import { expect, test } from '@playwright/test'

test('navigates the menu and data tabs by keyboard', async ({ page }) => {
  await page.goto('/')
  const play = page.getByRole('button', { name: 'Play', exact: true })
  await expect(play).toBeVisible()
  await page.keyboard.press('Tab')
  await expect(play).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Options' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('spinbutton', { name: 'Game session time' })).toBeFocused()

  await page.getByRole('button', { name: 'Back' }).press('Enter')
  await expect(page.getByRole('button', { name: 'Options' })).toBeFocused()

  await page.keyboard.press('Tab')
  const ranking = page.getByRole('tab', { name: 'Ranking' })
  const history = page.getByRole('tab', { name: 'Match History' })
  await expect(ranking).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect(history).toBeFocused()
  await expect(history).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('tabpanel', { name: 'Match History' })).toBeVisible()
  await page.keyboard.press('ArrowLeft')
  await expect(ranking).toBeFocused()
  await expect(page.getByRole('tabpanel', { name: 'Ranking' })).toBeVisible()
})

test('validates, saves and restores session options', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Options' }).click()
  const duration = page.getByRole('spinbutton', { name: 'Game session time' })
  const spawn = page.getByRole('spinbutton', { name: 'Enemy spawn time' })
  const save = page.getByRole('button', { name: 'Save options' })

  for (const [invalidDuration, invalidSpawn] of [['59', '0'], ['181', '61'], ['60.5', '1.5'], ['', '']]) {
    await duration.fill(invalidDuration)
    await spawn.fill(invalidSpawn)
    await save.click()
    await expect(duration).toHaveAttribute('aria-invalid', 'true')
    await expect(spawn).toHaveAttribute('aria-invalid', 'true')
    await expect(duration).toBeFocused()
    await expect(page.getByRole('alert')).toContainText('Enter a whole number from 60 to 180')
    await expect(page.getByRole('alert')).toContainText('Enter a whole number from 1 to 60')
  }

  for (const [validDuration, validSpawn] of [['60', '1'], ['180', '60']]) {
    await duration.fill(validDuration)
    await spawn.fill(validSpawn)
    await save.click()
    await expect(page.getByRole('heading', { name: 'Pirate Battle' })).toBeVisible()

    await page.reload()
    await page.getByRole('button', { name: 'Options' }).click()
    await expect(duration).toHaveValue(validDuration)
    await expect(spawn).toHaveValue(validSpawn)
  }

  await duration.fill('90')
  await page.getByRole('button', { name: 'Back' }).click()
  await page.getByRole('button', { name: 'Options' }).click()
  await expect(duration).toHaveValue('180')
})

test('keeps the active session settings when the saved options change', async ({ page, context }) => {
  await page.goto('/')
  const play = page.getByRole('button', { name: 'Play', exact: true })
  await play.click()
  const session = page.getByRole('region', { name: 'Session settings' })
  await expect(session).toContainText('120 seconds')
  await expect(session).toContainText('8 seconds')

  const optionsPage = await context.newPage()
  await optionsPage.goto('/')
  await optionsPage.getByRole('button', { name: 'Options' }).click()
  await optionsPage.getByRole('spinbutton', { name: 'Game session time' }).fill('90')
  await optionsPage.getByRole('spinbutton', { name: 'Enemy spawn time' }).fill('5')
  await optionsPage.getByRole('button', { name: 'Save options' }).click()
  await expect(optionsPage.getByRole('heading', { name: 'Pirate Battle' })).toBeVisible()
  await optionsPage.close()

  await expect(session).toContainText('120 seconds')
  await expect(session).toContainText('8 seconds')
  await page.getByRole('button', { name: 'Main Menu' }).click()
  await play.click()
  await expect(session).toContainText('90 seconds')
  await expect(session).toContainText('5 seconds')
})
