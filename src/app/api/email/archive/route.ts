import { NextRequest, NextResponse } from 'next/server';
import { archiveEmailViaImap } from '@/lib/zohoMail';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  console.log('[API] /api/email/archive - Starting request');
  
  try {
    const { messageId, mailboxEmail } = await request.json();
    
    if (!messageId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Message ID is required' 
      }, { status: 400 });
    }

    console.log(`[API] Archiving email with ID: ${messageId} from mailbox: ${mailboxEmail}`);

    // Use IMAP to archive the email
    const success = await archiveEmailViaImap(messageId, mailboxEmail);

    if (success) {
      console.log('[API] Email archived successfully via IMAP');
      return NextResponse.json({ 
        success: true, 
        message: 'Email archived successfully' 
      });
    } else {
      console.log('[API] Failed to archive email via IMAP');
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to archive email' 
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('[API] Error archiving email:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to archive email'
    }, { status: 500 });
  }
} 