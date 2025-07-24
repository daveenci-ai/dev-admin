import { NextResponse } from 'next/server';
import { getAllAccountsViaImap } from '@/lib/zohoMail';

export const dynamic = 'force-dynamic';

export async function GET() {
  console.log('[API] /api/email/stats - Starting request');
  
  try {
    console.log('[API] Fetching email statistics via IMAP...');
    
    const accounts = await getAllAccountsViaImap();
    
    // Calculate total stats from all accounts
    const totalStats = accounts.data?.reduce((acc, account) => {
      if (!account) return acc; // Handle potential null accounts
      return {
        totalEmails: acc.totalEmails + (account.totalEmails || 0),
        unreadEmails: acc.unreadEmails + (account.unreadEmails || 0)
      };
    }, { totalEmails: 0, unreadEmails: 0 }) || { totalEmails: 0, unreadEmails: 0 };
    
    console.log('[API] Email statistics calculated:', totalStats);
    
    return NextResponse.json({ 
      success: true, 
      data: {
        ...totalStats,
        accounts: accounts.data
      }
    });
  } catch (error: any) {
    console.error('[API] Error fetching email statistics:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to fetch email statistics'
    }, { status: 500 });
  }
} 