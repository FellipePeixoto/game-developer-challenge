import { expect, test } from '@playwright/test'
import { gameplayConfig } from '../src/arena/gameplayConfig'

test('spawns both enemy types at the saved interval in a standard match', async ({ page }) => {
  const startTime = new Date('2026-01-01T00:00:00Z')
  await page.clock.install({ time: startTime })
  await page.setViewportSize({ width: 960, height: 540 })
  await page.addInitScript(() => {
    localStorage.setItem('pirate-battle:session-options', JSON.stringify({
      durationSeconds: 60,
      spawnIntervalSeconds: 2,
    }))
  })
  await page.goto('/?seed=6444')
  await page.clock.pauseAt(startTime.getTime() + 60_000)
  await page.getByRole('button', { name: 'Play', exact: true }).press('Enter')

  const arena = page.getByRole('img', { name: 'Battle arena' })
  await arena.locator('canvas').waitFor({ state: 'attached' })
  const enemyTypes = async (): Promise<string[]> => {
    const enemies = JSON.parse(await arena.getAttribute('data-enemies') ?? '[]') as { type: string }[]
    return enemies.map(({ type }) => type)
  }

  await page.clock.runFor(1900)
  expect(await enemyTypes()).toEqual([])

  await page.clock.runFor(200)
  expect(await enemyTypes()).toHaveLength(1)

  await page.clock.runFor(2000)
  expect((await enemyTypes()).sort()).toEqual(['chaser', 'shooter'])
})

for (const type of ['chaser', 'shooter'] as const) {
  test(`player shots damage and destroy a ${type} for one point`, async ({ page }) => {
    const scenario = {
      ...gameplayConfig,
      player: { ...gameplayConfig.player, maxHealth: 100 },
      chaser: { ...gameplayConfig.chaser, maxHealth: 2, movementSpeed: 0 },
      shooter: { ...gameplayConfig.shooter, maxHealth: 2, movementSpeed: 0 },
      projectile: { ...gameplayConfig.projectile, lifetimeSeconds: 3 },
    }
    await page.route('**/src/arena/gameplayConfig.ts*', route => route.fulfill({
      contentType: 'application/javascript',
      body: `export const gameplayConfig = ${JSON.stringify(scenario)};`,
    }))
    const startTime = new Date('2026-01-01T00:00:00Z')
    await page.clock.install({ time: startTime })
    await page.setViewportSize({ width: 960, height: 540 })
    await page.goto(`/?enemy=${type}&seed=1487`)
    await page.getByRole('button', { name: 'Play', exact: true }).click()
    const arena = page.getByRole('img', { name: 'Battle arena' })
    await expect(arena.locator('canvas')).toHaveCount(1)
    await page.clock.pauseAt(startTime.getTime() + 60_000)

    const stateAttribute = type === 'chaser' ? 'data-chaser-state' : 'data-shooter-state'
    const state = async () => JSON.parse((await arena.getAttribute(stateAttribute))!) as {
      x: number; y: number; health: number
    }
    const enemy = await state()
    expect(enemy.health).toBe(2)
    const playerX = Number(await arena.getAttribute('data-ship-x'))
    const playerY = Number(await arena.getAttribute('data-ship-y'))
    const angle = Math.atan2(enemy.x - playerX, playerY - enemy.y)
    const turnKey = angle < 0 ? 'KeyA' : 'KeyD'
    await page.keyboard.down(turnKey)
    await page.clock.runFor(Math.abs(angle) / scenario.player.turningSpeed * 1000)
    await page.keyboard.up(turnKey)

    await page.keyboard.press('Space')
    await page.clock.runFor(1000)
    expect((await state()).health).toBe(1)
    expect(Number(await arena.getAttribute('data-score'))).toBe(0)

    await page.keyboard.press('Space')
    await page.clock.runFor(1000)
    const remaining = JSON.parse((await arena.getAttribute('data-enemies'))!) as unknown[]
    expect(remaining).toHaveLength(0)
    expect(Number(await arena.getAttribute('data-score'))).toBe(1)
    await page.clock.runFor(1000)
    expect(Number(await arena.getAttribute('data-score'))).toBe(1)
  })
}
