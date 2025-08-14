import { getOpenAIClient } from '@/lib/openai'
import { getModelFor } from '@/lib/openai'
import logger from '@/lib/logger'

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
  const sys = `You are an expert technical marketer. Produce a concise JSON object with keys: title, slug, excerpt, tags (array of strings), content (markdown). Keep to 800-1200 words.`
  const user =
    `Create a weekly blog post for DaVeenci.ai${topicHint ? ` about: ${topicHint}` : ''}. ` +
    `Audience: founders & operators. Tone: practical, data-driven.` +
    (instructions ? `\nAdditional instructions:\n${instructions}` : '')
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


