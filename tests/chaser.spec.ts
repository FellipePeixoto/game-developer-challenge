import { expect, test, type Page } from '@playwright/test'

interface Spawn {
  x: number
  y: number
  width: number
  height: number
}

async function openBattle(page: Page, seed: number) {
  await page.goto(`/?seed=${seed}`)
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
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') })
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
