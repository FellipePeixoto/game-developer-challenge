import { defineConfig, devices } from '@playwright/test'

const port = Number(process.env.PLAYWRIGHT_PORT ?? 4173)
const baseURL = `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: './tests',
  // Concurrent Pixi canvases compete for rendering resources in headless Chromium.
  workers: 2,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop-chromium', grepInvert: /@touch\b/, use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `node node_modules/vite/bin/vite.js ${process.env.PLAYWRIGHT_PRODUCTION ? 'preview ' : ''}--host 127.0.0.1 --port ${port} --strictPort`,
    url: baseURL,
  },
})
