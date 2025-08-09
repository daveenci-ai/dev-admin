import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = (searchParams.get('status') || 'pending').toLowerCase()
    const minScore = parseFloat(searchParams.get('minScore') || '0.55')

    const raw = await prisma.dedupeCandidate.findMany({
      where: { status, score: { gte: minScore as any } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })

    const candidates = raw.map((c: any) => ({
      id: Number(c.id),
      id1: Number(c.id1),
      id2: Number(c.id2),
      score: typeof c.score === 'object' && c.score !== null && 'toNumber' in c.score ? (c.score as any).toNumber() : Number(c.score),
      reason: c.reason,
      status: c.status,
      createdAt: c.createdAt,
    }))

    const ids = Array.from(new Set(candidates.flatMap((c) => [c.id1, c.id2])))
    const contacts = await prisma.contact.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, primaryEmail: true, primaryPhone: true, company: true, status: true, createdAt: true },
    })
    const map = new Map(contacts.map((c) => [c.id, c]))

    const hydrated = candidates.map((c) => ({
      ...c,
      a: map.get(c.id1) || null,
      b: map.get(c.id2) || null,
    }))

    return NextResponse.json({ candidates: hydrated })
  } catch (error) {
    console.error('Error fetching candidates with contacts:', error)
    return NextResponse.json({ error: 'Failed to fetch candidates' }, { status: 500 })
  }
}


