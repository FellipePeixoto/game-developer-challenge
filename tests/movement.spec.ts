import { expect, test } from '@playwright/test'
import { gameplayConfig } from '../src/arena/gameplayConfig'

const { movementSpeed, turningSpeed } = gameplayConfig.player
const forwardMs = Math.round(72 / movementSpeed * 1000)
const turnMs = Math.round((Math.PI / 4) / turningSpeed * 1000)

test.beforeEach(async ({ page }) => {
  const startTime = new Date('2026-01-01T00:00:00Z')
  await page.clock.install({ time: startTime })
  await page.goto('/')
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.getByRole('img', { name: 'Battle arena' }).locator('canvas')).toHaveCount(1)
  await page.clock.pauseAt(startTime.getTime() + 60_000)
})

test('moves and turns with keyboard controls', async ({ page }) => {
  const arena = page.getByRole('img', { name: 'Battle arena' })
  const startX = Number(await arena.getAttribute('data-ship-x'))
  const startY = Number(await arena.getAttribute('data-ship-y'))
  await page.keyboard.down('KeyW')
  await page.clock.runFor(forwardMs)
  await page.keyboard.up('KeyW')
  expect(Number(await arena.getAttribute('data-ship-y'))).toBeLessThan(startY)
  await page.keyboard.down('KeyD')
  await page.clock.runFor(turnMs)
  await page.keyboard.up('KeyD')
  await page.keyboard.down('KeyW')
  await page.clock.runFor(forwardMs)
  await page.keyboard.up('KeyW')
  expect(Number(await arena.getAttribute('data-ship-x'))).toBeGreaterThan(startX)
})

test('moves using touch controls', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Mobile viewport only')
  const arena = page.getByRole('img', { name: 'Battle arena' })
  for (const name of ['Turn left', 'Forward', 'Turn right']) {
    await expect(page.getByRole('button', { name })).toHaveCSS('user-select', 'none')
  }
  const startY = Number(await arena.getAttribute('data-ship-y'))
  await page.getByRole('button', { name: 'Forward' }).dispatchEvent('pointerdown', { pointerId: 1, pointerType: 'touch' })
  await page.clock.runFor(forwardMs)
  await page.getByRole('button', { name: 'Forward' }).dispatchEvent('pointerup', { pointerId: 1, pointerType: 'touch' })
  expect(Number(await arena.getAttribute('data-ship-y'))).toBeLessThan(startY)
  const startX = Number(await arena.getAttribute('data-ship-x'))
  await page.getByRole('button', { name: 'Turn right' }).dispatchEvent('pointerdown', { pointerId: 2, pointerType: 'touch' })
  await page.clock.runFor(turnMs)
  await page.getByRole('button', { name: 'Turn right' }).dispatchEvent('pointerup', { pointerId: 2, pointerType: 'touch' })
  await page.getByRole('button', { name: 'Forward' }).dispatchEvent('pointerdown', { pointerId: 3, pointerType: 'touch' })
  await page.clock.runFor(forwardMs)
  await page.getByRole('button', { name: 'Forward' }).dispatchEvent('pointerup', { pointerId: 3, pointerType: 'touch' })
  expect(Number(await arena.getAttribute('data-ship-x'))).toBeGreaterThan(startX)
})
