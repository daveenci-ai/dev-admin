import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, created, badRequest, serverError } from '@/lib/http'
import logger from '@/lib/logger'
import { avatarSchema } from '@/lib/schemas/avatar'
import { ZodError } from 'zod'


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
    const serializedAvatars = avatars.map((avatar) => ({
      ...avatar,
      id: avatar.id.toString()
    }))

    return ok({ avatars: serializedAvatars })
  } catch (error: any) {
    logger.error('Avatars fetch error:', error)
    return serverError('Error fetching avatars')
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
      return badRequest('This Replicate model URL is already in use')
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

    return created({
      message: 'Avatar created successfully',
      avatar: serializedAvatar
    })
  } catch (error: any) {
    logger.error('Avatar creation error:', error)
    
    if (error instanceof ZodError) {
      return badRequest('Invalid input data', error.issues)
    }
    
    return serverError('Error creating avatar')
  }
} 