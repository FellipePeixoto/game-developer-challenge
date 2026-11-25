import { expect, test } from '@playwright/test'

test('shows asset failure and retries before opening the arena', async ({ page }) => {
  let fail = true
  await page.route('**/ship_1.png*', async (route) => {
    if (route.request().url().includes('?import')) await route.continue()
    else if (fail) await route.abort()
    else await route.continue()
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Could not load battle assets')
  await expect(page.locator('canvas')).toHaveCount(0)
  fail = false
  await page.getByRole('button', { name: 'Retry' }).click()
  await expect(page.getByRole('img', { name: 'Battle arena' }).locator('canvas')).toHaveCount(1)
})
