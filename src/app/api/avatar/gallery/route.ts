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

    // Build where clause for generations
    const where: any = {}
    
    if (status && status !== 'all') {
      where.status = status
    }

    if (search) {
      where.OR = [
        { prompt: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Get generations with pagination
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
          numInferenceSteps: true,
          aspectRatio: true,
          outputFormat: true,
          seed: true,
          safetyChecker: true,
          status: true,
          imageUrl: true,
          errorMessage: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      prisma.avatarGeneration.count({ where })
    ])

    // Process generations to handle review status
    const processedGenerations = generations.map((generation: any) => {
      const isPendingReview = generation.imageUrl?.startsWith('PENDING_REVIEW:') || false
      const imageUrl = isPendingReview 
        ? generation.imageUrl?.replace('PENDING_REVIEW:', '') 
        : generation.imageUrl

      return {
        id: generation.id,
        prompt: generation.prompt,
        loraRepository: generation.loraRepository,
        loraScale: generation.loraScale,
        guidanceScale: generation.guidanceScale,
        numInferenceSteps: generation.numInferenceSteps,
        aspectRatio: generation.aspectRatio,
        outputFormat: generation.outputFormat,
        seed: generation.seed,
        safetyChecker: generation.safetyChecker,
        status: generation.status,
        imageUrl: imageUrl, // Clean URL for display
        githubImageUrl: isPendingReview ? null : generation.imageUrl,
        isPendingReview: isPendingReview,
        errorMessage: generation.errorMessage,
        createdAt: generation.createdAt,
        updatedAt: generation.updatedAt
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