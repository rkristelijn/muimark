import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    headless: true,
  },
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: 'MUIMARK_DATA_DIR=./data/demo npm run dev',
        port: 3000,
        timeout: 15000,
        reuseExistingServer: true,
      },
});
