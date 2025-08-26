import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { calculateNextRun } from '@/lib/blog-scheduler'

const updateScheduleSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  categoryId: z.number().int().positive().optional(),
  topics: z.array(z.string()).max(5).optional(),
  frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
  weeklyDays: z.array(z.number().min(0).max(6)).optional(),
  monthlyDay: z.number().min(1).max(28).optional(),
  timeLocal: z.string().regex(/^\d{1,2}:\d{2}$/).optional(),
  timezone: z.string().optional(),
  isActive: z.boolean().optional(),
  isPaused: z.boolean().optional()
})

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    
    const schedule = await prisma.blogSchedule.findUnique({
      where: { id },
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
    
    if (!schedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ schedule })
  } catch (error: any) {
    console.error('Failed to fetch schedule:', error)
    return NextResponse.json(
      { error: 'Failed to fetch schedule' },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    const body = await req.json()
    const data = updateScheduleSchema.parse(body)
    
    // Check if schedule exists
    const existingSchedule = await prisma.blogSchedule.findUnique({
      where: { id }
    })
    
    if (!existingSchedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      )
    }
    
    // If categoryId is being updated, validate it exists
    if (data.categoryId) {
      const category = await prisma.blogCategory.findUnique({
        where: { id: data.categoryId }
      })
      
      if (!category) {
        return NextResponse.json(
          { error: 'Category not found' },
          { status: 404 }
        )
      }
    }
    
    // Calculate new next run time if scheduling changed
    let nextRunAt = existingSchedule.nextRunAt
    if (data.frequency || data.weeklyDays || data.monthlyDay || data.timeLocal || data.timezone) {
      nextRunAt = calculateNextRun({
        frequency: data.frequency || existingSchedule.frequency,
        weeklyDays: data.weeklyDays || (existingSchedule.weeklyDays as number[]) || [],
        monthlyDay: data.monthlyDay || existingSchedule.monthlyDay,
        timeLocal: data.timeLocal || existingSchedule.timeLocal,
        timezone: data.timezone || existingSchedule.timezone
      })
    }
    
    const schedule = await prisma.blogSchedule.update({
      where: { id },
      data: {
        ...data,
        nextRunAt,
        topics: data.topics as any,
        weeklyDays: data.weeklyDays as any
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
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Failed to update schedule:', error)
    return NextResponse.json(
      { error: 'Failed to update schedule' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    
    await prisma.blogSchedule.delete({
      where: { id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Failed to delete schedule:', error)
    return NextResponse.json(
      { error: 'Failed to delete schedule' },
      { status: 500 }
    )
  }
}


