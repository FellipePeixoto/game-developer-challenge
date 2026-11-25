import { expect, test, type Locator, type Page } from '@playwright/test'
import { gameplayConfig, type FireCommand } from '../src/arena/gameplayConfig'

// This scenario gives all three projectile removal conditions room to occur.
const combatScenario = {
  player: gameplayConfig.player,
  weapons: {
    Space: { cooldownSeconds: 0.35 },
    KeyQ: { cooldownSeconds: 0.6 },
    KeyE: { cooldownSeconds: 0.6 },
  },
  projectile: { speed: 320, lifetimeSeconds: 1, radius: 3, broadsideSpacing: 12 },
}
const frameWindowMs = 32
const fireCommands = ['Space', 'KeyQ', 'KeyE'] as const

interface Projectile {
  id: number
  x: number
  y: number
}

async function fire(page: Page, ...commands: FireCommand[]) {
  for (const command of commands) await page.keyboard.press(command)
  await page.clock.runFor(frameWindowMs)
}

async function projectiles(arena: Locator): Promise<Projectile[]> {
  const snapshot = await arena.getAttribute('data-projectiles')
  return snapshot ? JSON.parse(snapshot) as Projectile[] : []
}

test.beforeEach(async ({ page }) => {
  let scenarioLoaded = false
  await page.route('**/src/arena/gameplayConfig.ts*', async route => {
    await route.fulfill({
      contentType: 'application/javascript',
      body: `export const gameplayConfig = ${JSON.stringify(combatScenario)};`,
    })
    scenarioLoaded = true
  })
  await page.addInitScript(seed => {
    let state = seed
    Math.random = () => {
      state = state * 16807 % 2147483647
      return (state - 1) / 2147483646
    }
  }, 42)
  const startTime = new Date('2026-01-01T00:00:00Z')
  await page.clock.install({ time: startTime })
  await page.goto('/')
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.getByRole('img', { name: 'Battle arena' }).locator('canvas')).toHaveCount(1)
  expect(scenarioLoaded, 'Combat scenarios require the Vite development server').toBe(true)
  await page.clock.pauseAt(startTime.getTime() + 60_000)
})

test('fires one shot from the bow while moving', async ({ page }) => {
  const arena = page.getByRole('img', { name: 'Battle arena' })
  const startY = Number(await arena.getAttribute('data-ship-y'))
  await page.keyboard.down('KeyW')
  await fire(page, 'Space')
  await page.keyboard.up('KeyW')

  const fired = await projectiles(arena)
  expect(fired).toHaveLength(1)
  const shipY = Number(await arena.getAttribute('data-ship-y'))
  expect(shipY).toBeLessThan(startY)
  expect(fired[0].y).toBeLessThan(shipY)
  await page.clock.runFor(frameWindowMs)
  const advanced = await projectiles(arena)
  expect(advanced).toHaveLength(1)
  expect(advanced[0].x).toBeCloseTo(fired[0].x)
  expect(advanced[0].y).toBeLessThan(fired[0].y)
})

for (const [side, key, direction] of [['left', 'KeyQ', -1], ['right', 'KeyE', 1]] as const) {
  test(`fires three parallel projectiles to the ${side}`, async ({ page }) => {
    const arena = page.getByRole('img', { name: 'Battle arena' })
    const shipX = Number(await arena.getAttribute('data-ship-x'))
    await fire(page, key)
    const fired = await projectiles(arena)
    expect(fired).toHaveLength(3)
    expect(new Set(fired.map(shot => shot.y)).size).toBe(3)
    await page.clock.runFor(frameWindowMs)
    const advanced = await projectiles(arena)
    expect(advanced).toHaveLength(3)
    const travel = advanced[0].x - fired[0].x
    expect(travel * direction).toBeGreaterThan(0)
    for (const [index, shot] of advanced.entries()) {
      expect((fired[index].x - shipX) * direction).toBeGreaterThan(0)
      expect(shot.x - fired[index].x).toBeCloseTo(travel)
      expect(shot.y).toBeCloseTo(fired[index].y)
    }
  })
}

test('uses an independent cooldown for each weapon', async ({ page }) => {
  const arena = page.getByRole('img', { name: 'Battle arena' })
  await fire(page, ...fireCommands)
  const initialShots = await projectiles(arena)
  expect(initialShots).toHaveLength(7)
  const initialIds = new Set(initialShots.map(shot => shot.id))

  const cooldowns = Object.values(combatScenario.weapons).map(weapon => weapon.cooldownSeconds * 1000)
  await page.clock.runFor(Math.floor(Math.min(...cooldowns) / 2))
  await fire(page, ...fireCommands)
  expect((await projectiles(arena)).every(shot => initialIds.has(shot.id))).toBe(true)

  await page.clock.runFor(Math.ceil(Math.max(...cooldowns)))
  await fire(page, ...fireCommands)
  expect((await projectiles(arena)).filter(shot => !initialIds.has(shot.id))).toHaveLength(7)
})

async function expectRemoval(page: Page, arena: Locator, removalTimesMs: number[]) {
  const before = Math.floor(Math.min(...removalTimesMs) - frameWindowMs * 2)
  const after = Math.ceil(Math.max(...removalTimesMs) + frameWindowMs * 2)
  expect(before).toBeGreaterThan(0)
  await page.clock.runFor(before)
  expect(await projectiles(arena)).toHaveLength(removalTimesMs.length)
  await page.clock.runFor(after - before)
  expect(await projectiles(arena)).toHaveLength(0)
}

test('removes projectiles on island contact', async ({ page }) => {
  const arena = page.getByRole('img', { name: 'Battle arena' })
  await fire(page, 'KeyE')
  const shots = await projectiles(arena)
  expect(shots).toHaveLength(3)

  const islandX = Number(await arena.getAttribute('data-island-x'))
  const islandY = Number(await arena.getAttribute('data-island-y'))
  const scale = Number(await arena.getAttribute('data-ship-scale'))
  const radius = Number(await arena.getAttribute('data-island-radius')) + combatScenario.projectile.radius * scale
  const speed = combatScenario.projectile.speed * scale
  const contactTimes = shots.map(({ x, y }) => {
    const contactX = islandX - Math.sqrt(radius ** 2 - (y - islandY) ** 2)
    return (contactX - x) / speed * 1000
  })
  await expectRemoval(page, arena, contactTimes)
})

test('removes projectiles when they leave the arena', async ({ page }) => {
  const arena = page.getByRole('img', { name: 'Battle arena' })
  await fire(page, 'Space')
  const shots = await projectiles(arena)
  expect(shots).toHaveLength(1)

  const scale = Number(await arena.getAttribute('data-ship-scale'))
  await expectRemoval(page, arena, [shots[0].y / (combatScenario.projectile.speed * scale) * 1000])
})

test('removes projectiles at the lifetime limit in open water', async ({ page }) => {
  const arena = page.getByRole('img', { name: 'Battle arena' })
  await fire(page, 'KeyQ')
  const shots = await projectiles(arena)
  expect(shots).toHaveLength(3)

  const scale = Number(await arena.getAttribute('data-ship-scale'))
  const { speed, lifetimeSeconds } = combatScenario.projectile
  expect(Math.min(...shots.map(shot => shot.x))).toBeGreaterThan(speed * scale * lifetimeSeconds)
  await expectRemoval(page, arena, shots.map(() => lifetimeSeconds * 1000))
})

test('fires a broadside while holding the touch movement control', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Touch controls are available on touch devices')
  const arena = page.getByRole('img', { name: 'Battle arena' })
  const forward = page.getByRole('button', { name: 'Forward', exact: true })
  const fire = page.getByRole('button', { name: 'Fire left', exact: true })
  const startY = Number(await arena.getAttribute('data-ship-y'))

  await expect(fire).toBeVisible()
  await forward.dispatchEvent('pointerdown', { pointerId: 1, pointerType: 'touch' })
  await fire.dispatchEvent('pointerdown', { pointerId: 2, pointerType: 'touch' })
  await page.clock.runFor(frameWindowMs)
  await fire.dispatchEvent('pointerup', { pointerId: 2, pointerType: 'touch' })
  await forward.dispatchEvent('pointerup', { pointerId: 1, pointerType: 'touch' })

  expect(await projectiles(arena)).toHaveLength(3)
  expect(Number(await arena.getAttribute('data-ship-y'))).toBeLessThan(startY)
})
