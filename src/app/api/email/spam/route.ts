import { NextRequest, NextResponse } from 'next/server';
import { markEmailAsSpam } from '@/lib/zohoMail';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  console.log('[API] /api/email/spam - Starting request');
  
  try {
    const { messageId, mailboxEmail } = await request.json();
    
    if (!messageId) {
      return NextResponse.json(
        { success: false, error: 'Message ID is required' },
        { status: 400 }
      );
    }

    console.log('[API] Marking email as spam with ID:', messageId, 'from mailbox:', mailboxEmail);
    
    const result = await markEmailAsSpam(messageId, mailboxEmail);
    
    console.log('[API] Email marked as spam successfully:', result);
    
    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[API] Error marking email as spam:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to mark email as spam'
    }, { status: 500 });
  }
} 