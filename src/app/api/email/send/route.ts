import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/zohoMail';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, content, cc, bcc } = body;

    // Validate required fields
    if (!to || !subject || !content) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: to, subject, content' 
        },
        { status: 400 }
      );
    }

    const result = await sendEmail({
      to,
      subject,
      content,
      cc,
      bcc
    });
    
    return NextResponse.json({
      success: true,
      data: result,
      message: 'Email sent successfully'
    });
  } catch (error) {
    console.error('Error sending email:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send email' 
      },
      { status: 500 }
    );
  }
} 