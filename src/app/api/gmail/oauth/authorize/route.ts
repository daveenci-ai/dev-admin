import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationUrl } from '@/lib/gmailOAuth';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    logger.info(`[Gmail Auth] Starting OAuth2 flow${email ? ` for ${email}` : ''}`);
    
    // Generate the OAuth2 authorization URL
    const authUrl = getAuthorizationUrl(email || undefined);
    
    logger.info('[Gmail Auth] Generated authorization URL, redirecting to Google');
    
    // Redirect user to Google OAuth consent screen
    return NextResponse.redirect(authUrl);
    
  } catch (error) {
    logger.error('[Gmail Auth] Error generating authorization URL:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: `Failed to start OAuth2 flow: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 }
    );
  }
}
