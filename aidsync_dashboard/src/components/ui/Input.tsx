import { cn } from '@/lib/utils'
import { type InputHTMLAttributes, forwardRef } from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-11 w-full rounded-xl border border-clinical-200 bg-white px-4 py-2 text-sm font-medium text-clinical-900 transition-all placeholder:text-clinical-400 focus:border-clinical-500 focus:outline-none focus:ring-4 focus:ring-clinical-500/10 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
