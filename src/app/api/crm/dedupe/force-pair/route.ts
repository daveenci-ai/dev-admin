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
    const row: any = await prisma.$queryRaw`SELECT * FROM score_pair(${a}::int, ${b}::int)`

    const cfg = getDedupeConfig()
    const w = cfg.weights
    const thresholds = cfg.thresholds

    const emailSim = Number(row?.email_sim ?? 0)
    const phoneEq = Number(row?.phone_equal ?? 0)
    const nameBase = Number(row?.name_sim ?? 0)
    const metaphoneMatch = Number(row?.metaphone_match ?? 0) === 1
    const nameSim = metaphoneMatch ? Math.max(nameBase, 0.7) : nameBase
    const companySim = Number(row?.company_sim ?? 0)
    const addressSim = Number(row?.address_sim ?? 0)

    let score = w.email * emailSim + w.phone * phoneEq + w.name * nameSim + w.company * companySim + w.address * addressSim
    if (metaphoneMatch) score += 0.05
    // We cannot know name_exact here from SQL row; fetch both contacts to check
    let isNameExact = false
    try {
      const contacts = await prisma.contact.findMany({ where: { id: { in: [a, b] } }, select: { fullNameNorm: true, id: true } })
      if (contacts.length === 2) {
        const map = new Map(contacts.map((c) => [c.id, c.fullNameNorm || '']))
        isNameExact = (map.get(a) || '') !== '' && map.get(a) === map.get(b)
      }
    } catch {}
    if (isNameExact) score += 0.35
    if (score < 0) score = 0
    if (score > 1) score = 1
    if (isNameExact && score < thresholds.review) score = thresholds.review

    const status = score >= thresholds.auto ? 'approved' : score >= thresholds.review ? 'pending' : 'pending'

    await upsertCandidate({ id1: a, id2: b, score, reason: isNameExact ? 'name_exact' : 'force-pair', status: status as any })

    return NextResponse.json({ id1: a, id2: b, score, status })
  } catch (error) {
    console.error('Force pair error:', error)
    return NextResponse.json({ error: 'Failed to score pair', details: (error as any)?.message || String(error) }, { status: 500 })
  }
}


