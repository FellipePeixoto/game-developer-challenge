import { expect, test } from '@playwright/test'

test('opens Pirate Battle', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Pirate Battle', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Controls' })).toBeVisible()
})

test('uses square corners on the menu and options controls', async ({ page }) => {
  await page.goto('/')
  const options = page.getByRole('button', { name: 'Options' })

  await expect(options).toHaveCSS('border-radius', '0px')
  await expect(page.getByRole('region', { name: 'Controls' })).toHaveCSS('border-radius', '0px')
  await expect(page.locator('kbd').first()).toHaveCSS('border-radius', '0px')
  await expect(page.getByRole('tabpanel', { name: 'Ranking' })).toHaveCSS('border-radius', '0px')

  await options.click()
  await expect(page.getByRole('spinbutton', { name: 'Game session time' })).toHaveCSS('border-radius', '0px')
})
