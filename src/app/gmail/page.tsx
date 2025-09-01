'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import DOMPurify from 'dompurify';
import { 
  Mail, 
  RefreshCw, 
  Trash2, 
  Archive, 
  AlertTriangle,
  X,
  Reply,
  Shield,
  Send,
  Plus,
  CheckCircle,
  ExternalLink,
  Settings
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/layout/PageHeader'

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

interface GmailAccount {
  accountId: string;
  accountName: string;
  emailAddress: string;
  accountDisplayName: string;
  mailboxName: string;
  mailboxEmail: string;
  totalEmails: number;
  unreadEmails: number;
  isDefault: boolean;
  lastSyncAt?: Date;
  error?: string;
}

// Helper function to safely render HTML content
const sanitizeAndRenderHTML = (htmlContent: string): { __html: string } => {
  if (typeof window === 'undefined') {
    // Server-side: return as-is for now
    return { __html: htmlContent };
  }
  
  // Client-side: sanitize HTML
  const cleanHTML = DOMPurify.sanitize(htmlContent, {
    ALLOWED_TAGS: ['p', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 'u', 'div', 'span'],
    ALLOWED_ATTR: []
  });
  
  return { __html: cleanHTML };
};

// Helper function to detect if content is HTML
const isHTMLContent = (content: string): boolean => {
  return content.includes('<') && (
    content.includes('<p>') || 
    content.includes('<div>') || 
    content.includes('<h1>') || 
    content.includes('<h2>') || 
    content.includes('<h3>') || 
    content.includes('<ul>') || 
    content.includes('<li>') ||
    content.includes('<br>')
  );
};

export default function GmailPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [accounts, setAccounts] = useState<GmailAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedMailbox, setSelectedMailbox] = useState<string>('');
  const [isReplyOpen, setIsReplyOpen] = useState(false);
  const [replyingToEmail, setReplyingToEmail] = useState<EmailMessage | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

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

  // Mark email as read
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

  // Handle OAuth callback parameters
  useEffect(() => {
    const error = searchParams.get('error');
    const success = searchParams.get('success');
    const email = searchParams.get('email');

    if (error) {
      switch (error) {
        case 'oauth_denied':
          setError('Gmail access was denied. Please try again and grant the necessary permissions.');
          break;
        case 'no_code':
          setError('No authorization code received from Gmail. Please try again.');
          break;
        case 'callback_failed':
          setError('Failed to complete Gmail authorization. Please try again.');
          break;
        default:
          setError('Gmail authorization failed. Please try again.');
      }
    } else if (success === 'connected' && email) {
      setSuccessMessage(`Successfully connected Gmail account: ${email}`);
      // Refresh accounts and emails
      setTimeout(() => {
        fetchAccounts();
        fetchEmails();
      }, 1000);
    }

    // Clear URL parameters after handling
    if (error || success) {
      const url = new URL(window.location.href);
      url.searchParams.delete('error');
      url.searchParams.delete('success');
      url.searchParams.delete('email');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams]);

  // Connect Gmail account
  const connectGmailAccount = async (email?: string) => {
    try {
      setIsConnecting(true);
      setError(null);
      
      const params = email ? `?email=${encodeURIComponent(email)}` : '';
      window.location.href = `/api/gmail/oauth/authorize${params}`;
    } catch (err) {
      setError('Failed to start Gmail connection');
      console.error('Error starting OAuth flow:', err);
      setIsConnecting(false);
    }
  };

  // Disconnect Gmail account
  const disconnectGmailAccount = async (email: string) => {
    try {
      const response = await fetch(`/api/gmail/oauth/accounts?email=${encodeURIComponent(email)}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        setSuccessMessage(`Successfully disconnected Gmail account: ${email}`);
        fetchAccounts();
        // Clear emails if this was the selected account
        if (selectedMailbox === email) {
          setSelectedMailbox('');
          setEmails([]);
        }
      } else {
        setError(result.error || 'Failed to disconnect Gmail account');
      }
    } catch (err) {
      setError('Failed to disconnect Gmail account');
      console.error('Error disconnecting account:', err);
    }
  };

  // Fetch emails using Gmail OAuth2 API
  const fetchEmails = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const emailParam = selectedMailbox ? `?email=${encodeURIComponent(selectedMailbox)}&limit=20` : '?limit=20';
      const response = await fetch(`/api/gmail/emails${emailParam}`);
      const result = await response.json();
      
      if (result.success) {
        setEmails(result.data || []);
        if (result.message) {
          setError(result.message); // Show informational message
        }
      } else {
        setError(result.error || 'Failed to fetch Gmail emails');
      }
    } catch (err) {
      setError('Failed to connect to Gmail service');
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
        setStats({
          totalEmails: result.data?.totalEmails || 0,
          unreadEmails: result.data?.unreadEmails || 0,
          sentEmails: 0
        });
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  // Fetch Gmail OAuth2 accounts
  const fetchAccounts = async () => {
    try {
      console.log('[Gmail] Fetching Gmail OAuth2 accounts...');
      const response = await fetch('/api/gmail/accounts');
      const result = await response.json();
      console.log('[Gmail] Accounts API response:', result);
      
      if (result.success) {
        const gmailAccounts = result.data || [];
        console.log('[Gmail] Setting Gmail accounts:', gmailAccounts);
        setAccounts(gmailAccounts);
        
        // Set default selected mailbox based on logged-in user
        if (gmailAccounts.length > 0 && !selectedMailbox) {
          const userEmail = session?.user?.email;
          if (userEmail) {
            const userAccount = gmailAccounts.find((account: GmailAccount) => 
              account.emailAddress === userEmail
            );
            if (userAccount) {
              setSelectedMailbox(userAccount.emailAddress);
              console.log('[Gmail] Set default mailbox to logged-in user:', userEmail);
            } else {
              // Fallback to first account
              setSelectedMailbox(gmailAccounts[0].emailAddress);
              console.log('[Gmail] User email not found, defaulting to first account');
            }
          } else {
            // Fallback to first account if no user session
            setSelectedMailbox(gmailAccounts[0].emailAddress);
            console.log('[Gmail] No user session, defaulting to first account:', gmailAccounts[0].emailAddress);
          }
        }

        if (result.message) {
          setError(result.message); // Show informational message if no accounts
        }
      } else {
        console.error('[Gmail] Error fetching accounts:', result.error);
        setError(`Failed to fetch Gmail accounts: ${result.error}`);
      }
    } catch (err) {
      console.error('[Gmail] Error fetching accounts:', err);
      setError('Failed to connect to Gmail service');
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
    
    try {
      let date: Date;
      
      if (typeof timestamp === 'string') {
        const numTimestamp = parseInt(timestamp);
        if (!isNaN(numTimestamp)) {
          if (numTimestamp > Date.now() + (365 * 24 * 60 * 60 * 1000)) {
            date = new Date(numTimestamp / 1000);
          } else {
            date = new Date(numTimestamp);
          }
        } else {
          date = new Date(timestamp);
        }
      } else if (typeof timestamp === 'number') {
        if (timestamp > Date.now() + (365 * 24 * 60 * 60 * 1000)) {
          date = new Date(timestamp / 1000);
        } else {
          date = new Date(timestamp);
        }
      } else {
        return 'Invalid Date';
      }
      
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      
      // Format as relative time for recent emails
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      
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
      console.error('[Date Debug] Error formatting date:', timestamp, error);
      return `Debug: ${timestamp}`;
    }
  };

  // Handle mailbox filter selection
  const handleMailboxClick = (mailboxEmail: string) => {
    console.log('[Gmail Mailbox Click] Clicked mailbox:', `"${mailboxEmail}"`, 'Currently selected:', `"${selectedMailbox}"`);
    
    // If clicking the same mailbox, deselect it (show all emails)
    if (selectedMailbox === mailboxEmail) {
      console.log('[Gmail Mailbox Click] Deselecting mailbox - showing all emails');
      setSelectedMailbox('');
    } else {
      console.log('[Gmail Mailbox Click] Selecting new mailbox:', `"${mailboxEmail}"`);
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

  // Email action handlers using Gmail OAuth2 API
  const handleEmailAction = async (email: EmailMessage, action: string, actionName: string) => {
    const isUnread = email.isRead === false || email.flagInfo?.includes('unread');
    
    try {
      console.log(`[Gmail ${actionName}] ${actionName} email:`, email.messageId, email.subject);
      
      // OPTIMISTIC UPDATE: Remove from UI and update counts immediately
      setEmails(prevEmails => {
        const filteredEmails = prevEmails.filter(e => e.messageId !== email.messageId);
        console.log(`[Gmail ${actionName}] Removed from UI (optimistic)`);
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

      // Call Gmail OAuth2 API
      const response = await fetch('/api/gmail/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: action,
          email: email.mailboxEmail,
          messageId: email.messageId
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log(`[Gmail ${actionName}] Email ${action} successful`);
      } else {
        console.error(`[Gmail ${actionName}] API error:`, result.error);
        
        // ROLLBACK: Restore email to UI and account counts if API call failed
        setEmails(prevEmails => {
          console.log(`[Gmail ${actionName}] Rolling back - restoring email to UI`);
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
        
        setError(`Failed to ${action} email: ${result.error}`);
      }
    } catch (error) {
      console.error(`[Gmail ${actionName}] Error:`, error);
      setError(`Failed to ${action} email - network error`);
    }
  };

  const handleArchive = async (email: EmailMessage) => {
    await handleEmailAction(email, 'archive', 'Archive');
  };

  const handleSpam = async (email: EmailMessage) => {
    await handleEmailAction(email, 'markAsSpam', 'Spam');
  };

  const handleTrash = async (email: EmailMessage) => {
    await handleEmailAction(email, 'delete', 'Trash');
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

  // Auto-dismiss messages after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Filter emails based on selected mailbox
  const filteredEmails = selectedMailbox ? emails.filter(email => {
    const emailMailbox = email.mailboxEmail?.trim()?.toLowerCase();
    const selectedMailboxLower = selectedMailbox?.trim()?.toLowerCase();
    return emailMailbox === selectedMailboxLower;
  }) : emails;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <PageHeader title="Gmail">
          <div className="hidden md:flex items-center gap-2">
            {accounts.length > 0 && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedMailbox('');
                    setError(null);
                    setSuccessMessage(null);
                  }}
                >
                  Reset Filters
                </Button>
                <Button
                  onClick={() => {
                    fetchAccounts();
                    fetchEmails();
                    fetchStats();
                  }}
                >
                  Refresh
                </Button>
              </>
            )}
            <Button
              onClick={() => connectGmailAccount()}
              disabled={isConnecting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isConnecting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  {accounts.length > 0 ? 'Add Account' : 'Connect Gmail'}
                </>
              )}
            </Button>
          </div>
        </PageHeader>
        
        {/* Success Alert */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4 flex items-center">
            <CheckCircle className="w-5 h-5 mr-2" />
            {successMessage}
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Connected Gmail Accounts */}
        {accounts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {accounts.map((account) => {
              const isActive = selectedMailbox === account.emailAddress;
              const mailboxName = account.mailboxName || account.accountDisplayName || account.accountName;
              
              // Dynamic colors based on email domain
              const getColorScheme = (email: string) => {
                if (email.includes('gmail')) {
                  return { 
                    color: 'text-red-600', 
                    hoverBg: 'hover:bg-red-50', 
                    borderColor: 'border-b-red-500', 
                    activeBg: 'bg-red-50', 
                    activeBorder: 'border-red-500' 
                  };
                }
                return { 
                  color: 'text-blue-600', 
                  hoverBg: 'hover:bg-blue-50', 
                  borderColor: 'border-b-blue-500', 
                  activeBg: 'bg-blue-50', 
                  activeBorder: 'border-blue-500' 
                };
              };
              
              const colorScheme = getColorScheme(account.emailAddress);
              const unreadCount = account.unreadEmails || 0;
              const totalCount = account.totalEmails || 0;
              
              return (
                <div 
                  key={account.accountId}
                  className={`bg-white p-6 rounded-lg shadow-sm transition-all duration-200 relative ${
                    isActive 
                      ? `${colorScheme.activeBg} border-2 ${colorScheme.activeBorder} shadow-md scale-105` 
                      : `border border-gray-200 ${colorScheme.borderColor} border-b-2 ${colorScheme.hoverBg} hover:shadow-md cursor-pointer`
                  }`}
                  onClick={() => {
                    console.log(`[Gmail Card Click] Clicked on card for: "${account.emailAddress}"`);
                    handleMailboxClick(account.emailAddress);
                  }}
                >
                  {/* Disconnect button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      disconnectGmailAccount(account.emailAddress);
                    }}
                    className="absolute top-2 right-2 text-gray-400 hover:text-red-600 transition-colors p-1"
                    title="Disconnect account"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  {/* Gmail icon and name */}
                  <div className="flex items-center mb-2">
                    <Mail className={`w-5 h-5 mr-2 ${colorScheme.color}`} />
                    <div className={`text-xl font-bold ${colorScheme.color} truncate`}>
                      {mailboxName || 'Gmail Account'}
                    </div>
                  </div>
                  
                  {/* Email address */}
                  <div className="text-sm text-gray-500 mb-3 truncate">
                    {account.emailAddress}
                  </div>
                  
                  {/* Stats */}
                  <div className="text-base text-gray-700 font-medium">
                    <span className="text-2xl font-bold">{unreadCount}</span> Unread
                    <span className="text-gray-400 mx-2">•</span>
                    <span className="text-lg">{totalCount}</span> Total
                  </div>

                  {/* Last sync info */}
                  {account.lastSyncAt && (
                    <div className="text-xs text-gray-400 mt-2">
                      Last synced: {new Date(account.lastSyncAt).toLocaleString()}
                    </div>
                  )}

                  {/* Error indicator */}
                  {account.error && (
                    <div className="text-xs text-red-500 mt-2 flex items-center">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      {account.error}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* No accounts connected state */}
        {accounts.length === 0 && !isLoading && (
          <Card className="p-12 text-center">
            <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-600 mb-2">No Gmail Accounts Connected</h2>
            <p className="text-gray-500 mb-6">
              Connect your Gmail account to start managing your emails with OAuth2 security.
            </p>
            <Button
              onClick={() => connectGmailAccount()}
              disabled={isConnecting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isConnecting ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <ExternalLink className="w-5 h-5 mr-2" />
                  Connect Gmail Account
                </>
              )}
            </Button>
          </Card>
        )}

        {/* Email List */}
        <Card className="p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-500">Loading emails...</p>
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No emails found</p>
              <p className="text-gray-400 text-sm">Check your Gmail configuration</p>
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
                  
                  return (
                    <div
                      key={`${email.mailboxEmail}-${email.messageId}-${index}`}
                      className={`border border-gray-200 rounded-lg p-4 transition-all duration-300 ${
                        isUnread ? 'bg-blue-50 border-blue-200' : 'bg-white hover:bg-gray-50 hover:shadow-md'
                      }`}
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
                            </div>
                            <p className={`text-sm text-gray-600 mb-2 ${isUnread ? 'font-medium' : ''}`}>
                              From: {email.fromName && email.fromName !== email.fromAddress 
                                ? `${email.fromName} (${email.fromAddress})` 
                                : email.fromAddress}
                            </p>
                            
                            {/* Email Content */}
                            {email.summary && 
                            email.summary !== 'No content available' && 
                            email.summary !== 'Click to expand and view full email content' && (
                              isHTMLContent(email.summary) ? (
                                <div 
                                  className="text-base text-gray-600 line-clamp-3 leading-relaxed prose prose-sm max-w-none"
                                  dangerouslySetInnerHTML={sanitizeAndRenderHTML(email.summary)}
                                />
                              ) : (
                                <p className="text-base text-gray-600 line-clamp-3 leading-relaxed">
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
                        
                        {/* Email Action Buttons */}
                        <div className="flex justify-end items-center mt-4">
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
            
            {/* Original Email Content */}
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
