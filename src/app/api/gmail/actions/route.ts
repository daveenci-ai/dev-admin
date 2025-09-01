import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  markGmailMessageAsRead,
  archiveGmailMessage,
  markGmailMessageAsSpam,
  deleteGmailMessage,
  getGmailMessageContent,
} from '@/lib/gmailService';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, email, messageId } = body;

    if (!action || !email || !messageId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: action, email, messageId' },
        { status: 400 }
      );
    }

    logger.info(`[Gmail Actions API] Performing action '${action}' on message ${messageId} for ${email}`);

    let result: any = { success: true };

    switch (action) {
      case 'markAsRead':
        await markGmailMessageAsRead(email, messageId);
        result.message = 'Message marked as read';
        break;

      case 'archive':
        await archiveGmailMessage(email, messageId);
        result.message = 'Message archived';
        break;

      case 'markAsSpam':
        await markGmailMessageAsSpam(email, messageId);
        result.message = 'Message marked as spam';
        break;

      case 'delete':
        await deleteGmailMessage(email, messageId);
        result.message = 'Message deleted';
        break;

      case 'getContent':
        const content = await getGmailMessageContent(email, messageId);
        result.content = content;
        result.message = 'Message content retrieved';
        break;

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    logger.info(`[Gmail Actions API] Successfully performed action '${action}' on message ${messageId}`);

    return NextResponse.json(result);

  } catch (error) {
    logger.error('[Gmail Actions API] Error performing action:', error);

    return NextResponse.json(
      {
        success: false,
        error: `Failed to perform action: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 }
    );
  }
}
