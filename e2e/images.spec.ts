// @covers F-030 Image paste
// @covers F-032 Image serving
import { test, expect } from '@playwright/test';

test.describe('Image Upload & Paste', () => {
  test('POST /api/images/upload accepts a PNG and returns URL', async ({ request }) => {
    // Create a minimal 1x1 PNG
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
      'base64'
    );

    // Get a valid file to use as context
    const foldersResponse = await request.get('/api/folders/incidents');
    const foldersData = await foldersResponse.json();
    const firstFile = foldersData.files[0];

    const response = await request.post('/api/images/upload', {
      multipart: {
        image: {
          name: 'test-screenshot.png',
          mimeType: 'image/png',
          buffer: png,
        },
        folderId: 'incidents',
        fileId: firstFile.id,
      },
    });

    expect(response.ok()).toBe(true);
    const data = await response.json();
    // URL format: /api/images/<folderId>/<fileId>.<name>-<4char>.<ext>
    expect(data.url).toMatch(/^\/api\/images\/incidents\//);
    expect(data.url).toMatch(/test-screenshot-[a-f0-9]{4}\.png$/);

    // Verify the image is serveable
    const imageResponse = await request.get(data.url);
    expect(imageResponse.ok()).toBe(true);
    expect(imageResponse.headers()['content-type']).toBe('image/png');
  });

  test('POST /api/images/upload rejects non-image files', async ({ request }) => {
    const response = await request.post('/api/images/upload', {
      multipart: {
        image: {
          name: 'malware.exe',
          mimeType: 'application/x-msdownload',
          buffer: Buffer.from('MZ'),
        },
        folderId: 'incidents',
        fileId: 'I-001',
      },
    });

    expect(response.ok()).toBe(false);
    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Invalid file type');
  });

  test('POST /api/images/upload rejects missing context', async ({ request }) => {
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
      'base64'
    );

    const response = await request.post('/api/images/upload', {
      multipart: {
        image: {
          name: 'test.png',
          mimeType: 'image/png',
          buffer: png,
        },
      },
    });

    expect(response.ok()).toBe(false);
    expect(response.status()).toBe(400);
  });

  test('GET /api/images/incidents/nonexistent returns 404', async ({ request }) => {
    const response = await request.get('/api/images/incidents/does-not-exist.png');
    expect(response.status()).toBe(404);
  });

  test('image paste in editor triggers upload and inserts markdown', async ({ page }) => {
    // Navigate to a file to get the editor
    const foldersResponse = await page.request.get('/api/folders/incidents');
    const foldersData = await foldersResponse.json();
    const firstFile = foldersData.files[0];

    await page.goto(`/incidents/${firstFile.id}`);

    // Wait for editor to load
    const editor = page.locator('.mdx-editor-content');
    await expect(editor).toBeVisible({ timeout: 10000 });

    // Simulate pasting an image via clipboard API
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

    await editor.click();
    await page.evaluate(async (base64) => {
      const binaryStr = atob(base64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'image/png' });
      const file = new File([blob], 'pasted-image.png', { type: 'image/png' });

      const clipboardData = new DataTransfer();
      clipboardData.items.add(file);

      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData,
        bubbles: true,
        cancelable: true,
      });

      document.querySelector('.mdx-editor-content')?.dispatchEvent(pasteEvent);
    }, pngBase64);

    // Wait for the upload to complete and image to appear in editor
    await expect(page.locator('.mdx-editor-content img')).toBeVisible({ timeout: 10000 });

    // Verify the image src points to our API with folder context
    const imgSrc = await page.locator('.mdx-editor-content img').first().getAttribute('src');
    expect(imgSrc).toMatch(/\/api\/images\/incidents\//);
  });
});
