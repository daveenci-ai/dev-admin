import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const source = searchParams.get('source')
    const dateRange = searchParams.get('dateRange')

    // Build where clause for filtering stats
    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { primaryEmail: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (source && source !== 'all') {
      where.source = { contains: source, mode: 'insensitive' }
    }

    // Date range filtering
    if (dateRange && dateRange !== 'all') {
      const days = parseInt(dateRange)
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      
      where.createdAt = {
        gte: startDate
      }
    }

    // Get stats for each status with filters applied
    const stats = await prisma.contact.groupBy({
      by: ['status'],
      where,
      _count: {
        status: true
      }
    })

    // Convert to object format
    const statusStats = stats.reduce((acc: Record<string, number>, stat: any) => {
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
      total: stats.reduce((sum: number, stat: any) => sum + stat._count.status, 0)
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