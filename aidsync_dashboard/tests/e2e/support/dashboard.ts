import { expect, type Locator, type Page } from '@playwright/test'

export async function waitForDashboardReady(page: Page, heading: RegExp | string) {
  await page.waitForLoadState('networkidle')
  await expect(page.locator('h1, h2, h3').filter({ hasText: heading }).first()).toBeVisible({ timeout: 15_000 })
}

export async function openDashboardSection(page: Page, linkName: RegExp | string, heading: RegExp | string) {
  await page.goto('/overview')
  await waitForDashboardReady(page, /clinical integrity flow/i)
  await page.getByRole('link', { name: linkName }).click()
  await waitForDashboardReady(page, heading)
}

export async function clickFirstVisible(locator: Locator) {
  await expect(locator.first()).toBeVisible()
  await locator.first().click()
}

export async function expectEitherVisible(page: Page, primary: Locator, fallback: Locator) {
  const primaryCount = await primary.count()
  if (primaryCount > 0) {
    await expect(primary.first()).toBeVisible()
    return
  }

  await expect(fallback.first()).toBeVisible()
}
