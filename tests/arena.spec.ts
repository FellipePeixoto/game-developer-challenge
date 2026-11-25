import { expect, test } from '@playwright/test'

test('opens, closes, and reopens one Pixi arena', async ({ page }) => {
  await page.goto('/')
  const play = page.getByRole('button', { name: 'Play', exact: true })
  await play.click()
  await expect(page.getByRole('img', { name: 'Battle arena' }).locator('canvas')).toHaveCount(1)
  await page.getByRole('button', { name: 'Main Menu' }).click()
  await expect(page.locator('canvas')).toHaveCount(0)
  await play.click()
  await expect(page.getByRole('img', { name: 'Battle arena' }).locator('canvas')).toHaveCount(1)
})
