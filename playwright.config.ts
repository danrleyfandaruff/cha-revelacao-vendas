import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  expect: { timeout: 10000 },
  fullyParallel: true,
  workers: 2,
  use: {
    baseURL: 'http://127.0.0.1:4205',
    channel: process.env['PLAYWRIGHT_CHANNEL'] || 'chrome',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    serviceWorkers: 'block',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
  webServer: {
    command: 'npm start -- --host 127.0.0.1 --port 4205 --no-open',
    url: 'http://127.0.0.1:4205',
    reuseExistingServer: !process.env['CI'],
    timeout: 120000,
  },
});
