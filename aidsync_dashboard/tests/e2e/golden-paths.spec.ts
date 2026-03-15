import { expect, test } from '@playwright/test'
import { clickFirstVisible, expectEitherVisible, waitForDashboardReady } from './support/dashboard'

test.describe('dashboard golden paths', () => {
  test('overview surfaces the operational command layer', async ({ page }) => {
    await page.goto('/overview')
    await waitForDashboardReady(page, /clinical integrity flow/i)

    await expect(page.getByText(/powersync engine online/i)).toBeVisible()
    await expect(page.getByRole('link', { name: /medication reference/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /patient directory/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /manage reference data/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /audit field sessions/i })).toBeVisible()
  })

  test('sidebar reaches each major dashboard section', async ({ page }) => {
    await page.goto('/overview')
    await waitForDashboardReady(page, /clinical integrity flow/i)

    const sections: Array<{ link: RegExp; heading: RegExp }> = [
      { link: /overview/i, heading: /clinical integrity flow/i },
      { link: /medications/i, heading: /medication reference/i },
      { link: /ingredients/i, heading: /substance dictionary/i },
      { link: /patients/i, heading: /patient profiles/i },
      { link: /encounters/i, heading: /review queue/i },
      { link: /interactions/i, heading: /safety engine rules/i },
      { link: /contraindications/i, heading: /contraindications/i },
    ]

    for (const section of sections) {
      await page.getByRole('link', { name: section.link }).click()
      await waitForDashboardReady(page, section.heading)
    }
  })

  test('patient directory opens a synced clinical profile', async ({ page }) => {
    await page.goto('/patients')
    await waitForDashboardReady(page, /patient profiles/i)

    const patientCards = page.locator('a[href^="/patients/"]:not([href$="/edit"])').filter({
      has: page.locator('h3'),
    })
    await expect(patientCards.first()).toBeVisible()

    const patientName = (await patientCards.first().locator('h3').innerText()).trim()
    await clickFirstVisible(patientCards)

    await expect(page.getByRole('heading', { level: 1, name: patientName })).toBeVisible()
    await expect(page.getByText(/critical allergies & hypersensitivity/i)).toBeVisible()
    await expect(page.getByText(/clinical conditions/i)).toBeVisible()
    await expect(page.getByText(/active treatments/i)).toBeVisible()
  })

  test('encounter review queue opens a structured audit session', async ({ page }) => {
    await page.goto('/encounters')
    await waitForDashboardReady(page, /review queue/i)

    const encounterLinks = page.locator('a[href^="/encounters/"]:not([href$="/edit"])')
    await expect(encounterLinks.first()).toBeVisible()
    await clickFirstVisible(encounterLinks)

    await expect(page.getByRole('heading', { name: /review session #/i })).toBeVisible()
    await expect(page.getByText(/encounter decision/i)).toBeVisible()
    await expect(page.getByText(/safety engine audit outcome/i)).toBeVisible()
    await expect(page.getByRole('link', { name: /patient profile/i })).toBeVisible()
  })

  test('medication catalog opens a sync-ready reference detail', async ({ page }) => {
    await page.goto('/medications')
    await waitForDashboardReady(page, /medication reference/i)

    const medicationCards = page
      .locator(
        'a[href^="/medications/"]:not([href="/medications/new"]):not([href="/medications/prepare"]):not([href="/medications/link-ingredient"]):not([href$="/edit"])',
      )
      .filter({ has: page.locator('h3') })

    await expect(medicationCards.first()).toBeVisible()

    const medicationName = (await medicationCards.first().locator('h3').innerText()).trim()
    await clickFirstVisible(medicationCards)

    await expect(page.getByRole('heading', { name: medicationName })).toBeVisible()
    await expect(page.getByText(/active ingredient composition/i)).toBeVisible()
    await expect(page.getByText(/validated for sync/i)).toBeVisible()
  })

  test('reference rule sections load with searchable results', async ({ page }) => {
    await page.goto('/ingredients')
    await waitForDashboardReady(page, /substance dictionary/i)
    await expect(page.getByPlaceholder(/search by canonical name/i)).toBeVisible()
    await expectEitherVisible(
      page,
      page.locator('a[href^="/ingredients/"]').first(),
      page.getByText(/dictionary empty/i),
    )

    await page.goto('/interactions')
    await waitForDashboardReady(page, /safety engine rules/i)
    await expect(page.getByPlaceholder(/search by substance or clinical effect/i)).toBeVisible()
    await expectEitherVisible(
      page,
      page.getByText(/clinical interaction effect/i).first(),
      page.getByText(/no rules defined/i),
    )

    await page.goto('/contraindications')
    await waitForDashboardReady(page, /^contraindications$/i)
    await expect(page.getByPlaceholder(/search by substance or clinical factor/i)).toBeVisible()
    await expectEitherVisible(
      page,
      page.getByText(/safety barrier/i).first(),
      page.getByText(/no cautions found/i),
    )
  })

  test('preparation session workspace list is reachable from the medication section', async ({ page }) => {
    await page.goto('/medications')
    await waitForDashboardReady(page, /medication reference/i)

    await page.getByRole('link', { name: /prepare reference/i }).click()
    await waitForDashboardReady(page, /medication preparation sessions/i)

    await expect(page.getByText(/durable preparation/i)).toBeVisible()
    await expect(
      page.locator('main').getByRole('heading', { level: 3 }).first(),
    ).toBeVisible()
  })
})
