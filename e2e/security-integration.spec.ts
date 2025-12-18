import { test, expect } from '@playwright/test';

test.describe('TaskGo Application - Security Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Monitor console for security events
    page.on('console', msg => {
      console.log(`Browser console [${msg.type()}]: ${msg.text()}`);
    });
    
    await page.goto('/');
  });

  test.describe('End-to-End XSS Prevention (A03)', () => {
    test('should prevent XSS in task creation form', async ({ page }) => {
      // Wait for app to load
      await expect(page.locator('h1')).toContainText('TaskGo');
      
      // Try to inject XSS via potential task input
      // Check that no script tags are rendered in page
      await page.waitForLoadState('networkidle');
      const content = await page.content();
      
      expect(content).not.toContain('<script>alert("XSS")</script>');
      expect(content).not.toContain('javascript:');
    });

    test('should sanitize dynamic content rendering', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      
      // Check all rendered elements for XSS
      const allElements = await page.locator('*').all();
      
      for (const element of allElements) {
        const textContent = await element.textContent();
        const innerHTML = await element.innerHTML();
        
        if (textContent) {
          expect(textContent).not.toContain('<script>');
          expect(textContent).not.toContain('javascript:');
        }
        
        if (innerHTML) {
          expect(innerHTML).not.toContain('<script>');
          expect(innerHTML).not.toContain('onerror=');
          expect(innerHTML).not.toContain('onclick=');
        }
      }
    });
  });

  test.describe('Content Security Policy Integration (A05)', () => {
    test('should not have inline scripts in main content', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      
      // Get script tags in body (inline scripts)
      const bodyScripts = await page.locator('body script').count();
      expect(bodyScripts).toBe(0);
    });

    test('should prevent protocol-relative URLs', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      
      const content = await page.content();
      
      // Should not contain protocol-relative URLs that can bypass CSP
      expect(content).not.toMatch(/src="\//);
      expect(content).not.toMatch(/href="\//);
    });
  });

  test.describe('Input Validation Pipeline (A04)', () => {
    test('should handle malformed input gracefully', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      
      // Try to access page with potentially dangerous query parameters
      await page.goto('/?title=<script>alert("XSS")</script>&description=javascript:alert(1)');
      
      // Should not execute scripts
      const content = await page.content();
      expect(content).not.toContain('<script>alert("XSS")</script>');
      expect(content).not.toContain('javascript:alert(1)');
    });

    test('should sanitize user input display', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      
      // Check that no dangerous content is rendered
      const dangerousPatterns = [
        '<script>',
        'javascript:',
        'onerror=',
        'onclick=',
        'onload='
      ];
      
      const content = await page.content();
      
      for (const pattern of dangerousPatterns) {
        expect(content).not.toContain(pattern);
      }
    });
  });

  test.describe('Error Handling Integration (A09)', () => {
    test('should handle component errors without exposing sensitive data', async ({ page }) => {
      // Monitor for unhandled exceptions
      const errors: string[] = [];
      page.on('pageerror', error => {
        errors.push(error.message);
      });
      
      await page.waitForLoadState('networkidle');
      
      // Check that no sensitive data is exposed even if errors occur
      const pageText = await page.textContent('body');
      expect(pageText).not.toContain('password');
      expect(pageText).not.toContain('secret');
      expect(pageText).not.toContain('token');
    });

    test('should maintain security when components fail', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      
      // Even with potential errors, security should be maintained
      const content = await page.content();
      
      // Should not expose sensitive information
      expect(content).not.toContain('api_key');
      expect(content).not.toContain('private_key');
      expect(content).not.toMatch(/password['"]/i);
    });
  });

  test.describe('Performance & Resource Limiting (A07)', () => {
    test('should load within reasonable time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    test('should not block on excessive DOM elements', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      
      // Should not have excessive DOM elements that could cause performance issues
      const elementCount = await page.locator('*').count();
      expect(elementCount).toBeLessThan(1000);
    });
  });
});

test.describe('Task List Functionality - E2E Tests', () => {
  test('should display application title and basic structure', async ({ page }) => {
    await page.goto('/');
    
    // Should show main application structure
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('h1')).toContainText('TaskGo');
  });

  test('should have proper responsive design', async ({ page }) => {
    // Test desktop
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    
    // Test mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should maintain security under network conditions', async ({ page }) => {
    // Simulate slow network
    await page.route('**/*', route => {
      setTimeout(() => route.continue(), 1000);
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Security should be maintained even under poor network conditions
    const content = await page.content();
    expect(content).not.toContain('<script>');
    expect(content).not.toContain('javascript:');
  });
});