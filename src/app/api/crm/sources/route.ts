import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Get distinct sources from contacts table
    const sources = await prisma.contact.findMany({
      select: {
        source: true
      },
      where: {
        source: {
          not: null
        }
      },
      distinct: ['source']
    })

    // Extract source values and filter out nulls
    const sourceValues = sources
      .map(contact => contact.source)
      .filter((source): source is string => source !== null)
      .sort()

    return NextResponse.json({ sources: sourceValues })
  } catch (error) {
    console.error('Error fetching sources:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sources' },
      { status: 500 }
    )
  }
} 