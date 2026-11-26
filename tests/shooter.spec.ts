import { expect, test, type Locator, type Page } from '@playwright/test'
import { gameplayConfig } from '../src/arena/gameplayConfig'

const startTime = new Date('2026-01-01T00:00:00Z')

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
  await page.goto(`/?enemy=shooter&seed=${seed}`)
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  const arena = page.getByRole('img', { name: 'Battle arena' })
  await expect(arena).toHaveAttribute('data-shooter-state', /\S+/)
  await page.clock.pauseAt(startTime.getTime() + 60_000)
  return arena
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 960, height: 540 })
  await page.clock.install({ time: startTime })
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

test('stops at land and removes enemy shots at the island before reaching the player', async ({ page }) => {
  const arena = await openBattle(page, 7)
  const initial = await shooterState(arena)
  await page.clock.runFor(2500)
  const stopped = await shooterState(arena)
  expect(Math.hypot(stopped.x - initial.x, stopped.y - initial.y)).toBeGreaterThan(5)
  await page.clock.runFor(1000)
  const blocked = await shooterState(arena)
  expect(blocked.x).toBeCloseTo(stopped.x, 2)
  expect(blocked.y).toBeCloseTo(stopped.y, 2)

  // Move into range on the opposite side of the coastline using the real controls.
  await page.keyboard.down('KeyA')
  await page.clock.runFor(3 * Math.PI / 4 / gameplayConfig.player.turningSpeed * 1000)
  await page.keyboard.up('KeyA')
  await page.keyboard.down('KeyW')
  await page.clock.runFor(1000)
  await page.keyboard.up('KeyW')
  const playerX = Number(await arena.getAttribute('data-ship-x'))
  const playerY = Number(await arena.getAttribute('data-ship-y'))
  let flying = await shooterState(arena)
  const scale = Number(await arena.getAttribute('data-ship-scale'))
  expect(Math.hypot(flying.x - playerX, flying.y - playerY))
    .toBeLessThanOrEqual(gameplayConfig.shooter.attackRange * scale)
  for (let elapsed = 0; elapsed < 5000 && flying.projectiles.length === 0; elapsed += 20) {
    await page.clock.runFor(20)
    flying = await shooterState(arena)
  }
  expect(flying.projectiles.length).toBeGreaterThan(0)
  const projectileId = flying.projectiles[0].id
  let removed = flying
  let elapsed = 0
  while (elapsed < gameplayConfig.shooter.projectileLifetimeSeconds * 1000
    && removed.projectiles.some(projectile => projectile.id === projectileId)) {
    await page.clock.runFor(20)
    elapsed += 20
    removed = await shooterState(arena)
  }
  expect(elapsed).toBeLessThan(gameplayConfig.shooter.projectileLifetimeSeconds * 1000)
  expect(removed.projectiles.some(projectile => projectile.id === projectileId)).toBe(false)
  expect(removed.playerHealth).toBe(initial.playerHealth)
})
