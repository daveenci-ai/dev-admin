import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeReview = searchParams.get('includeReview') === 'true'
    
    // Get all avatars
    const avatars = await prisma.avatar.findMany({
      where: { visible: true },
      select: {
        id: true,
        fullName: true,
        description: true,
        triggerWord: true,
        replicateModelUrl: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    })

    // Get recent avatar generations
    let generationsWhere: any = {}
    
         if (includeReview) {
       // Include both completed and pending review images
       generationsWhere = {
         OR: [
           { 
             imageUrl: { 
               startsWith: 'https://raw.githubusercontent.com/' 
             } 
           },
           { 
             imageUrl: { 
               startsWith: 'PENDING_REVIEW:' 
             } 
           }
         ],
         status: 'completed'
       }
     } else {
       // Only approved/uploaded images
       generationsWhere = {
         imageUrl: { 
           startsWith: 'https://raw.githubusercontent.com/' 
         },
         status: 'completed'
       }
     }

    const [generations, generationsCount] = await Promise.all([
      prisma.avatarGeneration.findMany({
        where: generationsWhere,
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
        },
        orderBy: { createdAt: 'desc' },
        take: 50 // Limit recent generations
      }),
      prisma.avatarGeneration.count({ where: generationsWhere })
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
      avatars: avatars,
      generations: processedGenerations,
      stats: {
        totalAvatars: avatars.length,
        totalGenerations: generationsCount,
        pendingReview: generations.filter((g: any) => g.imageUrl?.startsWith('PENDING_REVIEW:')).length
      }
    })

  } catch (error: any) {
    console.error('Error fetching avatar gallery:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
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