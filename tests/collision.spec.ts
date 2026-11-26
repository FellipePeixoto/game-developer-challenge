import { expect, test, type Locator, type Page } from '@playwright/test'
import { gameplayConfig } from '../src/arena/gameplayConfig'

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
  const startTime = new Date('2026-01-01T00:00:00Z')
  await page.clock.install({ time: startTime })
  await page.goto('/')
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.getByRole('img', { name: 'Battle arena' }).locator('canvas')).toHaveCount(1)
  // Freeze between inputs too: parallel workers must not add real-time rotation.
  await page.clock.pauseAt(startTime.getTime() + 60_000)
})

for (const [edge, heading] of [['top', 0], ['right', Math.PI / 2], ['bottom', Math.PI], ['left', 3 * Math.PI / 2]] as const) {
  test(`keeps the rotated ship collider inside the ${edge} edge`, async ({ page }) => {
    const arena = page.getByRole('img', { name: 'Battle arena' })
    await move(page, 126)
    await turn(page, 'KeyD', heading)
    await move(page, 720)
    const x = await value(arena, 'ship-x')
    const y = await value(arena, 'ship-y')
    const { width, height } = await arena.evaluate(element => ({
      width: element.clientWidth,
      height: element.clientHeight,
    }))
    expect(x).toBeGreaterThanOrEqual(0)
    expect(y).toBeGreaterThanOrEqual(0)
    expect(x).toBeLessThanOrEqual(width)
    expect(y).toBeLessThanOrEqual(height)
    const points = await corners(arena)
    const xs = points.filter((_, index) => index % 2 === 0)
    const ys = points.filter((_, index) => index % 2 === 1)
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(-0.01)
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(-0.01)
    expect(Math.max(...xs)).toBeLessThanOrEqual(width + 0.01)
    expect(Math.max(...ys)).toBeLessThanOrEqual(height + 0.01)
    const clearance = { top: Math.min(...ys), right: width - Math.max(...xs), bottom: height - Math.max(...ys), left: Math.min(...xs) }
    expect(clearance[edge]).toBeLessThan(4)
    await move(page, 180)
    expect(Math.abs(await value(arena, 'ship-x') - x)).toBeLessThan(4)
    expect(Math.abs(await value(arena, 'ship-y') - y)).toBeLessThan(4)
  })
}

test('stops the ship at the square island corner and lets it sail around', async ({ page }) => {
  const arena = page.getByRole('img', { name: 'Battle arena' })
  const scale = await value(arena, 'ship-scale')
  const islandHalfSize = 48 * scale
  const islandLeft = await value(arena, 'island-x') - islandHalfSize
  const islandTop = await value(arena, 'island-y') - islandHalfSize

  await move(page, 46)
  await turn(page, 'KeyD', Math.PI / 2)
  await move(page, 265)

  const points = await corners(arena)
  const bottom = Math.max(...points.filter((_, index) => index % 2 === 1))
  expect(bottom).toBeGreaterThan(islandTop)
  expect(bottom).toBeLessThan(islandTop + 2 * islandHalfSize)

  // A rotated bow may extend past the left edge while it is above the island.
  const hullAtIsland = []
  for (let index = 0; index < points.length; index += 2) {
    const next = (index + 2) % points.length
    const x = points[index]
    const y = points[index + 1]
    const nextY = points[next + 1]
    if (y >= islandTop) hullAtIsland.push(x)
    if ((y < islandTop) === (nextY < islandTop)) continue

    const fraction = (islandTop - y) / (nextY - y)
    hullAtIsland.push(x + fraction * (points[next] - x))
  }
  const right = Math.max(...hullAtIsland)
  expect(right).toBeLessThanOrEqual(islandLeft + 0.01)
  expect(right).toBeGreaterThan(islandLeft - 4)

  await turn(page, 'KeyA', Math.PI / 2)
  await move(page, 90)
  await turn(page, 'KeyD', Math.PI / 2)
  await move(page, 160)

  const pastCorner = await corners(arena)
  expect(Math.min(...pastCorner.filter((_, index) => index % 2 === 0))).toBeGreaterThan(islandLeft)
  expect(Math.max(...pastCorner.filter((_, index) => index % 2 === 1))).toBeLessThan(islandTop)
})

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
