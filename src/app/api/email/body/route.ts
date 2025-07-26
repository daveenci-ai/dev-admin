import { NextRequest, NextResponse } from 'next/server'
import { fetchEmailBodyViaImap } from '@/lib/zohoMail'

export async function GET(request: NextRequest) {
  try {
    const messageId = request.nextUrl.searchParams.get('messageId')
    const mailboxEmail = request.nextUrl.searchParams.get('mailboxEmail')

    console.log('[Email Body API] Request received - messageId:', messageId, 'mailboxEmail:', mailboxEmail)

    if (!messageId || !mailboxEmail) {
      console.log('[Email Body API] Missing parameters - messageId:', !!messageId, 'mailboxEmail:', !!mailboxEmail)
      return NextResponse.json(
        { error: 'Missing messageId or mailboxEmail parameter' },
        { status: 400 }
      )
    }

    console.log('[Email Body API] Calling fetchEmailBodyViaImap...')
    const emailBody = await fetchEmailBodyViaImap(messageId, mailboxEmail)
    console.log('[Email Body API] IMAP function returned body length:', emailBody?.length || 0)

    return NextResponse.json({
      success: true,
      body: emailBody,
      messageId,
      mailboxEmail
    })

  } catch (error: any) {
    console.error('[Email Body API] Detailed error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    return NextResponse.json(
      { 
        error: 'Failed to fetch email body',
        details: error.message,
        errorName: error.name
      },
      { status: 500 }
    )
  }
} 