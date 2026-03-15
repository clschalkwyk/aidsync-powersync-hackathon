import { test, expect } from '@playwright/test'
import { resolveDashboardCredentials } from './support/auth'

const authFile = 'playwright/.auth/user.json'

test('authenticate dashboard operator', async ({ page }) => {
  const credentials = resolveDashboardCredentials()

  await page.goto('/login')
  await page.waitForLoadState('networkidle')

  if (page.url().includes('/overview')) {
    await page.context().storageState({ path: authFile })
    return
  }

  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
  await page.getByLabel(/system email/i).fill(credentials.email)
  await page.getByLabel(/access key/i).fill(credentials.password)
  await page.getByRole('button', { name: /authorize access/i }).click()

  await page.waitForURL('**/overview', { timeout: 30_000 })
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('heading', { name: /clinical integrity flow/i })).toBeVisible()

  await page.context().storageState({ path: authFile })
})
