import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, badRequest, serverError } from '@/lib/http'
import logger from '@/lib/logger'
import { z } from 'zod'

const bodySchema = z.object({
  primaryId: z.number(),
  duplicateIds: z.array(z.number()).min(1),
  overrides: z.record(z.any()).optional(),
  mergeOptions: z
    .object({
      notes: z.enum(['concat', 'primary']).default('concat'),
      keepHistory: z.boolean().default(true),
    })
    .optional(),
})

export async function POST(req: NextRequest) {
  try {
    const json = await req.json()
    const { primaryId, duplicateIds, overrides, mergeOptions } = bodySchema.parse(json)

    if (duplicateIds.includes(primaryId)) {
      return badRequest('primaryId cannot be part of duplicateIds')
    }

    const result = await prisma.$transaction(async (tx) => {
      const primary = await tx.contact.findUnique({ where: { id: primaryId } })
      if (!primary) throw new Error('Primary contact not found')

      const duplicates = await tx.contact.findMany({ where: { id: { in: duplicateIds } } })
      if (duplicates.length !== duplicateIds.length) throw new Error('One or more duplicates not found')

      // Repoint children to primary
      await tx.touchpoint.updateMany({ where: { contactId: { in: duplicateIds } }, data: { contactId: primaryId } })
      await tx.avatar.updateMany({ where: { contactId: { in: duplicateIds } }, data: { contactId: primaryId } })

      // Compute merged fields
      const finalData: any = { ...primary }
      const fillIfEmpty = (key: keyof typeof primary) => {
        if (!finalData[key]) {
          for (const d of duplicates) {
            if ((d as any)[key]) {
              finalData[key] = (d as any)[key]
              break
            }
          }
        }
      }

      ;['secondaryEmail', 'primaryPhone', 'secondaryPhone', 'company', 'industry', 'website', 'address', 'notes'].forEach(
        (k) => fillIfEmpty(k as any)
      )

      if (mergeOptions?.notes === 'concat') {
        const extraNotes = duplicates
          .map((d) => d.notes)
          .filter(Boolean)
          .join('\n\n')
        finalData.notes = [primary.notes, extraNotes].filter(Boolean).join('\n\n')
      }

      Object.assign(finalData, overrides || {}, { updatedAt: new Date() })

      await tx.contact.update({ where: { id: primaryId }, data: finalData })

      // Soft mark duplicates by adding a note prefix (no schema change for now)
      await tx.contact.updateMany({
        where: { id: { in: duplicateIds } },
        data: { notes: '(Merged into #' + primaryId + ' on ' + new Date().toISOString() + ')\n' + (primary.notes || '') },
      })

      // Optionally delete duplicates if keepHistory = false
      if (mergeOptions?.keepHistory === false) {
        await tx.contact.deleteMany({ where: { id: { in: duplicateIds } } })
      }

      return { primaryId, merged: duplicateIds }
    })

    return ok({ success: true, ...result })
  } catch (error: any) {
    logger.error('Merge error:', error)
    if (error instanceof z.ZodError) return badRequest('Invalid input', error.issues)
    return serverError('Failed to merge contacts', error.message)
  }
}


