'use client'

import { cn } from '@/lib/utils'

interface SelectProps {
  children?: React.ReactNode
  value?: string
  onValueChange?: (value: string) => void
  className?: string
}

export function Select({ children, value, onValueChange, className }: SelectProps) {
  return (
    <div className={cn('relative', className)}>
      {children}
    </div>
  )
}

interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  className?: string
}

export function SelectTrigger({ children, className, ...props }: SelectTriggerProps) {
  return (
    <button
      type="button"
      className={cn(
        'flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

interface SelectContentProps {
  children: React.ReactNode
  className?: string
}

export function SelectContent({ children, className }: SelectContentProps) {
  return (
    <div className={cn('absolute z-50 mt-1 min-w-full bg-white border border-gray-200 rounded-md shadow-lg', className)}>
      {children}
    </div>
  )
}

interface SelectValueProps {
  placeholder?: string
  className?: string
}

export function SelectValue({ placeholder, className }: SelectValueProps) {
  return <span className={cn('', className)}>{placeholder}</span>
}

interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  value: string
  className?: string
}

export function SelectItem({ children, value, className, ...props }: SelectItemProps) {
  return (
    <div
      className={cn('px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm', className)}
      {...props}
    >
      {children}
    </div>
  )
} 