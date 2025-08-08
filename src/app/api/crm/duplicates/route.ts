import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, serverError } from '@/lib/http'
import logger from '@/lib/logger'

type DuplicateMember = {
  id: number
  name: string
  primaryEmail: string
  primaryPhone: string | null
  company: string | null
  status: string
  createdAt: Date
}

export async function GET(_req: NextRequest) {
  try {
    // Limit for responsiveness; adjust as needed
    const contacts = await prisma.contact.findMany({
      take: 1000,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        primaryEmail: true,
        primaryPhone: true,
        company: true,
        status: true,
        createdAt: true,
      },
    })

    const byEmail = new Map<string, DuplicateMember[]>()
    const byPhone = new Map<string, DuplicateMember[]>()

    for (const c of contacts) {
      const member: DuplicateMember = c
      const emailKey = (c.primaryEmail || '').trim().toLowerCase()
      if (emailKey) {
        byEmail.set(emailKey, [...(byEmail.get(emailKey) || []), member])
      }
      const phoneDigits = (c.primaryPhone || '').replace(/\D/g, '')
      if (phoneDigits.length >= 7) {
        const phoneKey = phoneDigits.slice(-7) // last 7 digits
        byPhone.set(phoneKey, [...(byPhone.get(phoneKey) || []), member])
      }
    }

    const groups: Array<{ reason: string; members: DuplicateMember[] }> = []

    for (const [key, arr] of byEmail) {
      if (arr.length > 1) groups.push({ reason: `Same email: ${key}`, members: arr })
    }
    for (const [key, arr] of byPhone) {
      if (arr.length > 1) groups.push({ reason: `Same phone (last 7): ${key}`, members: arr })
    }

    // Deduplicate overlapping groups by id set
    const seen = new Set<string>()
    const uniqueGroups = groups.filter((g) => {
      const sig = g.members
        .map((m) => m.id)
        .sort((a, b) => a - b)
        .join('-')
      if (seen.has(sig)) return false
      seen.add(sig)
      return true
    })

    return ok({ groups: uniqueGroups })
  } catch (error: any) {
    logger.error('Duplicate detection error:', error)
    return serverError('Failed to compute duplicate candidates', error.message)
  }
}


