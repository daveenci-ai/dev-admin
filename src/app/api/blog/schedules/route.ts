import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { calculateNextRun } from '@/lib/blog-scheduler'

const scheduleSchema = z.object({
  name: z.string().min(1).max(200),
  categoryId: z.number().int().positive(),
  topics: z.array(z.string()).max(5),
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  weeklyDays: z.array(z.number().min(0).max(6)).optional(),
  monthlyDay: z.number().min(1).max(28).optional(),
  timeLocal: z.string().regex(/^\d{1,2}:\d{2}$/),
  timezone: z.string().default('America/Chicago'),
  isActive: z.boolean().default(true),
  isPaused: z.boolean().default(false),
  generalPrompt: z.string().default(''),
  negativePrompt: z.string().default('')
})

export async function GET() {
  try {
    const schedules = await prisma.blogSchedule.findMany({
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      },
      orderBy: [
        { isActive: 'desc' },
        { isPaused: 'asc' },
        { name: 'asc' }
      ]
    })
    
    return NextResponse.json({ schedules })
  } catch (error: any) {
    console.error('Failed to fetch schedules:', error)
    return NextResponse.json(
      { error: 'Failed to fetch schedules' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = scheduleSchema.parse(body)
    
    // Validate category exists
    const category = await prisma.blogCategory.findUnique({
      where: { id: data.categoryId }
    })
    
    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }
    
    // Calculate next run time
    const nextRunAt = calculateNextRun({
      frequency: data.frequency,
      weeklyDays: data.weeklyDays,
      monthlyDay: data.monthlyDay,
      timeLocal: data.timeLocal,
      timezone: data.timezone
    })
    
    const schedule = await prisma.blogSchedule.create({
      data: {
        ...data,
        nextRunAt,
        topics: data.topics as any,
        weeklyDays: data.weeklyDays as any || []
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    })
    
    return NextResponse.json({ schedule })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      )
    }
    
    console.error('Failed to create schedule:', error)
    return NextResponse.json(
      { error: 'Failed to create schedule' },
      { status: 500 }
    )
  }
}


