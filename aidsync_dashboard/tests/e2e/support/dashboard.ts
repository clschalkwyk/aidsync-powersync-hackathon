import { expect, type Locator, type Page } from '@playwright/test'

export async function waitForDashboardReady(page: Page, heading: RegExp | string) {
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('heading', { name: heading })).toBeVisible()
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
