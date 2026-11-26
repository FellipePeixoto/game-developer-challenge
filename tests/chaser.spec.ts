import { expect, test, type Locator, type Page } from '@playwright/test'

const startTime = new Date('2026-01-01T00:00:00Z')

interface Spawn {
  x: number
  y: number
  width: number
  height: number
}

interface ChaserState {
  phase: 'pursuing' | 'exploding' | 'removed'
  x: number
  y: number
  rotation: number
  playerHealth: number
  score: number
}

async function chaserState(arena: Locator): Promise<ChaserState> {
  const state = await arena.getAttribute('data-chaser-state')
  expect(state, 'The arena exposes the Chaser state in development').not.toBeNull()
  return JSON.parse(state!) as ChaserState
}

async function openBattle(page: Page, seed: number) {
  await page.goto(`/?enemy=chaser&seed=${seed}`)
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  const arena = page.getByRole('img', { name: 'Battle arena' })
  await expect(arena).toHaveAttribute('data-chaser-spawn', /\S+/)
  const spawn = JSON.parse((await arena.getAttribute('data-chaser-spawn'))!) as Spawn
  const { width, height } = await arena.evaluate(element => ({
    width: element.clientWidth,
    height: element.clientHeight,
  }))
  return { arena, spawn, width, height }
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 960, height: 540 })
  await page.clock.install({ time: startTime })
})

test('turns toward the moving player, deals one damage on impact and explodes without scoring', async ({ page }) => {
  const { arena } = await openBattle(page, 1487)
  await page.clock.pauseAt(startTime.getTime() + 60_000)
  const initial = await chaserState(arena)
  expect(initial.phase).toBe('pursuing')

  await page.keyboard.down('KeyW')
  await page.clock.runFor(600)
  await page.keyboard.up('KeyW')
  const pursuit = await chaserState(arena)
  const playerX = Number(await arena.getAttribute('data-ship-x'))
  const playerY = Number(await arena.getAttribute('data-ship-y'))
  expect(Math.hypot(pursuit.x - playerX, pursuit.y - playerY))
    .toBeLessThan(Math.hypot(initial.x - playerX, initial.y - playerY))
  expect(pursuit.rotation).not.toBeCloseTo(initial.rotation, 2)
  expect(pursuit.playerHealth).toBe(initial.playerHealth)
  expect(pursuit.score).toBe(0)

  let impact = pursuit
  for (let elapsed = 0; elapsed < 5000 && impact.phase === 'pursuing'; elapsed += 100) {
    await page.clock.runFor(100)
    impact = await chaserState(arena)
  }
  expect(impact.phase).toBe('exploding')
  expect(impact.playerHealth).toBe(initial.playerHealth - 1)
  expect(impact.score).toBe(0)

  await page.clock.runFor(1500)
  const afterExplosion = await chaserState(arena)
  expect(afterExplosion.phase).toBe('removed')
  expect(afterExplosion.playerHealth).toBe(impact.playerHealth)
  expect(afterExplosion.score).toBe(0)
})

test('stops at the island while pursuing the player', async ({ page }) => {
  const { arena, spawn } = await openBattle(page, 7)
  await page.clock.pauseAt(startTime.getTime() + 60_000)
  const initial = await chaserState(arena)

  await page.clock.runFor(2500)
  const stopped = await chaserState(arena)
  expect(Math.hypot(stopped.x - spawn.x, stopped.y - spawn.y)).toBeGreaterThan(5)

  await page.clock.runFor(1000)
  const stillBlocked = await chaserState(arena)
  expect(stillBlocked.phase).toBe('pursuing')
  expect(stillBlocked.x).toBeCloseTo(stopped.x, 2)
  expect(stillBlocked.y).toBeCloseTo(stopped.y, 2)
  expect(stillBlocked.playerHealth).toBe(initial.playerHealth)
})

test('reproduces the Chaser spawn with the same simulation seed', async ({ page }) => {
  const first = await openBattle(page, 0)
  const second = await openBattle(page, 0)
  const different = await openBattle(page, 42)

  expect(second.spawn).toEqual(first.spawn)
  expect({ x: different.spawn.x, y: different.spawn.y })
    .not.toEqual({ x: first.spawn.x, y: first.spawn.y })
})

test('spawns the Chaser away from the player and clear of land and arena edges', async ({ page }) => {
  for (const seed of [0, 42, 73, 4_294_967_295]) {
    const { arena, spawn, width, height } = await openBattle(page, seed)
    const scale = Number(await arena.getAttribute('data-ship-scale'))
    const geometry = await arena.getAttribute('data-debug-colliders')
    expect(geometry).not.toBeNull()
    const { obstacles } = JSON.parse(geometry!) as { obstacles: [number, number, number, number][] }
    expect(obstacles.length).toBeGreaterThan(1)
    const left = spawn.x - spawn.width / 2
    const right = spawn.x + spawn.width / 2
    const top = spawn.y - spawn.height / 2
    const bottom = spawn.y + spawn.height / 2

    expect(spawn.width).toBeGreaterThan(0)
    expect(spawn.height).toBeGreaterThan(0)
    expect(left).toBeGreaterThanOrEqual(0)
    expect(right).toBeLessThanOrEqual(width)
    expect(top).toBeGreaterThanOrEqual(0)
    expect(bottom).toBeLessThanOrEqual(height)
    for (const [landX, landY, landWidth, landHeight] of obstacles) {
      expect(
        right <= landX || left >= landX + landWidth || bottom <= landY || top >= landY + landHeight,
        `Seed ${seed} must leave the entire hull in navigable water`,
      ).toBe(true)
    }
    expect(Math.hypot(spawn.x - width / 2, spawn.y - height / 2))
      .toBeGreaterThanOrEqual(160 * scale)
  }
})
