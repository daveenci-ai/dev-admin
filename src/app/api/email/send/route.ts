import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  console.log('[API] /api/email/send - Starting request');
  
  try {
    // Note: Email sending via IMAP is not supported
    // IMAP is for reading emails, SMTP would be needed for sending
    // For now, return not implemented
    
    return NextResponse.json({ 
      success: false, 
      error: 'Email sending not implemented with IMAP-only approach. SMTP integration needed for sending emails.' 
    }, { status: 501 }); // 501 = Not Implemented
    
  } catch (error: any) {
    console.error('[API] Error in send route:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to send email'
    }, { status: 500 });
  }
} 