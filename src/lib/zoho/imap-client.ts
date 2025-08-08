import { ImapFlow } from 'imapflow'
import type { ImapConfig } from './imap-config'

export async function createImapConnection(config: ImapConfig): Promise<ImapFlow> {
  if (!config.password) {
    throw new Error(`Missing IMAP password for ${config.email}. Please set the corresponding ZOHO_PASSWORD_* environment variable.`)
  }

  const client = new ImapFlow({
    host: 'imap.zoho.com',
    port: 993,
    secure: true,
    auth: {
      user: config.user,
      pass: config.password,
    },
    logger: false,
  })

  try {
    await client.connect()
    return client
  } catch (error: any) {
    if (
      error.message?.includes('Invalid credentials') ||
      error.message?.includes('Authentication failed') ||
      error.message?.includes('Login failed') ||
      error.code === 'AUTHENTICATIONFAILED'
    ) {
      throw new Error(`Authentication failed for ${config.email}. Please check that the IMAP password (app password) is correct in environment variables.`)
    }

    if (
      error.message?.includes('Connection timeout') ||
      error.message?.includes('ECONNREFUSED') ||
      error.message?.includes('ENOTFOUND')
    ) {
      throw new Error(`Cannot connect to Zoho IMAP server for ${config.email}. Please check your internet connection.`)
    }

    throw new Error(`Failed to connect to IMAP for ${config.email}: ${error.message}`)
  }
}


