import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const candidateId = BigInt(params.id)
    await prisma.dedupeCandidate.update({ where: { id: candidateId }, data: { status: 'rejected' } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Reject candidate error:', error)
    return NextResponse.json({ error: 'Failed to reject candidate' }, { status: 500 })
  }
}


