import { cn } from '@/lib/utils'
import * as React from 'react'

interface InputProps {
  className?: string
  placeholder?: string
  value?: string | number
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  onInput?: (e: React.FormEvent<HTMLInputElement>) => void
  type?: string
  id?: string
  name?: string
  required?: boolean
  disabled?: boolean
  min?: number
  max?: number
  step?: number
}

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        'flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
} 