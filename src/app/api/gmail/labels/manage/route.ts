import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { addGmailLabels, removeGmailLabels } from '@/lib/gmailService';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

// POST /api/gmail/labels/manage - Add or remove labels from a message
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { email, messageId, action, labelIds } = body;

    if (!email || !messageId || !action || !labelIds || !Array.isArray(labelIds)) {
      return NextResponse.json({ 
        error: 'Email, messageId, action (add/remove), and labelIds array are required' 
      }, { status: 400 });
    }

    logger.info(`[Gmail Labels Manage API] ${action}ing labels for message ${messageId} in ${email}`);
    
    if (action === 'add') {
      await addGmailLabels(email, messageId, labelIds);
    } else if (action === 'remove') {
      await removeGmailLabels(email, messageId, labelIds);
    } else {
      return NextResponse.json({ error: 'Action must be "add" or "remove"' }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      message: `Labels ${action}ed successfully`
    });

  } catch (error) {
    logger.error('[Gmail Labels Manage API] Error managing labels:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to manage labels'
    }, { status: 500 });
  }
}
