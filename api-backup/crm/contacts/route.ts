import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const contactSchema = z.object({
  name: z.string().min(1),
  primaryEmail: z.string().email(),
  secondaryEmail: z.string().email().optional().or(z.literal('')),
  primaryPhone: z.string().optional(),
  secondaryPhone: z.string().optional(),
  company: z.string().optional(),
  industry: z.string().optional(),
  website: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  linkedinUrl: z.string().optional(),
  facebookUrl: z.string().optional(),
  instagramUrl: z.string().optional(),
  youtubeUrl: z.string().optional(),
  tiktokUrl: z.string().optional(),
  source: z.string().optional(),
  status: z.enum(['PROSPECT', 'LEAD', 'OPPORTUNITY', 'CLIENT', 'CHURNED', 'DECLINED', 'UNQUALIFIED']),
  sentiment: z.enum(['GOOD', 'NEUTRAL', 'BAD']).optional(),
  leadScore: z.number().min(0).max(1).optional(),
  opportunityScore: z.number().min(0).max(1).optional(),
  userId: z.number()
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status')
    const source = searchParams.get('source')

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { primaryEmail: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (status && status !== 'all') {
      where.status = status
    }

    if (source && source !== 'all') {
      where.source = source
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          touchpoints: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      }),
      prisma.contact.count({ where })
    ])

    // Get unique sources for filter dropdown
    const sources = await prisma.contact.findMany({
      select: { source: true },
      distinct: ['source'],
      where: { source: { not: null } }
    })

    return NextResponse.json({
      contacts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      sources: sources.map(s => s.source).filter(Boolean)
    })
  } catch (error) {
    console.error('CRM Contacts GET Error:', error)
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

    // Check if email already exists
    const existingContact = await prisma.contact.findFirst({
      where: {
        primaryEmail: validatedData.primaryEmail
      }
    })

    if (existingContact) {
      return NextResponse.json(
        { error: 'Contact with this email already exists' },
        { status: 400 }
      )
    }

    const contact = await prisma.contact.create({
      data: {
        ...validatedData,
        secondaryEmail: validatedData.secondaryEmail || null
      }
    })

    return NextResponse.json(contact, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('CRM Contacts POST Error:', error)
    return NextResponse.json(
      { error: 'Failed to create contact' },
      { status: 500 }
    )
  }
} 