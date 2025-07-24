import axios from 'axios';

// Define mailbox configuration
interface MailboxConfig {
  name: string;
  email: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  accountId: string;
  folderId: string;
}

// Load all mailbox configurations from environment variables
const getMailboxConfigs = (): MailboxConfig[] => {
  const configs: MailboxConfig[] = [];
  
  // Anton's mailbox
  if (process.env.ZOHO_ANTON_CLIENT_ID && process.env.ZOHO_ANTON_CLIENT_SECRET && process.env.ZOHO_ANTON_REFRESH_TOKEN) {
    configs.push({
      name: 'Anton Osipov',
      email: 'anton.osipov@daveenci.ai',
      clientId: process.env.ZOHO_ANTON_CLIENT_ID,
      clientSecret: process.env.ZOHO_ANTON_CLIENT_SECRET,
      refreshToken: process.env.ZOHO_ANTON_REFRESH_TOKEN,
      accountId: process.env.ZOHO_ANTON_ACCOUNT_ID || '',
      folderId: '' // Will be discovered dynamically
    });
  }
  
  // Astrid's mailbox
  if (process.env.ZOHO_ASTRID_CLIENT_ID && process.env.ZOHO_ASTRID_CLIENT_SECRET && process.env.ZOHO_ASTRID_REFRESH_TOKEN) {
    configs.push({
      name: 'Astrid',
      email: 'astrid@daveenci.ai',
      clientId: process.env.ZOHO_ASTRID_CLIENT_ID,
      clientSecret: process.env.ZOHO_ASTRID_CLIENT_SECRET,
      refreshToken: process.env.ZOHO_ASTRID_REFRESH_TOKEN,
      accountId: process.env.ZOHO_ASTRID_ACCOUNT_ID || '',
      folderId: '' // Will be discovered dynamically
    });
  }
  
  // Hello mailbox
  if (process.env.ZOHO_HELLO_CLIENT_ID && process.env.ZOHO_HELLO_CLIENT_SECRET && process.env.ZOHO_HELLO_REFRESH_TOKEN) {
    configs.push({
      name: 'Hello',
      email: 'hello@daveenci.ai',
      clientId: process.env.ZOHO_HELLO_CLIENT_ID,
      clientSecret: process.env.ZOHO_HELLO_CLIENT_SECRET,
      refreshToken: process.env.ZOHO_HELLO_REFRESH_TOKEN,
      accountId: process.env.ZOHO_HELLO_ACCOUNT_ID || '',
      folderId: '' // Will be discovered dynamically
    });
  }
  
  // Support mailbox
  if (process.env.ZOHO_SUPPORT_CLIENT_ID && process.env.ZOHO_SUPPORT_CLIENT_SECRET && process.env.ZOHO_SUPPORT_REFRESH_TOKEN) {
    configs.push({
      name: 'Support',
      email: 'support@daveenci.ai',
      clientId: process.env.ZOHO_SUPPORT_CLIENT_ID,
      clientSecret: process.env.ZOHO_SUPPORT_CLIENT_SECRET,
      refreshToken: process.env.ZOHO_SUPPORT_REFRESH_TOKEN,
      accountId: process.env.ZOHO_SUPPORT_ACCOUNT_ID || '',
      folderId: '' // Will be discovered dynamically
    });
  }
  
  // Ops mailbox
  if (process.env.ZOHO_OPS_CLIENT_ID && process.env.ZOHO_OPS_CLIENT_SECRET && process.env.ZOHO_OPS_REFRESH_TOKEN) {
    configs.push({
      name: 'Operations',
      email: 'ops@daveenci.ai',
      clientId: process.env.ZOHO_OPS_CLIENT_ID,
      clientSecret: process.env.ZOHO_OPS_CLIENT_SECRET,
      refreshToken: process.env.ZOHO_OPS_REFRESH_TOKEN,
      accountId: process.env.ZOHO_OPS_ACCOUNT_ID || '',
      folderId: '' // Will be discovered dynamically
    });
  }
  
  return configs;
};

// Cache access tokens per mailbox
const accessTokenCache = new Map<string, { token: string; expiry: number }>();

// Legacy environment variables for backward compatibility
const {
  ZOHO_CLIENT_ID,
  ZOHO_CLIENT_SECRET,
  ZOHO_REFRESH_TOKEN,
  ZOHO_ACCOUNT_ID,
  ZOHO_FOLDER_ID
} = process.env;

// Helper to refresh token for a specific mailbox
async function getAccessToken(config: MailboxConfig): Promise<string> {
  const now = Date.now();
  const cacheKey = config.email;
  
  console.log(`[Zoho-${config.name}] getAccessToken called`);
  console.log(`[Zoho-${config.name}] Current time:`, new Date(now).toISOString());
  
  // Check cache
  const cached = accessTokenCache.get(cacheKey);
  if (cached && now < cached.expiry) {
    console.log(`[Zoho-${config.name}] Using cached access token`);
    return cached.token;
  }

  console.log(`[Zoho-${config.name}] Environment variables check:`);
  console.log(`[Zoho-${config.name}] CLIENT_ID:`, config.clientId ? 'SET' : 'MISSING');
  console.log(`[Zoho-${config.name}] CLIENT_SECRET:`, config.clientSecret ? 'SET' : 'MISSING');
  console.log(`[Zoho-${config.name}] REFRESH_TOKEN:`, config.refreshToken ? 'SET' : 'MISSING');
  console.log(`[Zoho-${config.name}] ACCOUNT_ID:`, config.accountId ? 'SET' : 'MISSING');
  console.log(`[Zoho-${config.name}] FOLDER_ID:`, config.folderId ? 'SET' : 'MISSING');

  if (!config.clientId || !config.clientSecret || !config.refreshToken) {
    console.error(`[Zoho-${config.name}] Missing required credentials`);
    throw new Error(`Missing Zoho credentials for ${config.email}`);
  }

  console.log(`[Zoho-${config.name}] Refreshing access token...`);
  const url = 'https://accounts.zoho.com/oauth/v2/token';
  const params = new URLSearchParams();
  params.append('refresh_token', config.refreshToken);
  params.append('client_id', config.clientId);
  params.append('client_secret', config.clientSecret);
  params.append('grant_type', 'refresh_token');

  console.log(`[Zoho-${config.name}] Token refresh URL:`, url);
  console.log(`[Zoho-${config.name}] Refresh token (first 20 chars):`, config.refreshToken.substring(0, 20) + '...');

  try {
    const response = await axios.post(url, params);
    console.log(`[Zoho-${config.name}] Token refresh response status:`, response.status);
    console.log(`[Zoho-${config.name}] Token refresh response:`, JSON.stringify(response.data, null, 2));
    
    const newToken = response.data.access_token;
    const expiry = now + (response.data.expires_in - 60) * 1000; // minus 60s safety margin
    
    // Cache the token
    accessTokenCache.set(cacheKey, { token: newToken, expiry });
    
    console.log(`[Zoho-${config.name}] New access token acquired (first 20 chars):`, newToken?.substring(0, 20) + '...');
    console.log(`[Zoho-${config.name}] Token expires at:`, new Date(expiry).toISOString());
    
    return newToken;
  } catch (error) {
    console.error(`[Zoho-${config.name}] Error refreshing token - Full error:`, error);
    
    if (axios.isAxiosError(error)) {
      console.error(`[Zoho-${config.name}] Token refresh status:`, error.response?.status);
      console.error(`[Zoho-${config.name}] Token refresh error data:`, error.response?.data);
    }
    
    throw new Error(`Failed to refresh Zoho access token for ${config.email}`);
  }
}

// Legacy function for backward compatibility
async function getLegacyAccessToken(): Promise<string> {
  if (!ZOHO_CLIENT_ID || !ZOHO_CLIENT_SECRET || !ZOHO_REFRESH_TOKEN) {
    throw new Error('Missing legacy Zoho credentials in environment variables');
  }

  const legacyConfig: MailboxConfig = {
    name: 'Legacy',
    email: 'legacy@daveenci.ai',
    clientId: ZOHO_CLIENT_ID,
    clientSecret: ZOHO_CLIENT_SECRET,
    refreshToken: ZOHO_REFRESH_TOKEN,
    accountId: ZOHO_ACCOUNT_ID || '',
    folderId: ZOHO_FOLDER_ID || ''
  };

  return getAccessToken(legacyConfig);
}

// Fetch inbox messages (legacy function - uses first available mailbox or legacy config)
export async function fetchInboxMessages(limit = 10) {
  const mailboxConfigs = getMailboxConfigs();
  
  if (mailboxConfigs.length > 0) {
    // Use first available mailbox
    const config = mailboxConfigs[0];
    console.log(`[Zoho] Using mailbox ${config.email} for fetchInboxMessages`);
    
    if (!config.accountId || !config.folderId) {
      throw new Error(`Missing account or folder ID for ${config.email}`);
    }

    const token = await getAccessToken(config);
    const url = `https://mail.zoho.com/api/accounts/${config.accountId}/messages/view?folderId=${config.folderId}&limit=${limit}`;
    
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
  } else {
    // Fall back to legacy credentials
    if (!ZOHO_ACCOUNT_ID || !ZOHO_FOLDER_ID) {
      throw new Error('Missing Zoho account or folder ID in environment variables');
    }

    const token = await getLegacyAccessToken();
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
}

// Fetch a specific message details
export async function fetchMessageDetails(messageId: string) {
  if (!ZOHO_ACCOUNT_ID) {
    throw new Error('Missing Zoho account ID in environment variables');
  }

  const token = await getLegacyAccessToken();
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

  const token = await getLegacyAccessToken();
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

// Move email to trash (multi-mailbox version) - Using Zoho's simple DELETE approach
export async function moveEmailToTrash(messageId: string, mailboxEmail?: string) {
  console.log(`[Zoho] Moving email ${messageId} to trash using DELETE method, mailbox: ${mailboxEmail}`);
  
  const mailboxConfigs = getMailboxConfigs();
  if (mailboxConfigs.length === 0) {
    throw new Error('No Zoho Mail configurations found');
  }

  // If specific mailbox provided, only try that one. Otherwise try all.
  if (mailboxEmail) {
    // Find the specific mailbox config
    const targetConfig = mailboxConfigs.find(c => c.email === mailboxEmail);
    if (!targetConfig) {
      throw new Error(`Mailbox configuration not found for ${mailboxEmail}`);
    }

    try {
      console.log(`[Zoho-${targetConfig.name}] Attempting to move email ${messageId} to trash using DELETE`);
      
      const token = await getAccessToken(targetConfig);
      
      // Use simple DELETE format from Zoho docs: DELETE /messages/{messageId} - "Moves from Inbox to Trash"
      const deleteUrl = `https://mail.zoho.com/api/accounts/${targetConfig.accountId}/messages/${messageId}`;
      
      console.log(`[Zoho-${targetConfig.name}] About to DELETE email ${messageId} from account ${targetConfig.accountId}`);
      console.log(`[Zoho-${targetConfig.name}] DELETE URL: ${deleteUrl}`);
      
      const { data } = await axios.delete(deleteUrl, {
        headers: {
          Authorization: `Zoho-oauthtoken ${token}`
        }
      });
      
      console.log(`[Zoho-${targetConfig.name}] Successfully moved email ${messageId} to trash using DELETE`);
      return data;
    } catch (error: any) {
      console.log(`[Zoho-${targetConfig.name}] Failed to move email ${messageId}: ${error.message}`);
      
      if (error.response?.status === 404) {
        throw new Error(`Email ${messageId} not found in ${targetConfig.name} - it may have already been deleted`);
      }
      
      console.log(`[Zoho-${targetConfig.name}] Error details:`, error.response?.data || error.message);
      throw new Error(`Failed to move email to trash in ${targetConfig.name}: ${error.message}`);
    }
  }

  // If no specific mailbox, try all (for legacy compatibility)
  for (const config of mailboxConfigs) {
    try {
      console.log(`[Zoho-${config.name}] Attempting to move email ${messageId} to trash using DELETE`);
      
      const token = await getAccessToken(config);
      // Use simple DELETE format from Zoho docs: DELETE /messages/{messageId} - "Moves from Inbox to Trash"
      const deleteUrl = `https://mail.zoho.com/api/accounts/${config.accountId}/messages/${messageId}`;
      
      console.log(`[Zoho-${config.name}] DELETE URL: ${deleteUrl}`);
      
      const { data } = await axios.delete(deleteUrl, {
        headers: {
          Authorization: `Zoho-oauthtoken ${token}`
        }
      });
      
      console.log(`[Zoho-${config.name}] Successfully moved email ${messageId} to trash using DELETE`);
      return data;
    } catch (error: any) {
      console.log(`[Zoho-${config.name}] Failed to move email ${messageId}: ${error.message}`);
      
      if (error.response?.status === 404) {
        console.log(`[Zoho-${config.name}] Email ${messageId} not found in this mailbox (404)`);
        continue; // Try next mailbox
      }
      
      console.log(`[Zoho-${config.name}] Error details:`, error.response?.data || error.message);
      // For non-404 errors when trying all mailboxes, continue to next
      continue;
    }
  }
  
  throw new Error('Failed to move email to trash - email not found in any configured mailbox');
}

// Get archive folder ID for a mailbox
async function getArchiveFolderId(config: MailboxConfig): Promise<string | null> {
  try {
    const token = await getAccessToken(config);
    const url = `https://mail.zoho.com/api/accounts/${config.accountId}/folders`;
    
    const response = await axios.get(url, {
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`
      }
    });
    
    const folders = response.data?.data || [];
    
    // Look for archive folder by different possible names
    const archiveFolder = folders.find((f: any) => 
      f.folderName?.toLowerCase() === 'archive' ||
      f.folderName?.toLowerCase() === 'archived' ||
      f.folderType === 'archive' ||
      f.isSystemFolder === true && f.folderName?.toLowerCase().includes('archive')
    );
    
    if (archiveFolder) {
      console.log(`[Zoho-${config.name}] Found archive folder:`, archiveFolder.folderName, 'ID:', archiveFolder.folderId);
      return archiveFolder.folderId;
    }
    
    console.log(`[Zoho-${config.name}] No archive folder found`);
    return null;
  } catch (error) {
    console.error(`[Zoho-${config.name}] Error getting archive folder:`, error);
    return null;
  }
}

// Archive an email (multi-mailbox version)
export async function archiveEmail(messageId: string, mailboxEmail?: string) {
  console.log(`[Zoho] Archiving email ${messageId}, mailbox: ${mailboxEmail}`);
  
  const mailboxConfigs = getMailboxConfigs();
  if (mailboxConfigs.length === 0) {
    throw new Error('No Zoho Mail configurations found');
  }

  // If specific mailbox provided, only try that one. Otherwise try all.
  if (mailboxEmail) {
    // Find the specific mailbox config
    const targetConfig = mailboxConfigs.find(c => c.email === mailboxEmail);
    if (!targetConfig) {
      throw new Error(`Mailbox configuration not found for ${mailboxEmail}`);
    }

    try {
      console.log(`[Zoho-${targetConfig.name}] Attempting to archive email ${messageId}`);
      
      const token = await getAccessToken(targetConfig);
      
      // Get the correct archive folder ID
      const archiveFolderId = await getArchiveFolderId(targetConfig);
      if (!archiveFolderId) {
        throw new Error(`No archive folder found in ${targetConfig.name}`);
      }
      
      // Move to archive folder using folder ID
      const moveUrl = `https://mail.zoho.com/api/accounts/${targetConfig.accountId}/messages/${messageId}/move`;
      
      const { data } = await axios.put(moveUrl, {
        destinationFolder: archiveFolderId
      }, {
        headers: {
          Authorization: `Zoho-oauthtoken ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`[Zoho-${targetConfig.name}] Successfully archived email ${messageId} to folder ${archiveFolderId}`);
      return data;
    } catch (error: any) {
      console.log(`[Zoho-${targetConfig.name}] Failed to archive email ${messageId}: ${error.message}`);
      
      if (error.response?.status === 404) {
        throw new Error(`Email ${messageId} not found in ${targetConfig.name} - it may have already been moved or deleted`);
      }
      
      console.log(`[Zoho-${targetConfig.name}] Error details:`, error.response?.data || error.message);
      throw new Error(`Failed to archive email in ${targetConfig.name}: ${error.message}`);
    }
  }

  // If no specific mailbox, try all (for legacy compatibility)
  for (const config of mailboxConfigs) {
    try {
      console.log(`[Zoho-${config.name}] Attempting to archive email ${messageId}`);
      
      const token = await getAccessToken(config);
      
      // Get the correct archive folder ID
      const archiveFolderId = await getArchiveFolderId(config);
      if (!archiveFolderId) {
        console.log(`[Zoho-${config.name}] No archive folder found, skipping this mailbox`);
        continue; // Try next mailbox
      }
      
      // Move to archive folder using folder ID
      const moveUrl = `https://mail.zoho.com/api/accounts/${config.accountId}/messages/${messageId}/move`;
      
      const { data } = await axios.put(moveUrl, {
        destinationFolder: archiveFolderId
      }, {
        headers: {
          Authorization: `Zoho-oauthtoken ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`[Zoho-${config.name}] Successfully archived email ${messageId} to folder ${archiveFolderId}`);
      return data;
    } catch (error: any) {
      console.log(`[Zoho-${config.name}] Failed to archive email ${messageId}: ${error.message}`);
      
      if (error.response?.status === 404) {
        console.log(`[Zoho-${config.name}] Email ${messageId} not found in this mailbox (404)`);
        continue; // Try next mailbox
      }
      
      console.log(`[Zoho-${config.name}] Error details:`, error.response?.data || error.message);
      // For non-404 errors when trying all mailboxes, continue to next
      continue;
    }
  }
  
  throw new Error('Failed to archive email - email not found in any configured mailbox');
}

// Get spam folder ID for a mailbox
async function getSpamFolderId(config: MailboxConfig): Promise<string | null> {
  try {
    const token = await getAccessToken(config);
    const url = `https://mail.zoho.com/api/accounts/${config.accountId}/folders`;
    
    const response = await axios.get(url, {
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`
      }
    });
    
    const folders = response.data?.data || [];
    
    // Look for spam folder by different possible names
    const spamFolder = folders.find((f: any) => 
      f.folderName?.toLowerCase() === 'spam' ||
      f.folderName?.toLowerCase() === 'junk' ||
      f.folderName?.toLowerCase() === 'junk mail' ||
      f.folderType === 'spam' ||
      f.isSystemFolder === true && f.folderName?.toLowerCase().includes('spam')
    );
    
    if (spamFolder) {
      console.log(`[Zoho-${config.name}] Found spam folder:`, spamFolder.folderName, 'ID:', spamFolder.folderId);
      return spamFolder.folderId;
    }
    
    console.log(`[Zoho-${config.name}] No spam folder found`);
    return null;
  } catch (error) {
    console.error(`[Zoho-${config.name}] Error getting spam folder:`, error);
    return null;
  }
}

// Mark email as spam (multi-mailbox version) - Using Zoho's POST /messages/move approach
export async function markEmailAsSpam(messageId: string, mailboxEmail?: string) {
  console.log(`[Zoho] Marking email ${messageId} as spam using POST /messages/move, mailbox: ${mailboxEmail}`);
  
  const mailboxConfigs = getMailboxConfigs();
  if (mailboxConfigs.length === 0) {
    throw new Error('No Zoho Mail configurations found');
  }

  // Try specified mailbox first, then try all others as fallback
  const configsToTry = mailboxEmail 
    ? [
        ...mailboxConfigs.filter(c => c.email === mailboxEmail), // Try specified first
        ...mailboxConfigs.filter(c => c.email !== mailboxEmail)  // Then try others as fallback
      ]
    : mailboxConfigs; // If no specific mailbox, try all

  for (const config of configsToTry) {
    try {
      console.log(`[Zoho-${config.name}] Attempting to mark email ${messageId} as spam using POST /messages/move`);
      
      const token = await getAccessToken(config);
      
      // Get the correct spam folder ID
      const spamFolderId = await getSpamFolderId(config);
      if (!spamFolderId) {
        console.log(`[Zoho-${config.name}] No spam folder found, skipping this mailbox`);
        if (mailboxEmail && config.email === mailboxEmail) {
          console.log(`[Zoho-${config.name}] No spam folder in specified mailbox, will try other mailboxes as fallback`);
        }
        continue; // Try next mailbox
      }
      
      // Use POST /messages/move with folderId as per Zoho docs
      const moveUrl = `https://mail.zoho.com/api/accounts/${config.accountId}/messages/move`;
      
      const { data } = await axios.post(moveUrl, {
        messageIds: [messageId],
        folderId: spamFolderId
      }, {
        headers: {
          Authorization: `Zoho-oauthtoken ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`[Zoho-${config.name}] Successfully marked email ${messageId} as spam using POST /messages/move`);
      return data;
    } catch (error: any) {
      console.log(`[Zoho-${config.name}] Failed to mark email ${messageId} as spam: ${error.message}`);
      
      // If 404, this email is not in this mailbox, try next one
      if (error.response?.status === 404) {
        console.log(`[Zoho-${config.name}] Email ${messageId} not found in this mailbox (404), trying next...`);
        continue; // Try next mailbox
      }
      
      console.log(`[Zoho-${config.name}] Error details:`, error.response?.data || error.message);
      
      // For non-404 errors, if this was the specified mailbox, log but continue trying others
      if (mailboxEmail && config.email === mailboxEmail) {
        console.log(`[Zoho-${config.name}] Non-404 error in specified mailbox, will try other mailboxes as fallback`);
        continue;
      }
    }
  }
  
  throw new Error('Failed to mark email as spam - email not found in any configured mailbox');
}

// Legacy delete function (for backward compatibility)
export async function deleteEmail(messageId: string) {
  // Use moveEmailToTrash as the default delete action
  return moveEmailToTrash(messageId);
}

// Get accounts from a specific mailbox
async function getAccountsForMailbox(config: MailboxConfig) {
  console.log(`[Zoho-${config.name}] Starting getAccountsForMailbox for ${config.email}...`);
  
  const token = await getAccessToken(config);
  const url = 'https://mail.zoho.com/api/accounts';
  
  console.log(`[Zoho-${config.name}] Making request to:`, url);
  console.log(`[Zoho-${config.name}] Using token (first 20 chars):`, token.substring(0, 20) + '...');
  
  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`
      }
    });
    
    console.log(`[Zoho-${config.name}] Response status:`, response.status);
    console.log(`[Zoho-${config.name}] Raw response data:`, JSON.stringify(response.data, null, 2));
    
    const accounts = response.data?.data || response.data;
    
    // Add mailbox info to each account
    if (Array.isArray(accounts)) {
      accounts.forEach((account: any) => {
        account.mailboxName = config.name;
        account.mailboxEmail = config.email;
      });
    }
    
    console.log(`[Zoho-${config.name}] Number of accounts found:`, Array.isArray(accounts) ? accounts.length : 'Not an array');
    
    return accounts;
  } catch (error) {
    console.error(`[Zoho-${config.name}] Error fetching accounts - Full error:`, error);
    
    if (axios.isAxiosError(error)) {
      console.error(`[Zoho-${config.name}] Response status:`, error.response?.status);
      console.error(`[Zoho-${config.name}] Response data:`, error.response?.data);
    }
    
    throw new Error(`Failed to fetch Zoho accounts for ${config.email}`);
  }
}

// Get all Zoho Mail accounts from all configured mailboxes
export async function getAllAccounts() {
  console.log('[Zoho] Starting getAllAccounts for all mailboxes...');
  
  const mailboxConfigs = getMailboxConfigs();
  console.log('[Zoho] Found mailbox configurations:', mailboxConfigs.length);
  
  if (mailboxConfigs.length === 0) {
    console.log('[Zoho] No mailbox configurations found, trying legacy credentials...');
    
    // Try legacy approach if no new configs
    if (ZOHO_CLIENT_ID && ZOHO_CLIENT_SECRET && ZOHO_REFRESH_TOKEN) {
      const legacyConfig: MailboxConfig = {
        name: 'Legacy Account',
        email: 'legacy@daveenci.ai',
        clientId: ZOHO_CLIENT_ID,
        clientSecret: ZOHO_CLIENT_SECRET,
        refreshToken: ZOHO_REFRESH_TOKEN,
        accountId: ZOHO_ACCOUNT_ID || '',
        folderId: ZOHO_FOLDER_ID || ''
      };
      
      const legacyAccounts = await getAccountsForMailbox(legacyConfig);
      return { data: legacyAccounts };
    } else {
      throw new Error('No Zoho Mail configurations found');
    }
  }
  
  const allAccounts: any[] = [];
  const errors: string[] = [];
  
  // Fetch accounts from each mailbox
  for (const config of mailboxConfigs) {
    try {
      console.log(`[Zoho] Fetching accounts for ${config.email}...`);
      const accounts = await getAccountsForMailbox(config);
      
      if (Array.isArray(accounts)) {
        allAccounts.push(...accounts);
      } else {
        allAccounts.push(accounts);
      }
    } catch (error) {
      const errorMsg = `Failed to fetch accounts for ${config.email}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('[Zoho]', errorMsg);
      errors.push(errorMsg);
    }
  }
  
  console.log('[Zoho] Total accounts found across all mailboxes:', allAccounts.length);
  console.log('[Zoho] Errors encountered:', errors.length);
  
  if (allAccounts.length === 0 && errors.length > 0) {
    throw new Error(`Failed to fetch accounts from any mailbox: ${errors.join('; ')}`);
  }
  
  return { 
    data: allAccounts,
    errors: errors.length > 0 ? errors : undefined
  };
}

// Get folder statistics for a specific mailbox
async function getFolderStatsForMailbox(config: MailboxConfig) {
  console.log(`[Zoho-${config.name}] Getting folder stats for ${config.email}...`);
  
  const token = await getAccessToken(config);
  const url = `https://mail.zoho.com/api/accounts/${config.accountId}/folders`;
  
  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`
      }
    });
    
    console.log(`[Zoho-${config.name}] Folder stats response:`, JSON.stringify(response.data, null, 2));
    
    const folders = response.data?.data || [];
    
    // Find inbox folder by name (could be "Inbox", "INBOX", etc.)
    const inboxFolder = folders.find((f: any) => 
      f.folderName?.toLowerCase() === 'inbox' || 
      f.folderName === 'Inbox' ||
      f.folderName === 'INBOX' ||
      f.isSystemFolder === true ||
      f.folderType === 'inbox'
    );
    
    console.log(`[Zoho-${config.name}] Found inbox folder:`, JSON.stringify(inboxFolder, null, 2));
    console.log(`[Zoho-${config.name}] All folders:`, folders.map((f: any) => ({ name: f.folderName, type: f.folderType, system: f.isSystemFolder, id: f.folderId, messageCount: f.messageCount, unreadCount: f.unreadCount })));
    
    // Update the config with the correct inbox folder ID for future use
    if (inboxFolder && inboxFolder.folderId) {
      config.folderId = inboxFolder.folderId;
      console.log(`[Zoho-${config.name}] Updated folder ID to: ${config.folderId}`);
    }
    
    return {
      totalEmails: inboxFolder?.messageCount || 0,
      unreadEmails: inboxFolder?.unreadCount || 0,
      folders,
      inboxFolderId: inboxFolder?.folderId
    };
  } catch (error) {
    console.error(`[Zoho-${config.name}] Error fetching folder stats:`, error);
    return { totalEmails: 0, unreadEmails: 0, folders: [], inboxFolderId: null };
  }
}

// Get all accounts with folder statistics
export async function getAllAccountsWithStats() {
  console.log('[Zoho] Starting getAllAccountsWithStats for all mailboxes...');
  
  const mailboxConfigs = getMailboxConfigs();
  console.log('[Zoho] Found mailbox configurations:', mailboxConfigs.length);
  
  if (mailboxConfigs.length === 0) {
    console.log('[Zoho] No mailbox configurations found, trying legacy credentials...');
    
    // Try legacy approach if no new configs
    if (ZOHO_CLIENT_ID && ZOHO_CLIENT_SECRET && ZOHO_REFRESH_TOKEN) {
      const legacyConfig: MailboxConfig = {
        name: 'Legacy Account',
        email: 'legacy@daveenci.ai',
        clientId: ZOHO_CLIENT_ID,
        clientSecret: ZOHO_CLIENT_SECRET,
        refreshToken: ZOHO_REFRESH_TOKEN,
        accountId: ZOHO_ACCOUNT_ID || '',
        folderId: ZOHO_FOLDER_ID || ''
      };
      
      const legacyAccounts = await getAccountsForMailbox(legacyConfig);
      const legacyStats = await getFolderStatsForMailbox(legacyConfig);
      
      // Add stats to legacy accounts
      if (Array.isArray(legacyAccounts)) {
        legacyAccounts.forEach((account: any) => {
          account.totalEmails = legacyStats.totalEmails;
          account.unreadEmails = legacyStats.unreadEmails;
        });
      }
      
      return { data: legacyAccounts };
    } else {
      throw new Error('No Zoho Mail configurations found');
    }
  }
  
  const allAccounts: any[] = [];
  const errors: string[] = [];
  
  // Fetch accounts and stats from each mailbox
  for (const config of mailboxConfigs) {
    try {
      console.log(`[Zoho] Fetching accounts and stats for ${config.email}...`);
      
      // Get accounts and folder stats in parallel
      const [accounts, folderStats] = await Promise.all([
        getAccountsForMailbox(config),
        getFolderStatsForMailbox(config)
      ]);
      
      // Add folder stats to accounts
      if (Array.isArray(accounts)) {
        accounts.forEach((account: any) => {
          account.totalEmails = folderStats.totalEmails;
          account.unreadEmails = folderStats.unreadEmails;
        });
        allAccounts.push(...accounts);
      } else if (accounts) {
        accounts.totalEmails = folderStats.totalEmails;
        accounts.unreadEmails = folderStats.unreadEmails;
        allAccounts.push(accounts);
      }
    } catch (error) {
      const errorMsg = `Failed to fetch accounts/stats for ${config.email}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('[Zoho]', errorMsg);
      errors.push(errorMsg);
    }
  }
  
  console.log('[Zoho] Total accounts found across all mailboxes:', allAccounts.length);
  console.log('[Zoho] Errors encountered:', errors.length);
  
  if (allAccounts.length === 0 && errors.length > 0) {
    throw new Error(`Failed to fetch accounts from any mailbox: ${errors.join('; ')}`);
  }
  
  return { 
    data: allAccounts,
    errors: errors.length > 0 ? errors : undefined
  };
}

// Get email statistics
export async function getEmailStats() {
  if (!ZOHO_ACCOUNT_ID) {
    throw new Error('Missing Zoho account ID in environment variables');
  }

  const token = await getLegacyAccessToken();
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

// Fetch emails from a specific mailbox
async function fetchEmailsForMailbox(config: MailboxConfig, limit = 10) {
  console.log(`[Zoho-${config.name}] Fetching emails for ${config.email}...`);
  
  // If no folder ID is set, get folder stats first to find the inbox
  if (!config.folderId) {
    console.log(`[Zoho-${config.name}] No folder ID set, getting folder stats first...`);
    const folderStats = await getFolderStatsForMailbox(config);
    if (!folderStats.inboxFolderId) {
      throw new Error(`Could not find inbox folder for ${config.email}`);
    }
    config.folderId = folderStats.inboxFolderId;
  }

  if (!config.accountId || !config.folderId) {
    throw new Error(`Missing account or folder ID for ${config.email}`);
  }

  const token = await getAccessToken(config);
  const url = `https://mail.zoho.com/api/accounts/${config.accountId}/messages/view?folderId=${config.folderId}&limit=${limit}`;
  
  console.log(`[Zoho-${config.name}] Fetching emails from URL: ${url}`);
  
  try {
    const { data } = await axios.get(url, {
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`
      }
    });
    
    console.log(`[Zoho-${config.name}] Raw email data:`, JSON.stringify(data, null, 2));
    
    // Add mailbox information and read status to each email
    if (data?.data && Array.isArray(data.data)) {
      data.data.forEach((email: any) => {
        email.mailboxName = config.name;
        email.mailboxEmail = config.email;
        
        // Determine read status from various possible fields
        email.isRead = email.isRead !== false && 
                      !email.flag?.includes('unread') && 
                      !email.flagInfo?.includes('unread') &&
                      email.readStatus !== false &&
                      email.status !== 'unread';
        
        // Extract flag information for debugging
        email.flagInfo = email.flag || email.flagInfo || '';
        
        console.log(`[Zoho-${config.name}] Email ${email.messageId}: isRead=${email.isRead}, flag=${email.flag}, flagInfo=${email.flagInfo}`);
      });
    }
    
    console.log(`[Zoho-${config.name}] Found ${data?.data?.length || 0} emails`);
    
    return data?.data || [];
  } catch (error) {
    console.error(`[Zoho-${config.name}] Error fetching emails:`, error);
    
    if (axios.isAxiosError(error)) {
      console.error(`[Zoho-${config.name}] Response status:`, error.response?.status);
      console.error(`[Zoho-${config.name}] Response data:`, error.response?.data);
    }
    
    return [];
  }
}

// Fetch emails from all configured mailboxes
export async function fetchAllInboxMessages(limit = 10) {
  console.log('[Zoho] Starting fetchAllInboxMessages for all mailboxes...');
  
  const mailboxConfigs = getMailboxConfigs();
  console.log('[Zoho] Found mailbox configurations:', mailboxConfigs.length);
  
  if (mailboxConfigs.length === 0) {
    console.log('[Zoho] No mailbox configurations found, trying legacy...');
    
    // Fall back to legacy single mailbox
    if (ZOHO_CLIENT_ID && ZOHO_CLIENT_SECRET && ZOHO_REFRESH_TOKEN && ZOHO_ACCOUNT_ID && ZOHO_FOLDER_ID) {
      const legacyConfig: MailboxConfig = {
        name: 'Legacy Account',
        email: 'legacy@daveenci.ai',
        clientId: ZOHO_CLIENT_ID,
        clientSecret: ZOHO_CLIENT_SECRET,
        refreshToken: ZOHO_REFRESH_TOKEN,
        accountId: ZOHO_ACCOUNT_ID,
        folderId: ZOHO_FOLDER_ID
      };
      
      const legacyEmails = await fetchEmailsForMailbox(legacyConfig, limit);
      return { data: legacyEmails };
    } else {
      throw new Error('No email configurations found');
    }
  }
  
  const allEmails: any[] = [];
  const errors: string[] = [];
  
  // Fetch emails from each mailbox
  for (const config of mailboxConfigs) {
    try {
      const emails = await fetchEmailsForMailbox(config, limit);
      allEmails.push(...emails);
    } catch (error) {
      const errorMsg = `Failed to fetch emails for ${config.email}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('[Zoho]', errorMsg);
      errors.push(errorMsg);
    }
  }
  
  // Sort all emails by date (newest first)
  allEmails.sort((a, b) => {
    const timeA = a.receivedTime || 0;
    const timeB = b.receivedTime || 0;
    return timeB - timeA;
  });
  
  console.log('[Zoho] Total emails found across all mailboxes:', allEmails.length);
  console.log('[Zoho] Errors encountered:', errors.length);
  
  return { 
    data: allEmails,
    errors: errors.length > 0 ? errors : undefined
  };
} 