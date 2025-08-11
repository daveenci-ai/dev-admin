import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getDedupeConfig } from '@/lib/dedupe/config'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { id1, id2 } = await req.json()
    const a = Number(id1)
    const b = Number(id2)
    if (!a || !b || a === b) return NextResponse.json({ error: 'Provide distinct id1 and id2' }, { status: 400 })

    const row: any = await prisma.$queryRaw`SELECT * FROM score_pair(${a}, ${b})`
    const cfg = getDedupeConfig()
    const w = cfg.weights
    const nameSimBase = Number(row?.name_sim ?? 0)
    const nameSim = (Number(row?.metaphone_match ?? 0) ? Math.max(nameSimBase, 0.7) : nameSimBase)
    let score = w.email * Number(row?.email_sim ?? 0) + w.phone * Number(row?.phone_equal ?? 0) + w.name * nameSim + w.company * Number(row?.company_sim ?? 0) + w.address * Number(row?.address_sim ?? 0)
    if (score < 0) score = 0
    if (score > 1) score = 1
    return NextResponse.json({ score, components: row })
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to score', details: e?.message || String(e) }, { status: 500 })
  }
}


