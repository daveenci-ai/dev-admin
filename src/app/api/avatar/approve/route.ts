import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

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
              
              console.log(`🚀 Uploading approved image to GitHub for generation: ${generation.id}`)
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

              console.log(`✅ Image approved and uploaded to GitHub: ${uploadResult.url}`)
              
            } catch (uploadError: any) {
              console.error(`❌ Failed to upload image to GitHub for generation ${approval.id}:`, uploadError)
              
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
        console.error(`Error processing approval for ${approval.id}:`, error)
        results.push({
          id: approval.id,
          status: 'error',
          error: 'Failed to process approval'
        })
      }
    }

    return NextResponse.json({ results })

  } catch (error: any) {
    console.error('Error processing approvals:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
} 