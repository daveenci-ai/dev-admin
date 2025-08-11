import { prisma } from '@/lib/db'
import { getDedupeConfig } from './config'

type CandidateRow = {
  candidate_id: number
  email_sim: number | null
  phone_equal: number
  name_sim: number | null
  metaphone_match: number
  company_sim: number | null
  address_sim: number | null
  name_exact?: number
}

function orderPair(a: number, b: number): [bigint, bigint] {
  return a < b ? [BigInt(a), BigInt(b)] : [BigInt(b), BigInt(a)]
}

export async function upsertCandidate(params: {
  id1: number
  id2: number
  score: number
  reason?: string
  status?: 'pending' | 'approved' | 'rejected' | 'merged'
}) {
  const [small, large] = orderPair(params.id1, params.id2)
  const status = params.status ?? 'pending'
  await prisma.dedupeCandidate.upsert({
    where: { entityType_id1_id2: { entityType: 'contact', id1: small, id2: large } },
    update: { score: params.score as any, reason: params.reason, status },
    create: {
      entityType: 'contact',
      id1: small,
      id2: large,
      score: params.score as any,
      reason: params.reason,
      status,
    },
  })
}

export async function createDeterministicCandidates(contactId: number) {
  const c = await prisma.contact.findUnique({ where: { id: contactId } })
  if (!c) return
  // Email exact
  if (c.emailNorm) {
    const others = await prisma.contact.findMany({
      where: { id: { not: c.id }, deletedAt: null, emailNorm: c.emailNorm },
      select: { id: true },
      take: 100,
    })
    for (const o of others) {
      await upsertCandidate({ id1: c.id, id2: o.id, score: 1, reason: 'email_exact', status: 'approved' })
    }
  }
  // Phone exact
  if (c.phoneE164) {
    const others = await prisma.contact.findMany({
      where: { id: { not: c.id }, deletedAt: null, phoneE164: c.phoneE164 },
      select: { id: true },
      take: 100,
    })
    for (const o of others) {
      await upsertCandidate({ id1: c.id, id2: o.id, score: 1, reason: 'phone_exact', status: 'approved' })
    }
  }
}

export async function generateCandidatesForContact(contactId: number) {
  const cfg = getDedupeConfig()
  const w = cfg.weights
  const thresholds = cfg.thresholds

  const rows = (await prisma.$queryRawUnsafe(
    `WITH base AS (
      SELECT c.*,
             array_remove(array_append(coalesce(c.other_emails, '{}'), c.email_norm), NULL) AS emails,
             array_remove(array_append(coalesce(c.other_phones, '{}'), c.phone_e164), NULL) AS phones
      FROM contacts c
      WHERE c.id = $1
    ), cand AS (
      SELECT o.*,
             array_remove(array_append(coalesce(o.other_emails, '{}'), o.email_norm), NULL) AS o_emails,
             array_remove(array_append(coalesce(o.other_phones, '{}'), o.phone_e164), NULL) AS o_phones
      FROM contacts o, base b
      WHERE o.id <> b.id AND o.deleted_at IS NULL AND (
        -- same domain + first local char
        (b.email_domain IS NOT NULL AND o.email_domain = b.email_domain AND left(coalesce(o.email_local,''),1) = left(coalesce(b.email_local,''),1))
        -- cross-domain: exact email local part
        OR (b.email_local IS NOT NULL AND o.email_local = b.email_local)
        -- zip + soundex last name
        OR (b.zip_norm IS NOT NULL AND o.zip_norm = b.zip_norm AND b.soundex_last IS NOT NULL AND o.soundex_last = b.soundex_last)
        -- same website root
        OR (b.website_root IS NOT NULL AND o.website_root = b.website_root)
        -- phone last7
        OR (b.phone_e164 IS NOT NULL AND right(o.phone_e164, 7) = right(b.phone_e164, 7))
        -- company prefix6
        OR (b.company_norm IS NOT NULL AND left(o.company_norm, 6) = left(b.company_norm, 6))
        -- exact same normalized full name (catch simple matches)
        OR (b.full_name_norm IS NOT NULL AND o.full_name_norm = b.full_name_norm)
        -- name prefix + metaphone match
        OR (b.full_name_norm IS NOT NULL AND o.full_name_norm IS NOT NULL AND left(b.full_name_norm,3) = left(o.full_name_norm,3) AND b.metaphone_last IS NOT NULL AND o.metaphone_last = b.metaphone_last)
      )
    )
    SELECT
      o.id as candidate_id,
      (SELECT GREATEST(
         -- full email similarity across any addresses
         COALESCE((SELECT max(similarity(e1, e2)) FROM base b, unnest(b.emails) e1 CROSS JOIN unnest(o.o_emails) e2), 0),
         -- local-part similarity bonus for different domains
         COALESCE((SELECT max(similarity(split_part(e1,'@',1), split_part(e2,'@',1))) FROM base b, unnest(b.emails) e1 CROSS JOIN unnest(o.o_emails) e2), 0)
       )) AS email_sim,
      (CASE WHEN EXISTS (SELECT 1 FROM base b, unnest(b.phones) p1 INNER JOIN unnest(o.o_phones) p2 ON p1 = p2) THEN 1.0 ELSE 0.0 END) AS phone_equal,
      (SELECT similarity(coalesce(b.full_name_norm,''), coalesce(o.full_name_norm,'')) FROM base b) AS name_sim,
      (SELECT CASE WHEN coalesce(o.metaphone_last,'') <> '' AND coalesce(b.metaphone_last,'') <> '' AND o.metaphone_last = b.metaphone_last THEN 1 ELSE 0 END FROM base b) AS metaphone_match,
      (SELECT similarity(coalesce(b.company_norm,''), coalesce(o.company_norm,'')) FROM base b) AS company_sim,
      (SELECT similarity(coalesce(b.address_norm,''), coalesce(o.address_norm,'')) FROM base b) AS address_sim,
      (SELECT CASE WHEN coalesce(b.full_name_norm,'') <> '' AND coalesce(o.full_name_norm,'') <> '' AND b.full_name_norm = o.full_name_norm THEN 1 ELSE 0 END FROM base b) AS name_exact
    FROM cand o
    `,
    contactId
  )) as CandidateRow[]

  for (const r of rows) {
    const emailSim = r.email_sim ?? 0
    const phoneEq = r.phone_equal ?? 0
    const nameSimBase = r.name_sim ?? 0
    const nameSim = r.metaphone_match ? Math.max(nameSimBase, 0.7) : nameSimBase
    const companySim = r.company_sim ?? 0
    const addressSim = r.address_sim ?? 0
    let score = w.email * emailSim + w.phone * phoneEq + w.name * nameSim + w.company * companySim + w.address * addressSim
    // Conservative baseline boost for exact same full name
    if (r.name_exact) {
      score += 0.35
    }
    if (r.metaphone_match) {
      score += 0.05
    }
    if (score < 0) score = 0
    if (score > 1) score = 1
    const status = score >= thresholds.auto ? 'approved' : score >= thresholds.review ? 'pending' : (r.name_exact ? 'pending' : null)
    if (!status) continue
    await upsertCandidate({ id1: contactId, id2: r.candidate_id, score, reason: 'block+score', status })
  }
}


