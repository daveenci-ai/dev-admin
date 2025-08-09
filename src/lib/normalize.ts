import removeAccents from 'remove-accents'
import { parsePhoneNumberFromString } from 'libphonenumber-js'
import { parse as parseDomain } from 'tldts'

export type NormalizedContact = {
  firstNameNorm?: string | null
  lastNameNorm?: string | null
  fullNameNorm?: string | null
  emailNorm?: string | null
  emailLocal?: string | null
  emailDomain?: string | null
  phoneE164?: string | null
  companyNorm?: string | null
  websiteRoot?: string | null
  addressNorm?: string | null
  zipNorm?: string | null
  otherEmails?: string[]
  otherPhones?: string[]
}

function baseNormalize(input: string | null | undefined): string | null {
  if (!input) return null
  const lowered = input.toLowerCase().trim()
  const unaccented = removeAccents(lowered)
  // collapse any non-alphanumeric to single spaces (avoid unicode property classes for older targets)
  const collapsed = unaccented.replace(/[^a-z0-9]+/gi, ' ').replace(/\s+/g, ' ').trim()
  return collapsed || null
}

function normalizeEmail(email: string | null | undefined): { emailNorm: string | null; local: string | null; domain: string | null } {
  if (!email) return { emailNorm: null, local: null, domain: null }
  const e = email.trim().toLowerCase()
  const atIdx = e.indexOf('@')
  if (atIdx === -1) return { emailNorm: null, local: null, domain: null }
  let local = e.slice(0, atIdx)
  const domain = e.slice(atIdx + 1)
  // strip +tags
  local = local.replace(/\+.*/g, '')
  // gmail dot removal
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    local = local.replace(/\./g, '')
  }
  return { emailNorm: `${local}@${domain}`, local, domain }
}

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null
  const parsed = parsePhoneNumberFromString(phone)
  if (!parsed || !parsed.isValid()) return null
  // Consider ignoring short VOIP-like numbers
  const nationalDigits = parsed.nationalNumber?.toString() ?? ''
  if (nationalDigits.replace(/\D/g, '').length < 10) return null
  return parsed.number
}

function normalizeWebsite(url: string | null | undefined): string | null {
  if (!url) return null
  const text = url.trim().toLowerCase()
  const withProto = /^https?:\/\//i.test(text) ? text : `https://${text}`
  const info = parseDomain(withProto)
  if (!info || !info.domain || !info.publicSuffix) return null
  return `${info.domain}.${info.publicSuffix}`
}

function normalizeAddress(address: string | null | undefined): { addressNorm: string | null; zipNorm: string | null } {
  if (!address) return { addressNorm: null, zipNorm: null }
  const a = baseNormalize(address)
  if (!a) return { addressNorm: null, zipNorm: null }
  const zipMatch = a.match(/\b(\d{5})(?:-\d{4})?\b/)
  const zip = zipMatch ? zipMatch[1] : null
  return { addressNorm: a, zipNorm: zip }
}

export function uniqueArray(values: Array<string | null | undefined>): string[] {
  const set = new Set<string>()
  for (const v of values) {
    if (!v) continue
    set.add(v)
  }
  return Array.from(set)
}

export function normalizeContact(input: {
  name?: string | null
  primaryEmail?: string | null
  secondaryEmail?: string | null
  primaryPhone?: string | null
  secondaryPhone?: string | null
  company?: string | null
  website?: string | null
  address?: string | null
  otherEmails?: string[]
  otherPhones?: string[]
}): NormalizedContact {
  // Names
  const fullNameRaw = input.name || ''
  const fullNameNorm = baseNormalize(fullNameRaw)
  const parts = (fullNameNorm || '').split(' ').filter(Boolean)
  const firstNameNorm = parts[0] || null
  const lastNameNorm = parts.length > 1 ? parts[parts.length - 1] : null

  // Emails
  const pEmail = (input.primaryEmail || '').toLowerCase().trim() || null
  const sEmail = (input.secondaryEmail || '').toLowerCase().trim() || null
  const { emailNorm, local: emailLocal, domain: emailDomain } = normalizeEmail(pEmail)
  const oEmails = uniqueArray([sEmail, ...(input.otherEmails || [])].map((e) => normalizeEmail(e).emailNorm))

  // Phones
  const pPhone = normalizePhone(input.primaryPhone || null)
  const sPhone = normalizePhone(input.secondaryPhone || null)
  const oPhones = uniqueArray([sPhone, ...(input.otherPhones || [])].map(normalizePhone))

  const companyNorm = baseNormalize(input.company)
  const websiteRoot = normalizeWebsite(input.website)
  const { addressNorm, zipNorm } = normalizeAddress(input.address)

  return {
    firstNameNorm,
    lastNameNorm,
    fullNameNorm,
    emailNorm,
    emailLocal,
    emailDomain,
    phoneE164: pPhone,
    companyNorm,
    websiteRoot,
    addressNorm,
    zipNorm,
    otherEmails: oEmails,
    otherPhones: oPhones,
  }
}


