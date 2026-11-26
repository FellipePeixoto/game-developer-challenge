import { expect, test, type Locator, type Page } from '@playwright/test'
import { gameplayConfig } from '../src/arena/gameplayConfig'
import { freezeGameClock, openClockedArena } from './clocked-arena'

async function hold(page: Page, key: string, milliseconds: number) {
  if (!milliseconds) return
  await page.keyboard.down(key)
  await page.clock.runFor(milliseconds)
  await page.keyboard.up(key)
}

function move(page: Page, referencePixels: number) {
  return hold(page, 'KeyW', Math.round(referencePixels / gameplayConfig.player.movementSpeed * 1000))
}

function turn(page: Page, key: 'KeyA' | 'KeyD', radians: number) {
  return hold(page, key, Math.round(radians / gameplayConfig.player.turningSpeed * 1000))
}

async function value(arena: Locator, name: string) {
  const attribute = await arena.getAttribute(`data-${name}`)
  expect(attribute, name).not.toBeNull()
  return Number(attribute)
}

async function corners(arena: Locator): Promise<number[]> {
  const attribute = await arena.getAttribute('data-ship-corners')
  expect(attribute).not.toBeNull()
  return JSON.parse(attribute!) as number[]
}

test.beforeEach(async ({ page }) => {
  await freezeGameClock(page)
  await openClockedArena(page)
})

const quarterTurn = Math.PI / 2
const routesToEdge = {
  top: [[quarterTurn, 200], [-quarterTurn, 320]],
  right: [[quarterTurn, 520]],
  bottom: [[Math.PI, 40], [quarterTurn, 240], [-quarterTurn, 280]],
  left: [[Math.PI, 40], [quarterTurn, 520]],
} as const

test('shows collider outlines only in development and updates them with movement and resize', async ({ page }) => {
  const arena = page.getByRole('img', { name: 'Battle arena' })
  if (process.env.PLAYWRIGHT_PRODUCTION) {
    await expect(arena).not.toHaveAttribute('data-collision-debugger')
    await page.screenshot({ path: test.info().outputPath('production-arena.png') })
    return
  }
  await expect(arena).toHaveAttribute('data-collision-debugger', 'enabled')
  const initial = await arena.getAttribute('data-debug-colliders')
  await move(page, 72)
  expect(await arena.getAttribute('data-debug-colliders')).not.toBe(initial)
  const moved = await arena.getAttribute('data-debug-colliders')
  await page.setViewportSize({ width: 700, height: 700 })
  await expect.poll(async () => {
    await page.clock.runFor(100)
    return arena.getAttribute('data-debug-colliders')
  }).not.toBe(moved)
  await page.screenshot({ path: test.info().outputPath('collision-debugger.png') })
})
