import { NextRequest, NextResponse } from 'next/server';
import { fetchInboxMessages } from '@/lib/zohoMail';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    const messages = await fetchInboxMessages(limit);
    
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