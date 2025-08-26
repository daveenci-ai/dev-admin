import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import logger from '@/lib/logger'
import { generateBlogPostDraft, toSlug } from '@/lib/content'

const bodySchema = z.object({
  topicHint: z.string().min(1).optional(),
  instructions: z.string().min(1).optional(),
  categoryId: z.number().int().positive().optional(),
  scheduleId: z.number().int().positive().optional(),
})

function calcReadTime(content: string): number {
  const words = content.trim().split(/\s+/).length
  return Math.ceil(words / 200)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { topicHint, instructions, categoryId, scheduleId } = bodySchema.parse(body)

    logger.info('[Blog] Generating blog draft via ChatGPT', { topicHint: !!topicHint, instructions: !!instructions })
    const draft = await generateBlogPostDraft({ topicHint, instructions })

    const title: string = draft?.title || 'Untitled'
    const content: string = draft?.content || ''
    const excerpt: string | undefined =
      typeof draft?.excerpt === 'string' && draft.excerpt.trim()
        ? draft.excerpt.trim()
        : content ? content.slice(0, 240) : undefined

    const tagsStr: string | undefined = Array.isArray(draft?.tags)
      ? draft.tags.join(', ')
      : typeof draft?.tags === 'string'
      ? draft.tags
      : undefined

    let slug = (typeof draft?.slug === 'string' && draft.slug.trim()) ? draft.slug.trim() : toSlug(title)
    const existing = await prisma.blogPost.findUnique({ where: { slug } })
    if (existing) slug = `${slug}-${Date.now()}`

    const post = await prisma.blogPost.create({
      data: {
        title,
        slug,
        content,
        excerpt: excerpt || null,
        tags: tagsStr || null,
        publishedAt: new Date(),
        readTimeMinutes: calcReadTime(content),
        createdByLlm: true,
        llmPrompt: [topicHint && `topic:${topicHint}`, instructions && `instr:${instructions}`, scheduleId && `schedule:${scheduleId}`].filter(Boolean).join(' | '),
        categoryId: categoryId || null,
      },
      select: { id: true, title: true, slug: true, publishedAt: true, categoryId: true },
    })

    logger.info('[Blog] Blog post created', { id: post.id, slug: post.slug })
    return NextResponse.json({ ok: true, post }, { status: 201 })
  } catch (err: any) {
    if (err?.issues) {
      return NextResponse.json({ ok: false, error: 'Invalid request', details: err.issues }, { status: 400 })
    }
    logger.error('[Blog] Generation failed', err?.message || err)
    return NextResponse.json({ ok: false, error: 'Failed to generate blog' }, { status: 500 })
  }
}


