import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'all'
    
    const skip = (page - 1) * limit

    // Build where clause for generations using existing avatars_generated table
    const where: any = {}

    if (search) {
      where.OR = [
        { prompt: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Get generations with pagination from avatars_generated table
    const [generations, total] = await Promise.all([
      prisma.avatarGenerated.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          prompt: true,
          githubImageUrl: true,
          createdAt: true,
          avatar: {
            select: {
              id: true,
              fullName: true,
              triggerWord: true
            }
          }
        }
      }),
      prisma.avatarGenerated.count({ where })
    ])

    // Process generations to match expected format
    const processedGenerations = generations.map((generation: any) => {
      const isPendingReview = generation.githubImageUrl?.startsWith('PENDING_REVIEW:') || false
      const imageUrl = isPendingReview 
        ? generation.githubImageUrl?.replace('PENDING_REVIEW:', '') 
        : generation.githubImageUrl

      return {
        id: generation.id.toString(),
        prompt: generation.prompt,
        status: isPendingReview ? 'pending' : 'completed',
        imageUrl: imageUrl,
        githubImageUrl: isPendingReview ? null : generation.githubImageUrl,
        isPendingReview: isPendingReview,
        createdAt: generation.createdAt,
        avatar: generation.avatar ? {
          ...generation.avatar,
          id: generation.avatar.id.toString()
        } : null
      }
    })

    return NextResponse.json({
      generations: processedGenerations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error: any) {
    console.error('Error fetching avatar gallery:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
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