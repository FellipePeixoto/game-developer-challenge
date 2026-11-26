import { expect, test, type Page } from '@playwright/test'
import { gameplayConfig } from '../src/arena/gameplayConfig'

const startTime = new Date('2026-01-01T00:00:00Z')

async function openBattle(page: Page, enemy?: 'chaser' | 'shooter') {
  await page.clock.install({ time: startTime })
  await page.setViewportSize({ width: 960, height: 540 })
  await page.addInitScript(() => {
    localStorage.setItem('pirate-battle:session-options', JSON.stringify({
      durationSeconds: 60,
      spawnIntervalSeconds: 8,
    }))
  })
  await page.goto(`/?seed=1487${enemy ? `&enemy=${enemy}` : ''}`)
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  const arena = page.locator('.battle-arena')
  await expect(arena.locator('canvas')).toHaveCount(1)
  await page.clock.pauseAt(startTime.getTime() + 60_000)
  return { arena, hud: page.getByRole('region', { name: 'Match status' }) }
}

test('shows semantic match values and suspends the displayed clock on pause', async ({ page }) => {
  const quietConfig = {
    ...gameplayConfig,
    chaser: { ...gameplayConfig.chaser, movementSpeed: 0 },
    shooter: { ...gameplayConfig.shooter, movementSpeed: 0, attackRange: 0 },
  }
  await page.route('**/src/arena/gameplayConfig.ts*', route => route.fulfill({
    contentType: 'application/javascript',
    body: `export const gameplayConfig = ${JSON.stringify(quietConfig)};`,
  }))
  const { hud } = await openBattle(page)
  await expect(hud).toBeVisible()
  await expect(hud).toContainText('Score 0')
  await expect(hud).toContainText('Time 1:00')
  await expect(hud).toContainText('Health 3 / 3')
  await expect(hud).toContainText('Playing')
  await expect(hud.locator('[aria-live]')).toHaveCount(0)

  await page.clock.runFor(2_100)
  await expect(hud).toContainText('Time 0:58')
  await page.getByRole('button', { name: 'Pause' }).click()
  await expect(hud).toContainText('Paused')
  const pausedText = await hud.textContent()
  await page.clock.runFor(10_000)
  expect(await hud.textContent()).toBe(pausedText)
  await page.getByRole('button', { name: 'Resume' }).click()
  await expect(hud).toContainText('Playing')
  await page.clock.runFor(1_100)
  await expect(hud).toContainText('Time 0:57')
})

test('updates player health after an impact', async ({ page }) => {
  const { hud, arena } = await openBattle(page, 'chaser')
  await expect(hud).toContainText('Health 3 / 3')
  for (let elapsed = 0; elapsed < 10_000; elapsed += 100) {
    await page.clock.runFor(100)
    if (Number(await arena.getAttribute('data-player-health')) === 2) break
  }
  await expect(hud).toContainText('Health 2 / 3')
  await expect(hud).toContainText('Playing')
})

test('updates score after a player kill', async ({ page }) => {
  const scenario = {
    ...gameplayConfig,
    shooter: { ...gameplayConfig.shooter, movementSpeed: 0, attackRange: 0 },
    projectile: { ...gameplayConfig.projectile, lifetimeSeconds: 3 },
  }
  await page.route('**/src/arena/gameplayConfig.ts*', route => route.fulfill({
    contentType: 'application/javascript',
    body: `export const gameplayConfig = ${JSON.stringify(scenario)};`,
  }))
  const { hud, arena } = await openBattle(page, 'shooter')
  const enemy = JSON.parse((await arena.getAttribute('data-shooter-state'))!) as { x: number; y: number }
  const playerX = Number(await arena.getAttribute('data-ship-x'))
  const playerY = Number(await arena.getAttribute('data-ship-y'))
  const angle = Math.atan2(enemy.x - playerX, playerY - enemy.y)
  await page.keyboard.down(angle < 0 ? 'KeyA' : 'KeyD')
  await page.clock.runFor(Math.abs(angle) / scenario.player.turningSpeed * 1000)
  await page.keyboard.up(angle < 0 ? 'KeyA' : 'KeyD')
  await page.keyboard.press('Space')
  await page.clock.runFor(1_000)
  await page.keyboard.press('Space')
  await page.clock.runFor(1_000)
  await expect(hud).toContainText('Score 1')
})
