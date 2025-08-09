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

    // Compute signals in SQL with fallbacks (no reliance on prefilled normalized columns)
    const row: any = await prisma.$queryRaw`WITH a AS (
        SELECT c.*,
               lower(unaccent(regexp_replace(coalesce(c.name,''), '[^a-z0-9]+', ' ', 'gi'))) AS name_norm_fb,
               lower(split_part(coalesce(c.primary_email,''),'@',1)) AS email_local_raw,
               lower(split_part(coalesce(c.primary_email,''),'@',2)) AS email_domain_raw,
               (regexp_split_to_array(lower(unaccent(coalesce(c.name,''))),'\\s+'))[array_length(regexp_split_to_array(lower(unaccent(coalesce(c.name,''))),'\\s+'),1)] AS last_name_norm
        FROM contacts c WHERE c.id = ${a}
      ), a2 AS (
        SELECT *,
          regexp_replace(
            CASE WHEN email_domain_raw IN ('gmail.com','googlemail.com') THEN replace(email_local_raw,'.','') ELSE email_local_raw END,
            '\\+.*$',
            ''
          ) AS email_local_norm,
          email_domain_raw AS email_domain_norm
        FROM a
      ), b AS (
        SELECT c.*,
               lower(unaccent(regexp_replace(coalesce(c.name,''), '[^a-z0-9]+', ' ', 'gi'))) AS name_norm_fb,
               lower(split_part(coalesce(c.primary_email,''),'@',1)) AS email_local_raw,
               lower(split_part(coalesce(c.primary_email,''),'@',2)) AS email_domain_raw,
               (regexp_split_to_array(lower(unaccent(coalesce(c.name,''))),'\\s+'))[array_length(regexp_split_to_array(lower(unaccent(coalesce(c.name,''))),'\\s+'),1)] AS last_name_norm
        FROM contacts c WHERE c.id = ${b}
      ), b2 AS (
        SELECT *,
          regexp_replace(
            CASE WHEN email_domain_raw IN ('gmail.com','googlemail.com') THEN replace(email_local_raw,'.','') ELSE email_local_raw END,
            '\\+.*$',
            ''
          ) AS email_local_norm,
          email_domain_raw AS email_domain_norm
        FROM b
      )
      SELECT
         GREATEST(
          similarity(coalesce((SELECT email_norm FROM a2), (SELECT email_local_norm||'@'||email_domain_norm FROM a2)),
                    coalesce((SELECT email_norm FROM b2), (SELECT email_local_norm||'@'||email_domain_norm FROM b2))),
          similarity((SELECT email_local_norm FROM a2), (SELECT email_local_norm FROM b2))
        ) AS email_sim,
        CASE WHEN right(coalesce((SELECT phone_e164 FROM a2), (SELECT primary_phone FROM a2)),7) = right(coalesce((SELECT phone_e164 FROM b2),(SELECT primary_phone FROM b2)),7) AND right(coalesce((SELECT phone_e164 FROM a2), (SELECT primary_phone FROM a2)),7) <> '' THEN 1.0 ELSE 0.0 END AS phone_equal,
        similarity(coalesce((SELECT full_name_norm FROM a2),(SELECT name_norm_fb FROM a2)), coalesce((SELECT full_name_norm FROM b2),(SELECT name_norm_fb FROM b2))) AS name_sim,
        CASE WHEN dmetaphone(coalesce((SELECT last_name_norm FROM a2),'')) = dmetaphone(coalesce((SELECT last_name_norm FROM b2),'')) THEN 1 ELSE 0 END AS metaphone_match,
        similarity(coalesce((SELECT company_norm FROM a2), lower(unaccent(coalesce((SELECT company FROM a2),''))) ), coalesce((SELECT company_norm FROM b2), lower(unaccent(coalesce((SELECT company FROM b2),''))))) AS company_sim,
        similarity(coalesce((SELECT address_norm FROM a2), lower(unaccent(coalesce((SELECT address FROM a2),''))) ), coalesce((SELECT address_norm FROM b2), lower(unaccent(coalesce((SELECT address FROM b2),''))))) AS address_sim
      ` as any

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


