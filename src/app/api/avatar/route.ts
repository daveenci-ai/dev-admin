import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const avatarSchema = z.object({
  fullName: z.string().min(2).max(255),
  replicateModelUrl: z.string().min(1),
  triggerWord: z.string().min(1).max(100),
  description: z.string().optional(),
  visible: z.boolean().default(true)
})

// Get all avatars
export async function GET(request: NextRequest) {
  try {
    const avatars = await prisma.avatar.findMany({
      where: { 
        visible: true
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fullName: true,
        replicateModelUrl: true,
        triggerWord: true,
        description: true,
        visible: true,
        createdAt: true,
        updatedAt: true
      }
    })

    // Convert BigInt to string for JSON serialization
    const serializedAvatars = avatars.map((avatar: any) => ({
      ...avatar,
      id: avatar.id.toString()
    }))

    return NextResponse.json({ avatars: serializedAvatars })
  } catch (error: any) {
    console.error('Avatars fetch error:', error)
    return NextResponse.json(
      { error: 'Error fetching avatars' },
      { status: 500 }
    )
  }
}

// Create new avatar
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = avatarSchema.parse(body)

    // Check if replicate_model_url already exists
    const existingAvatar = await prisma.avatar.findUnique({
      where: { replicateModelUrl: validatedData.replicateModelUrl }
    })

    if (existingAvatar) {
      return NextResponse.json(
        { error: 'This Replicate model URL is already in use' },
        { status: 400 }
      )
    }

    const avatar = await prisma.avatar.create({
      data: {
        contactId: null, // Set to null for now since we don't have direct user relationship
        fullName: validatedData.fullName,
        replicateModelUrl: validatedData.replicateModelUrl,
        triggerWord: validatedData.triggerWord,
        description: validatedData.description,
        visible: validatedData.visible
      },
      select: {
        id: true,
        fullName: true,
        replicateModelUrl: true,
        triggerWord: true,
        description: true,
        visible: true,
        createdAt: true,
        updatedAt: true
      }
    })

    // Convert BigInt to string for JSON serialization
    const serializedAvatar = {
      ...avatar,
      id: avatar.id.toString()
    }

    return NextResponse.json(
      {
        message: 'Avatar created successfully',
        avatar: serializedAvatar
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Avatar creation error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Error creating avatar' },
      { status: 500 }
    )
  }
} 