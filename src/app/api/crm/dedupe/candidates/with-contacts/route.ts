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
      // Fetch recent candidates broadly; we'll filter in JS to avoid Decimal quirks
      orderBy: { createdAt: 'desc' },
      take: 1000,
    })

    const candidates = raw
      .map((c: any) => ({
        id: Number(c.id),
        id1: Number(c.id1),
        id2: Number(c.id2),
        score: typeof c.score === 'object' && c.score !== null && 'toNumber' in c.score ? (c.score as any).toNumber() : Number(c.score),
        reason: c.reason,
        status: c.status?.toLowerCase?.() || c.status,
        createdAt: c.createdAt,
      }))
      .filter((c) => c.status === status && c.score >= minScore)

    const ids = Array.from(new Set(candidates.flatMap((c) => [c.id1, c.id2])))
    const contacts = await prisma.contact.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        name: true,
        primaryEmail: true,
        primaryPhone: true,
        company: true,
        status: true,
        createdAt: true,
        // Include normalized fields to improve display fidelity later if needed
        emailNorm: true,
        phoneE164: true,
      },
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


