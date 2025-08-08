import { NextRequest, NextResponse } from 'next/server';
import { markEmailAsSpamViaImap } from '@/lib/zoho/actions';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  console.log('[API] /api/email/spam - Starting request');
  
  try {
    const { messageId, mailboxEmail } = await request.json();
    
    if (!messageId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Message ID is required' 
      }, { status: 400 });
    }

    console.log(`[API] Marking email as spam with ID: ${messageId} from mailbox: ${mailboxEmail}`);

    // Use IMAP to mark email as spam
    const success = await markEmailAsSpamViaImap(messageId, mailboxEmail);

    if (success) {
      console.log('[API] Email marked as spam successfully via IMAP');
      return NextResponse.json({ 
        success: true, 
        message: 'Email marked as spam successfully' 
      });
    } else {
      console.log('[API] Failed to mark email as spam via IMAP');
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to mark email as spam' 
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('[API] Error marking email as spam:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to mark email as spam'
    }, { status: 500 });
  }
} 