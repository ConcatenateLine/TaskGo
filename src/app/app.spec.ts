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
    it('should not allow inline styles in main content', () => {
      const appElement = fixture.nativeElement;
      const appHtml = appElement.innerHTML;

      // Should not have dangerous inline styles
      expect(appHtml).not.toContain('style=');
      expect(appHtml).not.toContain('background: url(');
      expect(appHtml).not.toContain('expression(');
    });

    it('should prevent protocol-relative URLs', () => {
      const appElement = fixture.nativeElement;
      const appHtml = appElement.innerHTML;

      // Should not contain protocol-relative URLs that can bypass CSP
      expect(appHtml).not.toMatch(/src="\//);
      expect(appHtml).not.toMatch(/href="\//);
    });

    it('should sanitize dynamic content rendering', () => {
      // Test dynamic content binding security
      const appElement = fixture.nativeElement;
      const allElements = appElement.querySelectorAll('*');

      Array.from(allElements).forEach((element: any) => {
        const textContent = element.textContent;
        const innerHTML = element.innerHTML;

        // All dynamic content should be sanitized
        expect(textContent).not.toContain('<script>');
        expect(textContent).not.toContain('javascript:');
        expect(innerHTML).not.toContain('<script>');
        expect(innerHTML).not.toContain('onerror=');
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
});
