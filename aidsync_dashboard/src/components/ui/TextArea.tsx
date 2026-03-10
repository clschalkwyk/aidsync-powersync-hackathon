import { cn } from '@/lib/utils'
import { type TextareaHTMLAttributes, forwardRef } from 'react'

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[100px] w-full rounded-xl border border-clinical-200 bg-white px-4 py-3 text-sm font-medium text-clinical-900 transition-all placeholder:text-clinical-400 focus:border-clinical-500 focus:outline-none focus:ring-4 focus:ring-clinical-500/10 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
TextArea.displayName = 'TextArea'

export { TextArea }
