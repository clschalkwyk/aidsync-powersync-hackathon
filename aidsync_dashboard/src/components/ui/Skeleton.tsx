import { cn } from '@/lib/utils'

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-clinical-100", className)}
      {...props}
    />
  )
}

export function CardSkeleton() {
  return (
    <div className="bg-white border border-clinical-200/60 rounded-3xl p-5 space-y-4">
      <div className="flex items-start justify-between">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="pt-4 border-t border-clinical-50 space-y-3">
        <Skeleton className="h-3 w-1/3" />
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-12" />
          </div>
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </div>
  )
}

export function ListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center justify-between p-4 bg-white border border-clinical-200/60 rounded-2xl">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-5 w-5 rounded-full" />
        </div>
      ))}
    </div>
  )
}
