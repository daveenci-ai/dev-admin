import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getGmailAccountStats } from '@/lib/gmailService';
import { getAuthorizedGmailAccounts } from '@/lib/gmailOAuth';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

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

    logger.info('[Gmail Accounts API] Fetching Gmail account stats');
    
    // Get all authorized Gmail accounts
    const accounts = await getAuthorizedGmailAccounts();
    const activeAccounts = accounts.filter(acc => acc.isActive);
    
    if (activeAccounts.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        message: 'No authorized Gmail accounts found. Please connect your Gmail account first.',
      });
    }

    // Fetch stats for each account in parallel
    const statsPromises = activeAccounts.map(async (account) => {
      try {
        logger.info(`[Gmail Accounts API] Fetching stats for ${account.email}`);
        const stats = await getGmailAccountStats(account.email);
        
        // Return in format compatible with existing frontend
        return {
          accountId: `gmail-${account.email}`,
          accountName: stats.displayName || account.email.split('@')[0],
          emailAddress: account.email,
          accountDisplayName: stats.displayName || account.email.split('@')[0],
          mailboxName: stats.displayName || account.email.split('@')[0],
          mailboxEmail: account.email,
          totalEmails: stats.totalEmails,
          unreadEmails: stats.unreadEmails,
          isDefault: false, // Gmail accounts are not default
          lastSyncAt: account.lastSyncAt,
        };
      } catch (error) {
        logger.error(`[Gmail Accounts API] Error fetching stats for ${account.email}:`, error);
        
        // Return basic info even if stats fetch fails
        return {
          accountId: `gmail-${account.email}`,
          accountName: account.email.split('@')[0],
          emailAddress: account.email,
          accountDisplayName: account.email.split('@')[0],
          mailboxName: account.email.split('@')[0],
          mailboxEmail: account.email,
          totalEmails: 0,
          unreadEmails: 0,
          isDefault: false,
          lastSyncAt: account.lastSyncAt,
          error: 'Failed to fetch stats',
        };
      }
    });

    const accountStats = await Promise.all(statsPromises);

    logger.info(`[Gmail Accounts API] Successfully fetched stats for ${accountStats.length} Gmail accounts`);

    return NextResponse.json({
      success: true,
      data: accountStats,
    });

  } catch (error) {
    logger.error('[Gmail Accounts API] Error fetching Gmail account stats:', error);

    return NextResponse.json(
      {
        success: false,
        error: `Failed to fetch Gmail account stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 }
    );
  }
}
