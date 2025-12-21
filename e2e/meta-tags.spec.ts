import { test, expect } from '@playwright/test';

test.describe('Meta Tags and HTML Head', () => {
  test('should have proper charset meta tag', async ({ page }) => {
    await page.goto('/');

    // Check for charset meta tag
    const charsetMeta = page.locator('meta[charset]');

    await expect(charsetMeta).toBeTruthy();
    await expect(charsetMeta).toHaveAttribute('charset', 'utf-8');
  });

  test('should have proper viewport meta tag', async ({ page }) => {
    await page.goto('/');

    // Check for viewport meta tag
    const viewportMeta = page.locator('meta[name="viewport"]');
    await expect(viewportMeta).toBeTruthy();

    const content = await viewportMeta.getAttribute('content');
    expect(content).toContain('width=device-width');
    expect(content).toContain('initial-scale=1');
  });

  test('should have proper HTML structure', async ({ page }) => {
    await page.goto('/');

    // Check for proper doctype and lang attribute
    const doctype = await page.evaluate(() => document.doctype?.name);
    expect(doctype).toBe('html');

    const htmlElement = page.locator('html');
    await expect(htmlElement).toHaveAttribute('lang');

    // Validate lang attribute format and accessibility
    const langValue = await htmlElement.getAttribute('lang');
    expect(langValue).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/); // en, en-US, etc.
    expect(['en', 'en-US']).toContain(langValue); // Should be English variant
  });

  test('should have proper DOCTYPE declaration', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);

    // Check that DOCTYPE exists and is properly formed
    const doctypeInfo = await page.evaluate(() => {
      return {
        doctype: document.doctype?.name,
        publicId: document.doctype?.publicId,
        systemId: document.doctype?.systemId
      };
    });

    expect(doctypeInfo.doctype).toBe('html');
    expect(doctypeInfo.publicId).toBeFalsy();
    expect(doctypeInfo.systemId).toBeFalsy();
  });

  test('should have secure base href configuration', async ({ page }) => {
    await page.goto('/');

    // Check base href if present
    const baseElement = page.locator('base');
    if (await baseElement.count() > 0) {
      const href = await baseElement.getAttribute('href');
      // Should not have protocol-relative or external URLs
      expect(href).not.toMatch(/^\/\//); // Protocol-relative
      expect(href).not.toMatch(/^https?:\/\//); // External
    }
  });

  test('should not have inline scripts in main content', async ({ page }) => {
    await page.goto('/');

    // Get all script tags in the body
    const inlineScripts = await page.locator('body script:not([src])').count();
    expect(inlineScripts, 'Body should not contain inline <script> tags').toBe(0);
  });

  test('should prevent protocol-relative URLs in content', async ({ page }) => {
    await page.goto('/');

    const content = await page.content();

    // Should not contain protocol-relative URLs that can bypass CSP
    expect(content).not.toMatch(/src="\/\//);
    expect(content).not.toMatch(/href="\/\//);
  });
});

test.describe('Content Security', () => {
  test('should not expose sensitive information in page content', async ({ page }) => {
    await page.goto('/');

    const pageText = await page.textContent('body');

    // Should not expose sensitive information
    expect(pageText).not.toContain('password');
    expect(pageText).not.toContain('token');
    expect(pageText).not.toContain('secret');
    expect(pageText).not.toContain('api_key');
    expect(pageText).not.toContain('private_key');
  });

  test('should render content without XSS vulnerabilities', async ({ page }) => {
    await page.goto('/');

    const content = await page.content();

    // Should not contain any inline scripts or dangerous content
    expect(content).not.toContain('<script>');
    expect(content).not.toContain('javascript:');
    expect(content).not.toContain('onerror=');
    expect(content).not.toContain('onclick=');
  });
});

test.describe('Application Loading', () => {
  test('should load the TaskGo application successfully', async ({ page }) => {
    await page.goto('/');

    // Check that the app loads and shows the title
    await expect(page.locator('h1')).toContainText('TaskGo');
  });

  test('should have proper page title', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/TaskGo/);
  });
});
