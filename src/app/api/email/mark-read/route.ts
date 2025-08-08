import { NextRequest, NextResponse } from 'next/server'
import { markEmailAsReadViaImap } from '@/lib/zoho/actions'

export async function POST(request: NextRequest) {
  try {
    const { messageId, mailboxEmail } = await request.json()

    if (!messageId || !mailboxEmail) {
      return NextResponse.json(
        { error: 'Missing messageId or mailboxEmail' },
        { status: 400 }
      )
    }

    console.log('[Mark Read API] Marking email as read:', messageId, 'mailbox:', mailboxEmail)

    await markEmailAsReadViaImap(messageId, mailboxEmail)

    return NextResponse.json({
      success: true,
      messageId,
      mailboxEmail
    })

  } catch (error: any) {
    console.error('[Mark Read API] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to mark email as read',
        details: error.message 
      },
      { status: 500 }
    )
  }
} 