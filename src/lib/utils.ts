import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
} 

// Lightweight phone utilities without heavy deps
export function formatInternationalPhone(raw?: string | null): { formatted: string; flag?: string } {
  if (!raw) return { formatted: '-' }
  const digits = raw.replace(/\D/g, '')

  // Try to detect US (1 + 10) or just 10 digits
  const isUS = (digits.length === 11 && digits.startsWith('1')) || digits.length === 10
  if (isUS) {
    const national = digits.length === 11 ? digits.slice(1) : digits
    const area = national.slice(0, 3)
    const prefix = national.slice(3, 6)
    const line = national.slice(6)
    return { formatted: `🇺🇸 (${area}) ${prefix}-${line}`, flag: '🇺🇸' }
  }

  // Simple country inference by leading digits (very limited, extendable)
  // Examples: +44 UK, +91 IN, +61 AU, +81 JP, +49 DE, +33 FR, +39 IT, +34 ES, +7 RU, +86 CN, +82 KR, +972 IL, +971 AE
  const countryCodes: Array<{ code: string; flag: string }> = [
    { code: '44', flag: '🇬🇧' },
    { code: '91', flag: '🇮🇳' },
    { code: '61', flag: '🇦🇺' },
    { code: '81', flag: '🇯🇵' },
    { code: '49', flag: '🇩🇪' },
    { code: '33', flag: '🇫🇷' },
    { code: '39', flag: '🇮🇹' },
    { code: '34', flag: '🇪🇸' },
    { code: '7', flag: '🇷🇺' },
    { code: '86', flag: '🇨🇳' },
    { code: '82', flag: '🇰🇷' },
    { code: '972', flag: '🇮🇱' },
    { code: '971', flag: '🇦🇪' },
  ]

  // Accept leading + or 00
  const clean = raw.replace(/[^+\d]/g, '')
  const stripPlus = clean.startsWith('+') ? clean.slice(1) : clean.startsWith('00') ? clean.slice(2) : clean
  let match = countryCodes.find((c) => stripPlus.startsWith(c.code))
  if (!match) match = countryCodes.find((c) => stripPlus.startsWith(c.code.slice(0, 1)))

  // naive chunking for readability
  const chunks = digits.match(/\d{1,3}/g) || [digits]
  const spaced = chunks.join(' ')
  return { formatted: `${match?.flag ? match.flag + ' ' : ''}${spaced}`, flag: match?.flag }
}