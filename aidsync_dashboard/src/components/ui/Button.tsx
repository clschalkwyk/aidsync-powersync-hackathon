import { cn } from '@/lib/utils'
import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { Slot } from '@radix-ui/react-slot'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  asChild?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(
          'inline-flex items-center justify-center font-semibold transition-all duration-200 cursor-pointer shadow-sm active:scale-[0.98]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clinical-500 focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          'rounded-xl',
          {
            'bg-clinical-600 text-white hover:bg-clinical-700 hover:shadow-md': variant === 'primary',
            'bg-clinical-100 text-clinical-700 hover:bg-clinical-200': variant === 'secondary',
            'border border-clinical-200 bg-white hover:bg-clinical-50 text-clinical-700': variant === 'outline',
            'hover:bg-clinical-100 text-clinical-700 shadow-none': variant === 'ghost',
            'bg-safety-red text-white hover:bg-red-700 hover:shadow-md': variant === 'danger',
            'bg-safety-green text-white hover:bg-emerald-700 hover:shadow-md': variant === 'success',
            'h-9 px-4 text-xs': size === 'sm',
            'h-11 px-6 text-sm': size === 'md',
            'h-13 px-8 text-base': size === 'lg',
            'h-10 w-10 p-0': size === 'icon',
          },
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button }
