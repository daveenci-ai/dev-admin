import { NextRequest, NextResponse } from 'next/server';
import { moveEmailToTrash } from '@/lib/zohoMail';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest) {
  console.log('[API] /api/email/delete - Starting request');
  
  try {
    const { messageId, mailboxEmail } = await request.json();
    
    if (!messageId) {
      return NextResponse.json(
        { success: false, error: 'Message ID is required' },
        { status: 400 }
      );
    }

    console.log('[API] Deleting email with ID:', messageId, 'from mailbox:', mailboxEmail);
    
    const result = await moveEmailToTrash(messageId, mailboxEmail);
    
    console.log('[API] Email deleted successfully:', result);
    
    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[API] Error deleting email:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete email'
    }, { status: 500 });
  }
} 