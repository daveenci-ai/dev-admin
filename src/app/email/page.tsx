'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Mail, Send, RefreshCw, Inbox, Clock, AlertCircle, Reply, Archive, Trash2, Shield } from 'lucide-react';

interface EmailMessage {
  messageId: string;
  subject: string;
  fromAddress: string;
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
  primaryEmailAddress: string;
  displayName: string;
  isOrganizationAccount: boolean;
  accountCreatedTime: string;
  isActive: boolean;
  mailboxName?: string;
  mailboxEmail?: string;
  unreadEmails?: number;
  totalEmails?: number;
}

export default function EmailPage() {
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

  // Fetch emails
  const fetchEmails = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/email/inbox?limit=20');
      const result = await response.json();
      
      if (result.success) {
        setEmails(result.data?.data || []);
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
        // Process folder data to get stats
        const folders = result.data?.data || [];
        const inboxFolder = folders.find((f: any) => f.folderName === 'Inbox');
        
        setStats({
          totalEmails: inboxFolder?.messageCount || 0,
          unreadEmails: inboxFolder?.unreadCount || 0,
          sentEmails: folders.find((f: any) => f.folderName === 'Sent')?.messageCount || 0
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
      console.log('[Frontend] Accounts data.data:', result.data?.data);
      
      if (result.success) {
        const accountsData = result.data?.data || [];
        console.log('[Frontend] Setting accounts:', accountsData);
        console.log('[Frontend] First account sample:', accountsData[0]);
        setAccounts(accountsData);
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
    // If clicking the same mailbox, deselect it (show all emails)
    if (selectedMailbox === mailboxEmail) {
      setSelectedMailbox('');
    } else {
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
    try {
      console.log('[Archive] Archiving email:', email.messageId);
      console.log('[Archive] Current emails count before:', emails.length);
      
      // Call API to actually archive the email in Zoho
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
        console.log('[Archive] Email archived in Zoho successfully');
        
        // Remove from UI after successful archiving
        setEmails(prevEmails => {
          const filteredEmails = prevEmails.filter(e => e.messageId !== email.messageId);
          console.log('[Archive] Emails count after filtering:', filteredEmails.length);
          console.log('[Archive] Removed email with ID:', email.messageId);
          return filteredEmails;
        });
      } else {
        console.error('[Archive] API error:', result.error);
        setError(`Failed to archive email: ${result.error}`);
      }
    } catch (error) {
      console.error('[Archive] Error archiving email:', error);
      setError('Failed to archive email');
    }
  };

  const handleSpam = async (email: EmailMessage) => {
    try {
      console.log('[Spam] Marking email as spam:', email.messageId);
      console.log('[Spam] Current emails count before:', emails.length);
      
      // Call API to actually mark the email as spam in Zoho
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
        console.log('[Spam] Email marked as spam in Zoho successfully');
        
        // Remove from UI after successful spam marking
        setEmails(prevEmails => {
          const filteredEmails = prevEmails.filter(e => e.messageId !== email.messageId);
          console.log('[Spam] Emails count after filtering:', filteredEmails.length);
          console.log('[Spam] Marked email as spam with ID:', email.messageId);
          return filteredEmails;
        });
      } else {
        console.error('[Spam] API error:', result.error);
        setError(`Failed to mark email as spam: ${result.error}`);
      }
    } catch (error) {
      console.error('[Spam] Error marking email as spam:', error);
      setError('Failed to mark email as spam');
    }
  };

  const handleTrash = async (email: EmailMessage) => {
    try {
      console.log('[Trash] Trashing email:', email.messageId);
      console.log('[Trash] Current emails count before:', emails.length);
      
      // Call API to actually delete the email from Zoho
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
        console.log('[Trash] Email deleted from Zoho successfully');
        
        // Remove from UI after successful deletion
        setEmails(prevEmails => {
          const filteredEmails = prevEmails.filter(e => e.messageId !== email.messageId);
          console.log('[Trash] Emails count after filtering:', filteredEmails.length);
          console.log('[Trash] Removed email with ID:', email.messageId);
          return filteredEmails;
        });
      } else {
        console.error('[Trash] API error:', result.error);
        setError(`Failed to delete email: ${result.error}`);
      }
    } catch (error) {
      console.error('[Trash] Error trashing email:', error);
      setError('Failed to delete email');
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
            <div>
              <p className="text-red-800 font-medium">Error</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}



        {/* Mailbox Filter Cards */}
        {accounts.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            {/* Individual Mailbox Cards */}
            {accounts.map((account) => {
              const isActive = selectedMailbox === account.primaryEmailAddress;
              const mailboxName = account.mailboxName || account.displayName || account.accountName;
              const colors = {
                'anton.osipov@daveenci.ai': { color: 'text-blue-600', bgColor: 'hover:bg-blue-50', borderColor: 'border-b-blue-500', activeBg: 'bg-blue-50', activeBorder: 'border-blue-500' },
                'astrid@daveenci.ai': { color: 'text-purple-600', bgColor: 'hover:bg-purple-50', borderColor: 'border-b-purple-500', activeBg: 'bg-purple-50', activeBorder: 'border-purple-500' },
                'hello@daveenci.ai': { color: 'text-green-600', bgColor: 'hover:bg-green-50', borderColor: 'border-b-green-500', activeBg: 'bg-green-50', activeBorder: 'border-green-500' },
                'support@daveenci.ai': { color: 'text-yellow-600', bgColor: 'hover:bg-yellow-50', borderColor: 'border-b-yellow-500', activeBg: 'bg-yellow-50', activeBorder: 'border-yellow-500' },
                'ops@daveenci.ai': { color: 'text-red-600', bgColor: 'hover:bg-red-50', borderColor: 'border-b-red-500', activeBg: 'bg-red-50', activeBorder: 'border-red-500' }
              };
              
              const colorScheme = colors[account.primaryEmailAddress as keyof typeof colors] || colors['anton.osipov@daveenci.ai'];
              
              // Get email stats for this mailbox (placeholder - will be updated with real data)
                             // Get actual email counts from loaded emails
               const emailCounts = getEmailCountsForMailbox(account.primaryEmailAddress);
               const unreadCount = emailCounts.unread;
               const totalCount = emailCounts.total;
               console.log(`[Frontend] Card for ${account.primaryEmailAddress}: unread=${unreadCount}, total=${totalCount}`, account);
              
              return (
                <div 
                  key={account.accountId}
                  onClick={() => handleMailboxClick(account.primaryEmailAddress)}
                  className={`bg-white p-4 rounded-lg shadow-sm border border-gray-200 transition-all duration-200 cursor-pointer border-b-2 ${
                    isActive 
                      ? `${colorScheme.activeBg} ${colorScheme.activeBorder}` 
                      : `${colorScheme.bgColor} ${colorScheme.borderColor}`
                  }`}
                >
                  <div className={`text-xl font-bold ${colorScheme.color} mb-1`}>
                    {unreadCount}/{totalCount}
                  </div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">
                    {mailboxName?.toUpperCase() || 'MAILBOX'}
                  </div>
                  <div className="text-xs text-gray-400 truncate" title={account.primaryEmailAddress}>
                    {account.primaryEmailAddress}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Inbox className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Emails</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalEmails}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <Mail className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Unread</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.unreadEmails}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-50 rounded-lg">
                  <Send className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Sent</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.sentEmails}</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Email List */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Recent Emails</h2>
            <div className="flex items-center gap-3">
              <Badge variant="secondary">{emails.length} emails</Badge>
              <Button 
                onClick={() => {
                  fetchAccounts();
                  fetchEmails();
                  fetchStats();
                }} 
                disabled={isLoading} 
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-500">Loading emails...</p>
            </div>
          ) : emails.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No emails found</p>
              <p className="text-gray-400 text-sm">Check your Zoho Mail configuration</p>
            </div>
          ) : (
            <div className="space-y-4">
              {emails
                .filter(email => {
                  // Filter by selected mailbox, or show all if none selected
                  if (!selectedMailbox) return true;
                  return email.mailboxEmail === selectedMailbox;
                })
                .sort((a, b) => {
                  // Sort by date, newest first
                  const timeA = typeof a.receivedTime === 'string' ? new Date(a.receivedTime).getTime() : a.receivedTime;
                  const timeB = typeof b.receivedTime === 'string' ? new Date(b.receivedTime).getTime() : b.receivedTime;
                  return timeB - timeA;
                })
                .map((email, index) => {
                  // Reduced logging - only log first few emails to avoid console spam
                  if (index < 3) console.log(`[Email Render] Rendering email ${index}:`, email.messageId, email.subject);
                  const isUnread = email.isRead === false || email.flagInfo?.includes('unread');
                  
                  return (
                    <div
                      key={email.messageId}
                      className={`border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors ${
                        isUnread ? 'bg-blue-50 border-blue-200' : 'bg-white'
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
                              From: {email.fromAddress}
                            </p>
                            {email.summary && (
                              <p className="text-sm text-gray-500 line-clamp-2">
                                {email.summary}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end text-sm text-gray-500">
                            <div className="flex items-center mb-1">
                              <Clock className="w-4 h-4 mr-1" />
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
                        
                        {/* Email Action Buttons - Bottom Right */}
                        <div className="flex justify-end gap-2">
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
                              console.log('[Button Click] Trash button clicked for email:', email.messageId);
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
