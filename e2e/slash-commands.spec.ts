import { test, expect, type Page } from '@playwright/test';

/** Navigate to a file and activate its editor */
async function openFileEditor(page: Page, folder: string, fileRow: string) {
  await page.goto(`/${folder}`);
  await page.locator('tr', { hasText: fileRow }).first().click();
  await page.waitForSelector('[contenteditable="true"]', { timeout: 15000 });
}

/** Focus the editor and prepare for typing on a new line */
async function focusEditorNewLine(page: Page) {
  const editor = page.locator('[contenteditable="true"]').first();
  await editor.click();
  // Small delay to ensure focus is established
  await page.waitForTimeout(300);
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  return editor;
}

test.describe('Slash Commands', () => {
  let consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      consoleErrors.push(err.message);
    });
  });

  test.afterEach(async () => {
    const realErrors = consoleErrors.filter(
      (e) =>
        !e.includes('MUI:') &&
        !e.includes('act(...)') &&
        !e.includes('React does not recognize') &&
        !e.includes('hydrat') &&
        !e.includes('Hydrat') &&
        !e.includes('hydration')
    );
    expect(realErrors, `Browser errors detected:\n${realErrors.join('\n')}`).toHaveLength(0);
  });

  test('typing / in editor shows command menu', async ({ page }) => {
    await openFileEditor(page, 'incidents', 'I-001');
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();

    await focusEditorNewLine(page);
    await page.keyboard.type('/');

    // The slash command menu should appear (use .first() for strict mode)
    await expect(page.getByText('Table', { exact: true }).first()).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('Mermaid Diagram').first()).toBeVisible();
  });

  test('typing /tab filters to Table', async ({ page }) => {
    await openFileEditor(page, 'incidents', 'I-001');

    await focusEditorNewLine(page);
    await page.keyboard.type('/tab');

    // Should show Table
    await expect(page.getByText('Table', { exact: true }).first()).toBeVisible({ timeout: 3000 });
    // Mermaid should be filtered out
    await expect(page.getByText('Mermaid Diagram')).not.toBeVisible();
  });

  test('Escape closes the menu', async ({ page }) => {
    await openFileEditor(page, 'incidents', 'I-001');

    await focusEditorNewLine(page);
    await page.keyboard.type('/');

    await expect(page.getByText('Table', { exact: true }).first()).toBeVisible({ timeout: 3000 });

    await page.keyboard.press('Escape');

    await expect(page.getByText('Mermaid Diagram')).not.toBeVisible();
  });

  test('selecting a command inserts content', async ({ page }) => {
    await openFileEditor(page, 'incidents', 'I-001');

    await focusEditorNewLine(page);
    await page.keyboard.type('/divider');

    await expect(page.getByText('Divider').first()).toBeVisible({ timeout: 3000 });

    // Press Enter to select
    await page.keyboard.press('Enter');

    // Menu should close
    await expect(page.getByText('Horizontal rule')).not.toBeVisible({ timeout: 2000 });
  });

  test('selecting Table inserts a table', async ({ page }) => {
    await openFileEditor(page, 'incidents', 'I-001');

    await focusEditorNewLine(page);
    await page.keyboard.type('/table');

    await expect(page.getByText('Insert a markdown table').first()).toBeVisible({ timeout: 3000 });

    await page.keyboard.press('Enter');

    // Menu should close after selection
    await expect(page.getByText('Insert a markdown table')).not.toBeVisible({ timeout: 3000 });
  });

  test('no server errors during slash command usage', async ({ page }) => {
    const healthBefore = await page.request.get('/api/health');
    expect(healthBefore.ok()).toBe(true);

    await openFileEditor(page, 'incidents', 'I-001');

    await focusEditorNewLine(page);

    // Open and close
    await page.keyboard.type('/');
    await expect(page.getByText('Table', { exact: true }).first()).toBeVisible({ timeout: 3000 });
    await page.keyboard.press('Escape');

    // Open, filter, select
    await page.keyboard.type('/quote');
    await expect(page.getByText('Quote').first()).toBeVisible({ timeout: 3000 });
    await page.keyboard.press('Enter');

    // Page should not have crashed
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();

    // Server should still be healthy
    const healthAfter = await page.request.get('/api/health');
    expect(healthAfter.ok()).toBe(true);
  });
});
