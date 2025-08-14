import { getOpenAIClient } from '@/lib/openai'
import { getModelFor } from '@/lib/openai'
import logger from '@/lib/logger'
import { prisma } from '@/lib/db'

function parseJsonFromText(text: string): any {
  const match = text.match(/\{[\s\S]*\}$/)
  if (!match) throw new Error('No JSON object found in model response')
  return JSON.parse(match[0])
}

export async function generateBlogPostDraft(options?: { topicHint?: string; instructions?: string }) {
  const topicHint = options?.topicHint
  const instructions = options?.instructions
  const client = getOpenAIClient('BLOG')
  const model = getModelFor('BLOG', 'TEXT')
  // Load BLOG settings to enrich prompt (category, tone, audience, keywords, outline, guidelines)
  // Cast prisma to any here to avoid type errors before Prisma client is regenerated during build
  const setting = await (prisma as any).contentSetting.findUnique({ where: { kind: 'BLOG' } })
  const cfg: any = (setting?.config as any) || {}

  const sys = `You are an expert technical marketer. Produce a concise JSON object with keys: title, slug, excerpt, tags (array of strings), content (markdown). Keep to 800-1200 words.`
  const lines: string[] = []
  lines.push(`Create a blog post for DaVeenci.ai${topicHint ? ` about: ${topicHint}` : ''}.`)
  if (cfg.category) lines.push(`Category: ${cfg.category}`)
  if (cfg.tone || cfg.audience) lines.push(`Tone: ${cfg.tone || 'practical, data-driven'}; Audience: ${cfg.audience || 'founders & operators'}`)
  if (Array.isArray(cfg.keywords) && cfg.keywords.length) lines.push(`Target Keywords: ${cfg.keywords.join(', ')}`)
  if (Array.isArray(cfg.outline) && cfg.outline.length) lines.push(`Follow this outline: ${cfg.outline.join(' > ')}`)
  if (cfg.guidelines) lines.push(`Guidelines: ${cfg.guidelines}`)
  if (instructions) lines.push(`Additional instructions: ${instructions}`)

  const user = lines.join('\n')
  const res = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: sys },
      { role: 'user', content: user },
    ],
    temperature: 0.6,
  })
  const text = res.choices?.[0]?.message?.content || ''
  const json = parseJsonFromText(text)
  return json
}

export async function generateUseCaseDraft(industryHint?: string) {
  const client = getOpenAIClient('CASE')
  const model = getModelFor('USE_CASE', 'TEXT')
  const sys = `You are a B2B case study writer. Return JSON with keys: title, slug, industry, challenge, solution, results (array of short bullets). Keep total 500-800 words.`
  const user = `Create a use case for DaVeenci.ai${industryHint ? ` in the ${industryHint} industry` : ''}, highlighting measurable outcomes and ROI.`
  const res = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: sys },
      { role: 'user', content: user },
    ],
    temperature: 0.5,
  })
  const text = res.choices?.[0]?.message?.content || ''
  const json = parseJsonFromText(text)
  return json
}

export function toSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}


