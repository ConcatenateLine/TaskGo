import { test, expect } from '@playwright/test';

test.describe('Component Security - Browser Context Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Monitor console for security events
    page.on('console', msg => {
      console.log(`Browser console [${msg.type()}]: ${msg.text()}`);
    });
    
    await page.goto('/');
  });

  test('should sanitize HTML in task descriptions', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Check that no dangerous HTML is rendered
    const content = await page.content();
    
    // Should not contain raw HTML tags in rendered content
    expect(content).not.toMatch(/<img[^>]*src="x"[^>]*>/);
    expect(content).not.toContain('onerror=');
    expect(content).not.toContain('alert(');
  });

  test('should sanitize javascript protocol in titles', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Check that javascript: protocol is not executed
    const content = await page.content();
    
    // Should not contain active javascript protocols
    expect(content).not.toMatch(/javascript:\s*alert/i);
    expect(content).not.toMatch(/href\s*=\s*["']?javascript:/i);
  });

  test('should prevent external resource loading', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Check that no external malicious resources are loaded
    const content = await page.content();
    
    // Should not load external tracking/monitoring resources
    expect(content).not.toMatch(/src\s*=\s*["']?https?:\/\/malicious\.example\.com/i);
    expect(content).not.toContain('track.jpg');
  });

  test('should handle very long task titles without breaking layout', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Get task title elements and check their lengths
    const taskTitles = await page.locator('.task-list__task-title').all();
    
    for (const title of taskTitles) {
      const text = await title.textContent();
      expect(text?.length || 0).toBeLessThanOrEqual(500);
    }
  });

  test('should handle control characters in task content', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Check that control characters are properly handled
    const pageText = await page.textContent('body');
    
    // Should not contain control characters (except standard whitespace)
    const controlChars = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;
    const matches = pageText?.match(controlChars);
    expect(matches).toBeNull();
  });

  test('should not have dangerous inline styles', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Check for dangerous inline styles
    const content = await page.content();
    
    // Angular generates some inline styles, but check for dangerous ones
    expect(content).not.toMatch(/style\s*=\s*["'][^"']*javascript:/i);
    expect(content).not.toMatch(/style\s*=\s*["'][^"']*expression\(/i);
    expect(content).not.toMatch(/style\s*=\s*["'][^"']*@import/i);
  });

  test('should log security events to browser console', async ({ page }) => {
    const consoleMessages: string[] = [];
    
    // Capture all console messages
    page.on('console', msg => {
      consoleMessages.push(msg.text());
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check that security events are logged
    const securityLogs = consoleMessages.filter(msg => 
      msg.includes('SECURITY:') || 
      msg.includes('VALIDATION_FAILURE') || 
      msg.includes('DATA_ACCESS')
    );
    
    expect(securityLogs.length).toBeGreaterThan(0);
  });
});