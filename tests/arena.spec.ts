import { expect, test } from '@playwright/test'

test('keeps a 16:9 game frame and rotates it in mobile portrait', async ({ page, isMobile }) => {
  const sizes = isMobile ? [
    { viewport: { width: 432, height: 960 }, bounds: { x: 0, y: 96, width: 432, height: 768 } },
    { viewport: { width: 960, height: 432 }, bounds: { x: 96, y: 0, width: 768, height: 432 } },
  ] : [
    { viewport: { width: 1440, height: 720 }, bounds: { x: 80, y: 0, width: 1280, height: 720 } },
    { viewport: { width: 432, height: 960 }, bounds: { x: 0, y: 358.5, width: 432, height: 243 } },
    { viewport: { width: 2560, height: 1440 }, bounds: { x: 320, y: 180, width: 1920, height: 1080 } },
  ]
  const [initialSize] = sizes
  await page.setViewportSize(initialSize.viewport)
  await page.goto('/')
  const shell = page.locator('.game-shell')
  const arena = shell.locator('.battle-arena')
  const canvas = arena.locator('canvas')

  await expect.poll(() => shell.boundingBox()).toEqual(initialSize.bounds)
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(canvas).toBeVisible()
  const pixelRatio = await page.evaluate(() => window.devicePixelRatio)
  if (isMobile) expect(pixelRatio).toBeGreaterThan(1)

  for (const { viewport, bounds } of sizes) {
    await page.setViewportSize(viewport)
    await expect.poll(() => shell.boundingBox()).toEqual(bounds)
    await expect.poll(() => arena.boundingBox()).toEqual(bounds)
    await expect.poll(() => canvas.boundingBox()).toEqual(bounds)

    const rotated = isMobile && viewport.height > viewport.width
    const width = rotated ? bounds.height : bounds.width
    const height = rotated ? bounds.width : bounds.height
    await expect(canvas).toHaveAttribute('width', String(Math.round(width * pixelRatio)))
    await expect(canvas).toHaveAttribute('height', String(Math.round(height * pixelRatio)))

    if (isMobile) {
      await page.getByRole('button', { name: 'Pause', exact: true }).tap()
      await expect(page.getByRole('heading', { name: 'Paused' })).toBeVisible()
      await page.getByRole('button', { name: 'Resume' }).tap()
    }
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
