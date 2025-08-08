import { NextResponse } from 'next/server';
import { getAllAccountsViaImap } from '@/lib/zoho/actions';

export const dynamic = 'force-dynamic';

export async function GET() {
  console.log('[API] /api/email/accounts - Starting request');
  
  try {
    console.log('[API] Fetching Zoho accounts via IMAP...');
    const accounts = await getAllAccountsViaImap();
    
    console.log('[API] Accounts fetched successfully:', accounts);
    
    return NextResponse.json({ 
      success: true, 
      ...accounts 
    });
  } catch (error: any) {
    console.error('[API] Error fetching Zoho accounts - Full error:', error);
    console.log('[API] Error name:', error.name);
    console.log('[API] Error message:', error.message);
    console.log('[API] Error stack:', error.stack);
    
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to fetch Zoho accounts'
    }, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
} 