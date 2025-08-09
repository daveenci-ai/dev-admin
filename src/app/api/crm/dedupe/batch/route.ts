import { NextRequest, NextResponse } from 'next/server'
import { generateCandidatesForContact, createDeterministicCandidates } from '@/lib/dedupe/worker'
import { prisma } from '@/lib/db'
import { getDedupeConfig } from '@/lib/dedupe/config'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '90')
    const limit = parseInt(searchParams.get('limit') || '300')
    const since = new Date()
    since.setDate(since.getDate() - days)

    const contacts = await prisma.contact.findMany({
      where: { updatedAt: { gte: since }, deletedAt: null },
      select: { id: true },
      orderBy: { id: 'asc' },
      take: limit,
    })

    const cfg = getDedupeConfig()
    const autoEnabled = cfg.features.autoMergeFuzzy

    // Process sequentially to avoid exhausting DB connection pool on Render
    for (const { id } of contacts) {
      await createDeterministicCandidates(id)
      await generateCandidatesForContact(id)
    }

    if (autoEnabled) {
      // Process approved
      const approved = await prisma.dedupeCandidate.findMany({ where: { status: 'approved' }, take: 500 })
      for (const c of approved) {
        // Call merge API path in-process to reuse logic, or inline merge logic
        // For now, just mark approved; manual merge endpoint will process
        // You can wire automatic merge here if desired
      }
    }

    return NextResponse.json({ success: true, processed: contacts.length })
  } catch (error) {
    console.error('Batch dedupe error:', error)
    return NextResponse.json({ error: 'Failed to run batch' }, { status: 500 })
  }
}


