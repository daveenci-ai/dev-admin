import { gmail_v1, google } from 'googleapis';
import { createGmailImapConnection, createOAuth2Client, getValidAccessToken } from './gmailOAuth';
import { ImapFlow } from 'imapflow';
import logger from './logger';
import { prisma } from './db';

// Gmail API functions using OAuth2

export interface GmailEmailMessage {
  messageId: string;
  subject: string;
  fromAddress: string;
  fromName?: string;
  toAddress?: string;
  receivedTime: number;
  summary: string;
  isRead: boolean;
  threadId?: string;
  labelIds?: string[];
  mailboxEmail: string;
  mailboxName: string;
}

export interface GmailAccountStats {
  email: string;
  displayName?: string;
  totalEmails: number;
  unreadEmails: number;
  lastSyncAt?: Date;
}

// Helper function to extract email address from Gmail API format
function extractEmailAddress(emailString: string): { email: string; name?: string } {
  const match = emailString.match(/(.*?)\s*<(.+)>/);
  if (match) {
    return {
      name: match[1].trim().replace(/"/g, ''),
      email: match[2].trim(),
    };
  }
  return { email: emailString.trim() };
}

// Helper function to decode Gmail message body
function decodeGmailBody(body: gmail_v1.Schema$MessagePartBody): string {
  if (!body.data) return '';
  
  try {
    const decoded = Buffer.from(body.data, 'base64url').toString('utf-8');
    return decoded.replace(/<[^>]*>/g, '').trim(); // Remove HTML tags
  } catch (error) {
    logger.warn('[Gmail Service] Failed to decode message body:', error);
    return '';
  }
}

// Helper function to extract text content from Gmail message parts
function extractTextContent(parts: gmail_v1.Schema$MessagePart[] | undefined): string {
  if (!parts) return '';
  
  let textContent = '';
  
  for (const part of parts) {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      textContent += decodeGmailBody(part.body) + '\n';
    } else if (part.mimeType === 'text/html' && part.body?.data && !textContent) {
      // Use HTML as fallback if no plain text
      const htmlContent = decodeGmailBody(part.body);
      textContent += htmlContent.replace(/<[^>]*>/g, '').trim() + '\n';
    } else if (part.parts) {
      // Recursively process nested parts
      textContent += extractTextContent(part.parts);
    }
  }
  
  return textContent.trim();
}

// Create Gmail API client with OAuth2
async function createGmailApiClient(email: string): Promise<gmail_v1.Gmail> {
  try {
    const accessToken = await getValidAccessToken(email);
    const oauth2Client = createOAuth2Client();
    
    oauth2Client.setCredentials({
      access_token: accessToken,
    });
    
    return google.gmail({ version: 'v1', auth: oauth2Client });
  } catch (error) {
    logger.error(`[Gmail Service] Failed to create Gmail API client for ${email}:`, error);
    throw new Error(`Failed to create Gmail API client: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Fetch emails using Gmail API
export async function fetchGmailEmails(email: string, maxResults = 20): Promise<GmailEmailMessage[]> {
  try {
    logger.info(`[Gmail Service] Fetching emails for ${email} using Gmail API`);
    
    const gmail = await createGmailApiClient(email);
    
    // Get list of messages from INBOX
    const messageListResponse = await gmail.users.messages.list({
      userId: 'me',
      labelIds: ['INBOX'],
      maxResults: maxResults,
    });
    
    const messages = messageListResponse.data.messages || [];
    
    if (messages.length === 0) {
      logger.info(`[Gmail Service] No messages found for ${email}`);
      return [];
    }
    
    logger.info(`[Gmail Service] Found ${messages.length} messages for ${email}, fetching details...`);
    
    // Fetch detailed message data in parallel (but limit concurrency)
    const batchSize = 5; // Limit concurrent requests to avoid rate limits
    const emailMessages: GmailEmailMessage[] = [];
    
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (message) => {
        try {
          const messageResponse = await gmail.users.messages.get({
            userId: 'me',
            id: message.id!,
            format: 'full',
          });
          
          const msgData = messageResponse.data;
          const headers = msgData.payload?.headers || [];
          
          // Extract email information from headers
          const subjectHeader = headers.find(h => h.name?.toLowerCase() === 'subject');
          const fromHeader = headers.find(h => h.name?.toLowerCase() === 'from');
          const toHeader = headers.find(h => h.name?.toLowerCase() === 'to');
          const dateHeader = headers.find(h => h.name?.toLowerCase() === 'date');
          
          const fromInfo = fromHeader?.value ? extractEmailAddress(fromHeader.value) : { email: 'unknown' };
          const toInfo = toHeader?.value ? extractEmailAddress(toHeader.value) : { email: email };
          
          // Extract message body content
          let bodyContent = '';
          if (msgData.payload?.body?.data) {
            bodyContent = decodeGmailBody(msgData.payload.body);
          } else if (msgData.payload?.parts) {
            bodyContent = extractTextContent(msgData.payload.parts);
          }
          
          // Parse date
          let receivedTime = Date.now();
          if (dateHeader?.value) {
            try {
              receivedTime = new Date(dateHeader.value).getTime();
            } catch (dateError) {
              logger.warn(`[Gmail Service] Failed to parse date: ${dateHeader.value}`);
            }
          }
          
          // Check if message is unread
          const isRead = !msgData.labelIds?.includes('UNREAD');
          
          return {
            messageId: msgData.id!,
            subject: subjectHeader?.value || 'No Subject',
            fromAddress: fromInfo.email,
            fromName: fromInfo.name,
            toAddress: toInfo.email,
            receivedTime,
            summary: bodyContent.substring(0, 300) || 'No content available',
            isRead,
            threadId: msgData.threadId,
            labelIds: msgData.labelIds,
            mailboxEmail: email,
            mailboxName: email.split('@')[0], // Use local part as display name
          } as GmailEmailMessage;
          
        } catch (messageError) {
          logger.error(`[Gmail Service] Error fetching message ${message.id}:`, messageError);
          return null;
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      const validMessages = batchResults.filter(msg => msg !== null) as GmailEmailMessage[];
      emailMessages.push(...validMessages);
      
      // Small delay between batches to be respectful of API limits
      if (i + batchSize < messages.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    // Sort by date (newest first)
    emailMessages.sort((a, b) => b.receivedTime - a.receivedTime);
    
    logger.info(`[Gmail Service] Successfully fetched ${emailMessages.length} emails for ${email}`);
    return emailMessages;
    
  } catch (error) {
    logger.error(`[Gmail Service] Error fetching emails for ${email}:`, error);
    throw new Error(`Failed to fetch Gmail emails: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Get Gmail account statistics
export async function getGmailAccountStats(email: string): Promise<GmailAccountStats> {
  try {
    logger.debug(`[Gmail Service] Getting account stats for ${email}`);
    
    const gmail = await createGmailApiClient(email);
    
    // Get profile information
    const profileResponse = await gmail.users.getProfile({ userId: 'me' });
    const profile = profileResponse.data;
    
    // Get label information to count messages
    const labelsResponse = await gmail.users.labels.list({ userId: 'me' });
    const labels = labelsResponse.data.labels || [];
    
    // Find INBOX and UNREAD labels
    const inboxLabel = labels.find(label => label.id === 'INBOX');
    const unreadLabel = labels.find(label => label.id === 'UNREAD');
    
    const totalEmails = inboxLabel?.messagesTotal || 0;
    const unreadEmails = inboxLabel?.messagesUnread || 0;
    
    // Update last sync time in database
    await prisma.gmailAccount.update({
      where: { email },
      data: { lastSyncAt: new Date() },
    }).catch(error => {
      logger.warn(`[Gmail Service] Failed to update last sync time for ${email}:`, error);
    });
    
    return {
      email,
      displayName: profile.emailAddress || email,
      totalEmails,
      unreadEmails,
    };
    
  } catch (error) {
    logger.error(`[Gmail Service] Error getting stats for ${email}:`, error);
    throw new Error(`Failed to get Gmail account stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Mark Gmail message as read
export async function markGmailMessageAsRead(email: string, messageId: string): Promise<void> {
  try {
    logger.info(`[Gmail Service] Marking message ${messageId} as read for ${email}`);
    
    const gmail = await createGmailApiClient(email);
    
    // Remove UNREAD label to mark as read
    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        removeLabelIds: ['UNREAD'],
      },
    });
    
    logger.info(`[Gmail Service] Successfully marked message ${messageId} as read`);
    
  } catch (error) {
    logger.error(`[Gmail Service] Error marking message as read:`, error);
    throw new Error(`Failed to mark message as read: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Archive Gmail message
export async function archiveGmailMessage(email: string, messageId: string): Promise<void> {
  try {
    logger.info(`[Gmail Service] Archiving message ${messageId} for ${email}`);
    
    const gmail = await createGmailApiClient(email);
    
    // Remove INBOX label to archive the message
    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        removeLabelIds: ['INBOX'],
      },
    });
    
    logger.info(`[Gmail Service] Successfully archived message ${messageId}`);
    
  } catch (error) {
    logger.error(`[Gmail Service] Error archiving message:`, error);
    throw new Error(`Failed to archive message: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Move Gmail message to spam
export async function markGmailMessageAsSpam(email: string, messageId: string): Promise<void> {
  try {
    logger.info(`[Gmail Service] Marking message ${messageId} as spam for ${email}`);
    
    const gmail = await createGmailApiClient(email);
    
    // Add SPAM label and remove INBOX label
    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        addLabelIds: ['SPAM'],
        removeLabelIds: ['INBOX'],
      },
    });
    
    logger.info(`[Gmail Service] Successfully marked message ${messageId} as spam`);
    
  } catch (error) {
    logger.error(`[Gmail Service] Error marking message as spam:`, error);
    throw new Error(`Failed to mark message as spam: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Delete Gmail message (move to trash)
export async function deleteGmailMessage(email: string, messageId: string): Promise<void> {
  try {
    logger.info(`[Gmail Service] Deleting message ${messageId} for ${email}`);
    
    const gmail = await createGmailApiClient(email);
    
    // Move to trash
    await gmail.users.messages.trash({
      userId: 'me',
      id: messageId,
    });
    
    logger.info(`[Gmail Service] Successfully deleted message ${messageId}`);
    
  } catch (error) {
    logger.error(`[Gmail Service] Error deleting message:`, error);
    throw new Error(`Failed to delete message: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Get full Gmail message content
export async function getGmailMessageContent(email: string, messageId: string): Promise<string> {
  try {
    logger.info(`[Gmail Service] Getting full content for message ${messageId} for ${email}`);
    
    const gmail = await createGmailApiClient(email);
    
    const messageResponse = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });
    
    const msgData = messageResponse.data;
    let fullContent = '';
    
    // Extract content from message body or parts
    if (msgData.payload?.body?.data) {
      fullContent = decodeGmailBody(msgData.payload.body);
    } else if (msgData.payload?.parts) {
      fullContent = extractTextContent(msgData.payload.parts);
    }
    
    if (!fullContent) {
      fullContent = 'No readable content available for this message.';
    }
    
    logger.info(`[Gmail Service] Successfully retrieved content for message ${messageId}`);
    return fullContent;
    
  } catch (error) {
    logger.error(`[Gmail Service] Error getting message content:`, error);
    throw new Error(`Failed to get message content: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
