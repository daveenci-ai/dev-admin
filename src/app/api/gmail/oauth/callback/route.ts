import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, storeGmailTokens } from '@/lib/gmailOAuth';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    
    // Check for OAuth2 errors
    if (error) {
      logger.error('[Gmail Callback] OAuth2 error:', error);
      
      return NextResponse.redirect(
        new URL('/gmail?error=oauth_denied', request.url)
      );
    }
    
    if (!code) {
      logger.error('[Gmail Callback] No authorization code received');
      
      return NextResponse.redirect(
        new URL('/gmail?error=no_code', request.url)
      );
    }
    
    // Decode email from state parameter if provided
    let email: string | undefined;
    if (state) {
      try {
        email = Buffer.from(state, 'base64').toString('utf-8');
        logger.info(`[Gmail Callback] Processing callback for ${email}`);
      } catch (decodeError) {
        logger.warn('[Gmail Callback] Failed to decode state parameter:', decodeError);
      }
    }
    
    // Exchange authorization code for tokens
    const tokenData = await exchangeCodeForTokens(code, email || undefined);
    
    // Store tokens in database
    await storeGmailTokens(tokenData);
    
    logger.info(`[Gmail Callback] Successfully completed OAuth2 flow for ${tokenData.email}`);
    
    // Redirect back to Gmail page with success message
    return NextResponse.redirect(
      new URL(`/gmail?success=connected&email=${encodeURIComponent(tokenData.email)}`, request.url)
    );
    
  } catch (error) {
    logger.error('[Gmail Callback] Error processing OAuth2 callback:', error);
    
    return NextResponse.redirect(
      new URL('/gmail?error=callback_failed', request.url)
    );
  }
}
