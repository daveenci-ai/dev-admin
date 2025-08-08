import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, badRequest, serverError } from '@/lib/http'
import logger from '@/lib/logger'
import { contactCreateSchema } from '@/lib/schemas/contact'
import { getOpenAIClient, getModelFor } from '@/lib/openai'

async function parseImagesToRows(files: File[]): Promise<any[]> {
  const client = getOpenAIClient('RESEARCH')
  const model = getModelFor('RESEARCH', 'VISION')
  const rows: any[] = []
  for (const f of files) {
    const buf = Buffer.from(await f.arrayBuffer())
    const dataUrl = `data:${f.type};base64,${buf.toString('base64')}`
    const prompt = `You will receive an image of a table or list of contacts. Extract rows as JSON array. Use keys: name, primaryEmail, primaryPhone, company, industry, website, address, notes. Return ONLY JSON.`
    const res = await client.chat.completions.create({
      model,
      messages: [
        { role: 'user', content: [{ type: 'text', text: prompt } as any, { type: 'image_url', image_url: { url: dataUrl } } as any] as any },
      ],
      temperature: 0,
    })
    const text = res.choices?.[0]?.message?.content || '[]'
    const match = text.match(/\[[\s\S]*\]$/)
    const list = match ? JSON.parse(match[0]) : []
    if (Array.isArray(list)) rows.push(...list)
  }
  return rows
}

async function normalizeWithNano(row: any): Promise<any> {
  const client = getOpenAIClient('AVATAR') // nano key already mapped for cheap text
  const model = getModelFor('AVATAR', 'TEXT')
  const sys = `You map arbitrary contact data to this TypeScript shape: { name, primaryEmail, primaryPhone, company, industry, website, address, notes }. Only return JSON.`
  const res = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: sys },
      { role: 'user', content: `Input: ${JSON.stringify(row)}` },
    ],
    temperature: 0,
  })
  const text = res.choices?.[0]?.message?.content || '{}'
  const match = text.match(/\{[\s\S]*\}$/)
  return match ? JSON.parse(match[0]) : {}
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const files: File[] = []
    const allEntries = Array.from(form.entries())
    for (const entry of allEntries) {
      const v = entry[1]
      if (v instanceof File) files.push(v)
    }
    if (files.length === 0) return badRequest('No files uploaded')
    if (files.length > 10) return badRequest('Max 10 files per upload')

    // 1) OCR/parse
    const rawRows = await parseImagesToRows(files)
    if (!rawRows.length) return ok({ results: [], message: 'No rows detected' })

    // 2) Normalize and validate
    const normalized = await Promise.all(rawRows.map(normalizeWithNano))
    const results: any[] = []
    for (const rec of normalized) {
      try {
        const data = contactCreateSchema.parse(rec)
        // 3) Upsert by email
        const existing = await prisma.contact.findUnique({ where: { primaryEmail: data.primaryEmail } })
        if (existing) {
          // Minimal update (non-destructive)
          await prisma.contact.update({ where: { id: existing.id }, data: {
            name: data.name || existing.name,
            company: data.company || existing.company,
            industry: data.industry || existing.industry,
            website: data.website || existing.website,
            address: data.address || existing.address,
            notes: [existing.notes, data.notes].filter(Boolean).join('\n\n') || existing.notes,
          }})
          results.push({ status: 'updated', email: data.primaryEmail })
        } else {
          const created = await prisma.contact.create({ data: { ...data, userId: 1, source: 'Bulk Import' } })
          results.push({ status: 'created', id: created.id, email: data.primaryEmail })
        }
      } catch (e: any) {
        results.push({ status: 'error', error: e.message, input: rec })
      }
    }

    return ok({ results })
  } catch (error: any) {
    logger.error('Bulk upload error:', error)
    return serverError('Failed to import contacts', error.message)
  }
}


