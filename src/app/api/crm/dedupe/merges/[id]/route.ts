import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const merge = await prisma.dedupeMerge.findUnique({ where: { id: BigInt(params.id) } })
    if (!merge) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(merge)
  } catch (error) {
    console.error('Fetch merge error:', error)
    return NextResponse.json({ error: 'Failed to fetch merge' }, { status: 500 })
  }
}


