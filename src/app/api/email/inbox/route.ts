import { NextRequest, NextResponse } from 'next/server';
import { fetchAllEmailsViaImap } from '@/lib/zohoMail';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  console.log('[API] /api/email/inbox - Starting request');
  
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '10');
    
    console.log(`[API] Fetching inbox messages via IMAP with limit: ${limit}`);
    
    const emails = await fetchAllEmailsViaImap(limit);
    
    console.log(`[API] Successfully fetched ${emails.data?.length || 0} emails via IMAP`);
    
    return NextResponse.json({ 
      success: true, 
      ...emails 
    });
  } catch (error: any) {
    console.error('[API] Error fetching inbox messages:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to fetch inbox messages'
    }, { status: 500 });
  }
} 