import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Calculate date ranges using native Date methods
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Get avatar generation statistics using existing avatars_generated table
    const [
      totalGenerations,
      generationsToday,
      generationsThisWeek,
      generationsThisMonth,
      totalAvatars
    ] = await Promise.all([
      prisma.avatarGenerated.count(),
      prisma.avatarGenerated.count({
        where: { createdAt: { gte: startOfToday } }
      }),
      prisma.avatarGenerated.count({
        where: { createdAt: { gte: startOfWeek } }
      }),
      prisma.avatarGenerated.count({
        where: { createdAt: { gte: startOfMonth } }
      }),
      prisma.avatar.count()
    ])

    // Calculate success rate based on approved images (non-pending)
    const approvedGenerations = await prisma.avatarGenerated.count({
      where: {
        githubImageUrl: {
          not: {
            startsWith: 'PENDING_REVIEW:'
          }
        }
      }
    })

    const successRate = totalGenerations > 0 
      ? ((approvedGenerations / totalGenerations) * 100).toFixed(1)
      : '0'

    return NextResponse.json({
      totalGenerations,
      generationsToday,
      generationsThisWeek,
      generationsThisMonth,
      totalAvatars,
      approvedGenerations,
      successRate: parseFloat(successRate)
    })

  } catch (error: any) {
    console.error('Avatar stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
} 