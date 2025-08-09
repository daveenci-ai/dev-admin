import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { contactCreateSchema } from '@/lib/schemas/contact'
import { normalizeContact } from '@/lib/normalize'
import { createDeterministicCandidates, generateCandidatesForContact } from '@/lib/dedupe/worker'

const contactSchema = contactCreateSchema.extend({
  userId: z.number(),
  leadScore: z.number().min(0).max(1).optional(),
  opportunityScore: z.number().min(0).max(1).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status')
    const source = searchParams.get('source')
    const dateRange = searchParams.get('dateRange')
    const sentiment = searchParams.get('sentiment')
    const contactId = searchParams.get('contactId')

    // Build where clause
    const where: any = {}

    // If specific contact ID is requested, only fetch that contact
    if (contactId) {
      where.id = parseInt(contactId)
    } else {
      // Apply filters only when not fetching specific contact
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { primaryEmail: { contains: search, mode: 'insensitive' } },
          { company: { contains: search, mode: 'insensitive' } }
        ]
      }

      if (status && status !== 'all') {
        where.status = status.toUpperCase()
      }

      if (source && source !== 'all') {
        where.source = source
      }

      if (sentiment && sentiment !== 'all') {
        where.sentiment = sentiment.toUpperCase()
      }

      // Date range filtering
      if (dateRange && dateRange !== 'all') {
        const days = parseInt(dateRange)
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)
        
        where.createdAt = {
          gte: startDate
        }
      }
    }

    // Check if we need full contact details (for contact details panel)
    const includeAllTouchpoints = searchParams.get('includeAllTouchpoints') === 'true'
    
    // Get contacts with touchpoints
    const contacts = await prisma.contact.findMany({
      where,
      include: {
        touchpoints: {
          orderBy: { createdAt: 'desc' },
          take: includeAllTouchpoints ? undefined : 1
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: contactId ? 0 : (page - 1) * limit, // No pagination for specific contact
      take: contactId ? 1 : limit // Only take 1 if specific contact
    })

    // Get total count for pagination (only if not fetching specific contact)
    const total = contactId ? 1 : await prisma.contact.count({ where })

    return NextResponse.json({
      contacts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching contacts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contacts' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = contactSchema.parse(body)

    const normalized = normalizeContact({
      name: validatedData.name,
      primaryEmail: validatedData.primaryEmail,
      secondaryEmail: validatedData.secondaryEmail ?? undefined,
      primaryPhone: validatedData.primaryPhone ?? undefined,
      secondaryPhone: validatedData.secondaryPhone ?? undefined,
      company: validatedData.company ?? undefined,
      website: validatedData.website ?? undefined,
      address: validatedData.address ?? undefined,
      otherEmails: Array.isArray((body as any)?.otherEmails) ? (body as any).otherEmails : undefined,
      otherPhones: Array.isArray((body as any)?.otherPhones) ? (body as any).otherPhones : undefined,
    })

    const contact = await prisma.contact.create({
      data: {
        ...validatedData,
        primaryEmail: validatedData.primaryEmail.toLowerCase(),
        ...(validatedData.secondaryEmail ? { secondaryEmail: validatedData.secondaryEmail.toLowerCase() } : {}),
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
      }
    })

    // Compute phonetics in DB (requires fuzzystrmatch)
    if (contact.lastNameNorm) {
      await prisma.$executeRaw`UPDATE contacts SET soundex_last = soundex(${contact.lastNameNorm}), metaphone_last = metaphone(${contact.lastNameNorm}, 4) WHERE id = ${contact.id}`
    }

    // Real-time deterministic + fuzzy candidate generation (non-blocking best-effort)
    try {
      await createDeterministicCandidates(contact.id)
      await generateCandidatesForContact(contact.id)
    } catch (e) {
      console.error('Dedupe enqueue error:', e)
    }

    return NextResponse.json(contact, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error creating contact:', error)
    return NextResponse.json(
      { error: 'Failed to create contact' },
      { status: 500 }
    )
  }
} 