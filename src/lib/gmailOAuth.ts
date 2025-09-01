import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { ImapFlow } from 'imapflow';
import { prisma } from './db';
import logger from './logger';

// Gmail OAuth2 Configuration
export interface GmailOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

// Get OAuth2 configuration from environment variables
export function getGmailOAuthConfig(): GmailOAuthConfig {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/gmail/oauth/callback`;

  if (!clientId || !clientSecret) {
    throw new Error('Missing Gmail OAuth2 configuration. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.');
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
  };
}

// Create OAuth2 client
export function createOAuth2Client(): OAuth2Client {
  const config = getGmailOAuthConfig();
  
  return new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
    config.redirectUri
  );
}

// Generate OAuth2 authorization URL
export function getAuthorizationUrl(email?: string): string {
  const oauth2Client = createOAuth2Client();
  
  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.send',
    'https://mail.google.com/', // IMAP/SMTP access
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Required to get refresh token
    scope: scopes,
    prompt: 'consent', // Force consent screen to get refresh token
    state: email ? Buffer.from(email).toString('base64') : undefined, // Pass email as state parameter
  });

  return authUrl;
}

// Exchange authorization code for tokens
export async function exchangeCodeForTokens(code: string, email?: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiryDate: number;
  email: string;
}> {
  const oauth2Client = createOAuth2Client();
  
  try {
    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Failed to obtain access token or refresh token');
    }

    // Get user info to extract email if not provided
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    
    const userEmail = email || userInfo.data.email;
    if (!userEmail) {
      throw new Error('Could not determine user email address');
    }

    logger.info(`[Gmail OAuth] Successfully exchanged code for tokens for ${userEmail}`);
    
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date || Date.now() + 3600 * 1000, // Default 1 hour if not provided
      email: userEmail,
    };
  } catch (error) {
    logger.error('[Gmail OAuth] Error exchanging code for tokens:', error);
    throw new Error(`Failed to exchange authorization code: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Store OAuth2 tokens in database
export async function storeGmailTokens(tokenData: {
  email: string;
  accessToken: string;
  refreshToken: string;
  expiryDate: number;
}): Promise<void> {
  try {
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.send',
      'https://mail.google.com/',
    ];

    await prisma.gmailAccount.upsert({
      where: { email: tokenData.email },
      update: {
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        tokenExpiry: new Date(tokenData.expiryDate),
        scopes: scopes,
        isActive: true,
        lastSyncAt: new Date(),
        updatedAt: new Date(),
      },
      create: {
        email: tokenData.email,
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        tokenExpiry: new Date(tokenData.expiryDate),
        scopes: scopes,
        isActive: true,
        lastSyncAt: new Date(),
      },
    });

    logger.info(`[Gmail OAuth] Stored tokens for ${tokenData.email} in database`);
  } catch (error) {
    logger.error('[Gmail OAuth] Error storing tokens in database:', error);
    throw error;
  }
}

// Get valid access token (refresh if necessary)
export async function getValidAccessToken(email: string): Promise<string> {
  try {
    const account = await prisma.gmailAccount.findUnique({
      where: { email, isActive: true },
    });

    if (!account) {
      throw new Error(`No active Gmail account found for ${email}. Please complete OAuth2 setup.`);
    }

    const now = new Date();
    const tokenExpiry = account.tokenExpiry;

    // If token is still valid (with 5-minute buffer), use it
    if (tokenExpiry && tokenExpiry.getTime() > now.getTime() + 5 * 60 * 1000) {
      logger.debug(`[Gmail OAuth] Using existing access token for ${email}`);
      return account.accessToken!;
    }

    // Token is expired or about to expire, refresh it
    logger.info(`[Gmail OAuth] Refreshing access token for ${email}`);
    
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({
      refresh_token: account.refreshToken,
    });

    const { credentials } = await oauth2Client.refreshAccessToken();
    
    if (!credentials.access_token) {
      throw new Error('Failed to refresh access token');
    }

    // Update database with new token
    const newExpiryDate = new Date(credentials.expiry_date || Date.now() + 3600 * 1000);
    
    await prisma.gmailAccount.update({
      where: { email },
      data: {
        accessToken: credentials.access_token,
        tokenExpiry: newExpiryDate,
        updatedAt: new Date(),
      },
    });

    logger.info(`[Gmail OAuth] Successfully refreshed access token for ${email}`);
    return credentials.access_token;

  } catch (error) {
    logger.error(`[Gmail OAuth] Error getting valid access token for ${email}:`, error);
    throw new Error(`Failed to get valid access token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Create Gmail IMAP connection using OAuth2
export async function createGmailImapConnection(email: string): Promise<ImapFlow> {
  try {
    const accessToken = await getValidAccessToken(email);
    
    logger.debug(`[Gmail IMAP] Creating IMAP connection for ${email}`);
    
    const client = new ImapFlow({
      host: 'imap.gmail.com',
      port: 993,
      secure: true,
      auth: {
        user: email,
        accessToken: accessToken,
      },
      logger: false, // Set to true for debugging
    });

    await client.connect();
    logger.info(`[Gmail IMAP] Successfully connected to Gmail IMAP for ${email}`);
    
    return client;
    
  } catch (error) {
    logger.error(`[Gmail IMAP] Failed to create IMAP connection for ${email}:`, error);
    throw new Error(`Gmail IMAP connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Get list of authorized Gmail accounts
export async function getAuthorizedGmailAccounts(): Promise<Array<{
  email: string;
  displayName?: string;
  isActive: boolean;
  lastSyncAt?: Date;
}>> {
  try {
    const accounts = await prisma.gmailAccount.findMany({
      select: {
        email: true,
        displayName: true,
        isActive: true,
        lastSyncAt: true,
      },
      orderBy: {
        email: 'asc',
      },
    });

    return accounts;
  } catch (error) {
    logger.error('[Gmail OAuth] Error fetching authorized accounts:', error);
    return [];
  }
}

// Check if email has valid OAuth2 setup
export async function isGmailAccountAuthorized(email: string): Promise<boolean> {
  try {
    const account = await prisma.gmailAccount.findUnique({
      where: { email, isActive: true },
    });

    return !!account && !!account.refreshToken;
  } catch (error) {
    logger.error(`[Gmail OAuth] Error checking authorization for ${email}:`, error);
    return false;
  }
}

// Revoke OAuth2 access for an account
export async function revokeGmailAccess(email: string): Promise<void> {
  try {
    const account = await prisma.gmailAccount.findUnique({
      where: { email },
    });

    if (!account) {
      logger.warn(`[Gmail OAuth] No account found to revoke: ${email}`);
      return;
    }

    // Revoke the refresh token with Google
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({
      refresh_token: account.refreshToken,
    });

    try {
      await oauth2Client.revokeCredentials();
      logger.info(`[Gmail OAuth] Successfully revoked Google credentials for ${email}`);
    } catch (revokeError) {
      logger.warn(`[Gmail OAuth] Failed to revoke Google credentials for ${email}:`, revokeError);
      // Continue with database cleanup even if Google revocation fails
    }

    // Remove from database
    await prisma.gmailAccount.delete({
      where: { email },
    });

    logger.info(`[Gmail OAuth] Successfully removed Gmail account ${email} from database`);
    
  } catch (error) {
    logger.error(`[Gmail OAuth] Error revoking access for ${email}:`, error);
    throw error;
  }
}
