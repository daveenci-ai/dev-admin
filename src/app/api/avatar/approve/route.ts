import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, serverError } from '@/lib/http'
import logger from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const { approvals } = await request.json() // Array of { id, approved: boolean }

    const results = []

    for (const approval of approvals) {
      try {
        if (approval.approved) {
          // Get the generation record and avatar info
          const generation = await prisma.avatarGenerated.findUnique({
            where: { id: BigInt(approval.id) },
            include: {
              avatar: {
                select: {
                  fullName: true,
                  triggerWord: true
                }
              }
            }
          })

          if (generation && generation.githubImageUrl.startsWith('PENDING_REVIEW:')) {
            const replicateUrl = generation.githubImageUrl.replace('PENDING_REVIEW:', '')
            
            try {
              // Upload to GitHub using the GitHub storage class
              const { default: githubStorage } = await import('@/lib/github-storage')
              
              logger.info('Uploading approved image to GitHub for generation:', generation.id.toString())
              const uploadResult = await githubStorage.uploadImage(
                replicateUrl,
                generation.prompt,
                generation.avatar?.fullName || 'unknown'
              )

              // Update database with the GitHub URL
              await prisma.avatarGenerated.update({
                where: { id: BigInt(approval.id) },
                data: {
                  githubImageUrl: uploadResult.url // Store the GitHub raw URL
                }
              })

              results.push({
                id: approval.id,
                status: 'approved',
                githubImageUrl: uploadResult.url,
                replicateUrl: replicateUrl
              })

              logger.info('Image approved and uploaded to GitHub:', uploadResult.url)
              
            } catch (uploadError: any) {
              logger.warn('Failed to upload image to GitHub for generation', approval.id, uploadError)
              
              // Fall back to just removing PENDING_REVIEW prefix if upload fails
              const fallbackUrl = replicateUrl
              await prisma.avatarGenerated.update({
                where: { id: BigInt(approval.id) },
                data: {
                  githubImageUrl: fallbackUrl
                }
              })

              results.push({
                id: approval.id,
                status: 'approved_with_warning',
                githubImageUrl: fallbackUrl,
                warning: 'GitHub upload failed, using Replicate URL as fallback'
              })
            }
          }
        } else {
          // Disapprove: Delete from database completely
          await prisma.avatarGenerated.delete({
            where: { id: BigInt(approval.id) }
          })

          results.push({
            id: approval.id,
            status: 'deleted'
          })
        }
      } catch (error: any) {
        logger.error('Error processing approval for', approval.id, error)
        results.push({
          id: approval.id,
          status: 'error',
          error: 'Failed to process approval'
        })
      }
    }

    return ok({ results })

  } catch (error: any) {
    logger.error('Error processing approvals:', error)
    return serverError('Internal server error', error.message)
  }
} 