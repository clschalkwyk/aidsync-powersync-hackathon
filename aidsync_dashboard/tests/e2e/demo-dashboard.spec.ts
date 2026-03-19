import { expect, test } from '@playwright/test'
import { waitForDashboardReady } from './support/dashboard'

async function pause(pageMs: number) {
  return new Promise((resolve) => setTimeout(resolve, pageMs))
}

test.describe.configure({ mode: 'serial' })

test.use({
  video: 'on',
  trace: 'off',
  screenshot: 'off',
})

test('dashboard demo flow', async ({ page }) => {
  await page.goto('/overview')
  await waitForDashboardReady(page, /clinical integrity flow/i)
  await pause(1200)

  await expect(page.getByText(/powersync engine online/i)).toBeVisible()
  await expect(page.getByRole('link', { name: /manage reference data/i })).toBeVisible()
  await pause(1000)

  await page.getByRole('link', { name: /medication reference/i }).click()
  await waitForDashboardReady(page, /medication reference/i)
  await pause(1200)

  await expect(page.getByText(/prepared online, available offline/i)).toBeVisible()
  await expect(page.getByRole('link', { name: /prepare reference/i })).toBeVisible()
  await pause(1000)

  await page.getByRole('link', { name: /encounters/i }).click()
  await waitForDashboardReady(page, /review queue/i)
  await pause(1200)

  const encounterLink = page.locator('a[href="/encounters/61111111-1111-1111-1111-111111111111"]').first()

  await expect(encounterLink).toBeVisible()
  await encounterLink.click()
  await expect(page.getByRole('heading', { name: /review session #/i })).toBeVisible()
  await pause(1200)

  await expect(page.getByText(/encounter decision/i)).toBeVisible()
  await expect(page.getByText(/safety engine audit outcome/i)).toBeVisible()
  await pause(1000)

  const reviewNote = page.getByPlaceholder(/add a supervisor review note/i)
  if (await reviewNote.count()) {
    await reviewNote.fill('Supervisor review completed. Field warning and clinician note were synced correctly.')
    await pause(400)
    await page.getByRole('button', { name: /save review note/i }).click()
    await pause(1200)

    await expect(page.getByText(/last reviewed/i)).toBeVisible()
    await expect(page.getByText(/field warning and clinician note were synced correctly/i)).toBeVisible()
  } else {
    await expect(page.getByText(/last reviewed/i)).toBeVisible()
  }
  await pause(1200)
})
