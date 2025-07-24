import { NextRequest, NextResponse } from 'next/server';
import { deleteEmailViaImap } from '@/lib/zohoMail';

export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest) {
  console.log('[API] /api/email/delete - Starting request');
  
  try {
    const { messageId, mailboxEmail } = await request.json();
    
    if (!messageId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Message ID is required' 
      }, { status: 400 });
    }

    console.log(`[API] Deleting email with ID: ${messageId} from mailbox: ${mailboxEmail}`);

    // Use IMAP to delete the email
    const success = await deleteEmailViaImap(messageId, mailboxEmail);

    if (success) {
      console.log('[API] Email deleted successfully via IMAP');
      return NextResponse.json({ 
        success: true, 
        message: 'Email moved to trash successfully' 
      });
    } else {
      console.log('[API] Failed to delete email via IMAP');
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to delete email' 
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('[API] Error deleting email:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to delete email'
    }, { status: 500 });
  }
} 