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

export type EncounterNarrativeSections = {
  patientContext: string
  medicationUnderConsideration: string
  safetyResult: string
  safetyReasoning: string[]
  clinicianAction: string
  clinicianNote: string
  voiceNoteTranscript: string
  vitals: Array<{ label: string; value: string }>
}

export type EncounterNarrativeStorageFormat = 'empty' | 'json' | 'narrative' | 'plain'

export type EncounterNarrativeDraft = EncounterNarrativeSections & {
  format: EncounterNarrativeStorageFormat
}

const ENCOUNTER_SECTION_TITLES = [
  'Patient context',
  'Medication under consideration',
  'Safety result',
  'Safety reasoning',
  'Clinician action',
  'Clinician note',
  'Voice note transcript',
  'Vitals',
] as const

export function parseEncounterNarrative(text: string | null | undefined): EncounterNarrativeSections {
  return parseEncounterNarrativeDraft(text)
}

export function parseEncounterNarrativeDraft(text: string | null | undefined): EncounterNarrativeDraft {
  const empty: EncounterNarrativeDraft = {
    patientContext: '',
    medicationUnderConsideration: '',
    safetyResult: '',
    safetyReasoning: [],
    clinicianAction: '',
    clinicianNote: '',
    voiceNoteTranscript: '',
    vitals: [],
    format: 'empty',
  }

  if (!text?.trim()) return empty

  try {
    const decoded = JSON.parse(text)
    if (decoded && typeof decoded === 'object' && !Array.isArray(decoded)) {
      const vitals = Object.entries((decoded as Record<string, unknown>).vitals ?? {})
        .map(([label, value]) => ({
          label: String(label).trim(),
          value: String(value ?? '').trim(),
        }))
        .filter((item) => item.label && item.value)

      return {
        ...empty,
        patientContext: String((decoded as Record<string, unknown>).presentingComplaint ?? '').trim(),
        clinicianNote: String((decoded as Record<string, unknown>).clinicianNote ?? '').trim(),
        voiceNoteTranscript: String((decoded as Record<string, unknown>).voiceNoteTranscript ?? '').trim(),
        vitals,
        format: 'json',
      }
    }
  } catch {
    // Ignore JSON parse failure and fall through to narrative parsing.
  }

  const titlePattern = ENCOUNTER_SECTION_TITLES.map((title) => title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
  const regex = new RegExp(`(?:^|\\n\\n)(${titlePattern}):\\n`, 'g')
  const matches = [...text.matchAll(regex)]

  if (matches.length === 0) {
    return {
      ...empty,
      clinicianNote: text.trim(),
      format: 'plain',
    }
  }

  const sections = new Map<string, string>()
  for (let index = 0; index < matches.length; index += 1) {
    const current = matches[index]
    const next = matches[index + 1]
    const heading = current[1]
    const contentStart = current.index! + current[0].length
    const contentEnd = next?.index ?? text.length
    sections.set(heading, text.slice(contentStart, contentEnd).trim())
  }

  const vitals = (sections.get('Vitals') || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, ...rest] = line.split(':')
      return {
        label: label.trim(),
        value: rest.join(':').trim(),
      }
    })
    .filter((item) => item.label && item.value)

  const safetyReasoning = (sections.get('Safety reasoning') || '')
    .split('\n')
    .map((line) => line.replace(/^-+\s*/, '').trim())
    .filter(Boolean)

  return {
    patientContext: sections.get('Patient context') || '',
    medicationUnderConsideration: sections.get('Medication under consideration') || '',
    safetyResult: sections.get('Safety result') || '',
    safetyReasoning,
    clinicianAction: sections.get('Clinician action') || '',
    clinicianNote: sections.get('Clinician note') || '',
    voiceNoteTranscript: sections.get('Voice note transcript') || '',
    vitals,
    format: 'narrative',
  }
}

export function serializeEncounterNarrative(draft: EncounterNarrativeDraft): string | null {
  const normalizedVitals = draft.vitals
    .map((item) => ({
      label: item.label.trim(),
      value: item.value.trim(),
    }))
    .filter((item) => item.label && item.value)

  if (draft.format === 'json') {
    const vitalsObject = Object.fromEntries(normalizedVitals.map((item) => [item.label, item.value]))
    const payload = {
      presentingComplaint: draft.patientContext.trim(),
      clinicianNote: draft.clinicianNote.trim(),
      voiceNoteTranscript: draft.voiceNoteTranscript.trim(),
      vitals: vitalsObject,
    }
    if (
      !payload.presentingComplaint &&
      !payload.clinicianNote &&
      !payload.voiceNoteTranscript &&
      Object.keys(vitalsObject).length === 0
    ) {
      return null
    }
    return JSON.stringify(payload)
  }

  const sections: string[] = []
  if (draft.patientContext.trim()) {
    sections.push(`Patient context:\n${draft.patientContext.trim()}`)
  }
  if (draft.medicationUnderConsideration.trim()) {
    sections.push(`Medication under consideration:\n${draft.medicationUnderConsideration.trim()}`)
  }
  if (draft.safetyResult.trim()) {
    sections.push(`Safety result:\n${draft.safetyResult.trim()}`)
  }
  if (draft.safetyReasoning.length > 0) {
    sections.push(`Safety reasoning:\n${draft.safetyReasoning.map((item) => `- ${item.trim()}`).join('\n')}`)
  }
  if (draft.clinicianAction.trim()) {
    sections.push(`Clinician action:\n${draft.clinicianAction.trim()}`)
  }
  if (draft.clinicianNote.trim()) {
    sections.push(`Clinician note:\n${draft.clinicianNote.trim()}`)
  }
  if (draft.voiceNoteTranscript.trim()) {
    sections.push(`Voice note transcript:\n${draft.voiceNoteTranscript.trim()}`)
  }
  if (normalizedVitals.length > 0) {
    sections.push(`Vitals:\n${normalizedVitals.map((item) => `${item.label}: ${item.value}`).join('\n')}`)
  }

  if (sections.length === 0) {
    return null
  }

  if (draft.format === 'plain' && !draft.patientContext.trim() && !draft.voiceNoteTranscript.trim() && normalizedVitals.length === 0) {
    return draft.clinicianNote.trim() || null
  }

  return sections.join('\n\n')
}

export function formatClinicianAction(action: string | null | undefined): string {
  switch (action) {
    case 'accept':
      return 'Accept recommendation'
    case 'dismiss':
      return 'Override recommendation'
    case 'note':
      return 'Add note only'
    default:
      return action?.replace(/_/g, ' ') || '—'
  }
}

export function getEncounterAttentionState(
  interactionChecks: Array<{ severity?: string | null; clinician_action?: string | null; reviewed_at?: string | null }>
) {
  const unresolvedChecks = interactionChecks.filter((check) => !check.reviewed_at)
  const highSeverityCount = unresolvedChecks.filter((check) => check.severity === 'red').length
  const warningCount = unresolvedChecks.filter((check) => check.severity === 'red' || check.severity === 'yellow').length
  const noteOnlyCount = unresolvedChecks.filter((check) => check.clinician_action === 'note').length
  const flaggedCount = unresolvedChecks.filter(
    (check) => check.severity === 'red' || check.severity === 'yellow' || check.clinician_action === 'note'
  ).length

  return {
    highSeverityCount,
    warningCount,
    noteOnlyCount,
    flaggedCount,
    needsAttention: flaggedCount > 0,
  }
}

export function getInteractionCheckFlagReasons(check: {
  severity?: string | null
  clinician_action?: string | null
  reviewed_at?: string | null
}) {
  if (check.reviewed_at) return []

  const reasons: string[] = []
  if (check.severity === 'red') reasons.push('critical severity')
  else if (check.severity === 'yellow') reasons.push('caution severity')
  if (check.clinician_action === 'note') reasons.push('note-only action')
  return reasons
}
