import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getGmailLabels, createGmailLabel } from '@/lib/gmailService';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET /api/gmail/labels - Get all labels for connected Gmail accounts
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 });
    }

    logger.info(`[Gmail Labels API] Fetching labels for ${email}`);
    
    const labels = await getGmailLabels(email);
    
    return NextResponse.json({
      success: true,
      data: labels
    });

  } catch (error) {
    logger.error('[Gmail Labels API] Error fetching labels:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch labels'
    }, { status: 500 });
  }
}

// POST /api/gmail/labels - Create a new label
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { email, labelName } = body;

    if (!email || !labelName) {
      return NextResponse.json({ error: 'Email and labelName are required' }, { status: 400 });
    }

    logger.info(`[Gmail Labels API] Creating label "${labelName}" for ${email}`);
    
    const newLabel = await createGmailLabel(email, labelName);
    
    return NextResponse.json({
      success: true,
      data: newLabel
    });

  } catch (error) {
    logger.error('[Gmail Labels API] Error creating label:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create label'
    }, { status: 500 });
  }
}
