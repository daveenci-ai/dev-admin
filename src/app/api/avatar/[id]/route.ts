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

// Get single avatar
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const avatarId = BigInt(params.id)

    const avatar = await prisma.avatar.findFirst({
      where: {
        id: avatarId,
        visible: true
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

    if (!avatar) {
      return NextResponse.json({ error: 'Avatar not found' }, { status: 404 })
    }

    // Convert BigInt to string for JSON serialization
    const serializedAvatar = {
      ...avatar,
      id: avatar.id.toString()
    }

    return NextResponse.json({ avatar: serializedAvatar })
  } catch (error: any) {
    console.error('Avatar fetch error:', error)
    return NextResponse.json(
      { error: 'Error fetching avatar' },
      { status: 500 }
    )
  }
}

// Update avatar
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const avatarId = BigInt(params.id)

    // Check if avatar exists
    const existingAvatar = await prisma.avatar.findFirst({
      where: {
        id: avatarId,
        visible: true
      }
    })

    if (!existingAvatar) {
      return NextResponse.json({ error: 'Avatar not found' }, { status: 404 })
    }

    const body = await request.json()
    const validatedData = avatarSchema.parse(body)

    // Check if replicate_model_url already exists (excluding current avatar)
    if (validatedData.replicateModelUrl !== existingAvatar.replicateModelUrl) {
      const duplicateRepo = await prisma.avatar.findUnique({
        where: { replicateModelUrl: validatedData.replicateModelUrl }
      })

      if (duplicateRepo) {
        return NextResponse.json(
          { error: 'This Replicate model URL is already in use' },
          { status: 400 }
        )
      }
    }

    const updatedAvatar = await prisma.avatar.update({
      where: { id: avatarId },
      data: {
        fullName: validatedData.fullName,
        replicateModelUrl: validatedData.replicateModelUrl,
        triggerWord: validatedData.triggerWord,
        description: validatedData.description,
        visible: validatedData.visible,
        updatedAt: new Date()
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
    const serializedUpdatedAvatar = {
      ...updatedAvatar,
      id: updatedAvatar.id.toString()
    }

    return NextResponse.json({
      message: 'Avatar updated successfully',
      avatar: serializedUpdatedAvatar
    })
  } catch (error: any) {
    console.error('Avatar update error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Error updating avatar' },
      { status: 500 }
    )
  }
}

// Delete avatar
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const avatarId = BigInt(params.id)

    // Check if avatar exists
    const existingAvatar = await prisma.avatar.findFirst({
      where: {
        id: avatarId,
        visible: true
      }
    })

    if (!existingAvatar) {
      return NextResponse.json({ error: 'Avatar not found' }, { status: 404 })
    }

    await prisma.avatar.delete({
      where: { id: avatarId }
    })

    return NextResponse.json({ message: 'Avatar deleted successfully' })
  } catch (error: any) {
    console.error('Avatar deletion error:', error)
    return NextResponse.json(
      { error: 'Error deleting avatar' },
      { status: 500 }
    )
  }
} 