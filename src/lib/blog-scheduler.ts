import { prisma } from '@/lib/db'

interface ScheduleConfig {
  frequency: string
  weeklyDays?: number[]
  monthlyDay?: number
  timeLocal: string
  timezone: string
}

/**
 * Calculate the next run time for a blog schedule
 */
export function calculateNextRun(config: ScheduleConfig, fromDate?: Date): Date {
  const now = fromDate || new Date()
  const [hours, minutes] = config.timeLocal.split(':').map(Number)
  
  // Create a date in the specified timezone
  // For now, we'll use a simple approach - in production, use a proper timezone library
  const nextRun = new Date(now)
  
  switch (config.frequency) {
    case 'daily':
      // Next day at specified time
      nextRun.setDate(nextRun.getDate() + 1)
      nextRun.setHours(hours, minutes, 0, 0)
      break
      
    case 'weekly':
      if (!config.weeklyDays || config.weeklyDays.length === 0) {
        // Default to next Monday if no days specified
        const daysUntilMonday = (1 - nextRun.getDay() + 7) % 7 || 7
        nextRun.setDate(nextRun.getDate() + daysUntilMonday)
      } else {
        // Find the next occurrence of any specified day
        const currentDay = nextRun.getDay()
        const sortedDays = [...config.weeklyDays].sort()
        
        // Find next day in this week
        let nextDay = sortedDays.find(day => day > currentDay)
        
        if (nextDay === undefined) {
          // No more days this week, use first day of next week
          nextDay = sortedDays[0]
          const daysToAdd = (nextDay - currentDay + 7) % 7 || 7
          nextRun.setDate(nextRun.getDate() + daysToAdd)
        } else {
          // Use next day this week
          nextRun.setDate(nextRun.getDate() + (nextDay - currentDay))
        }
      }
      nextRun.setHours(hours, minutes, 0, 0)
      break
      
    case 'monthly':
      const targetDay = config.monthlyDay || 1
      
      // Try this month first
      nextRun.setDate(targetDay)
      nextRun.setHours(hours, minutes, 0, 0)
      
      // If the date has already passed this month, move to next month
      if (nextRun <= now) {
        nextRun.setMonth(nextRun.getMonth() + 1)
        nextRun.setDate(targetDay)
      }
      break
      
    default:
      // Default to daily
      nextRun.setDate(nextRun.getDate() + 1)
      nextRun.setHours(hours, minutes, 0, 0)
  }
  
  return nextRun
}

/**
 * Update next run times for all active schedules
 */
export async function updateAllScheduleNextRuns(): Promise<void> {
  const activeSchedules = await prisma.blogSchedule.findMany({
    where: {
      isActive: true,
      isPaused: false
    }
  })
  
  for (const schedule of activeSchedules) {
    const nextRunAt = calculateNextRun({
      frequency: schedule.frequency,
      weeklyDays: schedule.weeklyDays as number[] || [],
      monthlyDay: schedule.monthlyDay || undefined,
      timeLocal: schedule.timeLocal,
      timezone: schedule.timezone
    })
    
    await prisma.blogSchedule.update({
      where: { id: schedule.id },
      data: { nextRunAt }
    })
  }
}

/**
 * Get schedules that are due to run
 */
export async function getDueSchedules(): Promise<any[]> {
  const now = new Date()
  
  return await prisma.blogSchedule.findMany({
    where: {
      isActive: true,
      isPaused: false,
      nextRunAt: {
        lte: now
      }
    },
    include: {
      category: true
    }
  })
}

/**
 * Execute a scheduled blog post generation
 */
export async function executeScheduledPost(scheduleId: number): Promise<{ success: boolean; error?: string; postId?: number }> {
  try {
    const schedule = await prisma.blogSchedule.findUnique({
      where: { id: scheduleId },
      include: { category: true }
    })
    
    if (!schedule) {
      return { success: false, error: 'Schedule not found' }
    }
    
    if (!schedule.isActive || schedule.isPaused) {
      return { success: false, error: 'Schedule is not active or is paused' }
    }
    
    const topics = schedule.topics as string[]
    if (!topics || topics.length === 0) {
      return { success: false, error: 'No topics configured' }
    }
    
    // Use the first available topic
    const topic = topics.find(t => t && t.trim()) || topics[0]
    if (!topic || !topic.trim()) {
      return { success: false, error: 'No valid topic found' }
    }
    
    // Generate the blog post
    const generateResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/blog/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        topicHint: topic.trim(),
        categoryId: schedule.categoryId,
        scheduleId: schedule.id
      })
    })
    
    if (!generateResponse.ok) {
      const error = await generateResponse.json().catch(() => ({}))
      return { success: false, error: error.error || 'Failed to generate blog post' }
    }
    
    const result = await generateResponse.json()
    
    // Update schedule's last run time and calculate next run
    const nextRunAt = calculateNextRun({
      frequency: schedule.frequency,
      weeklyDays: schedule.weeklyDays as number[] || [],
      monthlyDay: schedule.monthlyDay || undefined,
      timeLocal: schedule.timeLocal,
      timezone: schedule.timezone
    })
    
    await prisma.blogSchedule.update({
      where: { id: scheduleId },
      data: {
        lastRunAt: new Date(),
        nextRunAt
      }
    })
    
    return { success: true, postId: result.post?.id }
  } catch (error: any) {
    console.error('Failed to execute scheduled post:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

/**
 * Process all due schedules
 */
export async function processDueSchedules(): Promise<{ processed: number; errors: string[] }> {
  const dueSchedules = await getDueSchedules()
  const errors: string[] = []
  let processed = 0
  
  for (const schedule of dueSchedules) {
    const result = await executeScheduledPost(schedule.id)
    if (result.success) {
      processed++
    } else {
      errors.push(`Schedule ${schedule.name}: ${result.error}`)
    }
  }
  
  return { processed, errors }
}
