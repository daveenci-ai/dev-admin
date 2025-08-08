import { ImapFlow } from 'imapflow'
import { getImapConfigs, ImapConfig } from './imap-config'
import { createImapConnection } from './imap-client'
import { cleanEmailText, extractEmailPreview, extractFullEmailContent, enhancePlainTextFormatting } from './parsing'

export async function deleteEmailViaImap(messageId: string, mailboxEmail?: string): Promise<boolean> {
  const imapConfigs = getImapConfigs()
  const configsToTry = mailboxEmail
    ? imapConfigs.filter((c) => c.email === mailboxEmail).concat(imapConfigs.filter((c) => c.email !== mailboxEmail))
    : imapConfigs

  for (const config of configsToTry) {
    let client: ImapFlow | null = null
    try {
      client = await createImapConnection(config)
      await client.mailboxOpen('INBOX')
      const uid = parseInt(messageId)
      if (isNaN(uid)) continue
      await client.messageMove([uid], 'Trash', { uid: true })
      return true
    } finally {
      if (client) {
        try {
          await client.logout()
        } catch {}
      }
    }
  }
  throw new Error('Failed to delete email - not found in any configured mailbox')
}

export async function archiveEmailViaImap(messageId: string, mailboxEmail?: string): Promise<boolean> {
  const imapConfigs = getImapConfigs()
  const configsToTry = mailboxEmail
    ? imapConfigs.filter((c) => c.email === mailboxEmail).concat(imapConfigs.filter((c) => c.email !== mailboxEmail))
    : imapConfigs
  for (const config of configsToTry) {
    let client: ImapFlow | null = null
    try {
      client = await createImapConnection(config)
      await client.mailboxOpen('INBOX')
      const uid = parseInt(messageId)
      if (isNaN(uid)) continue
      const archiveFolders = ['Archive', 'Archived', 'Archives']
      for (const folder of archiveFolders) {
        try {
          await client.messageMove([uid], folder, { uid: true })
          return true
        } catch {}
      }
      throw new Error('No archive folder found')
    } finally {
      if (client) {
        try {
          await client.logout()
        } catch {}
      }
    }
  }
  throw new Error('Failed to archive email - not found in any configured mailbox')
}

export async function markEmailAsSpamViaImap(messageId: string, mailboxEmail?: string): Promise<boolean> {
  const imapConfigs = getImapConfigs()
  const configsToTry = mailboxEmail
    ? imapConfigs.filter((c) => c.email === mailboxEmail).concat(imapConfigs.filter((c) => c.email !== mailboxEmail))
    : imapConfigs
  for (const config of configsToTry) {
    let client: ImapFlow | null = null
    try {
      client = await createImapConnection(config)
      await client.mailboxOpen('INBOX')
      const uid = parseInt(messageId)
      if (isNaN(uid)) continue
      const spamFolders = ['Spam', 'Junk', 'Junk Email']
      for (const folder of spamFolders) {
        try {
          await client.messageMove([uid], folder, { uid: true })
          return true
        } catch {}
      }
      throw new Error('No spam folder found')
    } finally {
      if (client) {
        try {
          await client.logout()
        } catch {}
      }
    }
  }
  throw new Error('Failed to mark email as spam - not found in any configured mailbox')
}

export async function getAllAccountsViaImap() {
  const imapConfigs = getImapConfigs()
  const accountPromises = imapConfigs.map(async (config) => {
    let client: ImapFlow | null = null
    try {
      client = await createImapConnection(config)
      const mailbox = await client.mailboxOpen('INBOX')
      const unreadMessages = await client.search({ seen: false })
      const unreadCount = Array.isArray(unreadMessages) ? unreadMessages.length : 0
      return {
        accountId: `imap-${config.email}`,
        accountName: config.name,
        emailAddress: config.email,
        accountDisplayName: config.name,
        mailboxName: config.name,
        mailboxEmail: config.email,
        totalEmails: mailbox.exists || 0,
        unreadEmails: unreadCount,
        isDefault: config.email === 'anton.osipov@daveenci.ai',
      }
    } catch (error: any) {
      return null
    } finally {
      if (client) {
        try {
          await client.logout()
        } catch {}
      }
    }
  })
  const accountResults = await Promise.all(accountPromises)
  const accounts = accountResults.filter(Boolean)
  return { data: accounts }
}

export async function fetchAllEmailsViaImap(limit = 10) {
  const imapConfigs = getImapConfigs()
  const emailPromises = imapConfigs.map(async (config) => {
    let client: ImapFlow | null = null
    try {
      client = await createImapConnection(config)
      const mailbox = await client.mailboxOpen('INBOX')
      if (mailbox.exists === 0) return []
      const searchLimit = Math.min(limit, mailbox.exists)
      const range = mailbox.exists > searchLimit ? `${mailbox.exists - searchLimit + 1}:${mailbox.exists}` : `1:${mailbox.exists}`
      const messages: any[] = []
      for await (const message of client.fetch(range, {
        envelope: true,
        flags: true,
        internalDate: true,
        uid: true,
        bodyStructure: true,
        source: true,
      })) {
        const envelope = message.envelope
        const flags = message.flags || new Set()
        const fromName = envelope?.from?.[0]?.name || envelope?.from?.[0]?.address || 'Unknown sender'
        const subject = envelope?.subject || 'No Subject'
        let bodyContent = 'Click to expand and view full email content'
        let preview = ''
        let fullContent = ''
        if (message.source) {
          const emailSource = message.source.toString()
          preview = extractEmailPreview(emailSource)
          fullContent = extractFullEmailContent(emailSource)
          if (preview && preview.trim()) bodyContent = preview
        }
        messages.push({
          messageId: message.uid?.toString() || `${Date.now()}-${Math.random()}`,
          subject: subject,
          fromAddress: envelope?.from?.[0]?.address || 'unknown@example.com',
          fromName: fromName,
          toAddress: envelope?.to?.[0]?.address || config.email,
          receivedTime: message.internalDate instanceof Date ? message.internalDate.getTime() : Date.now(),
          sentDateInGMT: message.internalDate instanceof Date ? message.internalDate.getTime().toString() : Date.now().toString(),
          isRead: !flags.has('\\Seen') ? false : true,
          flag: Array.from(flags).join(', '),
          summary: bodyContent ? bodyContent.substring(0, 300) : 'No content available',
          fullContent: fullContent || 'No content available',
          mailboxName: config.name,
          mailboxEmail: config.email,
          calendarType: 0,
          size: 0,
        })
      }
      messages.sort((a, b) => (b.receivedTime || 0) - (a.receivedTime || 0))
      return messages.slice(0, limit)
    } catch (error: any) {
      return []
    } finally {
      if (client) {
        try {
          await client.logout()
        } catch {}
      }
    }
  })
  const emailArrays = await Promise.all(emailPromises)
  const allEmails = emailArrays.flat()
  allEmails.sort((a, b) => (b.receivedTime || 0) - (a.receivedTime || 0))
  const limitedEmails = allEmails.slice(0, limit * imapConfigs.length)
  return { data: limitedEmails }
}

export async function fetchEmailBodyViaImap(messageId: string, mailboxEmail: string): Promise<string> {
  const imapConfigs = getImapConfigs()
  const config = imapConfigs.find((c) => c.email === mailboxEmail)
  if (!config) throw new Error(`No IMAP configuration found for mailbox: ${mailboxEmail}`)
  let client: ImapFlow | null = null
  try {
    client = await createImapConnection(config)
    await client.mailboxOpen('INBOX')
    const uid = parseInt(messageId)
    if (isNaN(uid)) throw new Error(`Invalid message ID: ${messageId}`)

    let emailBody = ''
    // Attempt direct fetch by UID first
    for await (const message of client.fetch(uid.toString(), { envelope: true, uid: true, source: true })) {
      if (message.uid === uid) {
        let bodyContent = ''
        if (message.source) {
          const sourceText = message.source.toString()
          if (sourceText.length > 100) {
            const bodyStart = sourceText.indexOf('\r\n\r\n')
            if (bodyStart > 0) {
              let rawBody = sourceText.substring(bodyStart + 4).trim()
              rawBody = rawBody
                .replace(/^--[=_\-a-zA-Z0-9]+.*$/gm, '')
                .replace(/^------=.*$/gm, '')
                .replace(/^----boundary.*$/gm, '')
                .replace(/^Content-Type:.*$/gmi, '')
                .replace(/^Content-Transfer-Encoding:.*$/gmi, '')
                .replace(/^Content-Disposition:.*$/gmi, '')
                .replace(/^Content-[^:]*:.*$/gmi, '')
                .replace(/^MIME-Version:.*$/gmi, '')
                .replace(/=([0-9A-F]{2})/g, (match, hex) => {
                  try { return String.fromCharCode(parseInt(hex, 16)) } catch { return match }
                })
                .replace(/=\r?\n/g, '')
                .replace(/=20/g, ' ')
                .replace(/=0D=0A/g, '\n')
                .replace(/=0A/g, '\n')
                .replace(/=09/g, '\t')
                .replace(/\n\s*\n\s*\n/g, '\n\n')
                .replace(/\t+/g, ' ')
                .replace(/  +/g, ' ')
                .trim()
              const lines = rawBody.split('\n')
              const meaningfulLines = lines.filter((line) => {
                const trimmed = line.trim()
                return (
                  trimmed.length > 0 &&
                  !trimmed.startsWith('--') &&
                  !trimmed.includes('=_') &&
                  !trimmed.match(/^[A-Za-z-]+:\s/) &&
                  trimmed.length > 3
                )
              })
              if (meaningfulLines.length > 0) bodyContent = meaningfulLines.join('\n').trim()
            }
          }
        }
        if (!bodyContent && (message as any).text) bodyContent = (message as any).text
        if (!bodyContent && (message as any).html) bodyContent = (message as any).html
        if (bodyContent && bodyContent.length > 50) {
          bodyContent = bodyContent.replace(/<[^>]*>/g, '').replace(/\n\s*\n\s*\n/g, '\n\n').trim()
          if (bodyContent.length > 1000) bodyContent = bodyContent.substring(0, 1000) + '\n\n... [Content truncated for preview]'
        } else {
          bodyContent = '[Unable to extract readable content from this email]'
        }
        emailBody = bodyContent
        break
      }
    }
    if (!emailBody) emailBody = '[No email content available]'
    return emailBody
  } finally {
    if (client) {
      try {
        await client.logout()
      } catch {}
    }
  }
}

export async function markEmailAsReadViaImap(messageId: string, mailboxEmail: string): Promise<void> {
  const imapConfigs = getImapConfigs()
  const config = imapConfigs.find((c) => c.email === mailboxEmail)
  if (!config) throw new Error(`No IMAP configuration found for mailbox: ${mailboxEmail}`)

  let client: ImapFlow | null = null
  try {
    client = await createImapConnection(config)
    await client.mailboxOpen('INBOX')
    const uid = parseInt(messageId)
    if (isNaN(uid)) throw new Error(`Invalid message ID: ${messageId}`)
    await client.messageFlagsAdd(`${uid}`, ['\\Seen'])
  } finally {
    if (client) {
      try {
        await client.logout()
      } catch {}
    }
  }
}


