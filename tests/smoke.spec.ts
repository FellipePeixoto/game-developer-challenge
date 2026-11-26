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

test('keeps mobile controls readable and paginated tables fully visible', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Requires a touch device')

  async function expectMenuButtonsToFit(name: string) {
    const panel = page.getByRole('region', { name, exact: true })
    await expect(panel).toBeVisible()
    const bounds = (await panel.boundingBox())!
    const buttons = await panel.getByRole('button').or(panel.getByRole('tab')).all()
    expect(buttons.length).toBeGreaterThan(0)

    for (const button of buttons) {
      await expect(button).toBeVisible()
      const box = (await button.boundingBox())!
      expect(box.width).toBeGreaterThanOrEqual(48)
      expect(box.height).toBeGreaterThanOrEqual(48)
      await expect(button).toBeInViewport({ ratio: 0.99 })
      const labelFits = await button.evaluate(element => {
        if (!element.textContent?.trim()) return true
        const label = document.createRange()
        label.selectNodeContents(element)
        const rotated = matchMedia('(orientation: portrait) and (pointer: coarse)').matches
        const { width, height } = label.getBoundingClientRect()
        const labelWidth = rotated ? height : width
        const buttonFrame = 40
        return label.getClientRects().length === 1 && labelWidth <= element.clientWidth - buttonFrame
      })
      expect(labelFits, `Button label should fit inside its frame: ${await button.textContent()}`).toBe(true)
      expect(box.x).toBeGreaterThanOrEqual(bounds.x)
      expect(box.y).toBeGreaterThanOrEqual(bounds.y)
      expect(box.x + box.width).toBeLessThanOrEqual(bounds.x + bounds.width)
      expect(box.y + box.height).toBeLessThanOrEqual(bounds.y + bounds.height)
    }
  }

  for (const viewport of [{ width: 320, height: 700 }, { width: 800, height: 360 }]) {
    await page.setViewportSize(viewport)
    await page.goto('/')

    await expectMenuButtonsToFit('Pirate Battle')
    await page.getByRole('button', { name: 'Options', exact: true }).tap()
    await expectMenuButtonsToFit('Options')
    await page.getByRole('button', { name: 'Main Menu', exact: true }).tap()

    await page.getByRole('button', { name: 'Ranking', exact: true }).tap()
    await expectMenuButtonsToFit("Captain's Log")
    const log = page.getByRole('region', { name: "Captain's Log", exact: true })
    const padding = await log.evaluate(element => {
      const { paddingBlockStart, paddingBlockEnd } = getComputedStyle(element)
      return [parseFloat(paddingBlockStart), parseFloat(paddingBlockEnd)]
    })
    expect(Math.min(...padding)).toBeGreaterThanOrEqual(14)
    const records = page.locator('.log-content')
    for (const name of ['Ranking', 'Match History']) {
      await page.getByRole('tab', { name, exact: true }).tap()
      const rows = page.getByRole('table', { name, exact: true }).getByRole('row')
      await expect(rows).toHaveCount(6)
      for (const row of await rows.all()) {
        await expect(row).toBeInViewport({ ratio: 0.99 })
      }
      const layout = await records.evaluate(element => ({
        overflow: getComputedStyle(element).overflow,
        fits: element.scrollHeight <= element.clientHeight && element.scrollWidth <= element.clientWidth,
      }))
      expect(layout).toEqual({ overflow: 'visible', fits: true })
    }
    await page.getByRole('button', { name: 'Main Menu', exact: true }).tap()

    await page.getByRole('button', { name: 'Play', exact: true }).tap()
    const battleControls = page.getByRole('group', { name: 'Movement controls' })
      .or(page.getByRole('group', { name: 'Weapon controls' }))
      .or(page.getByRole('region', { name: 'Battle controls' }))
      .getByRole('button')
    await expect(battleControls).toHaveCount(7)
    for (const button of await battleControls.all()) {
      await expect(button).toBeInViewport({ ratio: 0.99 })
      const box = (await button.boundingBox())!
      expect(box.width).toBeGreaterThanOrEqual(48)
      expect(box.height).toBeGreaterThanOrEqual(48)
    }
    await page.getByRole('button', { name: 'Pause', exact: true }).tap()
    await expectMenuButtonsToFit('Paused')
  }
})

test('uses square corners on the menu and options controls', async ({ page }) => {
  await page.goto('/')
  const options = page.getByRole('button', { name: 'Options' })

  await expect(options).toHaveCSS('border-radius', '0px')

  await options.click()
  await expect(page.getByRole('button', { name: 'Increase game session time' })).toHaveCSS('border-radius', '0px')
})
