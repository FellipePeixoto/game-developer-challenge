import { expect, test, type Locator, type Page } from '@playwright/test'
import { gameplayConfig } from '../src/arena/gameplayConfig'
import { freezeGameClock, openClockedArena } from './clocked-arena'

interface ShooterState {
  x: number
  y: number
  rotation: number
  playerHealth: number
  projectiles: { id: number; x: number; y: number }[]
}

async function shooterState(arena: Locator): Promise<ShooterState> {
  return JSON.parse((await arena.getAttribute('data-shooter-state'))!) as ShooterState
}

async function openBattle(page: Page, seed: number) {
  return openClockedArena(page, `/?enemy=shooter&seed=${seed}`)
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 960, height: 540 })
  await freezeGameClock(page)
})

test('approaches and turns toward the moving player before firing within range', async ({ page }) => {
  const arena = await openBattle(page, 1487)
  const initial = await shooterState(arena)
  expect(initial.projectiles).toHaveLength(0)

  await page.keyboard.down('KeyW')
  await page.clock.runFor(600)
  await page.keyboard.up('KeyW')
  const approaching = await shooterState(arena)
  const playerX = Number(await arena.getAttribute('data-ship-x'))
  const playerY = Number(await arena.getAttribute('data-ship-y'))
  expect(Math.hypot(approaching.x - playerX, approaching.y - playerY))
    .toBeLessThan(Math.hypot(initial.x - playerX, initial.y - playerY))
  expect(approaching.rotation).not.toBeCloseTo(initial.rotation, 2)

  let firing = approaching
  for (let elapsed = 0; elapsed < 8000 && firing.projectiles.length === 0; elapsed += 50) {
    await page.clock.runFor(50)
    firing = await shooterState(arena)
  }
  expect(firing.projectiles.length).toBeGreaterThan(0)
  const scale = Number(await arena.getAttribute('data-ship-scale'))
  expect(Math.hypot(firing.x - playerX, firing.y - playerY))
    .toBeLessThanOrEqual(gameplayConfig.shooter.attackRange * scale)
})

test('removes a projectile after one hit and respects the firing cooldown', async ({ page }) => {
  const arena = await openBattle(page, 1487)
  const initial = await shooterState(arena)
  let flying = initial
  for (let elapsed = 0; elapsed < 8000 && flying.projectiles.length === 0; elapsed += 20) {
    await page.clock.runFor(20)
    flying = await shooterState(arena)
  }
  expect(flying.projectiles).toHaveLength(1)
  const firstId = flying.projectiles[0].id
  let hit = flying
  for (let elapsed = 0; elapsed < 3000 && hit.playerHealth === initial.playerHealth; elapsed += 20) {
    await page.clock.runFor(20)
    hit = await shooterState(arena)
  }
  expect(hit.playerHealth).toBe(initial.playerHealth - gameplayConfig.shooter.projectileDamage)
  expect(hit.projectiles.some(projectile => projectile.id === firstId)).toBe(false)
  await page.clock.runFor(100)
  const afterHit = await shooterState(arena)
  expect(afterHit.playerHealth).toBe(hit.playerHealth)
  expect(afterHit.projectiles.some(projectile => projectile.id === firstId)).toBe(false)

  let next = afterHit
  for (let elapsed = 0; elapsed < gameplayConfig.shooter.cooldownSeconds * 1000 + 100; elapsed += 20) {
    await page.clock.runFor(20)
    next = await shooterState(arena)
    if (next.projectiles.some(projectile => projectile.id > firstId)) break
  }
  expect(next.projectiles.some(projectile => projectile.id > firstId)).toBe(true)
})
