import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const generationId = parseInt(params.id)
    
    if (isNaN(generationId)) {
      return NextResponse.json(
        { error: 'Invalid generation ID' },
        { status: 400 }
      )
    }

    const generation = await prisma.avatarGeneration.findUnique({
      where: { id: generationId }
    })

    if (!generation) {
      return NextResponse.json(
        { error: 'Generation not found' },
        { status: 404 }
      )
    }

    // If already completed or failed, return current status
    if (generation.status === 'completed' || generation.status === 'failed') {
      return NextResponse.json({
        id: generation.id,
        status: generation.status,
        imageUrl: generation.imageUrl,
        errorMessage: generation.errorMessage,
        completedAt: generation.completedAt
      })
    }

    // Check status with Replicate if still processing
    if (generation.replicatePredictionId && generation.status === 'processing') {
      const replicateToken = process.env.REPLICATE_API_TOKEN
      if (!replicateToken) {
        return NextResponse.json(
          { error: 'Replicate API token not configured' },
          { status: 500 }
        )
      }

      try {
        const replicateResponse = await fetch(
          `https://api.replicate.com/v1/predictions/${generation.replicatePredictionId}`,
          {
            headers: {
              'Authorization': `Token ${replicateToken}`,
              'Content-Type': 'application/json'
            }
          }
        )

        if (replicateResponse.ok) {
          const prediction = await replicateResponse.json()
          console.log('Replicate prediction status:', prediction)

          // Update database based on prediction status
          if (prediction.status === 'succeeded' && prediction.output) {
            const imageUrl = Array.isArray(prediction.output) 
              ? prediction.output[0] 
              : prediction.output

            const updatedGeneration = await prisma.avatarGeneration.update({
              where: { id: generationId },
              data: {
                status: 'completed',
                imageUrl: imageUrl,
                completedAt: new Date()
              }
            })

            return NextResponse.json({
              id: updatedGeneration.id,
              status: 'completed',
              imageUrl: updatedGeneration.imageUrl,
              completedAt: updatedGeneration.completedAt
            })
          } else if (prediction.status === 'failed') {
            const updatedGeneration = await prisma.avatarGeneration.update({
              where: { id: generationId },
              data: {
                status: 'failed',
                errorMessage: prediction.error || 'Generation failed',
                completedAt: new Date()
              }
            })

            return NextResponse.json({
              id: updatedGeneration.id,
              status: 'failed',
              errorMessage: updatedGeneration.errorMessage,
              completedAt: updatedGeneration.completedAt
            })
          }
        }
      } catch (replicateError) {
        console.error('Error checking Replicate status:', replicateError)
      }
    }

    // Return current status if still processing
    return NextResponse.json({
      id: generation.id,
      status: generation.status,
      imageUrl: generation.imageUrl,
      errorMessage: generation.errorMessage
    })

  } catch (error) {
    console.error('Avatar status check error:', error)
    return NextResponse.json(
      { error: 'Failed to check generation status' },
      { status: 500 }
    )
  }
} 