import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const conversationCreateSchema = z.object({
  sessionId: z.string().min(1),
  userId: z.string().optional(),
  userMessage: z.string().min(1),
  botResponse: z.string().min(1),
  context: z.string().optional(),
  intent: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  responseTime: z.number().optional(),
  feedbackRating: z.number().min(1).max(5).optional(),
  metadata: z.string().optional()
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const sessionId = searchParams.get('sessionId')
    const intent = searchParams.get('intent')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const minConfidence = searchParams.get('minConfidence')

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}

    if (search) {
      where.OR = [
        { userMessage: { contains: search, mode: 'insensitive' } },
        { botResponse: { contains: search, mode: 'insensitive' } },
        { intent: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (sessionId) {
      where.sessionId = sessionId
    }

    if (intent && intent !== 'all') {
      where.intent = intent
    }

    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) where.createdAt.gte = new Date(dateFrom)
      if (dateTo) where.createdAt.lte = new Date(dateTo)
    }

    if (minConfidence) {
      where.confidence = { gte: parseFloat(minConfidence) }
    }

    const [conversations, total] = await Promise.all([
      prisma.chatbotConversation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          sessionId: true,
          userId: true,
          userMessage: true,
          botResponse: true,
          intent: true,
          confidence: true,
          responseTime: true,
          feedbackRating: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      prisma.chatbotConversation.count({ where })
    ])

    return NextResponse.json({
      conversations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Conversations GET Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = conversationCreateSchema.parse(body)

    const conversation = await prisma.chatbotConversation.create({
      data: {
        ...validatedData,
        metadata: validatedData.metadata || null
      }
    })

    return NextResponse.json(conversation, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Conversations POST Error:', error)
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    )
  }
} 