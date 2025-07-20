import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const generationId = params.id

    // Get the generation record
    const generation = await prisma.avatarGeneration.findUnique({
      where: { id: parseInt(generationId) }
    })

    if (!generation) {
      return NextResponse.json({ error: 'Generation not found' }, { status: 404 })
    }

    // If still processing, check Replicate status
    if (generation.status === 'processing' && generation.replicateId) {
      try {
        const replicateResponse = await fetch(
          `https://api.replicate.com/v1/predictions/${generation.replicateId}`,
          {
            headers: {
              'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
            },
          }
        )

        if (replicateResponse.ok) {
          const prediction = await replicateResponse.json()
          
          if (prediction.status === 'succeeded') {
            // Get the output URLs
            const outputUrls = Array.isArray(prediction.output) ? prediction.output : [prediction.output]
            
            if (outputUrls.length > 0) {
                          // Store as PENDING_REVIEW for user approval
            await prisma.avatarGeneration.update({
              where: { id: parseInt(generationId) },
              data: {
                status: 'completed',
                imageUrl: `PENDING_REVIEW:${outputUrls[0]}`, // Mark for review
                updatedAt: new Date()
              }
            })

            return NextResponse.json({
              id: generation.id,
              status: 'completed',
              imageUrl: outputUrls[0],
              isPendingReview: true,
              message: 'Image generated successfully - ready for review'
            })
            }
          } else if (prediction.status === 'failed') {
            await prisma.avatarGeneration.update({
              where: { id: parseInt(generationId) },
              data: {
                status: 'failed',
                errorMessage: prediction.error || 'Generation failed',
                updatedAt: new Date()
              }
            })

            return NextResponse.json({
              id: generation.id,
              status: 'failed',
              error: prediction.error || 'Generation failed'
            })
          }
        }
      } catch (replicateError) {
        console.error('Error checking Replicate status:', replicateError)
      }
    }

    // Return current status
    const isPendingReview = generation.imageUrl?.startsWith('PENDING_REVIEW:') || false
    const imageUrl = isPendingReview 
      ? generation.imageUrl?.replace('PENDING_REVIEW:', '') 
      : generation.imageUrl

    return NextResponse.json({
      id: generation.id,
      status: generation.status,
      imageUrl: imageUrl,
      githubImageUrl: isPendingReview ? null : generation.imageUrl,
      isPendingReview: isPendingReview,
      errorMessage: generation.errorMessage
    })

  } catch (error: any) {
    console.error('Error checking generation status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Like action - Approve and upload to GitHub
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { action } = await request.json()
    const generationId = params.id

    const generation = await prisma.avatarGeneration.findUnique({
      where: { id: parseInt(generationId) }
    })

    if (!generation) {
      return NextResponse.json({ error: 'Generation not found' }, { status: 404 })
    }

    if (action === 'like') {
      // Check if it's pending review
      if (!generation.imageUrl?.startsWith('PENDING_REVIEW:')) {
        return NextResponse.json({ error: 'Image is not pending review' }, { status: 400 })
      }

      return NextResponse.json({
        message: 'Image approved - upload to GitHub via upload-github endpoint',
        generationId: generationId
      })

    } else if (action === 'dislike') {
      // Check if it's pending review
      if (!generation.imageUrl?.startsWith('PENDING_REVIEW:')) {
        return NextResponse.json({ error: 'Image is not pending review' }, { status: 400 })
      }

      // Delete from database (no need to delete from GitHub since it's not uploaded yet)
      await prisma.avatarGeneration.delete({
        where: { id: parseInt(generationId) }
      })

      return NextResponse.json({ message: 'Image rejected and deleted successfully' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error: any) {
    console.error('Error processing action:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 