import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = (searchParams.get('status') || 'pending').toLowerCase()
    const minScore = parseFloat(searchParams.get('minScore') || '0')

    const candidates = await prisma.dedupeCandidate.findMany({
      where: {
        status,
        score: { gte: minScore as any },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    })

    return NextResponse.json({ candidates })
  } catch (error) {
    console.error('Error fetching candidates:', error)
    return NextResponse.json({ error: 'Failed to fetch candidates' }, { status: 500 })
  }
}


