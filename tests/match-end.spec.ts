import { expect, test, type Page } from '@playwright/test'
import { gameplayConfig } from '../src/arena/gameplayConfig'

const startTime = new Date('2026-01-01T00:00:00Z')

async function openBattle(page: Page, scenario?: string) {
  await page.clock.install({ time: startTime })
  await page.setViewportSize({ width: 960, height: 540 })
  await page.addInitScript(() => {
    localStorage.setItem('pirate-battle:session-options', JSON.stringify({
      durationSeconds: 60,
      spawnIntervalSeconds: 2,
    }))
  })
  await page.goto(`/?seed=1487${scenario ? `&enemy=${scenario}` : ''}`)
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  const arena = page.locator('.battle-arena')
  await expect(arena.locator('canvas')).toHaveCount(1)
  await page.clock.pauseAt(startTime.getTime() + 60_000)
  return arena
}

test('time expires only during active play and restart clears the match', async ({ page }) => {
  test.setTimeout(120_000)
  const quietConfig = {
    ...gameplayConfig,
    player: { ...gameplayConfig.player, maxHealth: 100 },
    chaser: { ...gameplayConfig.chaser, movementSpeed: 0 },
    shooter: { ...gameplayConfig.shooter, movementSpeed: 0, attackRange: 0 },
  }
  await page.route('**/src/arena/gameplayConfig.ts*', route => route.fulfill({
    contentType: 'application/javascript',
    body: `export const gameplayConfig = ${JSON.stringify(quietConfig)};`,
  }))
  const arena = await openBattle(page)

  await page.clock.runFor(2_100)
  expect(JSON.parse(await arena.getAttribute('data-enemies') ?? '[]')).toHaveLength(1)
  await page.getByRole('button', { name: 'Pause' }).click()
  const pausedTime = Number(await arena.getAttribute('data-remaining-seconds'))
  await page.clock.runFor(10_000)
  expect(Number(await arena.getAttribute('data-remaining-seconds'))).toBe(pausedTime)
  await page.getByRole('button', { name: 'Resume' }).click()

  await page.clock.runFor(58_000)
  await expect(page.getByRole('heading', { name: 'Time up' })).toBeVisible()
  expect(Number(await arena.getAttribute('data-remaining-seconds'))).toBe(0)
  const endedEnemies = await arena.getAttribute('data-enemies')
  const endedScore = await arena.getAttribute('data-score')
  await page.clock.runFor(5_000)
  expect(await arena.getAttribute('data-enemies')).toBe(endedEnemies)
  expect(await arena.getAttribute('data-score')).toBe(endedScore)
  expect(Number(await arena.getAttribute('data-remaining-seconds'))).toBe(0)

  await page.getByRole('button', { name: 'Restart' }).click()
  await expect(page.getByRole('heading', { name: 'Time up' })).toHaveCount(0)
  await expect(arena.locator('canvas')).toHaveCount(1)
  await expect(arena).toHaveAttribute('data-remaining-seconds', '60')
  expect(Number(await arena.getAttribute('data-player-health'))).toBe(100)
  expect(Number(await arena.getAttribute('data-score'))).toBe(0)
  expect(JSON.parse(await arena.getAttribute('data-enemies') ?? '[]')).toEqual([])
})

test('player death ends the match and ignores held controls', async ({ page }) => {
  const fragileConfig = {
    ...gameplayConfig,
    player: { ...gameplayConfig.player, maxHealth: 1 },
  }
  await page.route('**/src/arena/gameplayConfig.ts*', route => route.fulfill({
    contentType: 'application/javascript',
    body: `export const gameplayConfig = ${JSON.stringify(fragileConfig)};`,
  }))
  const arena = await openBattle(page, 'chaser')
  await page.keyboard.down('KeyD')
  for (let elapsed = 0; elapsed < 10_000; elapsed += 100) {
    await page.clock.runFor(100)
    if (await page.getByRole('heading', { name: 'Ship sunk' }).count()) break
  }
  await expect(page.getByRole('heading', { name: 'Ship sunk' })).toBeVisible()
  expect(Number(await arena.getAttribute('data-player-health'))).toBe(0)
  const endedX = await arena.getAttribute('data-ship-x')
  const endedY = await arena.getAttribute('data-ship-y')
  const endedTime = await arena.getAttribute('data-remaining-seconds')
  await page.clock.runFor(5_000)
  expect(await arena.getAttribute('data-ship-x')).toBe(endedX)
  expect(await arena.getAttribute('data-ship-y')).toBe(endedY)
  expect(await arena.getAttribute('data-remaining-seconds')).toBe(endedTime)
  await page.keyboard.up('KeyD')

  await page.getByRole('button', { name: 'Restart' }).click()
  await expect(page.getByRole('heading', { name: 'Ship sunk' })).toHaveCount(0)
  await expect(arena).toHaveAttribute('data-remaining-seconds', '60')
  expect(Number(await arena.getAttribute('data-player-health'))).toBe(1)
  expect(Number(await arena.getAttribute('data-score'))).toBe(0)
})
