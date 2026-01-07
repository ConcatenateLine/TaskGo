import { TestBed, ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { RouterOutlet } from '@angular/router';
import { signal, Signal } from '@angular/core';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

import { App } from './app';
import { TaskService } from './shared/services/task.service';
import { AuthService } from './shared/services/auth.service';
import { SecurityService } from './shared/services/security.service';
import { AppStartupService } from './shared/services/app-startup.service';
import { NotificationService } from './shared/services/notification.service';
import { AutoSaveService } from './shared/services/auto-save.service';

// ========================
// TYPE DEFINITIONS
// ========================

interface MockTaskService {
  getTasks: ReturnType<typeof vi.fn>;
  initializeMockData: ReturnType<typeof vi.fn>;
  getTasksByStatusAndProject: ReturnType<typeof vi.fn>;
  getTaskCounts: ReturnType<typeof vi.fn>;
}

interface MockAuthService {
  getUserContext: ReturnType<typeof vi.fn>;
  isAuthenticated: ReturnType<typeof vi.fn>;
  createAnonymousUser: ReturnType<typeof vi.fn>;
  logSecurityEvent: ReturnType<typeof vi.fn>;
}

interface MockSecurityService {
  checkRateLimit: ReturnType<typeof vi.fn>;
}

interface MockAppStartupService {
  isLoading: Signal<boolean>;
  isReady: ReturnType<typeof vi.fn>;
  error: Signal<string | null>;
  warnings: Signal<string[]>;
}

interface MockNotificationService {
  showError: ReturnType<typeof vi.fn>;
  showWarning: ReturnType<typeof vi.fn>;
  showSuccess: ReturnType<typeof vi.fn>;
}

interface MockAutoSaveService {
  enable: ReturnType<typeof vi.fn>;
  disable: ReturnType<typeof vi.fn>;
  flush: ReturnType<typeof vi.fn>;
  isEnabled: ReturnType<typeof vi.fn>;
}

// ========================
// TEST FACTORIES & HELPERS
// ========================

/**
 * Creates a mock TaskService with controlled behavior
 */
function createMockTaskService(overrides: Partial<MockTaskService> = {}): MockTaskService {
  return {
    getTasks: vi.fn().mockReturnValue([]),
    initializeMockData: vi.fn(),
    getTasksByStatusAndProject: vi.fn().mockReturnValue([]),
    getTaskCounts: vi.fn().mockReturnValue({ todo: 0, inProgress: 0, done: 0, total: 0 }),
    ...overrides,
  };
}

/**
 * Creates a mock AuthService with authentication state
 */
function createMockAuthService(overrides: Partial<MockAuthService> = {}): MockAuthService {
  return {
    getUserContext: vi.fn().mockReturnValue({ userId: 'test-user' }),
    isAuthenticated: vi.fn().mockReturnValue(true),
    createAnonymousUser: vi.fn(),
    logSecurityEvent: vi.fn(),
    ...overrides,
  };
}

/**
 * Creates a mock SecurityService
 */
function createMockSecurityService(overrides: Partial<MockSecurityService> = {}): MockSecurityService {
  return {
    checkRateLimit: vi.fn().mockReturnValue({ allowed: true }),
    ...overrides,
  };
}

/**
 * Creates a mock AppStartupService with startup state control
 */
function createMockStartupService(state: {
  isLoading?: boolean;
  isReady?: boolean;
  error?: string | null;
  warnings?: string[];
} = {}): MockAppStartupService {
  return {
    isLoading: signal(state.isLoading ?? false),
    isReady: vi.fn().mockReturnValue(state.isReady ?? true),
    error: signal(state.error ?? null),
    warnings: signal(state.warnings ?? []),
  };
}

/**
 * Creates a mock NotificationService for testing notifications
 */
function createMockNotificationService(overrides: Partial<MockNotificationService> = {}): MockNotificationService {
  return {
    showError: vi.fn(),
    showWarning: vi.fn(),
    showSuccess: vi.fn(),
    ...overrides,
  };
}

/**
 * Creates AutoSaveService mock
 */
function createMockAutoSaveService(overrides: Partial<MockAutoSaveService> = {}): MockAutoSaveService {
  return {
    enable: vi.fn(),
    disable: vi.fn(),
    flush: vi.fn(),
    isEnabled: vi.fn().mockReturnValue(false),
    ...overrides,
  };
}

// ========================
// TEST SETUP CONFIGURATION
// ========================

interface TestFixture {
  fixture: ComponentFixture<App>;
  component: App;
  mockTaskService: MockTaskService;
  mockAuthService: MockAuthService;
  mockSecurityService: MockSecurityService;
  mockStartupService: MockAppStartupService;
  mockNotificationService: MockNotificationService;
  mockAutoSaveService: MockAutoSaveService;
}

interface TestSetupOptions {
  isLoading?: boolean;
  isReady?: boolean;
  error?: string | null;
  warnings?: string[];
  authenticated?: boolean;
  userId?: string | null;
}

/**
 * Configures and creates test fixture with all required mocks
 */
function createTestFixture(options: TestSetupOptions = {}): TestFixture {
  const mockTaskService = createMockTaskService();
  const mockAuthService = createMockAuthService(
    options.authenticated !== undefined
      ? { isAuthenticated: vi.fn().mockReturnValue(options.authenticated) }
      : {}
  );
  if (options.userId !== undefined) {
    mockAuthService.getUserContext.mockReturnValue(
      options.userId ? { userId: options.userId } : null
    );
  }

  const mockSecurityService = createMockSecurityService();
  const mockStartupService = createMockStartupService(options);
  const mockNotificationService = createMockNotificationService();
  const mockAutoSaveService = createMockAutoSaveService();

  TestBed.configureTestingModule({
    imports: [App],
    providers: [
      { provide: TaskService, useValue: mockTaskService },
      { provide: AuthService, useValue: mockAuthService },
      { provide: SecurityService, useValue: mockSecurityService },
      { provide: AppStartupService, useValue: mockStartupService },
      { provide: NotificationService, useValue: mockNotificationService },
      { provide: AutoSaveService, useValue: mockAutoSaveService },
    ],
  });

  const fixture = TestBed.createComponent(App);
  const component = fixture.componentInstance;

  return {
    fixture,
    component,
    mockTaskService,
    mockAuthService,
    mockSecurityService,
    mockStartupService,
    mockNotificationService,
    mockAutoSaveService,
  };
}

// ========================
// MAIN TEST SUITE
// ========================

describe('App', () => {
  describe('Component Initialization', () => {
    it('should create component successfully', () => {
      const { component } = createTestFixture();
      expect(component).toBeDefined();
    });

    it('should initialize with computed startup properties', () => {
      const { component } = createTestFixture({
        isLoading: false,
        isReady: true,
        error: null,
        warnings: [],
      });

      // Access computed properties through proper API or create test-specific getters
      expect((component as any).isLoading()).toBe(false);
      expect((component as any).isAppReady()).toBe(true);
      expect((component as any).startupError()).toBeNull();
      expect((component as any).startupWarnings()).toEqual([]);
    });

    it('should handle loading state correctly', () => {
      const { component } = createTestFixture({
        isLoading: true,
        isReady: false,
      });

      expect((component as any).isLoading()).toBe(true);
      expect((component as any).isAppReady()).toBe(false);
    });

    it('should handle error state correctly', () => {
      const errorMessage = 'Database connection failed';
      const { component } = createTestFixture({
        error: errorMessage,
      });

      expect((component as any).startupError()).toBe(errorMessage);
    });

    it('should expose taskService to window for E2E testing', () => {
      const { component, mockTaskService } = createTestFixture();
      
      // Mock window object
      const mockWindow = { taskService: undefined } as any;
      vi.stubGlobal('window', mockWindow);

      component.ngOnInit();

      expect(mockWindow.taskService).toBe(mockTaskService);
      
      vi.unstubAllGlobals();
    });
  });

  describe('Application Lifecycle', () => {
    it('should perform post-startup initialization when app is ready', () => {
      const { component, mockAuthService, mockTaskService } = createTestFixture({
        isReady: true,
        authenticated: true,
      });

      component.ngOnInit();

      // Should not create anonymous user if already authenticated
      expect(mockAuthService.createAnonymousUser).not.toHaveBeenCalled();
      
      // Should initialize mock data if no tasks exist
      expect(mockTaskService.initializeMockData).toHaveBeenCalled();
      
      // Should log security event for successful initialization
      expect(mockAuthService.logSecurityEvent).toHaveBeenCalledWith({
        type: 'DATA_ACCESS',
        message: 'Application initialized successfully',
        timestamp: expect.any(Date),
        userId: expect.any(String),
      });
    });

    it('should create anonymous user when not authenticated', () => {
      const { component, mockAuthService } = createTestFixture({
        isReady: true,
        authenticated: false,
      });

      component.ngOnInit();

      expect(mockAuthService.createAnonymousUser).toHaveBeenCalled();
    });

    it('should not perform post-startup initialization when app is not ready', () => {
      const { component, mockTaskService, mockAuthService } = createTestFixture({
        isReady: false,
      });

      component.ngOnInit();

      expect(mockTaskService.initializeMockData).not.toHaveBeenCalled();
      expect(mockAuthService.logSecurityEvent).not.toHaveBeenCalled();
    });

    it('should handle startup errors gracefully', () => {
      const errorMessage = 'Critical startup failure';
      const { component, mockNotificationService } = createTestFixture({
        error: errorMessage,
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      component.ngOnInit();

      expect(consoleSpy).toHaveBeenCalledWith('Application startup failed:', errorMessage);
      expect(mockNotificationService.showError).toHaveBeenCalledWith('Application startup failed: ' + errorMessage);
      
      consoleSpy.mockRestore();
    });

    it('should display startup warnings when present', () => {
      const warnings = ['Feature X not available', 'Performance degraded'];
      const { component, mockNotificationService } = createTestFixture({
        warnings,
        isReady: true,
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      component.ngOnInit();

      expect(consoleSpy).toHaveBeenCalledWith('Startup completed with warnings:', warnings);
      expect(mockNotificationService.showWarning).toHaveBeenCalledTimes(warnings.length);
      warnings.forEach((warning, index) => {
        expect(mockNotificationService.showWarning).toHaveBeenNthCalledWith(index + 1, warning);
      });
      
      consoleSpy.mockRestore();
    });
  });

  describe('Security Context', () => {
    it('should identify secure HTTPS context', () => {
      const mockLocation = {
        protocol: 'https:',
        hostname: 'app.taskgo.com',
      };
      vi.stubGlobal('window', { location: mockLocation });

      const { component } = createTestFixture();
      
      expect(component.isSecureContext()).toBe(true);
      
      vi.unstubAllGlobals();
    });

    it('should identify localhost as secure context', () => {
      const mockLocation = {
        protocol: 'http:',
        hostname: 'localhost',
      };
      vi.stubGlobal('window', { location: mockLocation });

      const { component } = createTestFixture();
      
      expect(component.isSecureContext()).toBe(true);
      
      vi.unstubAllGlobals();
    });

    it('should identify 127.0.0.1 as secure context', () => {
      const mockLocation = {
        protocol: 'http:',
        hostname: '127.0.0.1',
      };
      vi.stubGlobal('window', { location: mockLocation });

      const { component } = createTestFixture();
      
      expect(component.isSecureContext()).toBe(true);
      
      vi.unstubAllGlobals();
    });

    it('should identify insecure HTTP context', () => {
      const mockLocation = {
        protocol: 'http:',
        hostname: 'malicious-site.com',
      };
      vi.stubGlobal('window', { location: mockLocation });

      const { component } = createTestFixture();
      
      expect(component.isSecureContext()).toBe(false);
      
      vi.unstubAllGlobals();
    });

    it('should handle undefined window gracefully', () => {
      vi.stubGlobal('window', undefined);

      const { component } = createTestFixture();
      
      expect(component.isSecureContext()).toBe(false);
      
      vi.unstubAllGlobals();
    });
  });

  describe('Template Rendering', () => {
    it('should render startup loader when loading', () => {
      const { fixture } = createTestFixture({ isLoading: true });
      fixture.detectChanges();

      const loaderElement = fixture.debugElement.query(By.css('app-startup-loader'));
      expect(loaderElement).toBeTruthy();
    });

    it('should render main app content when ready', () => {
      const { fixture } = createTestFixture({ isReady: true, isLoading: false });
      fixture.detectChanges();

      const loaderElement = fixture.debugElement.query(By.css('app-startup-loader'));
      const navigationElement = fixture.debugElement.query(By.css('app-navigation'));
      const notificationElement = fixture.debugElement.query(By.css('app-notification-container'));
      const routerOutlet = fixture.debugElement.query(By.css('router-outlet'));

      expect(loaderElement).toBeFalsy();
      expect(navigationElement).toBeTruthy();
      expect(notificationElement).toBeTruthy();
      expect(routerOutlet).toBeTruthy();
    });

    it('should render error state when startup fails', () => {
      const { fixture } = createTestFixture({ error: 'Database connection failed' });
      fixture.detectChanges();

      // Should still render main container but with error handling
      const appElement = fixture.debugElement.query(By.css('.app-container'));
      expect(appElement).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication service errors gracefully', () => {
      const { component, mockAuthService } = createTestFixture({
        isReady: true,
        authenticated: false,
      });

      mockAuthService.createAnonymousUser.mockImplementation(() => {
        throw new Error('Authentication service unavailable');
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => component.ngOnInit()).not.toThrow();
      
      consoleSpy.mockRestore();
    });

    it('should handle task service errors gracefully', () => {
      const { component, mockTaskService } = createTestFixture({
        isReady: true,
        authenticated: true,
      });

      mockTaskService.getTasks.mockImplementation(() => {
        throw new Error('Task service unavailable');
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => component.ngOnInit()).not.toThrow();
      
      consoleSpy.mockRestore();
    });

    it('should handle security logging errors gracefully', () => {
      const { component, mockAuthService } = createTestFixture({
        isReady: true,
        authenticated: true,
      });

      mockAuthService.logSecurityEvent.mockImplementation(() => {
        throw new Error('Security logging failed');
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => component.ngOnInit()).not.toThrow();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Signal Reactivity', () => {
    it('should react to startup state changes', () => {
      const { component, fixture, mockStartupService } = createTestFixture({
        isLoading: true,
        isReady: false,
      });

      // Initial state
      expect((component as any).isLoading()).toBe(true);
      expect((component as any).isAppReady()).toBe(false);

      // Simulate startup completion by creating new signals with updated values
      mockStartupService.isLoading = signal(false);
      mockStartupService.isReady.mockReturnValue(true);
      fixture.detectChanges();

      expect((component as any).isLoading()).toBe(false);
      expect((component as any).isAppReady()).toBe(true);
    });

    it('should react to error state changes', () => {
      const { component, fixture, mockStartupService } = createTestFixture();

      // Initial state - no error
      expect((component as any).startupError()).toBeNull();

      // Simulate error by creating new signal with updated value
      const errorMessage = 'Service unavailable';
      mockStartupService.error = signal(errorMessage);
      fixture.detectChanges();

      expect((component as any).startupError()).toBe(errorMessage);
    });

    it('should react to warnings state changes', () => {
      const { component, fixture, mockStartupService } = createTestFixture();

      // Initial state - no warnings
      expect((component as any).startupWarnings()).toEqual([]);

      // Simulate warnings by creating new signal with updated values
      const warnings = ['Warning 1', 'Warning 2'];
      mockStartupService.warnings = signal(warnings);
      fixture.detectChanges();

      expect((component as any).startupWarnings()).toEqual(warnings);
    });
  });

  describe('Dependency Injection', () => {
    it('should inject all required services', () => {
      createTestFixture();

      expect(TestBed.inject(TaskService)).toBeDefined();
      expect(TestBed.inject(AuthService)).toBeDefined();
      expect(TestBed.inject(SecurityService)).toBeDefined();
      expect(TestBed.inject(AppStartupService)).toBeDefined();
      expect(TestBed.inject(NotificationService)).toBeDefined();
      expect(TestBed.inject(AutoSaveService)).toBeDefined();
    });

    it('should use injected services correctly', () => {
      const { component, mockTaskService, mockAuthService } = createTestFixture({
        isReady: true,
        authenticated: true,
      });

      component.ngOnInit();

      expect(mockTaskService.getTasks).toHaveBeenCalled();
      expect(mockAuthService.isAuthenticated).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null user context gracefully', () => {
      const { component, mockAuthService } = createTestFixture({
        isReady: true,
        authenticated: true,
        userId: null,
      });

      component.ngOnInit();

      expect(mockAuthService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DATA_ACCESS',
          message: 'Application initialized successfully',
          timestamp: expect.any(Date),
          userId: undefined, // Should handle null gracefully
        })
      );
    });

    it('should handle empty task array correctly', () => {
      const { component, mockTaskService } = createTestFixture({
        isReady: true,
        authenticated: true,
      });

      mockTaskService.getTasks.mockReturnValue([]);

      component.ngOnInit();

      expect(mockTaskService.initializeMockData).toHaveBeenCalled();
    });

    it('should handle existing tasks correctly', () => {
      const existingTasks = [
        { id: '1', title: 'Existing Task', status: 'TODO' },
        { id: '2', title: 'Another Task', status: 'DONE' },
      ];
      const { component, mockTaskService } = createTestFixture({
        isReady: true,
        authenticated: true,
      });

      mockTaskService.getTasks.mockReturnValue(existingTasks);

      component.ngOnInit();

      expect(mockTaskService.initializeMockData).not.toHaveBeenCalled();
    });

    it('should handle large numbers of warnings efficiently', () => {
      const warnings = Array.from({ length: 1000 }, (_, i) => `Warning ${i + 1}`);
      const { component, mockNotificationService } = createTestFixture({
        warnings,
        isReady: true,
      });

      const startTime = performance.now();
      component.ngOnInit();
      const endTime = performance.now();

      // Should complete within reasonable time (50ms for better performance)
      expect(endTime - startTime).toBeLessThan(50);
      expect(mockNotificationService.showWarning).toHaveBeenCalledTimes(1000);
    });

    it('should handle window object absence in SSR environment', () => {
      vi.stubGlobal('window', undefined);
      
      const { component } = createTestFixture({
        isReady: true,
        authenticated: true,
      });

      expect(() => component.ngOnInit()).not.toThrow();
      
      vi.unstubAllGlobals();
    });

    it('should handle missing location object', () => {
      vi.stubGlobal('window', {});
      
      const { component } = createTestFixture();
      
      expect(() => component.isSecureContext()).not.toThrow();
      expect(component.isSecureContext()).toBe(false);
      
      vi.unstubAllGlobals();
    });

    it('should handle concurrent initialization attempts', async () => {
      const { component } = createTestFixture({
        isReady: true,
        authenticated: true,
      });

      // Simulate multiple rapid ngOnInit calls
      const promises = Array.from({ length: 10 }, () => {
        return new Promise<void>((resolve) => {
          setTimeout(() => {
            component.ngOnInit();
            resolve();
          }, Math.random() * 10);
        });
      });

      await Promise.all(promises);

      // Should not crash and should only initialize once
      expect(() => component.ngOnInit()).not.toThrow();
    });

    it('should handle signal disposal and recreation', () => {
      const { component, mockStartupService } = createTestFixture();

      // Dispose and recreate signals
      mockStartupService.isLoading = signal(true);
      mockStartupService.isReady.mockReturnValue(false);
      
      expect((component as any).isLoading()).toBe(true);

      // Recreate signals
      mockStartupService.isLoading = signal(false);
      mockStartupService.isReady.mockReturnValue(true);
      
      expect((component as any).isLoading()).toBe(false);
    });

    it('should maintain component state during hydration mismatches', () => {
      const { fixture, component } = createTestFixture({
        isReady: false,
        isLoading: true,
      });

      // Simulate hydration scenario
      fixture.detectChanges();
      
      const initialHtml = fixture.nativeElement.innerHTML;
      
      // Simulate client-side completion
      (component as any).isLoading = signal(false);
      (component as any).isAppReady = () => true;
      
      fixture.detectChanges();
      
      const finalHtml = fixture.nativeElement.innerHTML;
      
      // Should transition gracefully from server to client state
      expect(initialHtml).not.toBe(finalHtml);
      expect(finalHtml).toContain('app-navigation');
    });
  });
});

// ========================
// INTEGRATION TESTS
// ========================

describe('App Integration', () => {
  it('should integrate all services properly in happy path', () => {
    const { fixture, component } = createTestFixture({
      isReady: true,
      isLoading: false,
      authenticated: true,
    });

    fixture.detectChanges();
    component.ngOnInit();

    const appElement = fixture.debugElement.query(By.css('.app-container'));
    expect(appElement).toBeTruthy();

    // Should render navigation
    const navigation = fixture.debugElement.query(By.css('app-navigation'));
    expect(navigation).toBeTruthy();

    // Should render router outlet
    const routerOutlet = fixture.debugElement.query(By.css('router-outlet'));
    expect(routerOutlet).toBeTruthy();
  });

  it('should handle complete startup failure scenario', () => {
    const { fixture, component } = createTestFixture({
      error: 'Complete system failure',
      isLoading: false,
      isReady: false,
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    fixture.detectChanges();
    component.ngOnInit();

    // Should still render container but with error handling
    const appElement = fixture.debugElement.query(By.css('.app-container'));
    expect(appElement).toBeTruthy();

    consoleSpy.mockRestore();
  });

    it('should handle rapid state changes without memory leaks', () => {
      const { fixture, component, mockStartupService } = createTestFixture();

      // Rapidly change states to test for memory leaks
      const initialMemory = process.memoryUsage?.()?.heapUsed || 0;
      
      for (let i = 0; i < 100; i++) {
        mockStartupService.isLoading = signal(i % 2 === 0);
        mockStartupService.error = signal(i % 3 === 0 ? `Error ${i}` : null);
        mockStartupService.warnings = signal(i % 4 === 0 ? [`Warning ${i}`] : []);
        fixture.detectChanges();
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage?.()?.heapUsed || 0;
      const memoryGrowth = finalMemory - initialMemory;

      // Should complete without excessive memory growth (less than 1MB)
      expect(memoryGrowth).toBeLessThan(1024 * 1024);
    });

  it('should maintain component integrity during service failures', () => {
    const { component, mockTaskService, mockAuthService } = createTestFixture({
      isReady: true,
      authenticated: true,
    });

    // Make services throw errors intermittently
    let callCount = 0;
    mockTaskService.getTasks.mockImplementation(() => {
      callCount++;
      if (callCount % 2 === 0) {
        throw new Error(' intermittent failure');
      }
      return [];
    });

    expect(() => component.ngOnInit()).not.toThrow();
  });
});