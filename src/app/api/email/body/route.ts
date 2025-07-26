import { NextRequest, NextResponse } from 'next/server'
import { fetchEmailBodyViaImap } from '@/lib/zohoMail'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const messageId = searchParams.get('messageId')
    const mailboxEmail = searchParams.get('mailboxEmail')

    if (!messageId || !mailboxEmail) {
      return NextResponse.json(
        { error: 'Missing messageId or mailboxEmail parameter' },
        { status: 400 }
      )
    }

    console.log('[Email Body API] Fetching body for messageId:', messageId, 'mailbox:', mailboxEmail)

    const emailBody = await fetchEmailBodyViaImap(messageId, mailboxEmail)

    return NextResponse.json({
      success: true,
      body: emailBody,
      messageId,
      mailboxEmail
    })

  } catch (error: any) {
    console.error('[Email Body API] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch email body',
        details: error.message 
      },
      { status: 500 }
    )
  }
} 