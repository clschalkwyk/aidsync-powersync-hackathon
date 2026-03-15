import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { type ReactNode } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export function Modal({ isOpen, onClose, title, description, children, size = 'md' }: ModalProps) {
  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-start justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className={cn(
          "relative w-full bg-white shadow-2xl overflow-hidden animate-in-slide-up",
          "h-full sm:h-auto my-0 sm:my-24",
          "sm:rounded-3xl",
          {
            'sm:max-w-md': size === 'sm',
            'sm:max-w-lg': size === 'md',
            'sm:max-w-3xl': size === 'lg',
          }
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-clinical-100 shrink-0 bg-white sticky top-0 z-10">
          <div className="pr-8">
            <h3 className="text-xl font-black text-clinical-900 tracking-tight uppercase">{title}</h3>
            {description && (
              <p className="text-xs font-bold text-clinical-400 mt-1 uppercase tracking-widest leading-relaxed">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-clinical-300 hover:text-clinical-900 hover:bg-clinical-50 transition-all p-2 rounded-xl -mr-2 active:scale-90"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 sm:p-8">
          {children}
        </div>
      </div>
    </div>
  )
}
