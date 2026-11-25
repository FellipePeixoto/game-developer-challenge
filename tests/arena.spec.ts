import { expect, test } from '@playwright/test'

test('fits the game shell to 16:9 and fills it with the Pixi canvas', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 720 })
  await page.goto('/')
  const shell = page.locator('.game-shell')
  const arena = shell.locator('.battle-arena')
  const canvas = arena.locator('canvas')

  await expect.poll(() => shell.boundingBox()).toEqual({ x: 80, y: 0, width: 1280, height: 720 })
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(canvas).toBeVisible()

  for (const { viewport, bounds } of [
    { viewport: { width: 1440, height: 720 }, bounds: { x: 80, y: 0, width: 1280, height: 720 } },
    { viewport: { width: 384, height: 800 }, bounds: { x: 0, y: 292, width: 384, height: 216 } },
    { viewport: { width: 2560, height: 1440 }, bounds: { x: 320, y: 180, width: 1920, height: 1080 } },
  ]) {
    await page.setViewportSize(viewport)
    await expect.poll(() => shell.boundingBox()).toEqual(bounds)
    await expect.poll(() => arena.boundingBox()).toEqual(bounds)
    await expect.poll(() => canvas.boundingBox()).toEqual(bounds)
  }
})

test('opens, pauses, resumes, and reopens one Pixi arena', async ({ page }) => {
  await page.clock.install()
  await page.goto('/')
  const play = page.getByRole('button', { name: 'Play', exact: true })
  const pause = page.getByRole('button', { name: 'Pause', exact: true })
  const arena = page.locator('.battle-arena')
  await play.click()
  await expect(arena.locator('canvas')).toHaveCount(1)
  await expect(page.getByRole('heading', { name: 'Session setup' })).toHaveCount(0)
  await pause.click()
  await expect(page.getByRole('heading', { name: 'Paused' })).toBeVisible()
  const pausedY = await arena.getAttribute('data-ship-y') ?? ''
  expect(pausedY).not.toBe('')
  await page.keyboard.down('KeyW')
  await page.clock.runFor(500)
  await page.keyboard.up('KeyW')
  await expect(arena).toHaveAttribute('data-ship-y', pausedY)

  await page.getByRole('button', { name: 'Options', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Options', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Back to Pause' }).click()
  await page.getByRole('button', { name: 'Resume' }).click()
  await expect(pause).toBeFocused()
  await expect(arena.locator('canvas')).toHaveCount(1)
  await expect(arena).toHaveAttribute('data-ship-y', pausedY)
  await page.keyboard.down('KeyW')
  await page.clock.runFor(500)
  await page.keyboard.up('KeyW')
  await expect(arena).not.toHaveAttribute('data-ship-y', pausedY)

  await pause.click()
  await page.getByRole('button', { name: 'Main Menu' }).click()
  await expect(play).toBeFocused()
  await play.click()
  await expect(arena.locator('canvas')).toHaveCount(1)
  await expect(arena).toHaveAttribute('data-ship-y', pausedY)
})
