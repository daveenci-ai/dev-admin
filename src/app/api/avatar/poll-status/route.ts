import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { generations } = await request.json() // Array of generation objects with predictionIds

    const updatedGenerations = []

    for (const generation of generations) {
      try {
        // Check Replicate status
        const response = await fetch(`https://api.replicate.com/v1/predictions/${generation.predictionId}`, {
          headers: {
            'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
          },
        })

        if (response.ok) {
          const prediction = await response.json()
          
          if (prediction.status === 'succeeded' && prediction.output) {
            // Get the first image URL from output (Replicate returns array)
            const imageUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output
            
            // Update database with actual image URL
            const updatedGeneration = await prisma.avatarGenerated.update({
              where: { id: BigInt(generation.id) },
              data: {
                githubImageUrl: `PENDING_REVIEW:${imageUrl}` // Store actual URL with PENDING_REVIEW prefix
              }
            })

            updatedGenerations.push({
              id: generation.id,
              status: 'completed',
              imageUrl: imageUrl,
              githubImageUrl: updatedGeneration.githubImageUrl
            })
            
          } else if (prediction.status === 'failed') {
            // Mark as failed and remove from database
            await prisma.avatarGenerated.delete({
              where: { id: BigInt(generation.id) }
            })
            
            updatedGenerations.push({
              id: generation.id,
              status: 'failed',
              error: prediction.error || 'Generation failed'
            })
          } else {
            // Still processing
            updatedGenerations.push({
              id: generation.id,
              status: 'processing'
            })
          }
        }
      } catch (error) {
        console.error(`Error polling generation ${generation.id}:`, error)
        updatedGenerations.push({
          id: generation.id,
          status: 'error',
          error: 'Failed to check status'
        })
      }
    }

    return NextResponse.json({ generations: updatedGenerations })
    
  } catch (error: any) {
    console.error('Poll status error:', error)
    return NextResponse.json(
      { error: 'Failed to poll generation status' },
      { status: 500 }
    )
  }
} 