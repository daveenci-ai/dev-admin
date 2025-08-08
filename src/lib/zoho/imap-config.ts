import { ImapFlow } from 'imapflow'
import logger from '@/lib/logger'

export interface ImapConfig {
  name: string
  email: string
  user: string
  password: string
}

export function getImapConfigs(): ImapConfig[] {
  logger.debug('[ENV-DEBUG] Starting getImapConfigs...')
  logger.debug('[ENV-DEBUG] Environment check:')

  const configs: ImapConfig[] = []
  const missingPasswords: string[] = []

  const passwordChecks = [
    { env: 'ZOHO_PASSWORD_ANTON', email: 'anton.osipov@daveenci.ai', name: 'Anton Osipov' },
    { env: 'ZOHO_PASSWORD_ASTRID', email: 'astrid@daveenci.ai', name: 'Astrid' },
    { env: 'ZOHO_PASSWORD_OPS', email: 'ops@daveenci.ai', name: 'Ops' },
    { env: 'ZOHO_PASSWORD_HELLO', email: 'hello@daveenci.ai', name: 'Hello' }
  ]

  passwordChecks.forEach((check) => {
    const password = process.env[check.env]
    logger.debug(`[ENV-DEBUG] ${check.env} exists:`, !!password)

    if (password) {
      logger.debug('[ENV-DEBUG] Adding', check.name, 'config')
      configs.push({
        name: check.name,
        email: check.email,
        user: check.email,
        password: password as string,
      })
    } else {
      logger.debug('[ENV-DEBUG] Missing', check.env)
      missingPasswords.push(`${check.env} (for ${check.email})`)
    }
  })

  logger.debug('[ENV-DEBUG] Total configs created:', configs.length)
  logger.debug('[ENV-DEBUG] Config names:', configs.map((c) => c.name))

  if (configs.length === 0) {
    const errorMessage = `No IMAP configurations found. Missing environment variables: ${missingPasswords.join(', ')}. Please set these in your Render dashboard with the corresponding Zoho app passwords.`
    logger.error('[ENV-DEBUG] Error:', errorMessage)
    throw new Error(errorMessage)
  }

  if (missingPasswords.length > 0) {
    logger.warn('[ENV-DEBUG] Warning: Some mailboxes are missing passwords:', missingPasswords.join(', '))
  }

  return configs
}


