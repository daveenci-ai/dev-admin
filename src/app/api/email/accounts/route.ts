import { NextRequest, NextResponse } from 'next/server';
import { getAllAccountsWithStats } from '@/lib/zohoMail';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  console.log('[API] /api/email/accounts - Starting request');
  console.log('[API] Request URL:', request.url);
  console.log('[API] Request method:', request.method);
  
  try {
    console.log('[API] Calling getAllAccountsWithStats...');
    const accounts = await getAllAccountsWithStats();
    
    console.log('[API] getAllAccounts returned:', JSON.stringify(accounts, null, 2));
    console.log('[API] accounts.data type:', typeof accounts?.data);
    console.log('[API] accounts.data is array:', Array.isArray(accounts?.data));
    console.log('[API] accounts.data length:', accounts?.data?.length);
    
    const responseData = {
      success: true,
      data: accounts,
      count: accounts?.data?.length || 0
    };
    
    console.log('[API] Sending response:', JSON.stringify(responseData, null, 2));
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('[API] Error fetching Zoho accounts - Full error:', error);
    console.error('[API] Error name:', error instanceof Error ? error.name : 'Unknown');
    console.error('[API] Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('[API] Error stack:', error instanceof Error ? error.stack : 'No stack');
    
    const errorResponse = { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch Zoho accounts' 
    };
    
    console.log('[API] Sending error response:', JSON.stringify(errorResponse, null, 2));
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
} 