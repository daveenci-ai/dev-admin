import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { normalizeContact } from '@/lib/normalize'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '500')
    const afterId = parseInt(searchParams.get('afterId') || '0')

    const contacts = await prisma.contact.findMany({
      where: { id: { gt: afterId }, deletedAt: null },
      select: {
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
      },
      orderBy: { id: 'asc' },
      take: limit,
    })

    let lastId = afterId
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

      await prisma.$executeRaw`UPDATE contacts SET soundex_last = soundex(${normalized.lastNameNorm || ''}), metaphone_last = metaphone(${normalized.lastNameNorm || ''}, 4) WHERE id = ${c.id}`
      lastId = c.id
    }

    const done = contacts.length < limit
    return NextResponse.json({ success: true, processed: contacts.length, afterId: lastId, done })
  } catch (error) {
    console.error('Normalize-all error:', error)
    return NextResponse.json({ error: 'Failed to normalize' }, { status: 500 })
  }
}


