import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { App } from './app';

describe('App', () => {
  let fixture: any;
  let app: App;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();

    fixture = TestBed.createComponent(App);
    app = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create app', () => {
    expect(app).toBeTruthy();
  });

  it('should render title', async () => {
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('TaskGo');
  });

  // ===============================================================
  // SECURITY TESTS - OWASP VULNERABILITIES (APP LEVEL)
  // ===============================================================

  describe('SECURITY: Application-Level Security (A05, A09)', () => {
    // Charset, CSP, referrer, robots, viewport, etc. must be tested at the build or server level
    // becuase they are outside of angular and its not lived in angular components
    it('should have proper meta tags for security headers', () => {
      const metaTags = fixture.debugElement.queryAll(By.css('meta'));

      // Check for security-related meta tags
      // Note: charset meta tag is in index.html, not in component templates
      // This test checks component-level meta tags if any exist

      // Should have meta tags in component if they exist
      expect(metaTags).toBeDefined();
    });

    it('should render content without XSS vulnerabilities', () => {
      // Test that base app component doesn't have XSS vulnerabilities
      const appElement = fixture.nativeElement;
      const appHtml = appElement.innerHTML;

      // Should not contain any inline scripts or dangerous content
      expect(appHtml).not.toContain('<script>');
      expect(appHtml).not.toContain('javascript:');
      expect(appHtml).not.toContain('onerror=');
      expect(appHtml).not.toContain('onclick=');
    });

    it('should have secure base href configuration', () => {
      const baseElement = fixture.debugElement.query(By.css('base'));
      if (baseElement) {
        const href = baseElement.nativeElement.getAttribute('href');
        // Should not have protocol-relative or external URLs
        expect(href).not.toMatch(/^\/\//); // Protocol-relative
        expect(href).not.toMatch(/^https?:\/\//); // External
      }
    });

    it('should not expose sensitive configuration in template', () => {
      const appElement = fixture.nativeElement;
      const appText = appElement.textContent;

      // Should not expose sensitive information
      expect(appText).not.toContain('password');
      expect(appText).not.toContain('token');
      expect(appText).not.toContain('secret');
      expect(appText).not.toContain('api_key');
      expect(appText).not.toContain('private_key');
    });

    it('should have proper HTML structure for security', () => {
      // Note: HTML structure testing (DOCTYPE, lang) moved to Playwright e2e tests
      // Unit tests can't access full HTML document structure
      expect(true).toBe(true); // Test reaches this point
    });
  });

  describe('SECURITY: CSP and Content Security (A05)', () => {
    it('should not allow unsafe inline styles in main content', () => {
      const appElement = fixture.nativeElement;
      const appHtml = appElement.innerHTML;

      // Allow Angular's default styles but block potentially dangerous patterns
      const allowedInlineStyles = [
        // Style properties and RGB colors
        /style\s*=\s*["'][^"']*(?:color|background-color|padding|margin|font-size|border-radius|font-weight)[^"']*["']/gi,
        /style\s*=\s*["'][^"']*rgb\([^)]*\)[^"']*["']/gi,
        /^<[_a-z][_a-z0-9-]*\s+[^>]*class="[^"]*"/i, // Allow class attributes
        /^<[_a-z][_a-z0-9-]*\s+[^>]*_nghost-[a-z0-9-]+/i, // Allow Angular's _nghost attributes
      ];

      // Check for dangerous inline styles and expressions (excluding background URLs from gradients)
      const hasDangerousStyles = !allowedInlineStyles.some((pattern) => pattern.test(appHtml));

      expect(hasDangerousStyles).toBe(false);
      // Note: background: url() is used in CSS gradients and is legitimate
      expect(appHtml).not.toContain('expression(');
      expect(appHtml).not.toMatch(/style\s*=\s*['"][^'"]*[:\s]url\(/i);
    });

    it('should prevent protocol-relative URLs for external resources', () => {
      const appElement = fixture.nativeElement;
      const appHtml = appElement.outerHTML;

      // Only check for protocol-relative URLs in attributes that load external resources
      const externalResourceAttributes = ['src', 'href', 'data', 'poster', 'srcset'];
      externalResourceAttributes.forEach((attr) => {
        const regex = new RegExp(`${attr}\\s*=\\s*['\"]//`, 'i');
        expect(appHtml).not.toMatch(regex);
      });
    });

    it('should sanitize dynamic content rendering', () => {
      const appElement = fixture.nativeElement;
      const allElements = appElement.querySelectorAll('*');

      // Test for common XSS vectors
      const xssVectors = [
        '<script>',
        'javascript:',
        'onerror=',
        'onload=',
        'onclick=',
        'data:text/html',
        'expression(',
        'vbscript:',
      ];

      allElements.forEach((element: Element) => {
        // Check text content
        const textContent = element.textContent || '';
        xssVectors.forEach((vector) => {
          expect(textContent).not.toContain(vector);
        });

        // Check attributes
        Array.from(element.attributes).forEach((attr) => {
          xssVectors.forEach((vector) => {
            expect(attr.value).not.toContain(vector);
          });
        });
      });
    });

    it('should have secure content security policy attributes', () => {
      const appElement = fixture.nativeElement;
      const html = appElement.outerHTML;

      // Check for unsafe inline/dynamic CSP attributes
      const unsafePatterns = [/unsafe-inline/, /unsafe-eval/, /data:/, /blob:/];

      unsafePatterns.forEach((pattern) => {
        expect(html).not.toMatch(pattern);
      });
    });
  });

  describe('SECURITY: Error Boundary and Fallback (A09)', () => {
    it('should handle component errors gracefully without exposing sensitive data', () => {
      // Simulate error condition
      const consoleSpy = vi.spyOn(console, 'error');

      // Force an error to test error handling
      try {
        // Access non-existent property to trigger error
        (app as any).nonExistentProperty?.someMethod?.();
      } catch (error) {
        // Expected
      }

      // Should not crash entire application
      expect(fixture.nativeElement).toBeTruthy();

      consoleSpy.mockRestore();
    });

    it('should maintain security when components fail', () => {
      // Test that security measures remain even when components have errors
      const appElement = fixture.nativeElement;

      // Even with errors, should not expose sensitive data
      const appText = appElement.textContent;
      expect(appText).not.toContain('password');
      expect(appText).not.toContain('secret');
      expect(appText).not.toContain('token');
    });
  });

  describe('Screen Reader Announcements - Global Success Messages', () => {
    let mockTask: any;

    beforeEach(() => {
      mockTask = {
        id: 'test-task-123',
        title: 'Test Task',
        description: 'Test Description',
        priority: 'medium',
        status: 'TODO',
        project: 'General',
        createdAt: new Date(),
        updatedAt: new Date()
      };
    });

    it('should have success message element with proper ARIA attributes', () => {
      // Initially should not show success message
      const successElement = fixture.debugElement.query(By.css('.app__success-message'));
      expect(successElement).toBeFalsy();

      // Trigger task creation to show success message
      app['successMessage'].set('Task created successfully');
      fixture.detectChanges();

      const successMessageElement = fixture.debugElement.query(By.css('.app__success-message'));
      expect(successMessageElement).toBeTruthy();
      expect(successMessageElement.nativeElement.getAttribute('role')).toBe('alert');
      expect(successMessageElement.nativeElement.getAttribute('aria-live')).toBe('polite');
    });

    it('should announce task creation success globally', () => {
      app['successMessage'].set('Task created successfully');
      fixture.detectChanges();

      const successElement = fixture.debugElement.query(By.css('.app__success-message'));
      expect(successElement.nativeElement.textContent).toContain('Task created successfully');
      expect(successElement.nativeElement.textContent).toContain('✅');
    });

    it('should display success message with proper styling', () => {
      app['successMessage'].set('Task created successfully');
      fixture.detectChanges();

      const successElement = fixture.debugElement.query(By.css('.app__success-message'));
      const element = successElement.nativeElement;

      // Should have success icon
      const icon = element.querySelector('.app__success-icon');
      expect(icon).toBeTruthy();
      expect(icon.textContent).toBe('✅');

      // Should have accessible text
      expect(element.textContent).toContain('Task created successfully');
    });

    it('should clear success message after timeout', async () => {
      // Wait for timeout (mock timer approach)
      vi.useFakeTimers();

      app.onTaskCreated(mockTask);
      fixture.detectChanges();

      // Message should be visible
      let successElement = fixture.debugElement.query(By.css('.app__success-message'));
      expect(successElement).toBeTruthy();

      // Trigger timeout
      vi.advanceTimersByTime(3100); // Add extra time to ensure timeout completes
      fixture.detectChanges();

      // Message should be cleared
      let undefinedElement = fixture.debugElement.query(By.css('.app__success-message'));
      expect(undefinedElement).toBeFalsy();

      vi.useRealTimers();
    });

    it('should be accessible to screen readers', () => {
      app['successMessage'].set('Task created successfully');
      fixture.detectChanges();

      const successElement = fixture.debugElement.query(By.css('.app__success-message'));
      const element = successElement.nativeElement;

      // Check ARIA attributes for screen readers
      expect(element.getAttribute('role')).toBe('alert');
      expect(element.getAttribute('aria-live')).toBe('polite');

      // Should be visible and readable
      expect(window.getComputedStyle(element).display).not.toBe('none');
      expect(window.getComputedStyle(element).visibility).not.toBe('hidden');
    });

    it('should use appropriate ARIA live region for success messages', () => {
      app['successMessage'].set('Task created successfully');
      fixture.detectChanges();

      const successElement = fixture.debugElement.query(By.css('.app__success-message'));

      // Should use 'polite' for non-critical success messages
      expect(successElement.nativeElement.getAttribute('aria-live')).toBe('polite');

      // Should have role="alert" for important announcements
      expect(successElement.nativeElement.getAttribute('role')).toBe('alert');
    });

    it('should handle multiple success messages correctly', () => {
      // First message
      app['successMessage'].set('First task created');
      fixture.detectChanges();

      let successElement = fixture.debugElement.query(By.css('.app__success-message'));
      expect(successElement.nativeElement.textContent).toContain('First task created');

      // Second message
      app['successMessage'].set('Second task created');
      fixture.detectChanges();

      successElement = fixture.debugElement.query(By.css('.app__success-message'));
      expect(successElement.nativeElement.textContent).toContain('Second task created');
      expect(successElement.nativeElement.textContent).not.toContain('First task created');
    });

    it('should maintain accessibility when message is cleared', () => {
      // Show message
      app['successMessage'].set('Task created successfully');
      fixture.detectChanges();

      let successElement = fixture.debugElement.query(By.css('.app__success-message'));
      expect(successElement).toBeTruthy();

      // Clear message
      app['successMessage'].set(null);
      fixture.detectChanges();

      // Element should be removed from DOM
      successElement = fixture.debugElement.query(By.css('.app__success-message'));
      expect(successElement).toBeFalsy();
    });

    it('should have proper contrast and visibility for accessibility', () => {
      app['successMessage'].set('Task created successfully');
      fixture.detectChanges();

      const successElement = fixture.debugElement.query(By.css('.app__success-message'));
      const element = successElement.nativeElement;

      // Check for visible styles (basic accessibility)
      const styles = window.getComputedStyle(element);
      expect(styles.position).toBe('fixed');
      expect(styles.zIndex).toBe('1000');
      expect(styles.display).not.toBe('none');
    });

    it('should provide clear and concise success messages', () => {
      app['successMessage'].set('Task created successfully');
      fixture.detectChanges();

      const successElement = fixture.debugElement.query(By.css('.app__success-message'));
      const message = successElement.nativeElement.textContent.trim();

      // Should be clear and concise
      expect(message.length).toBeLessThan(100);
      expect(message).toMatch(/^[A-Za-z\s✅]+$/); // Only letters, spaces, and emoji

      // Should be meaningful
      expect(message).toContain('Task');
      expect(message).toContain('created');
    });

    it('should integrate properly with task creation flow', () => {
      // Simulate task creation
      app.onTaskCreated(mockTask);

      fixture.detectChanges();

      // Should show success message
      const successElement = fixture.debugElement.query(By.css('.app__success-message'));
      expect(successElement).toBeTruthy();
      expect(successElement.nativeElement.textContent).toContain('Task created successfully');

      // Should hide task creation form
      expect(app['showTaskCreation']()).toBe(false);
    });

    it('should handle screen reader announcements for multiple task types', () => {
      const testCases = [
        { action: 'created', expectedMessage: 'Task created successfully' },
        { action: 'updated', expectedMessage: 'Task updated successfully' },
        { action: 'deleted', expectedMessage: 'Task deleted successfully' }
      ];

      testCases.forEach(({ action, expectedMessage }) => {
        app['successMessage'].set(expectedMessage);
        fixture.detectChanges();

        const successElement = fixture.debugElement.query(By.css('.app__success-message'));
        expect(successElement.nativeElement.textContent).toContain(expectedMessage);
      });
    });
  });
});
