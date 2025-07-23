import { NextRequest, NextResponse } from 'next/server';
import { getAllAccounts } from '@/lib/zohoMail';

export async function GET(request: NextRequest) {
  try {
    const accounts = await getAllAccounts();
    
    return NextResponse.json({
      success: true,
      data: accounts,
      count: accounts?.data?.length || 0
    });
  } catch (error) {
    console.error('Error fetching Zoho accounts:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch Zoho accounts' 
      },
      { status: 500 }
    );
  }
} 