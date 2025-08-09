import { z } from 'zod'

export const contactCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  primaryEmail: z.string().email().transform((v) => v.trim().toLowerCase()),
  secondaryEmail: z.string().email().optional().or(z.literal('')),
  primaryPhone: z.string().optional().or(z.literal('')).transform((v) => (v ? v : undefined)),
  secondaryPhone: z.string().optional().or(z.literal('')),
  otherEmails: z.array(z.string().email()).optional(),
  otherPhones: z.array(z.string()).optional(),
  company: z.string().optional().or(z.literal('')),
  industry: z.string().optional().or(z.literal('')),
  website: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  linkedinUrl: z.string().optional().or(z.literal('')),
  facebookUrl: z.string().optional().or(z.literal('')),
  instagramUrl: z.string().optional().or(z.literal('')),
  youtubeUrl: z.string().optional().or(z.literal('')),
  tiktokUrl: z.string().optional().or(z.literal('')),
  source: z.string().optional().default('Manual'),
  status: z
    .enum(['PROSPECT', 'LEAD', 'OPPORTUNITY', 'CLIENT', 'CHURNED', 'DECLINED', 'UNQUALIFIED'])
    .default('PROSPECT'),
  sentiment: z.enum(['GOOD', 'NEUTRAL', 'BAD']).optional().default('NEUTRAL'),
})

export type ContactCreateInput = z.infer<typeof contactCreateSchema>


