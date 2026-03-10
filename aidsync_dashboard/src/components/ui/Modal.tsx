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
      className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className={cn(
          "relative w-full bg-white shadow-xl overflow-hidden",
          "h-full sm:h-auto",
          "sm:rounded-xl",
          {
            'sm:max-w-md': size === 'sm',
            'sm:max-w-lg': size === 'md',
            'sm:max-w-2xl': size === 'lg',
          }
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-clinical-100 shrink-0">
          <div className="pr-4">
            <h3 className="text-lg font-semibold text-clinical-900">{title}</h3>
            {description && (
              <p className="text-sm text-clinical-500 mt-0.5">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-clinical-400 hover:text-clinical-600 transition-colors p-1 -mr-1"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(100dvh - 80px)' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
