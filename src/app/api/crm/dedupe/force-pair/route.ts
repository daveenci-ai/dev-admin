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

    // Compute signals in SQL using pg_trgm/fuzzystrmatch
    const row: any = await prisma.$queryRaw`WITH base AS (
        SELECT c.*,
               array_remove(array_append(coalesce(c.other_emails, '{}'), c.email_norm), NULL) AS emails,
               array_remove(array_append(coalesce(c.other_phones, '{}'), c.phone_e164), NULL) AS phones
        FROM contacts c WHERE c.id = ${a}
      ), other AS (
        SELECT o.*,
               array_remove(array_append(coalesce(o.other_emails, '{}'), o.email_norm), NULL) AS emails,
               array_remove(array_append(coalesce(o.other_phones, '{}'), o.phone_e164), NULL) AS phones
        FROM contacts o WHERE o.id = ${b}
      )
      SELECT
        (SELECT GREATEST(
           COALESCE((SELECT max(similarity(e1, e2)) FROM base b, unnest(b.emails) e1 CROSS JOIN unnest(o.emails) e2), 0),
           COALESCE((SELECT max(similarity(split_part(e1,'@',1), split_part(e2,'@',1))) FROM base b, unnest(b.emails) e1 CROSS JOIN unnest(o.emails) e2), 0)
         ) FROM other o) AS email_sim,
        (SELECT CASE WHEN EXISTS (SELECT 1 FROM base b, unnest(b.phones) p1 INNER JOIN other o ON true INNER JOIN unnest(o.phones) p2 ON p1 = p2) THEN 1.0 ELSE 0.0 END) AS phone_equal,
        (SELECT similarity(coalesce(b.full_name_norm,''), coalesce(o.full_name_norm,'')) FROM base b, other o) AS name_sim,
        (SELECT CASE WHEN coalesce(o.metaphone_last,'') <> '' AND coalesce(b.metaphone_last,'') <> '' AND o.metaphone_last = b.metaphone_last THEN 1 ELSE 0 END FROM base b, other o) AS metaphone_match,
        (SELECT similarity(coalesce(b.company_norm,''), coalesce(o.company_norm,'')) FROM base b, other o) AS company_sim,
        (SELECT similarity(coalesce(b.address_norm,''), coalesce(o.address_norm,'')) FROM base b, other o) AS address_sim` as any

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

    const status = score >= thresholds.auto ? 'approved' : score >= thresholds.review ? 'pending' : 'rejected'

    if (status !== 'rejected') {
      await upsertCandidate({ id1: a, id2: b, score, reason: 'force-pair', status: status as any })
    }

    return NextResponse.json({ id1: a, id2: b, score, status })
  } catch (error) {
    console.error('Force pair error:', error)
    return NextResponse.json({ error: 'Failed to score pair' }, { status: 500 })
  }
}


