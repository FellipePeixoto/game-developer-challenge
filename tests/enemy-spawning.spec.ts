import { expect, test } from '@playwright/test'

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
