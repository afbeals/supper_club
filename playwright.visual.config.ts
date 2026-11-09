import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/visual',
  snapshotPathTemplate: '{testDir}/{testFileName}-snapshots/{projectName}/{arg}{ext}',
  workers: 1,
  timeout: 45000,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  expect: { toHaveScreenshot: { animations: 'disabled', caret: 'hide', maxDiffPixels: 200 } },
  use: { baseURL: 'http://localhost:3000', locale: 'en-US', timezoneId: 'America/Los_Angeles', colorScheme: 'light', reducedMotion: 'reduce', trace: 'retain-on-failure' },
  webServer: {
    command: 'node scripts/test-server.mjs --visual',
    url: 'http://localhost:3000/login', reuseExistingServer: false, timeout: 120000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
    { name: 'mobile-webkit', use: { ...devices['iPhone 13'] } },
    { name: 'mobile-narrow', use: { ...devices['Pixel 7'], viewport: { width: 320, height: 800 } } },
  ],
});
