import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Get stats for each status
    const stats = await prisma.contact.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    })

    // Convert to object format
    const statusStats = stats.reduce((acc, stat) => {
      acc[stat.status.toLowerCase()] = stat._count.status
      return acc
    }, {} as Record<string, number>)

    // Ensure all statuses are present with 0 if not found
    const result = {
      churned: statusStats.churned || 0,
      declined: statusStats.declined || 0,
      unqualified: statusStats.unqualified || 0,
      prospects: statusStats.prospect || 0,
      leads: statusStats.lead || 0,
      opportunities: statusStats.opportunity || 0,
      clients: statusStats.client || 0,
      total: stats.reduce((sum, stat) => sum + stat._count.status, 0)
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching CRM stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch CRM stats' },
      { status: 500 }
    )
  }
} 