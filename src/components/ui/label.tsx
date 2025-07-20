import { cn } from '@/lib/utils'

interface LabelProps {
  children: React.ReactNode
  className?: string
  htmlFor?: string
}

export function Label({ children, className, ...props }: LabelProps) {
  return (
    <label
      className={cn('text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70', className)}
      {...props}
    >
      {children}
    </label>
  )
} 