import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizedGmailAccounts, revokeGmailAccess } from '@/lib/gmailOAuth';
import { getSession } from 'next-auth/react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
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

    // Get all authorized Gmail accounts
    const accounts = await getAuthorizedGmailAccounts();
    
    logger.info(`[Gmail Accounts] Retrieved ${accounts.length} authorized Gmail accounts`);
    
    return NextResponse.json({
      success: true,
      data: accounts,
    });
    
  } catch (error) {
    logger.error('[Gmail Accounts] Error fetching authorized accounts:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: `Failed to fetch Gmail accounts: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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
    
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email parameter is required' },
        { status: 400 }
      );
    }
    
    // Revoke access for the specified Gmail account
    await revokeGmailAccess(email);
    
    logger.info(`[Gmail Accounts] Successfully revoked access for ${email}`);
    
    return NextResponse.json({
      success: true,
      message: `Successfully removed Gmail account ${email}`,
    });
    
  } catch (error) {
    logger.error('[Gmail Accounts] Error revoking Gmail access:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: `Failed to revoke Gmail access: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 }
    );
  }
}
