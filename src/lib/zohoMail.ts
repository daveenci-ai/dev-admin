import axios from 'axios';

// Load secrets from env vars
const {
  ZOHO_CLIENT_ID,
  ZOHO_CLIENT_SECRET,
  ZOHO_REFRESH_TOKEN,
  ZOHO_ACCOUNT_ID,
  ZOHO_FOLDER_ID
} = process.env;

// We'll keep access_token in memory and refresh as needed
let accessToken: string | null = null;
let accessTokenExpiry = 0;

// Helper to refresh token when expired
async function getAccessToken(): Promise<string> {
  const now = Date.now();
  
  console.log('[Zoho] getAccessToken called');
  console.log('[Zoho] Current time:', new Date(now).toISOString());
  console.log('[Zoho] Token expiry:', new Date(accessTokenExpiry).toISOString());
  console.log('[Zoho] Has cached token:', !!accessToken);
  console.log('[Zoho] Token still valid:', accessToken && now < accessTokenExpiry);
  
  if (accessToken && now < accessTokenExpiry) {
    console.log('[Zoho] Using cached access token');
    return accessToken; // still valid
  }

  console.log('[Zoho] Environment variables check:');
  console.log('[Zoho] ZOHO_CLIENT_ID:', ZOHO_CLIENT_ID ? 'SET' : 'MISSING');
  console.log('[Zoho] ZOHO_CLIENT_SECRET:', ZOHO_CLIENT_SECRET ? 'SET' : 'MISSING');
  console.log('[Zoho] ZOHO_REFRESH_TOKEN:', ZOHO_REFRESH_TOKEN ? 'SET' : 'MISSING');
  console.log('[Zoho] ZOHO_ACCOUNT_ID:', ZOHO_ACCOUNT_ID ? 'SET' : 'MISSING');
  console.log('[Zoho] ZOHO_FOLDER_ID:', ZOHO_FOLDER_ID ? 'SET' : 'MISSING');

  if (!ZOHO_CLIENT_ID || !ZOHO_CLIENT_SECRET || !ZOHO_REFRESH_TOKEN) {
    console.error('[Zoho] Missing required credentials');
    throw new Error('Missing Zoho credentials in environment variables');
  }

  console.log('[Zoho] Refreshing access token...');
  const url = 'https://accounts.zoho.com/oauth/v2/token';
  const params = new URLSearchParams();
  params.append('refresh_token', ZOHO_REFRESH_TOKEN);
  params.append('client_id', ZOHO_CLIENT_ID);
  params.append('client_secret', ZOHO_CLIENT_SECRET);
  params.append('grant_type', 'refresh_token');

  console.log('[Zoho] Token refresh URL:', url);
  console.log('[Zoho] Refresh token (first 20 chars):', ZOHO_REFRESH_TOKEN.substring(0, 20) + '...');

  try {
    const response = await axios.post(url, params);
    console.log('[Zoho] Token refresh response status:', response.status);
    console.log('[Zoho] Token refresh response:', JSON.stringify(response.data, null, 2));
    
    accessToken = response.data.access_token;
    // tokens are valid for 1 hour
    accessTokenExpiry = now + (response.data.expires_in - 60) * 1000; // minus 60s safety margin
    
         console.log('[Zoho] New access token acquired (first 20 chars):', accessToken?.substring(0, 20) + '...');
    console.log('[Zoho] Token expires at:', new Date(accessTokenExpiry).toISOString());
    
    return accessToken as string;
  } catch (error) {
    console.error('[Zoho] Error refreshing token - Full error:', error);
    
    if (axios.isAxiosError(error)) {
      console.error('[Zoho] Token refresh status:', error.response?.status);
      console.error('[Zoho] Token refresh error data:', error.response?.data);
    }
    
    throw new Error('Failed to refresh Zoho access token');
  }
}

// Fetch inbox messages
export async function fetchInboxMessages(limit = 10) {
  if (!ZOHO_ACCOUNT_ID || !ZOHO_FOLDER_ID) {
    throw new Error('Missing Zoho account or folder ID in environment variables');
  }

  const token = await getAccessToken();
  const url = `https://mail.zoho.com/api/accounts/${ZOHO_ACCOUNT_ID}/messages/view?folderId=${ZOHO_FOLDER_ID}&limit=${limit}`;
  
  try {
    const { data } = await axios.get(url, {
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`
      }
    });
    return data;
  } catch (error) {
    console.error('[Zoho] Error fetching messages:', error);
    throw new Error('Failed to fetch Zoho messages');
  }
}

// Fetch a specific message details
export async function fetchMessageDetails(messageId: string) {
  if (!ZOHO_ACCOUNT_ID) {
    throw new Error('Missing Zoho account ID in environment variables');
  }

  const token = await getAccessToken();
  const url = `https://mail.zoho.com/api/accounts/${ZOHO_ACCOUNT_ID}/messages/${messageId}`;
  
  try {
    const { data } = await axios.get(url, {
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`
      }
    });
    return data;
  } catch (error) {
    console.error('[Zoho] Error fetching message details:', error);
    throw new Error('Failed to fetch message details');
  }
}

// Send an email
export async function sendEmail(emailData: {
  to: string;
  subject: string;
  content: string;
  cc?: string;
  bcc?: string;
}) {
  if (!ZOHO_ACCOUNT_ID) {
    throw new Error('Missing Zoho account ID in environment variables');
  }

  const token = await getAccessToken();
  const url = `https://mail.zoho.com/api/accounts/${ZOHO_ACCOUNT_ID}/messages`;
  
  const payload = {
    toAddress: emailData.to,
    subject: emailData.subject,
    content: emailData.content,
    ...(emailData.cc && { ccAddress: emailData.cc }),
    ...(emailData.bcc && { bccAddress: emailData.bcc })
  };

  try {
    const { data } = await axios.post(url, payload, {
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return data;
  } catch (error) {
    console.error('[Zoho] Error sending email:', error);
    throw new Error('Failed to send email');
  }
}

// Get all Zoho Mail accounts
export async function getAllAccounts() {
  console.log('[Zoho] Starting getAllAccounts...');
  
  const token = await getAccessToken();
  const url = 'https://mail.zoho.com/api/accounts';
  
  console.log('[Zoho] Making request to:', url);
  console.log('[Zoho] Using token (first 20 chars):', token.substring(0, 20) + '...');
  
  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`
      }
    });
    
    console.log('[Zoho] Response status:', response.status);
    console.log('[Zoho] Response headers:', response.headers);
    console.log('[Zoho] Raw response data:', JSON.stringify(response.data, null, 2));
    
    const accounts = response.data?.data || response.data;
    console.log('[Zoho] Processed accounts array:', JSON.stringify(accounts, null, 2));
    console.log('[Zoho] Number of accounts found:', Array.isArray(accounts) ? accounts.length : 'Not an array');
    
    return response.data;
  } catch (error) {
    console.error('[Zoho] Error fetching accounts - Full error:', error);
    
    if (axios.isAxiosError(error)) {
      console.error('[Zoho] Response status:', error.response?.status);
      console.error('[Zoho] Response data:', error.response?.data);
      console.error('[Zoho] Response headers:', error.response?.headers);
    }
    
    throw new Error('Failed to fetch Zoho accounts');
  }
}

// Get email statistics
export async function getEmailStats() {
  if (!ZOHO_ACCOUNT_ID) {
    throw new Error('Missing Zoho account ID in environment variables');
  }

  const token = await getAccessToken();
  const url = `https://mail.zoho.com/api/accounts/${ZOHO_ACCOUNT_ID}/folders`;
  
  try {
    const { data } = await axios.get(url, {
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`
      }
    });
    return data;
  } catch (error) {
    console.error('[Zoho] Error fetching email stats:', error);
    throw new Error('Failed to fetch email statistics');
  }
} 