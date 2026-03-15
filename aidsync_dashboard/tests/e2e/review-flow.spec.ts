import { expect, test } from '@playwright/test'
import { waitForDashboardReady } from './support/dashboard'
import {
  fetchFirstReviewableCheck,
  getSupabaseAccessToken,
  resetInteractionCheckReviewState,
} from './support/supabase'

test.describe('encounter review flow', () => {
  test('flagged medication checks can be marked reviewed and restored', async ({ page }) => {
    await page.goto('/overview')
    await waitForDashboardReady(page, /clinical integrity flow/i)

    const accessToken = await getSupabaseAccessToken(page)
    const candidate = await fetchFirstReviewableCheck(accessToken)

    test.skip(!candidate, 'No unresolved flagged interaction check is currently available for review-flow coverage.')

    let patchedCheckId: string | null = null

    try {
      await page.goto(`/encounters/${candidate!.encounter_id}`)
      await waitForDashboardReady(page, /review session #/i)

      const reviewButtons = page.getByRole('button', { name: /mark reviewed/i })
      const initialButtonCount = await reviewButtons.count()

      const patchRequestPromise = page.waitForRequest((request) => {
        return (
          request.method() === 'PATCH' &&
          request.url().includes('/rest/v1/interaction_checks') &&
          request.url().includes('id=eq.')
        )
      })

      await expect(reviewButtons.first()).toBeVisible()
      await reviewButtons.first().click()

      const patchRequest = await patchRequestPromise
      const requestUrl = new URL(patchRequest.url())
      const idFilter = requestUrl.searchParams.get('id')
      patchedCheckId = idFilter?.replace(/^eq\./, '') || null

      await expect(reviewButtons).toHaveCount(Math.max(initialButtonCount - 1, 0))
      await expect(page.getByText(/reviewed /i).first()).toBeVisible()
    } finally {
      if (patchedCheckId) {
        await resetInteractionCheckReviewState(accessToken, patchedCheckId)
      }
    }
  })
})
