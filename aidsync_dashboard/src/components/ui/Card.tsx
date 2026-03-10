import { cn } from '@/lib/utils'
import { type ReactNode } from 'react'

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("bg-white border border-clinical-200/60 rounded-2xl shadow-sm overflow-hidden", className)}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("p-6 border-b border-clinical-50 bg-clinical-50/30", className)}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h3 className={cn("text-lg font-bold text-clinical-900 tracking-tight", className)}>
      {children}
    </h3>
  )
}

export function CardDescription({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("text-sm font-medium text-clinical-500 mt-1", className)}>
      {children}
    </p>
  )
}

export function CardContent({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("p-6", className)}>
      {children}
    </div>
  )
}
