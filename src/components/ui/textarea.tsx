import { cn } from '@/lib/utils'
import * as React from 'react'

interface TextareaProps {
  className?: string
  placeholder?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  id?: string
  name?: string
  required?: boolean
  disabled?: boolean
  rows?: number
}

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        'flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
} 