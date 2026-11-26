import { expect, type Page } from '@playwright/test'

export async function freezeGameClock(page: Page) {
  const startTime = Date.UTC(2026, 0, 1)
  await page.clock.install({ time: startTime })
  // Pause before navigation so loading assets cannot advance the simulation.
  await page.clock.pauseAt(startTime + 60_000)
}

export async function openClockedArena(page: Page, url = '/') {
  await page.goto(url)
  await page.getByRole('button', { name: 'Play', exact: true }).press('Enter')
  const arena = page.getByRole('img', { name: 'Battle arena', includeHidden: true })
  await expect(arena.locator('canvas')).toHaveCount(1, { timeout: 15_000 })
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible()
  return arena
}
