import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import gitHubStorage from '@/lib/github-storage'

export async function POST(request: NextRequest) {
  try {
    const { avatarGenerationId } = await request.json()

    if (!avatarGenerationId) {
      return NextResponse.json({ error: 'Avatar generation ID is required' }, { status: 400 })
    }

    // Get the avatar generation from database
    const generation = await prisma.avatarGeneration.findUnique({
      where: { id: parseInt(avatarGenerationId) }
    })

    if (!generation) {
      return NextResponse.json({ error: 'Avatar generation not found' }, { status: 404 })
    }

    if (!generation.imageUrl?.startsWith('PENDING_REVIEW:')) {
      return NextResponse.json({ error: 'No pending review image found' }, { status: 400 })
    }

    const replicateUrl = generation.imageUrl.replace('PENDING_REVIEW:', '')

    // Use the robust GitHub storage class
    console.log(`🚀 Uploading image for generation: ${generation.id}`)
    const result = await gitHubStorage.uploadImage(
      replicateUrl,
      generation.prompt,
      `generation-${generation.id}`
    )

    // Update the database with GitHub URL
    await prisma.avatarGeneration.update({
      where: { id: parseInt(avatarGenerationId) },
      data: { 
        imageUrl: result.url,
        updatedAt: new Date()
      }
    })

    console.log(`✅ Successfully uploaded and updated database for generation: ${avatarGenerationId}`)

    return NextResponse.json({ 
      success: true, 
      githubUrl: result.url,
      imageUrl: result.url
    })

  } catch (error: any) {
    console.error('Error uploading to GitHub:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
} 