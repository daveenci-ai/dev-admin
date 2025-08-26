import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    const { topicIndex = 0 } = await req.json().catch(() => ({}))
    
    // Get the schedule with category
    const schedule = await prisma.blogSchedule.findUnique({
      where: { id },
      include: {
        category: true
      }
    })
    
    if (!schedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      )
    }
    
    if (!schedule.isActive || schedule.isPaused) {
      return NextResponse.json(
        { error: 'Schedule is not active or is paused' },
        { status: 400 }
      )
    }
    
    const topics = schedule.topics as string[]
    if (!topics || topics.length === 0 || !topics[topicIndex]) {
      return NextResponse.json(
        { error: 'No topic found at specified index' },
        { status: 400 }
      )
    }
    
    const topic = topics[topicIndex]
    
    // Generate blog post using the existing blog generation API
    const generateResponse = await fetch(`${req.nextUrl.origin}/api/blog/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        topicHint: topic,
        categoryId: schedule.categoryId,
        scheduleId: schedule.id,
        generalPrompt: schedule.generalPrompt,
        negativePrompt: schedule.negativePrompt
      })
    })
    
    if (!generateResponse.ok) {
      const error = await generateResponse.json().catch(() => ({}))
      throw new Error(error.error || 'Failed to generate blog post')
    }
    
    const result = await generateResponse.json()
    
    // Update schedule's last run time
    await prisma.blogSchedule.update({
      where: { id },
      data: {
        lastRunAt: new Date()
      }
    })
    
    return NextResponse.json({
      success: true,
      post: result.post,
      topic,
      schedule: {
        id: schedule.id,
        name: schedule.name,
        category: schedule.category.name
      }
    })
  } catch (error: any) {
    console.error('Failed to publish from schedule:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to publish blog post' },
      { status: 500 }
    )
  }
}
