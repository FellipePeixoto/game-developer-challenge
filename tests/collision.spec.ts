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

const quarterTurn = Math.PI / 2
const routesToEdge = {
  top: [[quarterTurn, 200], [-quarterTurn, 320]],
  right: [[quarterTurn, 520]],
  bottom: [[Math.PI, 40], [quarterTurn, 240], [-quarterTurn, 280]],
  left: [[Math.PI, 40], [quarterTurn, 520]],
} as const

for (const edge of ['top', 'right', 'bottom', 'left'] as const) {
  test(`keeps the rotated ship collider inside the ${edge} edge`, async ({ page }) => {
    const arena = page.getByRole('img', { name: 'Battle arena' })
    for (const [rotation, distance] of routesToEdge[edge]) {
      await turn(page, rotation < 0 ? 'KeyA' : 'KeyD', Math.abs(rotation))
      await move(page, distance)
    }
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
    const horizontalTravel = edge === 'left' || edge === 'right'
    const axis = horizontalTravel ? 'ship-x' : 'ship-y'
    const positionAtContact = horizontalTravel ? x : y
    await move(page, 60)
    expect(Math.abs(await value(arena, axis) - positionAtContact)).toBeLessThan(4)
  })
}

test('crosses the channel and stops at the southern shore of the fixed terrain map', async ({ page }) => {
  const arena = page.getByRole('img', { name: 'Battle arena' })
  const { width, height } = await arena.evaluate(element => ({
    width: element.clientWidth,
    height: element.clientHeight,
  }))

  await turn(page, 'KeyD', Math.PI / 2)
  await move(page, 330)
  expect(await value(arena, 'ship-x')).toBeGreaterThan(width * 0.8)
  expect(Math.abs(await value(arena, 'ship-y') - height / 2)).toBeLessThan(8)

  await turn(page, 'KeyD', Math.PI / 2)
  await move(page, 160)
  const points = await corners(arena)
  const south = Math.max(...points.filter((_, index) => index % 2 === 1))
  const shore = height * 0.625
  expect(south).toBeLessThanOrEqual(shore + 0.01)
  expect(south).toBeGreaterThan(shore - 4)
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
