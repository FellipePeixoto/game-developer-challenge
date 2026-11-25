import { defineConfig, devices } from '@playwright/test'

const baseURL = 'http://127.0.0.1:4173'

export default defineConfig({
  testDir: './tests',
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `node node_modules/vite/bin/vite.js ${process.env.PLAYWRIGHT_PRODUCTION ? 'preview ' : ''}--host 127.0.0.1 --port 4173 --strictPort`,
    url: baseURL,
  },
})
