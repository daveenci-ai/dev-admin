import { NextRequest, NextResponse } from 'next/server'
import { processDueSchedules, updateAllScheduleNextRuns } from '@/lib/blog-scheduler'

export async function POST(req: NextRequest) {
  try {
    // First, update all next run times to ensure they're current
    await updateAllScheduleNextRuns()
    
    // Then process any due schedules
    const result = await processDueSchedules()
    
    return NextResponse.json({
      success: true,
      processed: result.processed,
      errors: result.errors,
      message: `Processed ${result.processed} scheduled posts${result.errors.length > 0 ? ` with ${result.errors.length} errors` : ''}`
    })
  } catch (error: any) {
    console.error('Scheduler run failed:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Scheduler run failed',
        processed: 0,
        errors: []
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  // Allow GET requests for easy testing/monitoring
  return POST({} as NextRequest)
}
