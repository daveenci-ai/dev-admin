import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Get current date and 28 days ago for comparison
    const now = new Date()
    const twentyEightDaysAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000)

    // Get all contacts
    const allContacts = await prisma.contact.findMany({
      select: {
        status: true,
        createdAt: true,
      },
    })

    // Calculate current counts by status
    const statusCounts = allContacts.reduce((acc: Record<string, number>, contact) => {
      acc[contact.status] = (acc[contact.status] || 0) + 1
      return acc
    }, {})

    // Calculate counts from 28 days ago
    const contactsFromPast = allContacts.filter(contact => 
      contact.createdAt <= twentyEightDaysAgo
    )
    
    const pastStatusCounts = contactsFromPast.reduce((acc: Record<string, number>, contact) => {
      acc[contact.status] = (acc[contact.status] || 0) + 1
      return acc
    }, {})

    // Calculate percentage changes
    const calculateChange = (current: number, past: number) => {
      if (past === 0) return current > 0 ? 100 : 0
      return Math.round(((current - past) / past) * 100)
    }

    const stats = [
      {
        title: 'CHURNED',
        value: statusCounts['CHURNED'] || 0,
        change: calculateChange(statusCounts['CHURNED'] || 0, pastStatusCounts['CHURNED'] || 0),
        trend: 'down' as const
      },
      {
        title: 'DECLINED',
        value: statusCounts['DECLINED'] || 0,
        change: calculateChange(statusCounts['DECLINED'] || 0, pastStatusCounts['DECLINED'] || 0),
        trend: 'down' as const
      },
      {
        title: 'UNQUALIFIED',
        value: statusCounts['UNQUALIFIED'] || 0,
        change: calculateChange(statusCounts['UNQUALIFIED'] || 0, pastStatusCounts['UNQUALIFIED'] || 0),
        trend: 'neutral' as const
      },
      {
        title: 'PROSPECTS',
        value: statusCounts['PROSPECT'] || 0,
        change: calculateChange(statusCounts['PROSPECT'] || 0, pastStatusCounts['PROSPECT'] || 0),
        trend: 'up' as const
      },
      {
        title: 'LEADS',
        value: statusCounts['LEAD'] || 0,
        change: calculateChange(statusCounts['LEAD'] || 0, pastStatusCounts['LEAD'] || 0),
        trend: 'up' as const
      },
      {
        title: 'OPPORTUNITIES',
        value: statusCounts['OPPORTUNITY'] || 0,
        change: calculateChange(statusCounts['OPPORTUNITY'] || 0, pastStatusCounts['OPPORTUNITY'] || 0),
        trend: 'up' as const
      },
      {
        title: 'CLIENTS',
        value: statusCounts['CLIENT'] || 0,
        change: calculateChange(statusCounts['CLIENT'] || 0, pastStatusCounts['CLIENT'] || 0),
        trend: 'up' as const
      }
    ]

    return NextResponse.json({ stats })
  } catch (error) {
    console.error('CRM Stats API Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch CRM statistics' },
      { status: 500 }
    )
  }
} 