import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const bodySchema = z.object({
  instructions: z.string().optional(),
  // structured config inspired by website repo automation
  config: z
    .object({
      category: z.string().optional(),
      tone: z.string().optional(),
      audience: z.string().optional(),
      keywords: z.array(z.string()).optional(),
      outline: z.array(z.string()).optional(),
      guidelines: z.string().optional(),
      slot: z.string().optional(),
      // up to 5 category plans with topics and schedules
      categoryConfigs: z
        .array(
          z.object({
            category: z.string().min(1),
            topics: z.array(z.string()).max(5),
            schedule: z.object({
              frequency: z.enum(['daily', 'weekly', 'monthly']),
              dayOfWeek: z.number().min(0).max(6).optional(),
              dayOfMonth: z.number().min(1).max(28).optional(),
              timeLocal: z.string().regex(/^\d{1,2}:\d{2}$/),
              timezone: z.string().default('America/Chicago').optional(),
            }),
          })
        )
        .max(5)
        .optional(),
    })
    .optional(),
  // optional scheduling controls
  enabled: z.boolean().optional(),
  frequency: z.enum(['off', 'weekly', 'biweekly']).optional(),
  dayOfWeek: z.number().min(0).max(6).optional(),
  timeLocal: z.string().regex(/^\d{1,2}:\d{2}$/).optional(),
  timezone: z.string().optional(),
})

export async function GET() {
  const setting = await (prisma as any).contentSetting.findUnique({ where: { kind: 'BLOG' } })
  return NextResponse.json({ setting })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const data = bodySchema.parse(body)
    const existing = await (prisma as any).contentSetting.findUnique({ where: { kind: 'BLOG' } })
    const setting = await (prisma as any).contentSetting.upsert({
      where: { kind: 'BLOG' },
      create: {
        kind: 'BLOG',
        instructions: data.instructions ?? existing?.instructions ?? null,
        config: (data.config as any) ?? existing?.config ?? {},
        enabled: data.enabled ?? existing?.enabled ?? true,
        frequency: (data.frequency ?? existing?.frequency ?? 'weekly') as any,
        dayOfWeek: data.dayOfWeek ?? existing?.dayOfWeek ?? 1,
        timeLocal: data.timeLocal ?? existing?.timeLocal ?? '10:00',
        timezone: data.timezone ?? existing?.timezone ?? 'America/Chicago',
      },
      update: {
        instructions: data.instructions ?? undefined,
        config: (data.config as any) ?? undefined,
        enabled: data.enabled ?? undefined,
        frequency: (data.frequency as any) ?? undefined,
        dayOfWeek: data.dayOfWeek ?? undefined,
        timeLocal: data.timeLocal ?? undefined,
        timezone: data.timezone ?? undefined,
      },
      select: { kind: true, instructions: true, config: true, enabled: true, frequency: true, dayOfWeek: true, timeLocal: true, timezone: true },
    })
    return NextResponse.json({ ok: true, setting })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Failed to save settings' }, { status: 400 })
  }
}


