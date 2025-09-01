import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { fetchGmailEmails } from '@/lib/gmailService';
import { getAuthorizedGmailAccounts } from '@/lib/gmailOAuth';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Verify user is authenticated
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const limit = parseInt(searchParams.get('limit') || '20');

    // If specific email is requested, fetch for that account only
    if (email) {
      logger.info(`[Gmail API] Fetching emails for specific account: ${email}`);
      
      const emails = await fetchGmailEmails(email, limit);
      
      return NextResponse.json({
        success: true,
        data: emails,
      });
    }

    // If no specific email, fetch from all authorized accounts
    logger.info('[Gmail API] Fetching emails from all authorized Gmail accounts');
    
    const accounts = await getAuthorizedGmailAccounts();
    const activeAccounts = accounts.filter(acc => acc.isActive);
    
    if (activeAccounts.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        message: 'No authorized Gmail accounts found. Please connect your Gmail account first.',
      });
    }

    // Fetch emails from all accounts in parallel
    const emailPromises = activeAccounts.map(async (account) => {
      try {
        logger.info(`[Gmail API] Fetching emails for ${account.email}`);
        return await fetchGmailEmails(account.email, Math.ceil(limit / activeAccounts.length));
      } catch (error) {
        logger.error(`[Gmail API] Error fetching emails for ${account.email}:`, error);
        return []; // Return empty array on error to not break the whole request
      }
    });

    const emailArrays = await Promise.all(emailPromises);
    const allEmails = emailArrays.flat();

    // Sort all emails by date (newest first) and limit
    allEmails.sort((a, b) => b.receivedTime - a.receivedTime);
    const limitedEmails = allEmails.slice(0, limit);

    logger.info(`[Gmail API] Successfully fetched ${limitedEmails.length} emails from ${activeAccounts.length} Gmail accounts`);

    return NextResponse.json({
      success: true,
      data: limitedEmails,
    });

  } catch (error) {
    logger.error('[Gmail API] Error fetching emails:', error);

    return NextResponse.json(
      {
        success: false,
        error: `Failed to fetch emails: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 }
    );
  }
}
