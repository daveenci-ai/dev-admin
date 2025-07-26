import { ImapFlow } from 'imapflow';

// IMAP Configuration for each mailbox
interface ImapConfig {
  name: string;
  email: string;
  user: string;
  password: string;
}

// Get IMAP configurations for all mailboxes
const getImapConfigs = (): ImapConfig[] => {
  console.log('[ENV-DEBUG] Starting getImapConfigs...');
  console.log('[ENV-DEBUG] Environment check:');
  
  const configs: ImapConfig[] = [];
  const missingPasswords: string[] = [];
  
  // Check each environment variable and provide specific feedback
  const passwordChecks = [
    { env: 'ZOHO_PASSWORD_ANTON', email: 'anton.osipov@daveenci.ai', name: 'Anton Osipov' },
    { env: 'ZOHO_PASSWORD_ASTRID', email: 'astrid@daveenci.ai', name: 'Astrid' },
    { env: 'ZOHO_PASSWORD_OPS', email: 'ops@daveenci.ai', name: 'Ops' },
    { env: 'ZOHO_PASSWORD_HELLO', email: 'hello@daveenci.ai', name: 'Hello' }
  ];
  
  passwordChecks.forEach(check => {
    const password = process.env[check.env];
    console.log(`[ENV-DEBUG] ${check.env} exists:`, !!password);
    
    if (password) {
      console.log(`[ENV-DEBUG] Adding ${check.name} config`);
      configs.push({
        name: check.name,
        email: check.email,
        user: check.email,
        password: password
      });
    } else {
      console.log(`[ENV-DEBUG] ${check.env} not found`);
      missingPasswords.push(`${check.env} (for ${check.email})`);
    }
  });
  
  console.log('[ENV-DEBUG] Total configs created:', configs.length);
  console.log('[ENV-DEBUG] Config names:', configs.map(c => c.name));
  
  if (configs.length === 0) {
    const errorMessage = `No IMAP configurations found. Missing environment variables: ${missingPasswords.join(', ')}. Please set these in your Render dashboard with the corresponding Zoho app passwords.`;
    console.error('[ENV-DEBUG] Error:', errorMessage);
    throw new Error(errorMessage);
  }
  
  if (missingPasswords.length > 0) {
    console.warn(`[ENV-DEBUG] Warning: Some mailboxes are missing passwords: ${missingPasswords.join(', ')}`);
  }
  
  return configs;
};

// IMAP helper function to create connection
async function createImapConnection(config: ImapConfig): Promise<ImapFlow> {
  // Check if password exists
  if (!config.password) {
    throw new Error(`Missing IMAP password for ${config.email}. Please set the corresponding ZOHO_PASSWORD_* environment variable.`);
  }

  const client = new ImapFlow({
    host: 'imap.zoho.com',
    port: 993,
    secure: true,
    auth: {
      user: config.user,
      pass: config.password
    },
    logger: false // Set to true for debugging
  });
  
  console.log(`[IMAP-${config.name}] Connecting to Zoho IMAP...`);
  
  try {
    await client.connect();
    console.log(`[IMAP-${config.name}] Connected successfully`);
    return client;
  } catch (error: any) {
    console.error(`[IMAP-${config.name}] Connection failed:`, error.message);
    
    // Detect specific error types
    if (error.message?.includes('Invalid credentials') || 
        error.message?.includes('Authentication failed') ||
        error.message?.includes('Login failed') ||
        error.code === 'AUTHENTICATIONFAILED') {
      throw new Error(`Authentication failed for ${config.email}. Please check that the IMAP password (app password) is correct in environment variables.`);
    }
    
    if (error.message?.includes('Connection timeout') || 
        error.message?.includes('ECONNREFUSED') ||
        error.message?.includes('ENOTFOUND')) {
      throw new Error(`Cannot connect to Zoho IMAP server for ${config.email}. Please check your internet connection.`);
    }
    
    // Generic connection error
    throw new Error(`Failed to connect to IMAP for ${config.email}: ${error.message}`);
  }
}

// IMAP function to delete email (move to Trash)
export async function deleteEmailViaImap(messageId: string, mailboxEmail?: string): Promise<boolean> {
  console.log(`[IMAP] Deleting email ${messageId}, mailbox: ${mailboxEmail}`);
  
  const imapConfigs = getImapConfigs();
  if (imapConfigs.length === 0) {
    throw new Error('No IMAP configurations found');
  }

  // Try specified mailbox first, then others as fallback
  const configsToTry = mailboxEmail 
    ? imapConfigs.filter(c => c.email === mailboxEmail).concat(imapConfigs.filter(c => c.email !== mailboxEmail))
    : imapConfigs;

  for (const config of configsToTry) {
    let client: ImapFlow | null = null;
    
    try {
      client = await createImapConnection(config);
      
      // Select INBOX
      await client.mailboxOpen('INBOX');
      console.log(`[IMAP-${config.name}] Opened INBOX, searching for message ${messageId}`);
      
      // The messageId is actually the UID, so we can directly use it
      const uid = parseInt(messageId);
      if (isNaN(uid)) {
        console.log(`[IMAP-${config.name}] Invalid UID: ${messageId}`);
        continue; // Try next mailbox
      }
      
      console.log(`[IMAP-${config.name}] Moving message UID ${uid} to Trash`);
      
      // Move to Trash folder using UID
      await client.messageMove([uid], 'Trash', { uid: true });
      console.log(`[IMAP-${config.name}] Successfully moved email ${messageId} to Trash`);
      
      return true;
      
    } catch (error: any) {
      console.log(`[IMAP-${config.name}] Error: ${error.message}`);
      if (mailboxEmail && config.email === mailboxEmail) {
        throw new Error(`Failed to delete email in ${config.name}: ${error.message}`);
      }
      continue; // Try next mailbox
    } finally {
      if (client) {
        try {
          await client.logout();
        } catch (e) {
          console.log(`[IMAP-${config.name}] Error closing connection:`, e);
        }
      }
    }
  }
  
  throw new Error('Failed to delete email - not found in any configured mailbox');
}

// IMAP function to archive email
export async function archiveEmailViaImap(messageId: string, mailboxEmail?: string): Promise<boolean> {
  console.log(`[IMAP] Archiving email ${messageId}, mailbox: ${mailboxEmail}`);
  
  const imapConfigs = getImapConfigs();
  if (imapConfigs.length === 0) {
    throw new Error('No IMAP configurations found');
  }

  const configsToTry = mailboxEmail 
    ? imapConfigs.filter(c => c.email === mailboxEmail).concat(imapConfigs.filter(c => c.email !== mailboxEmail))
    : imapConfigs;

  for (const config of configsToTry) {
    let client: ImapFlow | null = null;
    
    try {
      client = await createImapConnection(config);
      
      await client.mailboxOpen('INBOX');
      console.log(`[IMAP-${config.name}] Opened INBOX, archiving message ${messageId}`);
      
      // The messageId is actually the UID, so we can directly use it
      const uid = parseInt(messageId);
      if (isNaN(uid)) {
        console.log(`[IMAP-${config.name}] Invalid UID: ${messageId}`);
        continue; // Try next mailbox
      }
      
      console.log(`[IMAP-${config.name}] Moving message UID ${uid} to Archive`);
      
      // Move to Archive folder (try different possible names)
      const archiveFolders = ['Archive', 'Archived', 'Archives'];
      let moved = false;
      
      for (const folder of archiveFolders) {
        try {
          await client.messageMove([uid], folder, { uid: true });
          console.log(`[IMAP-${config.name}] Successfully moved email ${messageId} to ${folder}`);
          moved = true;
          break;
        } catch (e) {
          console.log(`[IMAP-${config.name}] Folder ${folder} not found, trying next...`);
        }
      }
      
      if (!moved) {
        throw new Error('No archive folder found');
      }
      
      return true;
      
    } catch (error: any) {
      console.log(`[IMAP-${config.name}] Error: ${error.message}`);
      if (mailboxEmail && config.email === mailboxEmail) {
        throw new Error(`Failed to archive email in ${config.name}: ${error.message}`);
      }
      continue;
    } finally {
      if (client) {
        try {
          await client.logout();
        } catch (e) {
          console.log(`[IMAP-${config.name}] Error closing connection:`, e);
        }
      }
    }
  }
  
  throw new Error('Failed to archive email - not found in any configured mailbox');
}

// IMAP function to mark email as spam
export async function markEmailAsSpamViaImap(messageId: string, mailboxEmail?: string): Promise<boolean> {
  console.log(`[IMAP] Marking email ${messageId} as spam, mailbox: ${mailboxEmail}`);
  
  const imapConfigs = getImapConfigs();
  if (imapConfigs.length === 0) {
    throw new Error('No IMAP configurations found');
  }

  const configsToTry = mailboxEmail 
    ? imapConfigs.filter(c => c.email === mailboxEmail).concat(imapConfigs.filter(c => c.email !== mailboxEmail))
    : imapConfigs;

  for (const config of configsToTry) {
    let client: ImapFlow | null = null;
    
    try {
      client = await createImapConnection(config);
      
      await client.mailboxOpen('INBOX');
      console.log(`[IMAP-${config.name}] Opened INBOX, marking message ${messageId} as spam`);
      
      // The messageId is actually the UID, so we can directly use it
      const uid = parseInt(messageId);
      if (isNaN(uid)) {
        console.log(`[IMAP-${config.name}] Invalid UID: ${messageId}`);
        continue; // Try next mailbox
      }
      
      console.log(`[IMAP-${config.name}] Moving message UID ${uid} to Spam`);
      
      // Move to Spam folder (try different possible names)
      const spamFolders = ['Spam', 'Junk', 'Junk Email'];
      let moved = false;
      
      for (const folder of spamFolders) {
        try {
          await client.messageMove([uid], folder, { uid: true });
          console.log(`[IMAP-${config.name}] Successfully moved email ${messageId} to ${folder}`);
          moved = true;
          break;
        } catch (e) {
          console.log(`[IMAP-${config.name}] Folder ${folder} not found, trying next...`);
        }
      }
      
      if (!moved) {
        throw new Error('No spam folder found');
      }
      
      return true;
      
    } catch (error: any) {
      console.log(`[IMAP-${config.name}] Error: ${error.message}`);
      if (mailboxEmail && config.email === mailboxEmail) {
        throw new Error(`Failed to mark email as spam in ${config.name}: ${error.message}`);
      }
      continue;
    } finally {
      if (client) {
        try {
          await client.logout();
        } catch (e) {
          console.log(`[IMAP-${config.name}] Error closing connection:`, e);
        }
      }
    }
  }
  
  throw new Error('Failed to mark email as spam - not found in any configured mailbox');
}

// IMAP function to fetch emails from INBOX
async function fetchEmailsViaImap(config: ImapConfig, limit = 10): Promise<any[]> {
  console.log(`[IMAP-${config.name}] Fetching ${limit} emails via IMAP...`);
  
  let client: ImapFlow | null = null;
  
  try {
    client = await createImapConnection(config);
    
    // Open INBOX
    const mailbox = await client.mailboxOpen('INBOX');
    console.log(`[IMAP-${config.name}] INBOX opened, ${mailbox.exists} messages total`);
    
    if (mailbox.exists === 0) {
      console.log(`[IMAP-${config.name}] No messages in INBOX`);
      return [];
    }
    
    // Get the most recent messages
    const searchLimit = Math.min(limit, mailbox.exists);
    const range = mailbox.exists > searchLimit ? 
      `${mailbox.exists - searchLimit + 1}:${mailbox.exists}` : 
      `1:${mailbox.exists}`;
    
    console.log(`[IMAP-${config.name}] Fetching messages in range: ${range}`);
    
    // Fetch message headers and flags
    const messages = [];
    for await (const message of client.fetch(range, {
      envelope: true,
      flags: true,
      internalDate: true,
      uid: true,
      bodyStructure: true
    })) {
      const envelope = message.envelope;
      const flags = message.flags || new Set();
      
      // Try to get a basic preview or show placeholder
      const fromName = envelope?.from?.[0]?.name || envelope?.from?.[0]?.address || 'Unknown sender';
      const subject = envelope?.subject || 'No Subject';
      
      // For now, show a simple placeholder - full content will be loaded on expansion
      let bodyContent = 'Click to expand and view full email content';
      
      // If there's any basic text structure available, we could try to extract a preview
      // But for performance, we'll keep it simple and load full content on demand
      
      // Convert IMAP message to our format
      const emailMessage = {
        messageId: message.uid?.toString() || `${Date.now()}-${Math.random()}`,
        subject: envelope?.subject || 'No Subject',
        fromAddress: envelope?.from?.[0]?.address || 'unknown@example.com',
        fromName: envelope?.from?.[0]?.name || envelope?.from?.[0]?.address || 'Unknown',
        toAddress: envelope?.to?.[0]?.address || config.email,
        receivedTime: message.internalDate instanceof Date ? message.internalDate.getTime() : Date.now(),
        sentDateInGMT: message.internalDate instanceof Date ? message.internalDate.getTime().toString() : Date.now().toString(),
        isRead: !flags.has('\\Seen') ? false : true,
        flag: Array.from(flags).join(', '),
        summary: bodyContent ? bodyContent.substring(0, 300) : 'No content available',
        mailboxName: config.name,
        mailboxEmail: config.email,
        calendarType: 0,
        size: 0 // IMAP doesn't easily provide size in this call
      };
      
      messages.push(emailMessage);
    }
    
    // Sort by date (newest first) and limit
    messages.sort((a, b) => (b.receivedTime || 0) - (a.receivedTime || 0));
    const limitedMessages = messages.slice(0, limit);
    
    console.log(`[IMAP-${config.name}] Successfully fetched ${limitedMessages.length} messages`);
    return limitedMessages;
    
  } catch (error: any) {
    console.error(`[IMAP-${config.name}] Error fetching emails:`, error.message);
    return [];
  } finally {
    if (client) {
      try {
        await client.logout();
      } catch (e) {
        console.log(`[IMAP-${config.name}] Error closing connection:`, e);
      }
    }
  }
}

// IMAP function to get mailbox statistics
async function getMailboxStatsViaImap(config: ImapConfig): Promise<{totalEmails: number, unreadEmails: number}> {
  console.log(`[IMAP-${config.name}] Getting mailbox stats via IMAP...`);
  
  let client: ImapFlow | null = null;
  
  try {
    client = await createImapConnection(config);
    
    // Open INBOX and get stats
    const mailbox = await client.mailboxOpen('INBOX');
    
    // Get unread count by searching for unseen messages
    const unreadMessages = await client.search({ seen: false });
    const unreadCount = Array.isArray(unreadMessages) ? unreadMessages.length : 0;
    
    console.log(`[IMAP-${config.name}] Stats: ${mailbox.exists} total, ${unreadCount} unread`);
    
    return {
      totalEmails: mailbox.exists || 0,
      unreadEmails: unreadCount
    };
    
  } catch (error: any) {
    console.error(`[IMAP-${config.name}] Error getting stats:`, error.message);
    return { totalEmails: 0, unreadEmails: 0 };
  } finally {
    if (client) {
      try {
        await client.logout();
      } catch (e) {
        console.log(`[IMAP-${config.name}] Error closing connection:`, e);
      }
    }
  }
}

// IMAP function to get all accounts with stats
export async function getAllAccountsViaImap() {
  console.log('[IMAP] Getting all accounts via IMAP...');
  
  const imapConfigs = getImapConfigs();
  if (imapConfigs.length === 0) {
    throw new Error('No IMAP configurations found');
  }
  
  // Fetch account stats from all mailboxes in parallel for better performance
  const accountPromises = imapConfigs.map(async (config) => {
    try {
      console.log(`[IMAP] Starting parallel stats fetch for ${config.email}`);
      const stats = await getMailboxStatsViaImap(config);
      
      // Create account object matching the REST API format
      const account = {
        accountId: `imap-${config.email}`,
        accountName: config.name,
        emailAddress: config.email,
        accountDisplayName: config.name,
        mailboxName: config.name,
        mailboxEmail: config.email,
        totalEmails: stats.totalEmails,
        unreadEmails: stats.unreadEmails,
        isDefault: config.email === 'anton.osipov@daveenci.ai' // Make Anton default
      };
      
      console.log(`[IMAP] Completed stats fetch for ${config.email}: ${stats.totalEmails}/${stats.unreadEmails}`);
      return account;
    } catch (error: any) {
      console.error(`[IMAP] Error getting account info for ${config.email}:`, error.message);
      return null;
    }
  });
  
  // Wait for all account fetches to complete
  const accountResults = await Promise.all(accountPromises);
  const accounts = accountResults.filter(Boolean); // Remove null results
  
  console.log(`[IMAP] Found ${accounts.length} accounts with stats`);
  return { data: accounts };
}

// IMAP function to fetch all emails from all mailboxes
export async function fetchAllEmailsViaImap(limit = 10) {
  console.log('[IMAP] Fetching all emails via IMAP...');
  
  const imapConfigs = getImapConfigs();
  if (imapConfigs.length === 0) {
    throw new Error('No IMAP configurations found');
  }
  
  // Fetch emails from all mailboxes in parallel for better performance
  const emailPromises = imapConfigs.map(async (config) => {
    try {
      console.log(`[IMAP] Starting parallel fetch for ${config.email}`);
      const emails = await fetchEmailsViaImap(config, limit);
      console.log(`[IMAP] Completed fetch for ${config.email}: ${emails.length} emails`);
      return emails;
    } catch (error: any) {
      console.error(`[IMAP] Error fetching emails for ${config.email}:`, error.message);
      return [];
    }
  });
  
  // Wait for all mailbox fetches to complete
  const emailArrays = await Promise.all(emailPromises);
  const allEmails = emailArrays.flat();
  
  // Sort all emails by date (newest first)
  allEmails.sort((a, b) => (b.receivedTime || 0) - (a.receivedTime || 0));
  
  // Limit total results
  const limitedEmails = allEmails.slice(0, limit * imapConfigs.length);
  
  console.log(`[IMAP] Found ${limitedEmails.length} total emails from all mailboxes`);
  return { data: limitedEmails };
}

// Fetch full email body for a specific message
export async function fetchEmailBodyViaImap(messageId: string, mailboxEmail: string): Promise<string> {
  console.log(`[IMAP Body] Fetching body for message ${messageId} from ${mailboxEmail}`);
  
  const imapConfigs = getImapConfigs();
  const config = imapConfigs.find(c => c.email === mailboxEmail);
  
  if (!config) {
    throw new Error(`No IMAP configuration found for mailbox: ${mailboxEmail}`);
  }
  
  let client: ImapFlow | null = null;
  
  try {
    client = await createImapConnection(config);
    
    // Open INBOX
    await client.mailboxOpen('INBOX');
    console.log(`[IMAP Body] INBOX opened for ${config.name}`);
    
    // Find the message by UID
    const uid = parseInt(messageId);
    if (isNaN(uid)) {
      throw new Error(`Invalid message ID: ${messageId}`);
    }
    
    console.log(`[IMAP Body] Fetching body for UID: ${uid}`);
    
    // First check if the message exists and debug available UIDs
    try {
      console.log(`[IMAP Body] Checking if UID ${uid} exists...`);
      
      // Get all available UIDs for debugging
      const allMessages = [];
      for await (const message of client.fetch('1:*', { uid: true })) {
        allMessages.push(message.uid);
      }
      console.log(`[IMAP Body] Available UIDs in mailbox:`, allMessages.slice(0, 10), `(showing first 10 of ${allMessages.length})`);
      console.log(`[IMAP Body] Looking for UID: ${uid}, Available UIDs include:`, allMessages.includes(uid));
      
             // Simply check if UID exists in the available UIDs list
        const messageExists = allMessages.includes(uid);
        console.log(`[IMAP Body] Message UID ${uid} exists in available UIDs: ${messageExists}`);
        
        if (!messageExists) {
          console.log(`[IMAP Body] UID ${uid} not found in available UIDs:`, allMessages);
          throw new Error(`Message with UID ${uid} not found in mailbox. Available UIDs: ${allMessages.join(', ')}`);
        }
        
        console.log(`[IMAP Body] UID ${uid} confirmed to exist, proceeding with body fetch...`);
    } catch (existsError) {
      console.error(`[IMAP Body] Error checking if message exists:`, existsError);
      throw new Error(`Failed to check message existence: ${existsError instanceof Error ? existsError.message : 'Unknown error'}`);
    }
    
    // Fetch the message body
    let emailBody = '';
    console.log(`[IMAP Body] Starting body fetch for UID: ${uid}`);
    
    try {
      console.log(`[IMAP Body] Executing IMAP fetch command for UID ${uid} with bodyParts...`);
      let messageCount = 0;
      for await (const message of client.fetch(`${uid}`, {
        bodyParts: ['TEXT', 'HTML'],
        envelope: true,
        bodyStructure: true
      })) {
        messageCount++;
        console.log(`[IMAP Body] Processing message ${messageCount} with UID ${message.uid}`);
      console.log(`[IMAP Body] Processing message body parts...`);
      
      // Try to get text or HTML content
      if (message.bodyParts) {
        const bodyParts = message.bodyParts;
        
        // Look for text content first
        if (bodyParts.has('TEXT')) {
          const textBuffer = bodyParts.get('TEXT');
          if (textBuffer) {
            emailBody = textBuffer.toString('utf8');
            console.log(`[IMAP Body] Found TEXT content, length: ${emailBody.length}`);
          }
        } else if (bodyParts.has('HTML')) {
          const htmlBuffer = bodyParts.get('HTML');
          if (htmlBuffer) {
            emailBody = htmlBuffer.toString('utf8');
            console.log(`[IMAP Body] Found HTML content, length: ${emailBody.length}`);
            
            // Clean up HTML content
            emailBody = emailBody
              .replace(/<[^>]*>/g, '') // Remove HTML tags
              .replace(/&nbsp;/g, ' ') // Replace HTML entities
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'")
              .replace(/\s+/g, ' ') // Normalize whitespace
              .trim();
          }
        }
      }
      
      // If no body parts found, try to get some basic info
      if (!emailBody && message.envelope) {
        emailBody = `Subject: ${message.envelope.subject}\nFrom: ${message.envelope.from?.[0]?.address}\n\n[Email body content not available]`;
      }
      
      break; // We only expect one message
    }
    
    console.log(`[IMAP Body] Finished processing ${messageCount} messages`);
    
    if (!emailBody) {
      emailBody = '[No email content available]';
    }
    
    console.log(`[IMAP Body] Successfully fetched email body, length: ${emailBody.length}`);
    return emailBody;
    
    } catch (fetchError) {
      console.error(`[IMAP Body] Error during body fetch:`, fetchError);
      throw new Error(`Failed to fetch message body: ${fetchError instanceof Error ? fetchError.message : 'Unknown fetch error'}`);
    }
    
  } catch (error: any) {
    console.error(`[IMAP Body] Error fetching email body:`, error);
    throw error;
  } finally {
    if (client) {
      try {
        await client.logout();
        console.log(`[IMAP Body] Connection closed for ${config.name}`);
      } catch (error) {
        console.error(`[IMAP Body] Error closing connection:`, error);
      }
    }
  }
}

// Mark email as read via IMAP
export async function markEmailAsReadViaImap(messageId: string, mailboxEmail: string): Promise<void> {
  console.log(`[IMAP Mark Read] Marking message ${messageId} as read in ${mailboxEmail}`);
  
  const imapConfigs = getImapConfigs();
  const config = imapConfigs.find(c => c.email === mailboxEmail);
  
  if (!config) {
    throw new Error(`No IMAP configuration found for mailbox: ${mailboxEmail}`);
  }
  
  let client: ImapFlow | null = null;
  
  try {
    client = await createImapConnection(config);
    
    // Open INBOX
    await client.mailboxOpen('INBOX');
    console.log(`[IMAP Mark Read] INBOX opened for ${config.name}`);
    
    // Mark the message as read by adding the \Seen flag
    const uid = parseInt(messageId);
    if (isNaN(uid)) {
      throw new Error(`Invalid message ID: ${messageId}`);
    }
    
    await client.messageFlagsAdd(`${uid}`, ['\\Seen']);
    console.log(`[IMAP Mark Read] Successfully marked message ${uid} as read`);
    
  } catch (error: any) {
    console.error(`[IMAP Mark Read] Error marking email as read:`, error);
    throw error;
  } finally {
    if (client) {
      try {
        await client.logout();
        console.log(`[IMAP Mark Read] Connection closed for ${config.name}`);
      } catch (error) {
        console.error(`[IMAP Mark Read] Error closing connection:`, error);
      }
    }
  }
} 