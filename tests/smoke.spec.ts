import { expect, test } from '@playwright/test'

test('opens Pirate Battle', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Pirate Battle', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Options', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Ranking', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Match History', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toHaveCount(0)
})

test('shows the keyboard controls in the main menu', async ({ page }) => {
  await page.goto('/')

  const controls = page.getByRole('region', { name: 'Controls', exact: true })
  const commands = [
    ['Forward', 'W'],
    ['Turn left', 'A'],
    ['Turn right', 'D'],
    ['Fire left', 'Q'],
    ['Fire front', 'Space'],
    ['Fire right', 'E'],
  ]

  for (const [action, key] of commands) {
    const command = controls.getByRole('listitem').filter({ hasText: action })
    await expect(command.getByText(key, { exact: true })).toBeVisible()
  }
})

test('uses square corners on the menu and options controls', async ({ page }) => {
  await page.goto('/')
  const options = page.getByRole('button', { name: 'Options' })

  await expect(options).toHaveCSS('border-radius', '0px')

  await options.click()
  await expect(page.getByRole('button', { name: 'Increase game session time' })).toHaveCSS('border-radius', '0px')
})
