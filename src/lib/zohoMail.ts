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
    
    // Get all available UIDs for debugging and body fetch optimization
    let allMessages: number[] = [];
    
    // First check if the message exists and debug available UIDs
    try {
      console.log(`[IMAP Body] Checking if UID ${uid} exists...`);
      
      // Get all available UIDs for debugging
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
      console.log(`[IMAP Body] Using optimized single UID fetch for UID ${uid}...`);
      let messageCount = 0;
      let targetMessageFound = false;
      
      // Use the UID list to build a targeted sequence - fetch only known UIDs from the check above
      const uidString = allMessages.slice(0, 5).join(','); // Limit to first 5 UIDs for speed
      console.log(`[IMAP Body] Fetching UIDs: ${uidString}`);
      
      for await (const message of client.fetch(uidString, {
        envelope: true,
        uid: true,
        source: true
      })) {
        messageCount++;
        
        if (message.uid === uid) {
          targetMessageFound = true;
          console.log(`[IMAP Body] Found target message with UID ${message.uid}`);
          console.log(`[IMAP Body] Processing message envelope...`);
          
          // Get email info from envelope and body
          if (message.envelope) {
            const subject = message.envelope.subject || 'No Subject';
            const fromName = message.envelope.from?.[0]?.name || 'Unknown';
            const fromEmail = message.envelope.from?.[0]?.address || 'No email';
            const date = message.envelope.date ? new Date(message.envelope.date).toLocaleString() : 'Unknown';
            
            // Try to extract body content from available message properties
            let bodyContent = '';
            
            console.log(`[IMAP Body] Investigating message properties for body content...`);
            console.log(`[IMAP Body] Message keys:`, Object.keys(message));
            
            // Check for body content in various message properties
            if (message.bodyStructure) {
              console.log(`[IMAP Body] Found bodyStructure`);
            }
            
            if (message.source) {
              console.log(`[IMAP Body] Found source, length:`, message.source.length);
              // Extract text from source if available
              const sourceText = message.source.toString();
                             if (sourceText.length > 100) {
                 // Try to extract content after headers
                 const bodyStart = sourceText.indexOf('\r\n\r\n');
                 if (bodyStart > 0) {
                   let rawBody = sourceText.substring(bodyStart + 4).trim();
                   
                   // COMPREHENSIVE email content cleanup
                   rawBody = rawBody
                     // Remove all MIME boundary lines (various formats)
                     .replace(/^--[=_\-a-zA-Z0-9]+.*$/gm, '')
                     .replace(/^------=.*$/gm, '')
                     .replace(/^----boundary.*$/gm, '')
                     // Remove Content-* headers
                     .replace(/^Content-Type:.*$/gmi, '')
                     .replace(/^Content-Transfer-Encoding:.*$/gmi, '')
                     .replace(/^Content-Disposition:.*$/gmi, '')
                     .replace(/^Content-[^:]*:.*$/gmi, '')
                     // Remove MIME version headers
                     .replace(/^MIME-Version:.*$/gmi, '')
                     // Decode quoted-printable encoding
                     .replace(/=([0-9A-F]{2})/g, (match, hex) => {
                       try {
                         return String.fromCharCode(parseInt(hex, 16));
                       } catch {
                         return match;
                       }
                     })
                     // Remove soft line breaks (=\r\n or =\n)
                     .replace(/=\r?\n/g, '')
                     // Clean up common encoded characters
                     .replace(/=20/g, ' ')    // space
                     .replace(/=0D=0A/g, '\n') // CRLF
                     .replace(/=0A/g, '\n')    // LF
                     .replace(/=09/g, '\t')    // tab
                     // Remove excessive whitespace
                     .replace(/\n\s*\n\s*\n/g, '\n\n')
                     .replace(/\t+/g, ' ')
                     .replace(/  +/g, ' ')
                     .trim();
                   
                   // Extract meaningful content (skip MIME artifacts)
                   const lines = rawBody.split('\n');
                   const meaningfulLines = lines.filter(line => {
                     const trimmed = line.trim();
                     // Skip empty lines, MIME artifacts, and encoding markers
                     return trimmed.length > 0 && 
                            !trimmed.startsWith('--') &&
                            !trimmed.includes('=_') &&
                            !trimmed.match(/^[A-Za-z-]+:\s/) &&
                            trimmed.length > 3;
                   });
                   
                   if (meaningfulLines.length > 0) {
                     bodyContent = meaningfulLines.join('\n').trim();
                     console.log(`[IMAP Body] Extracted and cleaned body from source, lines: ${meaningfulLines.length}, length: ${bodyContent.length}`);
                   } else {
                     console.log(`[IMAP Body] No meaningful content found after cleanup, raw length was: ${rawBody.length}`);
                   }
                 }
               }
            }
            
            if (!bodyContent && (message as any).text) {
              bodyContent = (message as any).text;
              console.log(`[IMAP Body] Found text property, length:`, bodyContent.length);
            }
            
            if (!bodyContent && (message as any).html) {
              bodyContent = (message as any).html;
              console.log(`[IMAP Body] Found html property, length:`, bodyContent.length);
            }
            
            // If we found content, clean it up
            if (bodyContent && bodyContent.length > 50) {
              // Remove HTML tags if present
              bodyContent = bodyContent.replace(/<[^>]*>/g, '');
              // Clean up whitespace
              bodyContent = bodyContent.replace(/\n\s*\n\s*\n/g, '\n\n').trim();
              // Limit length
              if (bodyContent.length > 1000) {
                bodyContent = bodyContent.substring(0, 1000) + '\n\n... [Content truncated for preview]';
              }
              console.log(`[IMAP Body] Successfully extracted and cleaned body content, final length:`, bodyContent.length);
            } else {
              bodyContent = `[Unable to extract readable content from this email]\n\nThis email may use complex formatting, attachments, or encoding that requires different processing. The email was received but the text content could not be cleanly extracted.`;
              console.log(`[IMAP Body] No substantial body content found in message properties`);
            }

            
            // Return just the clean email content, no metadata wrapper
            emailBody = bodyContent;
            
            console.log(`[IMAP Body] Successfully extracted envelope for: ${subject}`);
          } else {
            emailBody = '[Email envelope not available]';
          }
          
          break; // Found our message, stop processing
        }
      }
      
      if (!targetMessageFound) {
        console.log(`[IMAP Body] Target UID ${uid} not found in first 5 UIDs, trying direct fetch...`);
        
        // Try fetching just the specific UID directly
        try {
          for await (const message of client.fetch(uid.toString(), {
            envelope: true,
            uid: true,
            source: true
          })) {
            if (message.uid === uid) {
              targetMessageFound = true;
              console.log(`[IMAP Body] Found target message with direct UID fetch: ${message.uid}`);
              
              // Same processing logic as above
              if (message.envelope) {
                const subject = message.envelope.subject || 'No Subject';
                const fromName = message.envelope.from?.[0]?.name || 'Unknown';
                const fromEmail = message.envelope.from?.[0]?.address || 'No email';
                const date = message.envelope.date ? new Date(message.envelope.date).toLocaleString() : 'Unknown';
                
                let bodyContent = '';
                
                if (message.source) {
                  const sourceText = message.source.toString();
                  if (sourceText.length > 100) {
                    const bodyStart = sourceText.indexOf('\r\n\r\n');
                    if (bodyStart > 0) {
                      let rawBody = sourceText.substring(bodyStart + 4).trim();
                      
                      // COMPREHENSIVE email content cleanup (same as main fetch)
                      rawBody = rawBody
                        // Remove all MIME boundary lines (various formats)
                        .replace(/^--[=_\-a-zA-Z0-9]+.*$/gm, '')
                        .replace(/^------=.*$/gm, '')
                        .replace(/^----boundary.*$/gm, '')
                        // Remove Content-* headers
                        .replace(/^Content-Type:.*$/gmi, '')
                        .replace(/^Content-Transfer-Encoding:.*$/gmi, '')
                        .replace(/^Content-Disposition:.*$/gmi, '')
                        .replace(/^Content-[^:]*:.*$/gmi, '')
                        // Remove MIME version headers
                        .replace(/^MIME-Version:.*$/gmi, '')
                        // Decode quoted-printable encoding
                        .replace(/=([0-9A-F]{2})/g, (match, hex) => {
                          try {
                            return String.fromCharCode(parseInt(hex, 16));
                          } catch {
                            return match;
                          }
                        })
                        // Remove soft line breaks (=\r\n or =\n)
                        .replace(/=\r?\n/g, '')
                        // Clean up common encoded characters
                        .replace(/=20/g, ' ')    // space
                        .replace(/=0D=0A/g, '\n') // CRLF
                        .replace(/=0A/g, '\n')    // LF
                        .replace(/=09/g, '\t')    // tab
                        // Remove excessive whitespace
                        .replace(/\n\s*\n\s*\n/g, '\n\n')
                        .replace(/\t+/g, ' ')
                        .replace(/  +/g, ' ')
                        .trim();
                      
                      // Extract meaningful content (skip MIME artifacts)
                      const lines = rawBody.split('\n');
                      const meaningfulLines = lines.filter(line => {
                        const trimmed = line.trim();
                        // Skip empty lines, MIME artifacts, and encoding markers
                        return trimmed.length > 0 && 
                               !trimmed.startsWith('--') &&
                               !trimmed.includes('=_') &&
                               !trimmed.match(/^[A-Za-z-]+:\s/) &&
                               trimmed.length > 3;
                      });
                      
                      if (meaningfulLines.length > 0) {
                        bodyContent = meaningfulLines.join('\n').trim();
                        console.log(`[IMAP Body] Direct fetch: Extracted and cleaned body, lines: ${meaningfulLines.length}, length: ${bodyContent.length}`);
                      } else {
                        console.log(`[IMAP Body] Direct fetch: No meaningful content found after cleanup`);
                      }
                    }
                  }
                }
                
                if (!bodyContent) {
                  bodyContent = `[Unable to extract readable content from this email]\n\nThis email may use complex formatting, attachments, or encoding that requires different processing. The email was received but the text content could not be cleanly extracted.`;
                }
                
                if (bodyContent.length > 1000) {
                  bodyContent = bodyContent.substring(0, 1000) + '\n\n... [Content truncated for preview]';
                }
                
                // Return just the clean email content, no metadata wrapper
                emailBody = bodyContent;
                console.log(`[IMAP Body] Successfully processed direct fetch for: ${subject}`);
              }
              break;
            }
          }
        } catch (directFetchError) {
          console.log(`[IMAP Body] Direct fetch also failed:`, directFetchError);
        }
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
        console.log(`[IMAP Body] Closing connection for ${config.name}...`);
        
        // Add timeout to just the logout operation
        const logoutPromise = client.logout();
        const logoutTimeout = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Logout timeout')), 2000);
        });
        
        await Promise.race([logoutPromise, logoutTimeout]);
        console.log(`[IMAP Body] ✅ Connection successfully closed for ${config.name}`);
      } catch (error) {
        console.error(`[IMAP Body] ❌ Error/timeout closing connection for ${config.name}:`, error);
        // Force close the connection if logout hangs
        try {
          (client as any).close();
        } catch (forceCloseError) {
          console.log(`[IMAP Body] Force close attempted for ${config.name}`);
        }
      }
    } else {
      console.log(`[IMAP Body] No client to close for ${config.name}`);
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