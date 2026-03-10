import { cn } from '@/lib/utils'
import { type LabelHTMLAttributes } from 'react'

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {}

export function Label({ className, ...props }: LabelProps) {
  return (
    <label
      className={cn(
        'text-sm font-medium text-clinical-700',
        className
      )}
      {...props}
    />
  )
}
