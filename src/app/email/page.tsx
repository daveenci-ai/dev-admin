'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Mail, 
  RefreshCw, 
  Trash2, 
  Archive, 
  AlertTriangle,
  X,
  Reply,
  Shield,
  Send
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';

interface EmailMessage {
  messageId: string;
  subject: string;
  fromAddress: string;
  fromName?: string;
  receivedTime: number | string;
  summary: string;
  flag?: string;
  mailboxEmail?: string;
  mailboxName?: string;
  isRead?: boolean;
  flagInfo?: string;
}

interface EmailStats {
  totalEmails: number;
  unreadEmails: number;
  sentEmails: number;
}

interface ZohoAccount {
  accountId: string;
  accountName: string;
  emailAddress: string;  // IMAP API uses emailAddress instead of primaryEmailAddress
  accountDisplayName: string;  // IMAP API field
  mailboxName: string;
  mailboxEmail: string;
  totalEmails: number;
  unreadEmails: number;
  isDefault: boolean;  // IMAP API field
  // Legacy fields (optional for backward compatibility)
  primaryEmailAddress?: string;
  displayName?: string;
  isOrganizationAccount?: boolean;
  accountCreatedTime?: string;
  isActive?: boolean;
}

export default function EmailPage() {
  const { data: session } = useSession();
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [accounts, setAccounts] = useState<ZohoAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMailbox, setSelectedMailbox] = useState<string>('');
  const [isReplyOpen, setIsReplyOpen] = useState(false);
  const [replyingToEmail, setReplyingToEmail] = useState<EmailMessage | null>(null);
  const [expandedEmails, setExpandedEmails] = useState<Set<string>>(new Set());
  const [emailBodies, setEmailBodies] = useState<Record<string, string>>({});

  // Compose form state
  const [composeForm, setComposeForm] = useState({
    to: '',
    subject: '',
    content: '',
    cc: '',
    bcc: ''
  });

  // Reply form state  
  const [replyForm, setReplyForm] = useState({
    to: '',
    subject: '',
    content: '',
    originalEmail: ''
  });

  // Count emails by mailbox
  const getEmailCountsForMailbox = (mailboxEmail: string) => {
    const mailboxEmails = emails.filter(email => email.mailboxEmail === mailboxEmail);
    const unreadEmails = mailboxEmails.filter(email => email.isRead === false || email.flagInfo?.includes('unread'));
    return {
      total: mailboxEmails.length,
      unread: unreadEmails.length
    };
  };

  // Fetch full email body for expanded view
  const fetchEmailBody = async (email: EmailMessage) => {
    console.warn('🚨 FETCH EMAIL BODY CALLED!', { messageId: email.messageId, mailbox: email.mailboxEmail });
    
    try {
      console.log('[Email Body] Fetching full body for:', email.messageId, 'from mailbox:', email.mailboxEmail);
      const url = `/api/email/body?messageId=${email.messageId}&mailboxEmail=${email.mailboxEmail}`;
      console.log('[Email Body] API URL:', url);
      
      console.warn('🌐 MAKING FETCH REQUEST to:', url);
      const response = await fetch(url);
      console.warn('📡 FETCH RESPONSE STATUS:', response.status, response.statusText);
      
      // Check if response is actually JSON
      const contentType = response.headers.get('content-type');
      console.warn('📄 CONTENT TYPE:', contentType);
      
      if (!contentType || !contentType.includes('application/json')) {
        const htmlText = await response.text();
        console.error('🚨 SERVER RETURNED HTML INSTEAD OF JSON:', htmlText.substring(0, 500));
        return `Server Error: Received HTML instead of JSON. Content: ${htmlText.substring(0, 200)}...`;
      }
      
      const data = await response.json();
      console.warn('📦 FETCH RESPONSE DATA:', data);
      
      console.log('[Email Body] Response status:', response.status);
      console.log('[Email Body] Response data:', data);
      
      if (response.ok) {
        console.warn('✅ SUCCESS: Returning email body');
        return data.body || 'No content available';
      } else {
        console.error('[Email Body] API Error:', data.error, data.details);
        console.warn('❌ API ERROR:', data.error, 'Details:', data.details);
        return `API Error: ${data.error || 'Failed to load email content'} - Details: ${data.details || 'No details'}`;
      }
    } catch (error) {
      console.error('[Email Body] Network/Parse Error:', error);
      console.warn('💥 NETWORK/PARSE ERROR:', error);
      return `Network Error: ${error instanceof Error ? error.message : 'Error loading email content'}`;
    }
  };

  // Handle email card click for expansion and mark as read
  const handleEmailCardClick = async (email: EmailMessage) => {
    const emailKey = `${email.mailboxEmail}-${email.messageId}`;
    
    if (expandedEmails.has(emailKey)) {
      // Collapse if already expanded
      console.log('[Email Card] Collapsing email:', email.subject);
      setExpandedEmails(prev => {
        const newSet = new Set(prev);
        newSet.delete(emailKey);
        return newSet;
      });
    } else {
      // Expand email, fetch body, and mark as read
      console.log('[Email Card] Expanding email:', email.subject);
      setExpandedEmails(prev => new Set(prev).add(emailKey));
      
      // Mark email as read in UI immediately
      setEmails(prevEmails => 
        prevEmails.map(e => 
          e.messageId === email.messageId && e.mailboxEmail === email.mailboxEmail
            ? { ...e, isRead: true, flagInfo: e.flagInfo?.replace('unread', '').trim() }
            : e
        )
      );
      
      // Fetch full body content
      if (!emailBodies[emailKey]) {
        const body = await fetchEmailBody(email);
        setEmailBodies(prev => ({ ...prev, [emailKey]: body }));
      }
      
      // Mark as read on server
      await markEmailAsRead(email);
    }
  };

  // Mark email as read via IMAP
  const markEmailAsRead = async (email: EmailMessage) => {
    try {
      console.log('[Mark Read] Marking email as read:', email.messageId);
      const response = await fetch('/api/email/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: email.messageId,
          mailboxEmail: email.mailboxEmail
        })
      });
      
      if (response.ok) {
        console.log('[Mark Read] Email marked as read successfully');
      } else {
        console.error('[Mark Read] Failed to mark email as read');
      }
    } catch (error) {
      console.error('[Mark Read] Error marking email as read:', error);
    }
  };

  // Fetch emails
  const fetchEmails = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/email/inbox?limit=20');
      const result = await response.json();
      
      if (result.success) {
        // IMAP API returns emails directly in result.data
        setEmails(result.data || []);
      } else {
        setError(result.error || 'Failed to fetch emails');
      }
    } catch (err) {
      setError('Failed to connect to email service');
      console.error('Error fetching emails:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch email statistics
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/email/stats');
      const result = await response.json();
      
      if (result.success) {
        // IMAP API returns total stats directly
        setStats({
          totalEmails: result.data?.totalEmails || 0,
          unreadEmails: result.data?.unreadEmails || 0,
          sentEmails: 0 // IMAP doesn't track sent folder in current implementation
        });
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  // Fetch all Zoho accounts
  const fetchAccounts = async () => {
    try {
      console.log('[Frontend] Fetching accounts...');
      const response = await fetch('/api/email/accounts');
      const result = await response.json();
      console.log('[Frontend] Accounts API response:', result);
      console.log('[Frontend] Accounts data:', result.data);
      
      if (result.success) {
        // IMAP API returns accounts directly in result.data
        const accountsData = result.data || [];
        console.log('[Frontend] Setting accounts:', accountsData);
        console.log('[Frontend] First account sample:', accountsData[0]);
        setAccounts(accountsData);
        
        // Set default selected mailbox based on logged-in user
        if (accountsData.length > 0 && !selectedMailbox) {
          const userEmail = session?.user?.email;
          if (userEmail) {
            const userAccount = accountsData.find((account: ZohoAccount) => 
              account.emailAddress === userEmail
            );
            if (userAccount) {
              setSelectedMailbox(userAccount.emailAddress);
              console.log('[Accounts] Set default mailbox to logged-in user:', userEmail);
            } else {
              // Fallback to first account if user's email not found
              setSelectedMailbox(accountsData[0].emailAddress);
              console.log('[Accounts] User email not found, defaulting to first account:', accountsData[0].emailAddress);
            }
          } else {
            // Fallback to first account if no user session
            setSelectedMailbox(accountsData[0].emailAddress);
            console.log('[Accounts] No user session, defaulting to first account:', accountsData[0].emailAddress);
          }
        }
      } else {
        console.error('[Frontend] Error fetching accounts:', result.error);
        setError(`Failed to fetch accounts: ${result.error}`);
      }
    } catch (err) {
      console.error('[Frontend] Error fetching accounts:', err);
      setError('Failed to connect to accounts service');
    }
  };

  // Send email
  const sendEmail = async () => {
    if (!composeForm.to || !composeForm.subject || !composeForm.content) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setIsSending(true);
      setError(null);

      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(composeForm),
      });

      const result = await response.json();

      if (result.success) {
        setIsComposeOpen(false);
        setComposeForm({ to: '', subject: '', content: '', cc: '', bcc: '' });
        fetchStats(); // Refresh stats
      } else {
        setError(result.error || 'Failed to send email');
      }
    } catch (err) {
      setError('Failed to send email');
      console.error('Error sending email:', err);
    } finally {
      setIsSending(false);
    }
  };

  // Format date
  const formatDate = (timestamp: number | string) => {
    if (!timestamp) return 'No Date';
    
    // Only log date debug for first few calls to avoid spam
    const shouldLog = Math.random() < 0.1; // 10% chance to log
    if (shouldLog) console.log('[Date Debug] Raw timestamp:', timestamp, 'Type:', typeof timestamp);
    
    try {
      // Handle different timestamp formats
      let date: Date;
      
      if (typeof timestamp === 'string') {
        // Try parsing as number first for string timestamps like "1753308528875"
        const numTimestamp = parseInt(timestamp);
        if (!isNaN(numTimestamp)) {
          if (shouldLog) console.log('[Date Debug] Parsed string to number:', numTimestamp);
          // Check if timestamp seems to be in future (likely wrong format)
          if (numTimestamp > Date.now() + (365 * 24 * 60 * 60 * 1000)) {
            if (shouldLog) console.log('[Date Debug] Future timestamp detected, trying seconds conversion');
            date = new Date(numTimestamp / 1000);
          } else {
            date = new Date(numTimestamp);
          }
        } else {
          if (shouldLog) console.log('[Date Debug] Using string as date directly');
          date = new Date(timestamp);
        }
      } else if (typeof timestamp === 'number') {
        // Check if timestamp is too far in future (wrong format)
        if (timestamp > Date.now() + (365 * 24 * 60 * 60 * 1000)) {
          if (shouldLog) console.log('[Date Debug] Future timestamp detected, converting from microseconds');
          date = new Date(timestamp / 1000);
        } else {
          if (shouldLog) console.log('[Date Debug] Using number timestamp directly:', timestamp);
          date = new Date(timestamp);
        }
      } else {
        if (shouldLog) console.log('[Date Debug] Invalid timestamp type');
        return 'Invalid Date';
      }
      
      if (shouldLog) console.log('[Date Debug] Created date object:', date, 'Valid:', !isNaN(date.getTime()));
      
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      
      // Format as relative time for recent emails
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      
      if (shouldLog) console.log('[Date Debug] Time diff:', { diffMs, diffHours, diffDays });
      
      if (diffHours < 1) {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
      } else if (diffHours < 24) {
        const hours = Math.floor(diffHours);
        return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
      } else if (diffDays < 7) {
        const days = Math.floor(diffDays);
        return `${days} day${days !== 1 ? 's' : ''} ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch (error) {
      if (shouldLog) console.error('[Date Debug] Error formatting date:', timestamp, error);
      return `Debug: ${timestamp}`;
    }
  };

  // Handle mailbox filter selection
  const handleMailboxClick = (mailboxEmail: string) => {
    console.log('[Mailbox Click] Clicked mailbox:', `"${mailboxEmail}"`, 'Currently selected:', `"${selectedMailbox}"`);
    console.log('[Mailbox Click] Available emails before filter:', emails.length);
    console.log('[Mailbox Click] Sample email mailboxEmails:', emails.slice(0, 3).map(e => e.mailboxEmail));
    
    // If clicking the same mailbox, deselect it (show all emails)
    if (selectedMailbox === mailboxEmail) {
      console.log('[Mailbox Click] Deselecting mailbox - showing all emails');
      setSelectedMailbox('');
    } else {
      console.log('[Mailbox Click] Selecting new mailbox:', `"${mailboxEmail}"`);
      console.log('[Mailbox Click] Emails matching this mailbox:', emails.filter(e => e.mailboxEmail === mailboxEmail).length);
      setSelectedMailbox(mailboxEmail);
    }
  };

  // Handle email actions
  const handleReply = (email: EmailMessage) => {
    setReplyingToEmail(email);
    setReplyForm({
      to: email.fromAddress,
      subject: email.subject?.startsWith('Re:') ? email.subject : `Re: ${email.subject}`,
      content: '',
      originalEmail: `\n\n--- Original Message ---\nFrom: ${email.fromAddress}\nSubject: ${email.subject}\nDate: ${formatDate(email.receivedTime)}\n\n${email.summary || ''}`
    });
    setIsReplyOpen(true);
  };

  const handleArchive = async (email: EmailMessage) => {
    // Determine if email is unread for count updates
    const isUnread = email.isRead === false || email.flagInfo?.includes('unread');
    
    try {
      console.log('[Archive] Archiving email:', email.messageId, email.subject);
      
      // OPTIMISTIC UPDATE: Remove from UI and update counts immediately
      setEmails(prevEmails => {
        const filteredEmails = prevEmails.filter(e => e.messageId !== email.messageId);
        console.log('[Archive] Removed from UI (optimistic)');
        return filteredEmails;
      });

      // Update account counts optimistically
      setAccounts(prevAccounts => {
        return prevAccounts.map(account => {
          if (account.emailAddress === email.mailboxEmail) {
            return {
              ...account,
              totalEmails: Math.max(0, account.totalEmails - 1),
              unreadEmails: isUnread ? Math.max(0, account.unreadEmails - 1) : account.unreadEmails
            };
          }
          return account;
        });
      });

      // Call API to actually archive the email in Zoho in background
      const response = await fetch('/api/email/archive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId: email.messageId,
          mailboxEmail: email.mailboxEmail
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log('[Archive] Email archived in Zoho successfully (background)');
      } else {
        console.error('[Archive] API error:', result.error);
        
        // ROLLBACK: Restore email to UI and account counts if API call failed
        setEmails(prevEmails => {
          console.log('[Archive] Rolling back - restoring email to UI');
          return [...prevEmails, email].sort((a, b) => {
            const timeA = typeof a.receivedTime === 'number' ? a.receivedTime : 0;
            const timeB = typeof b.receivedTime === 'number' ? b.receivedTime : 0;
            return timeB - timeA;
          });
        });
        
        // Restore account counts
        setAccounts(prevAccounts => {
          return prevAccounts.map(account => {
            if (account.emailAddress === email.mailboxEmail) {
              return {
                ...account,
                totalEmails: account.totalEmails + 1,
                unreadEmails: isUnread ? account.unreadEmails + 1 : account.unreadEmails
              };
            }
            return account;
          });
        });
        
        setError(`Failed to archive email: ${result.error}`);
      }
    } catch (error) {
      console.error('[Archive] Error archiving email:', error);
      
      // ROLLBACK: Restore email to UI and account counts if network error
      setEmails(prevEmails => {
        console.log('[Archive] Rolling back due to network error - restoring email to UI');
        return [...prevEmails, email].sort((a, b) => {
          const timeA = typeof a.receivedTime === 'number' ? a.receivedTime : 0;
          const timeB = typeof b.receivedTime === 'number' ? b.receivedTime : 0;
          return timeB - timeA;
        });
      });
      
      // Restore account counts
      setAccounts(prevAccounts => {
        return prevAccounts.map(account => {
          if (account.emailAddress === email.mailboxEmail) {
            return {
              ...account,
              totalEmails: account.totalEmails + 1,
              unreadEmails: isUnread ? account.unreadEmails + 1 : account.unreadEmails
            };
          }
          return account;
        });
      });
      
      setError('Failed to archive email - network error');
    }
  };

  const handleSpam = async (email: EmailMessage) => {
    // Determine if email is unread for count updates
    const isUnread = email.isRead === false || email.flagInfo?.includes('unread');
    
    try {
      console.log('[Spam] Marking email as spam:', email.messageId, email.subject);
      
      // OPTIMISTIC UPDATE: Remove from UI and update counts immediately
      setEmails(prevEmails => {
        const filteredEmails = prevEmails.filter(e => e.messageId !== email.messageId);
        console.log('[Spam] Removed from UI (optimistic)');
        return filteredEmails;
      });

      // Update account counts optimistically
      setAccounts(prevAccounts => {
        return prevAccounts.map(account => {
          if (account.emailAddress === email.mailboxEmail) {
            return {
              ...account,
              totalEmails: Math.max(0, account.totalEmails - 1),
              unreadEmails: isUnread ? Math.max(0, account.unreadEmails - 1) : account.unreadEmails
            };
          }
          return account;
        });
      });

      // Call API to actually mark the email as spam in Zoho in background
      const response = await fetch('/api/email/spam', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId: email.messageId,
          mailboxEmail: email.mailboxEmail
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log('[Spam] Email marked as spam in Zoho successfully (background)');
      } else {
        console.error('[Spam] API error:', result.error);
        
        // ROLLBACK: Restore email to UI and account counts if API call failed
        setEmails(prevEmails => {
          console.log('[Spam] Rolling back - restoring email to UI');
          return [...prevEmails, email].sort((a, b) => {
            const timeA = typeof a.receivedTime === 'number' ? a.receivedTime : 0;
            const timeB = typeof b.receivedTime === 'number' ? b.receivedTime : 0;
            return timeB - timeA;
          });
        });
        
        // Restore account counts
        setAccounts(prevAccounts => {
          return prevAccounts.map(account => {
            if (account.emailAddress === email.mailboxEmail) {
              return {
                ...account,
                totalEmails: account.totalEmails + 1,
                unreadEmails: isUnread ? account.unreadEmails + 1 : account.unreadEmails
              };
            }
            return account;
          });
        });
        
        setError(`Failed to mark email as spam: ${result.error}`);
      }
    } catch (error) {
      console.error('[Spam] Error marking email as spam:', error);
      
      // ROLLBACK: Restore email to UI and account counts if network error
      setEmails(prevEmails => {
        console.log('[Spam] Rolling back due to network error - restoring email to UI');
        return [...prevEmails, email].sort((a, b) => {
          const timeA = typeof a.receivedTime === 'number' ? a.receivedTime : 0;
          const timeB = typeof b.receivedTime === 'number' ? b.receivedTime : 0;
          return timeB - timeA;
        });
      });
      
      // Restore account counts
      setAccounts(prevAccounts => {
        return prevAccounts.map(account => {
          if (account.emailAddress === email.mailboxEmail) {
            return {
              ...account,
              totalEmails: account.totalEmails + 1,
              unreadEmails: isUnread ? account.unreadEmails + 1 : account.unreadEmails
            };
          }
          return account;
        });
      });
      
      setError('Failed to mark email as spam - network error');
    }
  };

  const handleTrash = async (email: EmailMessage) => {
    // Determine if email is unread for count updates
    const isUnread = email.isRead === false || email.flagInfo?.includes('unread');
    
    try {
      console.log('[Trash] Deleting email:', email.messageId, email.subject);
      
      // OPTIMISTIC UPDATE: Remove from UI and update counts immediately
      
      setEmails(prevEmails => {
        const filteredEmails = prevEmails.filter(e => e.messageId !== email.messageId);
        console.log('[Trash] Removed from UI (optimistic)');
        return filteredEmails;
      });

      // Update account counts optimistically
      setAccounts(prevAccounts => {
        return prevAccounts.map(account => {
          if (account.emailAddress === email.mailboxEmail) {
            return {
              ...account,
              totalEmails: Math.max(0, account.totalEmails - 1),
              unreadEmails: isUnread ? Math.max(0, account.unreadEmails - 1) : account.unreadEmails
            };
          }
          return account;
        });
      });

      // Call API to actually delete the email from Zoho in background
      const response = await fetch('/api/email/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId: email.messageId,
          mailboxEmail: email.mailboxEmail
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log('[Trash] Email deleted from Zoho successfully (background)');
      } else {
        console.error('[Trash] API error:', result.error);
        
        // ROLLBACK: Restore email to UI and account counts if API call failed
        setEmails(prevEmails => {
          console.log('[Trash] Rolling back - restoring email to UI');
          return [...prevEmails, email].sort((a, b) => {
            const timeA = typeof a.receivedTime === 'number' ? a.receivedTime : 0;
            const timeB = typeof b.receivedTime === 'number' ? b.receivedTime : 0;
            return timeB - timeA;
          });
        });
        
        // Restore account counts
        setAccounts(prevAccounts => {
          return prevAccounts.map(account => {
            if (account.emailAddress === email.mailboxEmail) {
              return {
                ...account,
                totalEmails: account.totalEmails + 1,
                unreadEmails: isUnread ? account.unreadEmails + 1 : account.unreadEmails
              };
            }
            return account;
          });
        });
        
        setError(`Failed to delete email: ${result.error}`);
      }
    } catch (error) {
      console.error('[Trash] Error trashing email:', error);
      
      // ROLLBACK: Restore email to UI and account counts if network error
      setEmails(prevEmails => {
        console.log('[Trash] Rolling back due to network error - restoring email to UI');
        return [...prevEmails, email].sort((a, b) => {
          const timeA = typeof a.receivedTime === 'number' ? a.receivedTime : 0;
          const timeB = typeof b.receivedTime === 'number' ? b.receivedTime : 0;
          return timeB - timeA;
        });
      });
      
      // Restore account counts
      setAccounts(prevAccounts => {
        return prevAccounts.map(account => {
          if (account.emailAddress === email.mailboxEmail) {
            return {
              ...account,
              totalEmails: account.totalEmails + 1,
              unreadEmails: isUnread ? account.unreadEmails + 1 : account.unreadEmails
            };
          }
          return account;
        });
      });
      
      setError('Failed to delete email - network error');
    }
  };

  // Send reply
  const sendReply = async () => {
    if (!replyForm.to || !replyForm.subject || !replyForm.content) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setIsSending(true);
      setError(null);

      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: replyForm.to,
          subject: replyForm.subject,
          content: replyForm.content + replyForm.originalEmail
        }),
      });

      const result = await response.json();

      if (result.success) {
        setIsReplyOpen(false);
        setReplyingToEmail(null);
        setReplyForm({ to: '', subject: '', content: '', originalEmail: '' });
        // Refresh emails to show the sent reply
        fetchEmails();
      } else {
        setError(result.error || 'Failed to send reply');
      }
    } catch (err) {
      setError('Failed to send reply');
      console.error('Error sending reply:', err);
    } finally {
      setIsSending(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchAccounts();
    fetchEmails();
    fetchStats();
  }, []);

  // Debug when selectedMailbox changes
  useEffect(() => {
    console.log('[State Change] selectedMailbox changed to:', `"${selectedMailbox}"`);
    console.log('[State Change] Total emails available:', emails.length);
    if (selectedMailbox && emails.length > 0) {
      const matchingEmails = emails.filter(email => {
        const emailMailbox = email.mailboxEmail?.trim()?.toLowerCase();
        const selectedMailboxLower = selectedMailbox?.trim()?.toLowerCase();
        return emailMailbox === selectedMailboxLower;
      });
      console.log('[State Change] Emails that should match filter:', matchingEmails.length);
      console.log('[State Change] Matching emails sample:', matchingEmails.slice(0, 2).map(e => ({ subject: e.subject, mailboxEmail: e.mailboxEmail })));
    }
  }, [selectedMailbox, emails]);

  // Filter emails based on selected mailbox
  const filteredEmails = selectedMailbox ? emails.filter(email => {
    const emailMailbox = email.mailboxEmail?.trim()?.toLowerCase();
    const selectedMailboxLower = selectedMailbox?.trim()?.toLowerCase();
    const matches = emailMailbox === selectedMailboxLower;
    
    // if (!matches && selectedMailbox) {
    //   console.log('[Filter Debug] Email mailbox:', `"${email.mailboxEmail}"`, 'vs selected:', `"${selectedMailbox}"`, 'match:', matches);
    //   console.log('[Filter Debug] After normalization - Email:', `"${emailMailbox}"`, 'vs Selected:', `"${selectedMailboxLower}"`);
    // }
    return matches;
  }) : emails;
  
  // Debug filtered emails count
  console.log('[Filter Debug] Selected mailbox:', `"${selectedMailbox}"`, 'Total emails:', emails.length, 'Filtered emails:', filteredEmails.length);
  
  // Additional debug: show first few emails and their mailbox info
  if (selectedMailbox && emails.length > 0) {
    console.log('[Filter Debug] Available unique mailboxEmail values:', Array.from(new Set(emails.map(e => e.mailboxEmail).filter(Boolean))));
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Mailbox Filter Cards */}
        {accounts.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
            {(() => {
              // Define custom order: Astrid -> Hello -> Ops -> Anton
              const orderPriority = {
                'astrid@daveenci.ai': 1,
                'hello@daveenci.ai': 2,
                'ops@daveenci.ai': 3,
                'anton.osipov@daveenci.ai': 4
              };
              
              const sortedAccounts = [...accounts].sort((a, b) => {
                const priorityA = orderPriority[a.emailAddress as keyof typeof orderPriority] || 999;
                const priorityB = orderPriority[b.emailAddress as keyof typeof orderPriority] || 999;
                return priorityA - priorityB;
              });
              
              return sortedAccounts.map((account) => {
                const isActive = selectedMailbox === account.emailAddress;
                const mailboxName = account.mailboxName || account.accountDisplayName || account.accountName;
                const colors = {
                  'anton.osipov@daveenci.ai': { color: 'text-blue-600', hoverBg: 'hover:bg-blue-50', borderColor: 'border-b-blue-500', activeBg: 'bg-blue-50', activeBorder: 'border-blue-500' },
                  'astrid@daveenci.ai': { color: 'text-purple-600', hoverBg: 'hover:bg-purple-50', borderColor: 'border-b-purple-500', activeBg: 'bg-purple-50', activeBorder: 'border-purple-500' },
                  'hello@daveenci.ai': { color: 'text-green-600', hoverBg: 'hover:bg-green-50', borderColor: 'border-b-green-500', activeBg: 'bg-green-50', activeBorder: 'border-green-500' },
                  'support@daveenci.ai': { color: 'text-yellow-600', hoverBg: 'hover:bg-yellow-50', borderColor: 'border-b-yellow-500', activeBg: 'bg-yellow-50', activeBorder: 'border-yellow-500' },
                  'ops@daveenci.ai': { color: 'text-red-600', hoverBg: 'hover:bg-red-50', borderColor: 'border-b-red-500', activeBg: 'bg-red-50', activeBorder: 'border-red-500' }
                };
                
                const colorScheme = colors[account.emailAddress as keyof typeof colors] || colors['anton.osipov@daveenci.ai'];
                
                // Use stats directly from IMAP API
                const unreadCount = account.unreadEmails || 0;
                const totalCount = account.totalEmails || 0;
                
                return (
                  <div 
                    key={account.accountId}
                    onClick={(e) => {
                      console.log(`[Card Click] Clicked on card for: "${account.emailAddress}"`);
                      console.log(`[Card Click] Account name: "${account.mailboxName}"`);
                      handleMailboxClick(account.emailAddress);
                    }}
                    className={`bg-white p-4 rounded-lg shadow-sm transition-all duration-200 cursor-pointer ${
                      isActive 
                        ? `${colorScheme.activeBg} border-2 ${colorScheme.activeBorder} shadow-md scale-105` 
                        : `border border-gray-200 ${colorScheme.borderColor} border-b-2 ${colorScheme.hoverBg} hover:shadow-md`
                    }`}
                  >
                    {/* Name in bold - top row */}
                    <div className={`text-lg font-bold ${colorScheme.color} mb-1 truncate`}>
                      {mailboxName || 'Mailbox'}
                    </div>
                    
                    {/* Email address in gray - 2nd row */}
                    <div className="text-xs text-gray-500 mb-2 truncate">
                      {account.emailAddress}
                    </div>
                    
                    {/* Unread / Total emails - 3rd row */}
                    <div className="text-sm text-gray-700 font-medium">
                      {unreadCount} Unread, {totalCount} Total
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}

        {/* Email List */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {selectedMailbox ? (
                <>
                  <span className="text-blue-600">Filtered:</span> {accounts.find(a => a.emailAddress === selectedMailbox)?.mailboxName || selectedMailbox} Emails
                </>
              ) : (
                'All Emails'
              )}
            </h2>
            <div className="flex items-center gap-3">
              {selectedMailbox && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    console.log('[Show All] Clearing mailbox filter');
                    setSelectedMailbox('');
                  }}
                  className="text-xs"
                >
                  <X className="w-3 h-3 mr-1" />
                  Show All
                </Button>
              )}
              <Badge variant="secondary">
                {filteredEmails.length} emails
                <Button 
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    console.log('[Refresh] Refreshing data, current selectedMailbox:', `"${selectedMailbox}"`);
                    fetchAccounts();
                    fetchEmails();
                    fetchStats();
                  }} 
                  className="ml-2 p-1 h-6 w-6"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </Badge>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-500">Loading emails...</p>
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No emails found</p>
              <p className="text-gray-400 text-sm">Check your Zoho Mail configuration</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEmails
                .sort((a, b) => {
                  // Sort by date, newest first
                  const timeA = typeof a.receivedTime === 'string' ? new Date(a.receivedTime).getTime() : a.receivedTime;
                  const timeB = typeof b.receivedTime === 'string' ? new Date(b.receivedTime).getTime() : b.receivedTime;
                  return timeB - timeA;
                })
                .map((email, index) => {
                  const isUnread = email.isRead === false || email.flagInfo?.includes('unread');
                  const emailKey = `${email.mailboxEmail}-${email.messageId}`;
                  const isExpanded = expandedEmails.has(emailKey);
                  const emailBody = emailBodies[emailKey];
                  
                  return (
                    <div
                      key={`${email.mailboxEmail}-${email.messageId}-${index}`}
                      className={`border border-gray-200 rounded-lg p-4 transition-all duration-300 cursor-pointer ${
                        isUnread ? 'bg-blue-50 border-blue-200' : 'bg-white'
                      } ${isExpanded ? 'shadow-lg border-blue-400' : 'hover:bg-gray-50 hover:shadow-md'}`}
                      onClick={() => handleEmailCardClick(email)}
                    >
                      <div className="relative">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 pr-4">
                            <div className="flex items-center gap-3 mb-2">
                              {isUnread && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" title="Unread email" />
                              )}
                              <h3 className={`${isUnread ? 'font-bold' : 'font-medium'} text-gray-900 truncate`}>
                                {email.subject || 'No Subject'}
                              </h3>
                              {email.flag && (
                                <Badge variant="outline" className="text-xs">
                                  {email.flag}
                                </Badge>
                              )}
                              {isExpanded && (
                                <Badge variant="secondary" className="text-xs">
                                  Expanded
                                </Badge>
                              )}
                            </div>
                            <p className={`text-sm text-gray-600 mb-2 ${isUnread ? 'font-medium' : ''}`}>
                              From: {email.fromName && email.fromName !== email.fromAddress 
                                ? `${email.fromName} (${email.fromAddress})` 
                                : email.fromAddress}
                            </p>
                            
                            {/* Email Body - Full when expanded, only show if not placeholder */}
                            {isExpanded ? (
                              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                {emailBody && emailBody !== 'Click to expand and view full email content' ? (
                                  <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">
                                    {emailBody}
                                  </div>
                                ) : (
                                  <div className="text-center py-4">
                                    <RefreshCw className="w-4 h-4 text-gray-400 animate-spin mx-auto mb-2" />
                                    <p className="text-gray-500 text-xs">Loading full email content...</p>
                                  </div>
                                )}
                              </div>
                            ) : (
                              // Only show summary if it's not the placeholder text
                              email.summary && 
                              email.summary !== 'No content available' && 
                              email.summary !== 'Click to expand and view full email content' && (
                                <p className="text-sm text-gray-500 line-clamp-2">
                                  {email.summary}
                                </p>
                              )
                            )}
                          </div>
                          <div className="flex flex-col items-end text-sm text-gray-500">
                            <div className="flex items-center mb-1">
                              <span className={isUnread ? 'font-medium text-gray-700' : ''}>
                              {formatDate(email.receivedTime)}
                            </span>
                            </div>
                            {email.mailboxName && (
                              <div className="text-xs text-gray-400">
                                {email.mailboxName}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Bottom row with expand/collapse button and action buttons */}
                        <div className="flex justify-between items-center mt-4">
                          {/* Click to expand - Bottom Left */}
                          <div className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                            {isExpanded ? 'Click to collapse' : 'Click to expand'}
                          </div>
                          
                          {/* Email Action Buttons - Bottom Right */}
                          <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReply(email);
                            }}
                            className="text-xs px-3 py-1 h-7"
                          >
                            <Reply className="w-3 h-3 mr-1" />
                            Reply
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              console.log('[Button Click] Archive button clicked for email:', email.messageId);
                              e.stopPropagation();
                              handleArchive(email);
                            }}
                            className="text-xs px-3 py-1 h-7"
                          >
                            <Archive className="w-3 h-3 mr-1" />
                            Archive
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              console.log('[Button Click] Spam button clicked for email:', email.messageId);
                              e.stopPropagation();
                              handleSpam(email);
                            }}
                            className="text-xs px-3 py-1 h-7 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                          >
                            <Shield className="w-3 h-3 mr-1" />
                            Spam
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              console.log('[Button Click] Trash button clicked');
                              console.log('[Button Click] Email messageId:', email.messageId);
                              console.log('[Button Click] Email mailboxEmail:', email.mailboxEmail);
                              console.log('[Button Click] Email subject:', email.subject);
                              console.log('[Button Click] Email from:', email.fromAddress);
                              console.log('[Button Click] Full email object:', email);
                              e.stopPropagation();
                              handleTrash(email);
                            }}
                            className="text-xs px-3 py-1 h-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Trash
                          </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </Card>

                {/* Reply Email Modal */}
        <Modal 
          isOpen={isReplyOpen} 
          onClose={() => setIsReplyOpen(false)}
          className="w-[90vw] max-w-none h-[90vh] overflow-hidden flex flex-col"
        >
          <div className="p-6 flex-1 overflow-y-auto">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Reply to Email</h2>
            
            {/* Original Email Content Only */}
            {replyingToEmail && replyingToEmail.summary && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{replyingToEmail.summary}</p>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To *
                </label>
                <Input
                  type="email"
                  value={replyForm.to}
                  onChange={(e) => setReplyForm({ ...replyForm, to: e.target.value })}
                  disabled
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject *
                </label>
                <Input
                  value={replyForm.subject}
                  onChange={(e) => setReplyForm({ ...replyForm, subject: e.target.value })}
                  disabled
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Reply *
                </label>
                <Textarea
                  placeholder="Type your reply here..."
                  rows={8}
                  value={replyForm.content}
                  onChange={(e) => setReplyForm({ ...replyForm, content: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsReplyOpen(false)}
                  disabled={isSending}
                >
                  Cancel
                </Button>
                <Button onClick={sendReply} disabled={isSending}>
                  {isSending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Reply
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
