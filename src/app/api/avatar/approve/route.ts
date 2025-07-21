import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { approvals } = await request.json() // Array of { id, approved: boolean }

    const results = []

    for (const approval of approvals) {
      try {
        if (approval.approved) {
          // Approve: Remove PENDING_REVIEW prefix to move to gallery
          const generation = await prisma.avatarGenerated.findUnique({
            where: { id: BigInt(approval.id) }
          })

          if (generation && generation.githubImageUrl.startsWith('PENDING_REVIEW:')) {
            const approvedUrl = generation.githubImageUrl.replace('PENDING_REVIEW:', '')
            
            await prisma.avatarGenerated.update({
              where: { id: BigInt(approval.id) },
              data: {
                githubImageUrl: approvedUrl // Remove prefix to show in gallery
              }
            })

            results.push({
              id: approval.id,
              status: 'approved',
              githubImageUrl: approvedUrl
            })
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
      } catch (error) {
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
    console.error('Approval error:', error)
    return NextResponse.json(
      { error: 'Failed to process approvals' },
      { status: 500 }
    )
  }
} 