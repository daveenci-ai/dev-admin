import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const [
      totalGenerations,
      completedGenerations,
      processingGenerations,
      failedGenerations,
      recentGenerations
    ] = await Promise.all([
      prisma.avatarGeneration.count(),
      prisma.avatarGeneration.count({
        where: { status: 'completed' }
      }),
      prisma.avatarGeneration.count({
        where: { status: 'processing' }
      }),
      prisma.avatarGeneration.count({
        where: { status: 'failed' }
      }),
      prisma.avatarGeneration.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      })
    ])

    // Calculate success rate
    const successRate = totalGenerations > 0 
      ? ((completedGenerations / totalGenerations) * 100).toFixed(1)
      : '0'

    return NextResponse.json({
      totalGenerations,
      completedGenerations,
      processingGenerations,
      failedGenerations,
      recentGenerations,
      successRate: parseFloat(successRate)
    })
  } catch (error) {
    console.error('Avatar stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch avatar statistics' },
      { status: 500 }
    )
  }
} 