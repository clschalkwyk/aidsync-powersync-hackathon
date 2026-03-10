import { cn } from '@/lib/utils'
import { type HTMLAttributes } from 'react'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border transition-all',
        {
          'bg-clinical-50 text-clinical-600 border-clinical-100': variant === 'default',
          'bg-safety-green/5 text-safety-green font-bold border-safety-green/20': variant === 'success',
          'bg-safety-yellow/5 text-safety-yellow font-bold border-safety-yellow/20': variant === 'warning',
          'bg-safety-red/5 text-safety-red font-bold border-safety-red/20': variant === 'danger',
          'bg-brand-50 text-brand-900 font-bold border-brand-100': variant === 'info',
        },
        className
      )}
      {...props}
    />
  )
}
