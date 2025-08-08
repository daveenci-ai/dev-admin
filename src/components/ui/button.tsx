import { cn } from '@/lib/utils'
import * as React from 'react'

interface ButtonProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive'
  size?: 'default' | 'sm' | 'lg'
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}

export function Button({
  children,
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50'
  
  const variants = {
    default: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
    outline: 'border border-gray-300 bg-white text-gray-900 hover:bg-gray-50',
    ghost: 'text-gray-900 hover:bg-gray-100',
    destructive: 'bg-red-600 text-white hover:bg-red-700'
  }
  
  const sizes = {
    default: 'h-10 px-4 py-2',
    sm: 'h-8 px-3 text-sm',
    lg: 'h-12 px-8'
  }
  
  return (
    <button
      className={cn(baseClasses, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  )
} 