import { NextRequest, NextResponse } from 'next/server';
import { archiveEmail } from '@/lib/zohoMail';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  console.log('[API] /api/email/archive - Starting request');
  
  try {
    const { messageId, mailboxEmail } = await request.json();
    
    if (!messageId) {
      return NextResponse.json(
        { success: false, error: 'Message ID is required' },
        { status: 400 }
      );
    }

    console.log('[API] Archiving email with ID:', messageId, 'from mailbox:', mailboxEmail);
    
    const result = await archiveEmail(messageId, mailboxEmail);
    
    console.log('[API] Email archived successfully:', result);
    
    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[API] Error archiving email:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to archive email'
    }, { status: 500 });
  }
} 