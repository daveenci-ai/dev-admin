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
  if (accessToken && now < accessTokenExpiry) {
    return accessToken; // still valid
  }

  if (!ZOHO_CLIENT_ID || !ZOHO_CLIENT_SECRET || !ZOHO_REFRESH_TOKEN) {
    throw new Error('Missing Zoho credentials in environment variables');
  }

  console.log('[Zoho] Refreshing access token...');
  const url = 'https://accounts.zoho.com/oauth/v2/token';
  const params = new URLSearchParams();
  params.append('refresh_token', ZOHO_REFRESH_TOKEN);
  params.append('client_id', ZOHO_CLIENT_ID);
  params.append('client_secret', ZOHO_CLIENT_SECRET);
  params.append('grant_type', 'refresh_token');

  try {
    const { data } = await axios.post(url, params);
    accessToken = data.access_token;
    // tokens are valid for 1 hour
    accessTokenExpiry = now + (data.expires_in - 60) * 1000; // minus 60s safety margin
    console.log('[Zoho] New access token acquired.');
    return accessToken as string;
  } catch (error) {
    console.error('[Zoho] Error refreshing token:', error);
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