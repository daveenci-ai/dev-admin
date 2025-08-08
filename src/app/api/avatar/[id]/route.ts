import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, badRequest, notFound, serverError } from '@/lib/http'
import logger from '@/lib/logger'
import { avatarSchema } from '@/lib/schemas/avatar'
import { ZodError } from 'zod'

// Using shared avatarSchema

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
      return notFound('Avatar not found')
    }

    // Convert BigInt to string for JSON serialization
    const serializedAvatar = {
      ...avatar,
      id: avatar.id.toString()
    }

    return ok({ avatar: serializedAvatar })
  } catch (error: any) {
    logger.error('Avatar fetch error:', error)
    return serverError('Error fetching avatar')
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
      return notFound('Avatar not found')
    }

    const body = await request.json()
    const validatedData = avatarSchema.parse(body)

    // Check if replicate_model_url already exists (excluding current avatar)
    if (validatedData.replicateModelUrl !== existingAvatar.replicateModelUrl) {
      const duplicateRepo = await prisma.avatar.findUnique({
        where: { replicateModelUrl: validatedData.replicateModelUrl }
      })

      if (duplicateRepo) {
        return badRequest('This Replicate model URL is already in use')
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

    return ok({
      message: 'Avatar updated successfully',
      avatar: serializedUpdatedAvatar
    })
  } catch (error: any) {
    logger.error('Avatar update error:', error)
    
    if (error instanceof ZodError) {
      return badRequest('Invalid input data', error.issues)
    }
    
    return serverError('Error updating avatar')
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
      return notFound('Avatar not found')
    }

    await prisma.avatar.delete({
      where: { id: avatarId }
    })

    return ok({ message: 'Avatar deleted successfully' })
  } catch (error: any) {
    logger.error('Avatar deletion error:', error)
    return serverError('Error deleting avatar')
  }
} 