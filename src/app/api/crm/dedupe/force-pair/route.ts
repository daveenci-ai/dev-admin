import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getDedupeConfig } from '@/lib/dedupe/config'
import { upsertCandidate } from '@/lib/dedupe/worker'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { id1, id2 } = await req.json()
    const a = Number(id1)
    const b = Number(id2)
    if (!a || !b || a === b) return NextResponse.json({ error: 'Provide distinct id1 and id2' }, { status: 400 })

    // Use centralized SQL scorer
    const row: any = await prisma.$queryRaw`SELECT * FROM score_pair(${a}, ${b})`

    const cfg = getDedupeConfig()
    const w = cfg.weights
    const thresholds = cfg.thresholds

    const emailSim = Number(row?.email_sim ?? 0)
    const phoneEq = Number(row?.phone_equal ?? 0)
    const nameBase = Number(row?.name_sim ?? 0)
    const nameSim = (row?.metaphone_match ? Math.max(nameBase, 0.7) : nameBase) as number
    const companySim = Number(row?.company_sim ?? 0)
    const addressSim = Number(row?.address_sim ?? 0)

    let score = w.email * emailSim + w.phone * phoneEq + w.name * nameSim + w.company * companySim + w.address * addressSim
    if (score < 0) score = 0
    if (score > 1) score = 1

    const status = score >= thresholds.auto ? 'approved' : score >= thresholds.review ? 'pending' : 'pending'

    await upsertCandidate({ id1: a, id2: b, score, reason: 'force-pair', status: status as any })

    return NextResponse.json({ id1: a, id2: b, score, status })
  } catch (error) {
    console.error('Force pair error:', error)
    return NextResponse.json({ error: 'Failed to score pair', details: (error as any)?.message || String(error) }, { status: 500 })
  }
}


