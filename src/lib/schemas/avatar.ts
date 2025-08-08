import { z } from 'zod'

export const avatarSchema = z.object({
  fullName: z.string().min(2).max(255),
  replicateModelUrl: z.string().min(1),
  triggerWord: z.string().min(1).max(100),
  description: z.string().optional(),
  visible: z.boolean().default(true),
})

export type AvatarInput = z.infer<typeof avatarSchema>


