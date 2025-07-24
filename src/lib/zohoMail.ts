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
  console.log('[ENV-DEBUG] ZOHO_PASSWORD_ANTON exists:', !!process.env.ZOHO_PASSWORD_ANTON);
  console.log('[ENV-DEBUG] ZOHO_PASSWORD_ASTRID exists:', !!process.env.ZOHO_PASSWORD_ASTRID);
  console.log('[ENV-DEBUG] ZOHO_PASSWORD_OPS exists:', !!process.env.ZOHO_PASSWORD_OPS);
  console.log('[ENV-DEBUG] ZOHO_PASSWORD_HELLO exists:', !!process.env.ZOHO_PASSWORD_HELLO);
  
  const configs: ImapConfig[] = [];
  
  // Anton's IMAP config
  if (process.env.ZOHO_PASSWORD_ANTON) {
    console.log('[ENV-DEBUG] Adding Anton config');
    configs.push({
      name: 'Anton Osipov',
      email: 'anton.osipov@daveenci.ai',
      user: 'anton.osipov@daveenci.ai',
      password: process.env.ZOHO_PASSWORD_ANTON
    });
  } else {
    console.log('[ENV-DEBUG] ZOHO_PASSWORD_ANTON not found');
  }
  
  // Astrid's IMAP config
  if (process.env.ZOHO_PASSWORD_ASTRID) {
    console.log('[ENV-DEBUG] Adding Astrid config');
    configs.push({
      name: 'Astrid',
      email: 'astrid@daveenci.ai',
      user: 'astrid@daveenci.ai',
      password: process.env.ZOHO_PASSWORD_ASTRID
    });
  } else {
    console.log('[ENV-DEBUG] ZOHO_PASSWORD_ASTRID not found');
  }
  
  // Ops IMAP config
  if (process.env.ZOHO_PASSWORD_OPS) {
    console.log('[ENV-DEBUG] Adding Ops config');
    configs.push({
      name: 'Ops',
      email: 'ops@daveenci.ai',
      user: 'ops@daveenci.ai',
      password: process.env.ZOHO_PASSWORD_OPS
    });
  } else {
    console.log('[ENV-DEBUG] ZOHO_PASSWORD_OPS not found');
  }
  
  // Hello IMAP config
  if (process.env.ZOHO_PASSWORD_HELLO) {
    console.log('[ENV-DEBUG] Adding Hello config');
    configs.push({
      name: 'Hello',
      email: 'hello@daveenci.ai',
      user: 'hello@daveenci.ai',
      password: process.env.ZOHO_PASSWORD_HELLO
    });
  } else {
    console.log('[ENV-DEBUG] ZOHO_PASSWORD_HELLO not found');
  }
  
  console.log('[ENV-DEBUG] Total configs created:', configs.length);
  console.log('[ENV-DEBUG] Config names:', configs.map(c => c.name));
  
  return configs;
};

// IMAP helper function to create connection
async function createImapConnection(config: ImapConfig): Promise<ImapFlow> {
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
  await client.connect();
  console.log(`[IMAP-${config.name}] Connected successfully`);
  
  return client;
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
      
      // Find the message by messageId (this might be the Message-ID header or UID)
      const messages = await client.search({ header: { 'message-id': messageId } });
      
      if (!messages || messages.length === 0) {
        console.log(`[IMAP-${config.name}] Message ${messageId} not found in INBOX`);
        continue; // Try next mailbox
      }
      
      console.log(`[IMAP-${config.name}] Found message, moving to Trash`);
      
      // Move to Trash folder
      await client.messageMove(messages as number[], 'Trash');
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
      console.log(`[IMAP-${config.name}] Opened INBOX, searching for message ${messageId}`);
      
      const messages = await client.search({ header: { 'message-id': messageId } });
      
      if (!messages || messages.length === 0) {
        console.log(`[IMAP-${config.name}] Message ${messageId} not found in INBOX`);
        continue;
      }
      
      console.log(`[IMAP-${config.name}] Found message, moving to Archive`);
      
      // Move to Archive folder (try different possible names)
      const archiveFolders = ['Archive', 'Archived', 'Archives'];
      let moved = false;
      
      for (const folder of archiveFolders) {
        try {
          await client.messageMove(messages as number[], folder);
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
      console.log(`[IMAP-${config.name}] Opened INBOX, searching for message ${messageId}`);
      
      const messages = await client.search({ header: { 'message-id': messageId } });
      
      if (!messages || messages.length === 0) {
        console.log(`[IMAP-${config.name}] Message ${messageId} not found in INBOX`);
        continue;
      }
      
      console.log(`[IMAP-${config.name}] Found message, moving to Spam`);
      
      // Move to Spam folder (try different possible names)
      const spamFolders = ['Spam', 'Junk', 'Junk Email'];
      let moved = false;
      
      for (const folder of spamFolders) {
        try {
          await client.messageMove(messages as number[], folder);
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
        summary: `From: ${envelope?.from?.[0]?.name || envelope?.from?.[0]?.address} - ${envelope?.subject || 'No Subject'}`.substring(0, 100),
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
  
  const accounts = [];
  
  for (const config of imapConfigs) {
    try {
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
      
      accounts.push(account);
    } catch (error: any) {
      console.error(`[IMAP] Error getting account info for ${config.email}:`, error.message);
    }
  }
  
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
  
  const allEmails = [];
  
  for (const config of imapConfigs) {
    try {
      const emails = await fetchEmailsViaImap(config, limit);
      allEmails.push(...emails);
    } catch (error: any) {
      console.error(`[IMAP] Error fetching emails for ${config.email}:`, error.message);
    }
  }
  
  // Sort all emails by date (newest first)
  allEmails.sort((a, b) => (b.receivedTime || 0) - (a.receivedTime || 0));
  
  // Limit total results
  const limitedEmails = allEmails.slice(0, limit * imapConfigs.length);
  
  console.log(`[IMAP] Found ${limitedEmails.length} total emails from all mailboxes`);
  return { data: limitedEmails };
} 