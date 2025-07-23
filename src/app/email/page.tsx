'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Mail, Send, RefreshCw, Inbox, Clock, AlertCircle } from 'lucide-react';

interface EmailMessage {
  messageId: string;
  subject: string;
  fromAddress: string;
  receivedTime: number;
  summary: string;
  flag?: string;
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
}

export default function EmailPage() {
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [accounts, setAccounts] = useState<ZohoAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compose form state
  const [composeForm, setComposeForm] = useState({
    to: '',
    subject: '',
    content: '',
    cc: '',
    bcc: ''
  });

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
      const response = await fetch('/api/email/accounts');
      const result = await response.json();
      
      if (result.success) {
        const accountsData = result.data?.data || [];
        setAccounts(accountsData);
      } else {
        console.error('Error fetching accounts:', result.error);
        setError(`Failed to fetch accounts: ${result.error}`);
      }
    } catch (err) {
      console.error('Error fetching accounts:', err);
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
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  // Load data on component mount
  useEffect(() => {
    fetchAccounts();
    fetchEmails();
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Email Management</h1>
            <p className="text-gray-600">Manage your Zoho Mail inbox and send emails</p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={() => {
                fetchAccounts();
                fetchEmails();
                fetchStats();
              }} 
              disabled={isLoading} 
              variant="outline"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => setIsComposeOpen(true)}>
              <Send className="w-4 h-4 mr-2" />
              Compose
            </Button>
          </div>
        </div>

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

        {/* Zoho Mail Accounts */}
        {accounts.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Zoho Mail Accounts</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {accounts.map((account) => (
                <Card key={account.accountId} className="p-4">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-white font-bold text-lg">
                        {account.displayName?.charAt(0) || account.accountName?.charAt(0) || 'Z'}
                      </span>
                    </div>
                    <h3 className="font-medium text-gray-900 text-sm mb-1 truncate" title={account.displayName || account.accountName}>
                      {account.displayName || account.accountName}
                    </h3>
                    <p className="text-xs text-gray-600 mb-2 truncate" title={account.primaryEmailAddress}>
                      {account.primaryEmailAddress}
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <Badge 
                        variant={account.isActive ? "default" : "secondary"} 
                        className="text-xs px-2 py-1"
                      >
                        {account.isActive ? "Active" : "Inactive"}
                      </Badge>
                      {account.isOrganizationAccount && (
                        <Badge variant="outline" className="text-xs px-2 py-1">
                          Org
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
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
            <Badge variant="secondary">{emails.length} emails</Badge>
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
              {emails.map((email) => (
                <div
                  key={email.messageId}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-gray-900 truncate">
                          {email.subject || 'No Subject'}
                        </h3>
                        {email.flag && (
                          <Badge variant="outline" className="text-xs">
                            {email.flag}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        From: {email.fromAddress}
                      </p>
                      {email.summary && (
                        <p className="text-sm text-gray-500 line-clamp-2">
                          {email.summary}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center text-sm text-gray-500 ml-4">
                      <Clock className="w-4 h-4 mr-1" />
                      {formatDate(email.receivedTime)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Compose Email Modal */}
        <Modal 
          isOpen={isComposeOpen} 
          onClose={() => setIsComposeOpen(false)}
        >
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Compose Email</h2>
            <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To *
              </label>
              <Input
                type="email"
                placeholder="recipient@example.com"
                value={composeForm.to}
                onChange={(e) => setComposeForm({ ...composeForm, to: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CC
                </label>
                <Input
                  type="email"
                  placeholder="cc@example.com"
                  value={composeForm.cc}
                  onChange={(e) => setComposeForm({ ...composeForm, cc: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  BCC
                </label>
                <Input
                  type="email"
                  placeholder="bcc@example.com"
                  value={composeForm.bcc}
                  onChange={(e) => setComposeForm({ ...composeForm, bcc: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject *
              </label>
              <Input
                placeholder="Email subject"
                value={composeForm.subject}
                onChange={(e) => setComposeForm({ ...composeForm, subject: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message *
              </label>
              <Textarea
                placeholder="Type your message here..."
                rows={6}
                value={composeForm.content}
                onChange={(e) => setComposeForm({ ...composeForm, content: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsComposeOpen(false)}
                disabled={isSending}
              >
                Cancel
              </Button>
              <Button onClick={sendEmail} disabled={isSending}>
                {isSending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Email
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
