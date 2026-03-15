import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Page } from '@playwright/test'

type SupabaseEnv = {
  url: string
  publishableKey: string
}

function parseEnvFile(contents: string) {
  const result: Record<string, string> = {}
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const separatorIndex = line.indexOf('=')
    if (separatorIndex < 0) continue
    const key = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1).trim()
    result[key] = value
  }
  return result
}

export function resolveSupabaseEnv(): SupabaseEnv {
  const url = process.env.VITE_SUPABASE_URL
  const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY

  if (url && publishableKey) {
    return { url, publishableKey }
  }

  const currentFile = fileURLToPath(import.meta.url)
  const currentDir = path.dirname(currentFile)
  const envPath = path.resolve(currentDir, '../../../.env')

  if (!fs.existsSync(envPath)) {
    throw new Error('Missing aidsync_dashboard/.env for Supabase E2E configuration.')
  }

  const env = parseEnvFile(fs.readFileSync(envPath, 'utf8'))
  if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_PUBLISHABLE_KEY) {
    throw new Error('Supabase env file is missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY.')
  }

  return {
    url: env.VITE_SUPABASE_URL,
    publishableKey: env.VITE_SUPABASE_PUBLISHABLE_KEY,
  }
}

export async function getSupabaseAccessToken(page: Page): Promise<string> {
  const token = await page.evaluate(() => {
    for (const key of Object.keys(window.localStorage)) {
      if (!key.startsWith('sb-') || !key.endsWith('-auth-token')) continue

      const raw = window.localStorage.getItem(key)
      if (!raw) continue

      try {
        const parsed = JSON.parse(raw)
        if (parsed?.access_token) return parsed.access_token as string
        if (Array.isArray(parsed) && parsed[0]?.access_token) return parsed[0].access_token as string
      } catch {
        // ignore malformed storage and continue scanning
      }
    }

    return null
  })

  if (!token) {
    throw new Error('Could not resolve Supabase access token from local storage.')
  }

  return token
}

type ReviewableCheck = {
  id: string
  encounter_id: string
  severity: string | null
  clinician_action: string | null
  reviewed_at: string | null
}

export async function fetchFirstReviewableCheck(accessToken: string): Promise<ReviewableCheck | null> {
  const { url, publishableKey } = resolveSupabaseEnv()
  const endpoint = new URL('/rest/v1/interaction_checks', url)
  endpoint.searchParams.set('select', 'id,encounter_id,severity,clinician_action,reviewed_at')
  endpoint.searchParams.set('reviewed_at', 'is.null')
  endpoint.searchParams.set('or', '(severity.eq.red,severity.eq.yellow,clinician_action.eq.note)')
  endpoint.searchParams.set('order', 'created_at.asc')
  endpoint.searchParams.set('limit', '1')

  const response = await fetch(endpoint, {
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch reviewable interaction checks: ${response.status} ${response.statusText}`)
  }

  const rows = (await response.json()) as ReviewableCheck[]
  return rows[0] ?? null
}

export async function resetInteractionCheckReviewState(accessToken: string, interactionCheckId: string) {
  const { url, publishableKey } = resolveSupabaseEnv()
  const endpoint = new URL('/rest/v1/interaction_checks', url)
  endpoint.searchParams.set('id', `eq.${interactionCheckId}`)

  const response = await fetch(endpoint, {
    method: 'PATCH',
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      reviewed_at: null,
      reviewed_by: null,
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to reset interaction check review state: ${response.status} ${response.statusText}`)
  }
}
