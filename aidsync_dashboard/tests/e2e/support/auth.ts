import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

type Credentials = {
  email: string
  password: string
}

function parseLoginFile(contents: string): Credentials | null {
  const lines = contents
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const emailLine = lines.find((line) => line.toLowerCase().startsWith('email:'))
  const passwordLine = lines.find((line) => line.toLowerCase().startsWith('password:'))

  if (!emailLine || !passwordLine) {
    return null
  }

  const email = emailLine.split(':').slice(1).join(':').trim()
  const password = passwordLine.split(':').slice(1).join(':').trim()

  if (!email || !password) {
    return null
  }

  return { email, password }
}

export function resolveDashboardCredentials(): Credentials {
  const email = process.env.AIDSYNC_E2E_EMAIL || process.env.E2E_EMAIL
  const password = process.env.AIDSYNC_E2E_PASSWORD || process.env.E2E_PASSWORD

  if (email && password) {
    return { email, password }
  }

  const currentFile = fileURLToPath(import.meta.url)
  const currentDir = path.dirname(currentFile)
  const fallbackFile = path.resolve(currentDir, '../../../../temp/login.txt')

  if (fs.existsSync(fallbackFile)) {
    const parsed = parseLoginFile(fs.readFileSync(fallbackFile, 'utf8'))
    if (parsed) {
      return parsed
    }
  }

  throw new Error(
    'Missing dashboard E2E credentials. Set AIDSYNC_E2E_EMAIL and AIDSYNC_E2E_PASSWORD, or provide temp/login.txt.',
  )
}
