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
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status')
    const source = searchParams.get('source')
    const dateRange = searchParams.get('dateRange')
    const sentiment = searchParams.get('sentiment')

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

    // Get contacts with touchpoints
    const contacts = await prisma.contact.findMany({
      where,
      include: {
        touchpoints: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    })

    // Get total count for pagination
    const total = await prisma.contact.count({ where })

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

    const contact = await prisma.contact.create({
      data: validatedData
    })

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