import { NextRequest, NextResponse } from 'next/server'
import { generateCandidatesForContact, createDeterministicCandidates } from '@/lib/dedupe/worker'
import { prisma } from '@/lib/db'
import { getDedupeConfig } from '@/lib/dedupe/config'
import { normalizeContact } from '@/lib/normalize'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '90')
    const limitParam = searchParams.get('limit')
    const unlimited = !limitParam
    const limit = unlimited ? 0 : parseInt(limitParam as string)
    const chunkSize = parseInt(searchParams.get('chunk') || '500')
    const recentOnly = (searchParams.get('recentOnly') ?? 'true') !== 'false'
    const since = new Date()
    since.setDate(since.getDate() - days)

    const whereClause = recentOnly
      ? { updatedAt: { gte: since }, deletedAt: null }
      : { deletedAt: null }

    const selectFields = {
      id: true,
      name: true,
      primaryEmail: true,
      secondaryEmail: true,
      primaryPhone: true,
      secondaryPhone: true,
      company: true,
      website: true,
      address: true,
      otherEmails: true,
      otherPhones: true,
      lastNameNorm: true,
    } as const

    let contacts: any[] = []
    if (unlimited) {
      // We'll stream through all matching contacts in chunks
      let lastId = 0
      while (true) {
        const page = await prisma.contact.findMany({
          where: { ...whereClause, id: { gt: lastId } },
          select: selectFields,
          orderBy: { id: 'asc' },
          take: chunkSize,
        })
        if (page.length === 0) break
        contacts.push(...page)
        lastId = page[page.length - 1].id
        // Process each page immediately to keep memory bounded
        for (const c of page) {
          const normalized = normalizeContact({
            name: c.name,
            primaryEmail: c.primaryEmail,
            secondaryEmail: c.secondaryEmail ?? undefined,
            primaryPhone: c.primaryPhone ?? undefined,
            secondaryPhone: c.secondaryPhone ?? undefined,
            company: c.company ?? undefined,
            website: c.website ?? undefined,
            address: c.address ?? undefined,
            otherEmails: (c as any).otherEmails || [],
            otherPhones: (c as any).otherPhones || [],
          })

          await prisma.contact.update({
            where: { id: c.id },
            data: {
              firstNameNorm: normalized.firstNameNorm,
              lastNameNorm: normalized.lastNameNorm,
              fullNameNorm: normalized.fullNameNorm,
              emailNorm: normalized.emailNorm,
              emailLocal: normalized.emailLocal,
              emailDomain: normalized.emailDomain,
              phoneE164: normalized.phoneE164,
              companyNorm: normalized.companyNorm,
              websiteRoot: normalized.websiteRoot,
              addressNorm: normalized.addressNorm,
              zipNorm: normalized.zipNorm,
              otherEmails: normalized.otherEmails,
              otherPhones: normalized.otherPhones,
              updatedAt: new Date(),
            },
          })

          await prisma.$executeRaw`UPDATE contacts SET soundex_last = soundex(${normalized.lastNameNorm || ''}), metaphone_last = dmetaphone(${normalized.lastNameNorm || ''}) WHERE id = ${c.id}`

          await createDeterministicCandidates(c.id)
          await generateCandidatesForContact(c.id)
        }
      }
    } else {
      contacts = await prisma.contact.findMany({
        where: whereClause,
        select: selectFields,
        orderBy: recentOnly ? { id: 'asc' } : { updatedAt: 'desc' },
        take: limit,
      })
    }

    const cfg = getDedupeConfig()
    const autoEnabled = cfg.features.autoMergeFuzzy

    if (!unlimited) {
      // Process sequentially to avoid exhausting DB connection pool on Render
      for (const c of contacts) {
        const normalized = normalizeContact({
          name: c.name,
          primaryEmail: c.primaryEmail,
          secondaryEmail: c.secondaryEmail ?? undefined,
          primaryPhone: c.primaryPhone ?? undefined,
          secondaryPhone: c.secondaryPhone ?? undefined,
          company: c.company ?? undefined,
          website: c.website ?? undefined,
          address: c.address ?? undefined,
          otherEmails: (c as any).otherEmails || [],
          otherPhones: (c as any).otherPhones || [],
        })

        await prisma.contact.update({
          where: { id: c.id },
          data: {
            firstNameNorm: normalized.firstNameNorm,
            lastNameNorm: normalized.lastNameNorm,
            fullNameNorm: normalized.fullNameNorm,
            emailNorm: normalized.emailNorm,
            emailLocal: normalized.emailLocal,
            emailDomain: normalized.emailDomain,
            phoneE164: normalized.phoneE164,
            companyNorm: normalized.companyNorm,
            websiteRoot: normalized.websiteRoot,
            addressNorm: normalized.addressNorm,
            zipNorm: normalized.zipNorm,
            otherEmails: normalized.otherEmails,
            otherPhones: normalized.otherPhones,
            updatedAt: new Date(),
          },
        })

        await prisma.$executeRaw`UPDATE contacts SET soundex_last = soundex(${normalized.lastNameNorm || ''}), metaphone_last = dmetaphone(${normalized.lastNameNorm || ''}) WHERE id = ${c.id}`

        await createDeterministicCandidates(c.id)
        await generateCandidatesForContact(c.id)
      }
    }

    if (autoEnabled) {
      // Process approved
      const approved = await prisma.dedupeCandidate.findMany({ where: { status: 'approved' }, take: 500 })
      for (const c of approved) {
        // Call merge API path in-process to reuse logic, or inline merge logic
        // For now, just mark approved; manual merge endpoint will process
        // You can wire automatic merge here if desired
      }
    }

    return NextResponse.json({ success: true, processed: unlimited ? 'all' : contacts.length })
  } catch (error) {
    console.error('Batch dedupe error:', error)
    return NextResponse.json({ error: 'Failed to run batch' }, { status: 500 })
  }
}


