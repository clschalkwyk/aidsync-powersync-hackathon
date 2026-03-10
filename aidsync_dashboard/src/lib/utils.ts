import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(date: string | null | undefined): string {
  if (!date) return '—'
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatRelativeTime(date: string | null | undefined): string {
  if (!date) return '—'
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(date)
}

export function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'green':
    case 'low':
      return 'bg-safety-green/10 text-safety-green border-safety-green/20'
    case 'yellow':
    case 'medium':
      return 'bg-safety-yellow/10 text-safety-yellow border-safety-yellow/20'
    case 'red':
    case 'high':
    case 'severe':
      return 'bg-safety-red/10 text-safety-red border-safety-red/20'
    default:
      return 'bg-clinical-100 text-clinical-600 border-clinical-200'
  }
}

export function getSeverityBadgeColor(severity: string): string {
  switch (severity) {
    case 'green':
    case 'low':
      return 'bg-safety-green/10 text-safety-green'
    case 'yellow':
    case 'medium':
      return 'bg-safety-yellow/10 text-safety-yellow'
    case 'red':
    case 'high':
    case 'severe':
      return 'bg-safety-red/10 text-safety-red'
    default:
      return 'bg-clinical-100 text-clinical-600'
  }
}

export function truncateText(text: string | null, maxLength: number): string {
  if (!text) return '—'
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function canManageReferenceData(role: string | null | undefined): boolean {
  return role === 'supervisor' || role === 'admin'
}

export function getUserFriendlyErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') {
    return fallback
  }

  const maybeError = error as {
    code?: string
    message?: string
    details?: string
    hint?: string
  }

  switch (maybeError.code) {
    case '42501':
      return 'Your account does not have permission to modify medication reference data. Use a supervisor or admin profile.'
    case '23505':
      return 'This record already exists or conflicts with an existing unique value.'
    case '23503':
      return 'This record refers to another item that does not exist yet. Save the related reference data first.'
    case '22P02':
      return 'One of the values entered is in the wrong format.'
    default:
      return maybeError.message || fallback
  }
}
