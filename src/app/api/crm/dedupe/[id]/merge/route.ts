import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const candidateId = BigInt(params.id)
  try {
    const candidate = await prisma.dedupeCandidate.findUnique({ where: { id: candidateId } })
    if (!candidate) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })

    const id1 = Number(candidate.id1)
    const id2 = Number(candidate.id2)

    const result = await prisma.$transaction(async (tx) => {
      const a = await tx.contact.findUnique({ where: { id: id1 } })
      const b = await tx.contact.findUnique({ where: { id: id2 } })
      if (!a || !b) throw new Error('Contacts not found')

      // Survivor selection: completeness -> updatedAt -> id
      const completeness = (c: any) =>
        [c.name, c.primaryEmail, c.primaryPhone, c.company, c.website, c.address].filter(Boolean).length
      let survivor = a
      let merged = b
      if (
        completeness(b) > completeness(a) ||
        (completeness(b) === completeness(a) && new Date(b.updatedAt).getTime() > new Date(a.updatedAt).getTime()) ||
        (completeness(b) === completeness(a) && b.updatedAt === a.updatedAt && b.id > a.id)
      ) {
        survivor = b
        merged = a
      }

      // Repoint children
      await tx.touchpoint.updateMany({ where: { contactId: merged.id }, data: { contactId: survivor.id } })
      await tx.avatar.updateMany({ where: { contactId: merged.id }, data: { contactId: survivor.id } })

      // Merge scalar fields (fill missing)
      const data: any = {}
      const scalars = [
        'secondaryEmail',
        'primaryPhone',
        'secondaryPhone',
        'company',
        'industry',
        'website',
        'address',
        'notes',
      ]
      for (const k of scalars) {
        if (!survivor[k as keyof typeof survivor] && merged[k as keyof typeof merged]) {
          data[k] = merged[k as keyof typeof merged]
        }
      }

      // Arrays union
      const unionUnique = (aArr?: string[] | null, bArr?: string[] | null) => Array.from(new Set([...(aArr || []), ...(bArr || [])]))
      data.otherEmails = unionUnique(survivor.otherEmails as any, merged.otherEmails as any)
      data.otherPhones = unionUnique(survivor.otherPhones as any, merged.otherPhones as any)

      await tx.contact.update({ where: { id: survivor.id }, data: { ...data, updatedAt: new Date() } })

      // Soft-delete merged
      await tx.contact.update({ where: { id: merged.id }, data: { deletedAt: new Date() } })

      await tx.dedupeCandidate.update({ where: { id: candidateId }, data: { status: 'merged' } })
      await tx.dedupeMerge.create({
        data: {
          entityType: 'contact',
          survivorId: BigInt(survivor.id),
          mergedId: BigInt(merged.id),
          score: candidate.score as any,
          mode: 'manual',
          details: { candidateId: Number(candidateId) },
        },
      })

      return { survivorId: survivor.id, mergedId: merged.id }
    })

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('Merge candidate error:', error)
    return NextResponse.json({ error: 'Failed to merge candidate' }, { status: 500 })
  }
}


