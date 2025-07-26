import { NextRequest, NextResponse } from 'next/server'
import { fetchEmailBodyViaImap } from '@/lib/zohoMail'

// Force this route to be dynamic (not statically generated)
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Single comprehensive try-catch to prevent HTML responses
  try {
    console.log('[Email Body API] Starting request handler...')
    
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

    // Add environment diagnostics
    console.log('[Email Body API] Environment check - NODE_ENV:', process.env.NODE_ENV)
    console.log('[Email Body API] IMAP passwords available:', {
      anton: !!process.env.ZOHO_PASSWORD_ANTON,
      astrid: !!process.env.ZOHO_PASSWORD_ASTRID,
      ops: !!process.env.ZOHO_PASSWORD_OPS,
      hello: !!process.env.ZOHO_PASSWORD_HELLO
    })
    
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
    console.error('[Email Body API] Comprehensive error handler:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      toString: error.toString()
    })
    
    // Always return JSON, never HTML - even for catastrophic errors
    return new Response(JSON.stringify({
      error: 'Failed to fetch email body',
      details: error.message || 'Unknown error',
      errorName: error.name || 'UnknownError',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }
} 