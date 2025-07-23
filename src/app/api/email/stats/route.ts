import { NextRequest, NextResponse } from 'next/server';
import { getEmailStats } from '@/lib/zohoMail';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const stats = await getEmailStats();
    
    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching email statistics:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch email statistics' 
      },
      { status: 500 }
    );
  }
} 