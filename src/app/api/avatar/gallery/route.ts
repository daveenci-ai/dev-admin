import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, badRequest, notFound, serverError } from '@/lib/http'
import logger from '@/lib/logger'
import { serializePrisma } from '@/lib/serialize'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const search = searchParams.get('search') || ''
    const avatar = searchParams.get('avatar') || 'all'
    const timeframe = searchParams.get('timeframe') || 'all'
    
    const skip = (page - 1) * limit

    // Build where clause for generations using existing avatars_generated table
    const where: Record<string, unknown> = {
      // Only show approved images (not pending review)
      githubImageUrl: {
        not: {
          startsWith: 'PENDING_REVIEW:'
        }
      }
    }

    // Search in prompt
    if (search) {
      where.OR = [
        { prompt: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Filter by specific avatar
    if (avatar !== 'all') {
      const parsed = Number(avatar)
      if (Number.isNaN(parsed)) {
        return badRequest('Invalid avatar filter')
      }
      ;(where as any).avatarId = parsed
    }

    // Filter by timeframe based on creation date
    if (timeframe !== 'all') {
      const now = new Date()
      let startDate: Date

      switch (timeframe) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        case '3m':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
          break
        default:
          startDate = new Date(0) // Beginning of time
      }

      where.createdAt = {
        gte: startDate
      }
    }

    // Get generations with pagination from avatars_generated table
    const [generations, total] = await Promise.all([
      prisma.avatarGenerated.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          prompt: true,
          githubImageUrl: true,
          createdAt: true,
          avatar: {
            select: {
              id: true,
              fullName: true,
              triggerWord: true
            }
          }
        }
      }),
      prisma.avatarGenerated.count({ where })
    ])

    // Process generations to match expected format
    const processedGenerations = generations.map((generation) => {
      const isPendingReview = generation.githubImageUrl?.startsWith('PENDING_REVIEW:') || false
      const imageUrl = isPendingReview 
        ? generation.githubImageUrl?.replace('PENDING_REVIEW:', '') 
        : generation.githubImageUrl

      return {
        id: generation.id.toString(),
        prompt: generation.prompt,
        status: isPendingReview ? 'pending' : 'completed',
        imageUrl: imageUrl,
        githubImageUrl: isPendingReview ? null : generation.githubImageUrl,
        isPendingReview: isPendingReview,
        createdAt: generation.createdAt,
        avatar: generation.avatar ? {
          ...generation.avatar,
          id: generation.avatar.id.toString()
        } : null,
        // Add additional fields for compatibility
        loraRepository: generation.avatar?.fullName || 'Unknown',
        aspectRatio: '9:16', // Default aspect ratio
        errorMessage: null
      }
    })

    return ok({
      generations: processedGenerations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error: any) {
    logger.error('Error fetching avatar gallery:', error)
    return serverError('Internal server error', error.message)
  }
}

// DELETE: Remove generation from both GitHub and database
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json()
    
    if (!id) {
      return badRequest('Generation ID is required')
    }

    const generationId = BigInt(id)

    // First, get the generation record to retrieve the GitHub URL
    const generation = await prisma.avatarGenerated.findUnique({
      where: { id: generationId }
    })

    if (!generation) {
      return notFound('Generation not found')
    }

    let githubDeletionError = null

    // Try to delete from GitHub first (if not PENDING_REVIEW)
    if (generation.githubImageUrl && !generation.githubImageUrl.startsWith('PENDING_REVIEW:')) {
      try {
        const { default: githubStorage } = await import('@/lib/github-storage')
        logger.info('Deleting image from GitHub:', generation.githubImageUrl)
        await githubStorage.deleteImage(generation.githubImageUrl)
        logger.info('Successfully deleted from GitHub')
      } catch (error: any) {
        logger.warn('GitHub deletion failed:', error)
        githubDeletionError = error.message
        // Continue with database deletion even if GitHub deletion fails
      }
    } else if (generation.githubImageUrl?.startsWith('PENDING_REVIEW:')) {
      logger.debug('Skipping GitHub deletion for PENDING_REVIEW image')
    }

    // Delete from database
    await prisma.avatarGenerated.delete({
      where: { id: generationId }
    })

    logger.info('Successfully deleted from database:', id)

    const response: any = { 
      message: 'Avatar generation deleted successfully',
      deletedFromDatabase: true,
      deletedFromGitHub: !githubDeletionError
    }

    if (githubDeletionError) {
      response.warnings = [`GitHub deletion failed: ${githubDeletionError}`]
    }

    return ok(response)
    
  } catch (error) {
    logger.error('Avatar deletion error:', error)
    return serverError('Failed to delete avatar generation')
  }
} 