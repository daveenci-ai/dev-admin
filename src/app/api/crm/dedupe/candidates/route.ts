import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getReviewMinScore } from '@/lib/dedupe/config'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = (searchParams.get('status') || 'pending').toLowerCase()
    const minScore = parseFloat(searchParams.get('minScore') || String(getReviewMinScore()))

    const raw = await prisma.dedupeCandidate.findMany({
      where: {
        status,
        score: { gte: minScore as any },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    })

    // Serialize BigInt/Decimal for JSON
    const candidates = raw.map((c: any) => ({
      id: Number(c.id),
      entityType: c.entityType,
      id1: Number(c.id1),
      id2: Number(c.id2),
      score: typeof c.score === 'object' && c.score !== null && 'toNumber' in c.score ? (c.score as any).toNumber() : Number(c.score),
      reason: c.reason,
      status: c.status,
      createdAt: c.createdAt,
    }))

    return NextResponse.json({ candidates })
  } catch (error) {
    console.error('Error fetching candidates:', error)
    return NextResponse.json({ error: 'Failed to fetch candidates' }, { status: 500 })
  }
}


