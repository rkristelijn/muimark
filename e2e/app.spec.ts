import { test, expect } from '@playwright/test';

test.describe('Health & API', () => {
  test('GET /api/health returns ok', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(data.status).toBe('ok');
    expect(data.folders).toBeGreaterThan(0);
  });

  test('GET /api/folders returns folder list', async ({ request }) => {
    const response = await request.get('/api/folders');
    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(data.folders).toBeDefined();
    expect(data.folders.length).toBeGreaterThan(0);

    // Check structure
    const folder = data.folders[0];
    expect(folder).toHaveProperty('id');
    expect(folder).toHaveProperty('label');
    expect(folder).toHaveProperty('path');
  });

  test('GET /api/folders/incidents returns files', async ({ request }) => {
    const response = await request.get('/api/folders/incidents');
    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(data.folder.id).toBe('incidents');
    expect(data.files.length).toBeGreaterThan(0);
    expect(data.files[0]).toHaveProperty('id');
    expect(data.files[0]).toHaveProperty('title');
  });
});

test.describe('UI Navigation', () => {
  test('homepage loads with sidebar', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Muimark')).toBeVisible();
  });

  test('clicking a folder shows files', async ({ page }) => {
    await page.goto('/');

    // Click on Incidents in sidebar
    await page.getByText('Incidents').click();

    // Should show file grid or content
    await expect(page).toHaveURL(/incidents/);
  });

  test('file detail loads markdown content', async ({ page }) => {
    const response = await page.request.get('/api/folders/incidents');
    const data = await response.json();
    const firstFile = data.files[0];

    await page.goto(`/incidents/${firstFile.id}`);

    // Should show the file content area
    await expect(page.locator('text=' + firstFile.filename)).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Render Loop Regression', () => {
  test('direct URL to file does not crash with infinite loop', async ({ page }) => {
    // This was the bug: navigating directly to /changes/SC-001 caused
    // "Maximum update depth exceeded" due to MDXEditor onChange loop
    const response = await page.request.get('/api/folders/changes');
    const data = await response.json();
    const firstFile = data.files[0];

    await page.goto(`/changes/${firstFile.id}`);

    // Should NOT show error boundary
    await expect(page.locator('text=Maximum update depth')).not.toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Something went wrong')).not.toBeVisible({ timeout: 3000 });

    // Should show the file
    await expect(page.locator('text=' + firstFile.filename)).toBeVisible({ timeout: 10000 });
  });

  test('navigating between files does not crash', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Incidents').click();
    await page.waitForTimeout(1000);

    // Click a file in the grid (if visible)
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    if (count > 1) {
      await rows.nth(1).click();
      await page.waitForTimeout(2000);
      await expect(page.locator('text=Something went wrong')).not.toBeVisible();
    }
  });
});

test.describe('Mermaid Editor', () => {
  test('/mermaid page loads', async ({ page }) => {
    await page.goto('/mermaid');
    await expect(page.locator('text=Mermaid Editor')).toBeVisible();
  });

  test('mermaid editor has template button', async ({ page }) => {
    await page.goto('/mermaid');
    await expect(page.getByRole('button', { name: 'Templates' })).toBeVisible();
  });
});
