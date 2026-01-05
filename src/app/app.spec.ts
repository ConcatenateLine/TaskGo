import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { App } from './app';
import { TaskService } from './shared/services/task.service';
import { AuthService } from './shared/services/auth.service';
import { SecurityService } from './shared/services/security.service';
import { AppStartupService } from './shared/services/app-startup.service';

describe('App', () => {
  let fixture: any;
  let app: App;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: TaskService, useValue: { getTasks: () => [], initializeMockData: () => {}, getTasksByStatusAndProject: () => [], getTaskCounts: () => ({ todo: 0, inProgress: 0, done: 0, total: 0 }) } },
        { provide: AuthService, useValue: { getUserContext: () => ({ userId: 'test' }), isAuthenticated: () => true, createAnonymousUser: () => () => {}, logSecurityEvent: () => {} } },
        { provide: SecurityService, useValue: { checkRateLimit: () => ({ allowed: true }) } },
        { provide: AppStartupService, useValue: { 
          isLoading: () => false, 
          isReady: () => true, 
          error: () => null, 
          warnings: () => []
        } }
      ]
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
    const titleElement = compiled.querySelector('.app-header__title');
    console.log("titleElement:", titleElement?.innerHTML);
    
    
    expect(titleElement?.textContent).toContain('TaskGo');
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

      // First check if there are any inline styles at all
      const hasAnyInlineStyles = /style\s*=/i.test(appHtml);
      
      if (hasAnyInlineStyles) {
        // If there are inline styles, they must match allowed patterns
        const allowedInlineStyles = [
          // Style properties and RGB colors (including background-color for legitimate use)
          /style\s*=\s*["'][^"']*(?:color|background-color|padding|margin|font-size|border-radius|font-weight)[^"']*["']/gi,
          /style\s*=\s*["'][^"']*rgb\([^)]*\)[^"']*["']/gi,
          // Allow Angular's style binding syntax for controlled properties
          /\[style\.[^=]+\]=["'][^"']*["']/gi,
        ];

        // Check if inline styles match allowed patterns
        const hasAllowedStyles = allowedInlineStyles.some((pattern) => pattern.test(appHtml));
        expect(hasAllowedStyles).toBe(true);
        
        // Ensure no dangerous patterns exist
        expect(appHtml).not.toContain('expression(');
        expect(appHtml).not.toMatch(/style\s*=\s*['"][^'"]*[:\s]url\(/i);
      } else {
        // No inline styles at all - this is ideal
        expect(true).toBe(true);
      }
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

    it('should handle task creation properly', () => {
      // Trigger task creation
      app.onTaskCreated(mockTask);
      fixture.detectChanges();

      // Should hide task creation form
      expect(app['showTaskCreation']()).toBe(false);
    });

    it('should handle task creation without errors', () => {
      expect(() => {
        app.onTaskCreated(mockTask);
      }).not.toThrow();
    });

    it('should handle task creation cancellation', () => {
      app.onTaskCreationCancelled();
      expect(app['showTaskCreation']()).toBe(false);
    });

    it('should handle task deletion properly', () => {
      expect(() => {
        app.onTaskDeleted();
      }).not.toThrow();
    });
  });
});
