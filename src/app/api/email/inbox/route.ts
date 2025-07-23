import { NextRequest, NextResponse } from 'next/server';
import { fetchAllInboxMessages } from '@/lib/zohoMail';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');

    const messages = await fetchAllInboxMessages(limit);
    
    return NextResponse.json({
      success: true,
      data: messages,
      count: messages?.data?.length || 0
    });
  } catch (error) {
    console.error('Error fetching inbox messages:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch inbox messages' 
      },
      { status: 500 }
    );
  }
} 