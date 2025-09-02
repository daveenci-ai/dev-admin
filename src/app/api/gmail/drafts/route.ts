import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createGmailDraft, getGmailDrafts, sendGmailDraft, deleteGmailDraft } from '@/lib/gmailService';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET /api/gmail/drafts - Get all drafts for a Gmail account
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!email) {
      return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 });
    }

    logger.info(`[Gmail Drafts API] Fetching drafts for ${email}`);
    
    const drafts = await getGmailDrafts(email, limit);
    
    return NextResponse.json({
      success: true,
      data: drafts
    });

  } catch (error) {
    logger.error('[Gmail Drafts API] Error fetching drafts:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch drafts'
    }, { status: 500 });
  }
}

// POST /api/gmail/drafts - Create a new draft
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { email, to, subject, body: emailBody, cc, bcc } = body;

    if (!email || !to || !subject || !emailBody) {
      return NextResponse.json({ 
        error: 'Email, to, subject, and body are required' 
      }, { status: 400 });
    }

    logger.info(`[Gmail Drafts API] Creating draft for ${email}`);
    
    const draft = await createGmailDraft(email, to, subject, emailBody, cc, bcc);
    
    return NextResponse.json({
      success: true,
      data: draft
    });

  } catch (error) {
    logger.error('[Gmail Drafts API] Error creating draft:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create draft'
    }, { status: 500 });
  }
}

// PUT /api/gmail/drafts - Send a draft
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { email, draftId } = body;

    if (!email || !draftId) {
      return NextResponse.json({ 
        error: 'Email and draftId are required' 
      }, { status: 400 });
    }

    logger.info(`[Gmail Drafts API] Sending draft ${draftId} for ${email}`);
    
    const result = await sendGmailDraft(email, draftId);
    
    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('[Gmail Drafts API] Error sending draft:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send draft'
    }, { status: 500 });
  }
}

// DELETE /api/gmail/drafts - Delete a draft
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { email, draftId } = body;

    if (!email || !draftId) {
      return NextResponse.json({ 
        error: 'Email and draftId are required' 
      }, { status: 400 });
    }

    logger.info(`[Gmail Drafts API] Deleting draft ${draftId} for ${email}`);
    
    await deleteGmailDraft(email, draftId);
    
    return NextResponse.json({
      success: true,
      message: 'Draft deleted successfully'
    });

  } catch (error) {
    logger.error('[Gmail Drafts API] Error deleting draft:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete draft'
    }, { status: 500 });
  }
}
