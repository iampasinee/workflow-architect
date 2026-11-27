import { defineConfig, devices } from '@playwright/test';

const testOrigin = 'http://127.0.0.1:43121';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  outputDir: 'test-results',
  use: {
    baseURL: testOrigin,
    ...devices['Desktop Chrome'],
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    env: { DISABLE_HMR: 'true' },
    command: 'npm.cmd run dev -- --port 43121 --host 127.0.0.1 --strictPort',
    url: testOrigin,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
