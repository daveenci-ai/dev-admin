import { cn } from '@/lib/utils'

interface SelectProps {
  children: React.ReactNode
  value?: string
  onValueChange?: (value: string) => void
  className?: string
}

export function Select({ children, className, ...props }: SelectProps) {
  return (
    <div className={cn('relative', className)}>
      {children}
    </div>
  )
}

interface SelectTriggerProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export function SelectTrigger({ children, className, ...props }: SelectTriggerProps) {
  return (
    <button
      className={cn(
        'flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
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
    <div className={cn('absolute z-50 min-w-full bg-white border border-gray-200 rounded-md shadow-md', className)}>
      {children}
    </div>
  )
}

interface SelectValueProps {
  placeholder?: string
  className?: string
}

export function SelectValue({ placeholder, className }: SelectValueProps) {
  return <span className={cn('text-gray-500', className)}>{placeholder}</span>
}

interface SelectItemProps {
  children: React.ReactNode
  value: string
  className?: string
  onClick?: () => void
}

export function SelectItem({ children, className, ...props }: SelectItemProps) {
  return (
    <div
      className={cn('px-3 py-2 hover:bg-gray-100 cursor-pointer', className)}
      {...props}
    >
      {children}
    </div>
  )
} 