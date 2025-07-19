import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const status = searchParams.get('status')
    const search = searchParams.get('search') || ''

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}

    if (status && status !== 'all') {
      where.status = status
    }

    if (search) {
      where.OR = [
        { prompt: { contains: search, mode: 'insensitive' } },
        { loraRepository: { contains: search, mode: 'insensitive' } }
      ]
    }

    const [generations, total] = await Promise.all([
      prisma.avatarGeneration.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          prompt: true,
          loraRepository: true,
          loraScale: true,
          guidanceScale: true,
          inferenceSteps: true,
          aspectRatio: true,
          outputFormat: true,
          seed: true,
          enableSafetyChecker: true,
          status: true,
          imageUrl: true,
          errorMessage: true,
          createdAt: true,
          completedAt: true
        }
      }),
      prisma.avatarGeneration.count({ where })
    ])

    return NextResponse.json({
      generations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Avatar gallery fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch avatar gallery' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required' },
        { status: 400 }
      )
    }

    const generationId = parseInt(id)

    // Check if generation exists
    const generation = await prisma.avatarGeneration.findUnique({
      where: { id: generationId }
    })

    if (!generation) {
      return NextResponse.json(
        { error: 'Generation not found' },
        { status: 404 }
      )
    }

    // Delete the generation
    await prisma.avatarGeneration.delete({
      where: { id: generationId }
    })

    return NextResponse.json({ 
      message: 'Avatar generation deleted successfully' 
    })
  } catch (error) {
    console.error('Avatar deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete avatar generation' },
      { status: 500 }
    )
  }
} 