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

test('keeps the ship within the mobile arena', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Mobile viewport only')
  await page.goto('/')
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  const arena = page.getByRole('img', { name: 'Battle arena' })
  await expect(arena.locator('canvas')).toHaveCount(1)
  const shipX = Number(await arena.getAttribute('data-ship-x'))
  const shipY = Number(await arena.getAttribute('data-ship-y'))
  const size = await arena.locator('canvas').evaluate(element => {
    const canvas = element as HTMLCanvasElement
    return { width: canvas.width, height: canvas.height }
  })
  expect(shipX).toBeGreaterThan(0)
  expect(shipX).toBeLessThan(size.width)
  expect(shipY).toBeGreaterThan(0)
  expect(shipY).toBeLessThan(size.height)
  const viewportWidth = page.viewportSize()!.width
  const bounds = await arena.boundingBox()
  expect(bounds!.x).toBe(0)
  expect(bounds!.width).toBe(viewportWidth)
  const shipScale = Number(await arena.getAttribute('data-ship-scale'))
  expect(shipScale).toBeGreaterThan(0)
  expect(shipScale).toBeLessThan(0.6)
})
