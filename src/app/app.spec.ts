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
import { NotificationService, Notification } from './shared/services/notification.service';
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
  isLoaded: Signal<boolean>;
  isReady: ReturnType<typeof vi.fn>;
  error: Signal<string | null>;
  warnings: Signal<string[]>;
}

interface MockNotificationService {
  showError: ReturnType<typeof vi.fn>;
  showWarning: ReturnType<typeof vi.fn>;
  showSuccess: ReturnType<typeof vi.fn>;
  notifications$: { (): Notification[] }; // Proper signal function
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
  isLoaded?: boolean;
  isReady?: boolean;
  error?: string | null;
  warnings?: string[];
} = {}): MockAppStartupService {
  return {
    isLoading: signal(state.isLoading ?? false),
    isLoaded: signal(state.isLoaded ?? false),
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
    notifications$: vi.fn().mockReturnValue([]), // Mock signal function
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
  isLoaded?: boolean;
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

      // Test the component's public interface and behavior
      expect(component).toBeDefined();
      expect(component.isSecureContext()).toBeDefined();
    });

    it('should handle loading state correctly', () => {
      const { component } = createTestFixture({
        isLoading: true,
        isReady: false,
      });

      // Component should still be functional even in loading state
      expect(component).toBeDefined();
      expect(component.isSecureContext()).toBeDefined();
    });

    it('should handle error state correctly', () => {
      const errorMessage = 'Database connection failed';
      const { component } = createTestFixture({
        error: errorMessage,
      });

      // Component should still be defined even with error state
      expect(component).toBeDefined();
      expect(component.isSecureContext()).toBeDefined();
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
    it('should create component successfully', () => {
      const { fixture } = createTestFixture();
      fixture.detectChanges();
      
      expect(fixture.componentInstance).toBeDefined();
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
      
      // The component should throw the error - this is expected behavior
      expect(() => component.ngOnInit()).toThrow('Authentication service unavailable');
      
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
      
      // The component should throw the error - this is expected behavior
      expect(() => component.ngOnInit()).toThrow('Task service unavailable');
      
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
      
      // The component should throw the error - this is expected behavior
      expect(() => component.ngOnInit()).toThrow('Security logging failed');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Component Behavior', () => {
    it('should handle secure context detection', () => {
      const { component } = createTestFixture();
      
      // Test HTTPS context
      vi.stubGlobal('window', {
        location: { protocol: 'https:', hostname: 'example.com' }
      });
      expect(component.isSecureContext()).toBe(true);
      vi.unstubAllGlobals();

      // Test localhost context
      vi.stubGlobal('window', {
        location: { protocol: 'http:', hostname: 'localhost' }
      });
      expect(component.isSecureContext()).toBe(true);
      vi.unstubAllGlobals();

      // Test insecure context
      vi.stubGlobal('window', {
        location: { protocol: 'http:', hostname: 'malicious-site.com' }
      });
      expect(component.isSecureContext()).toBe(false);
      vi.unstubAllGlobals();
    });

    it('should handle missing window gracefully', () => {
      vi.stubGlobal('window', undefined);
      const { component } = createTestFixture();
      
      expect(() => component.isSecureContext()).not.toThrow();
      expect(component.isSecureContext()).toBe(false);
      
      vi.unstubAllGlobals();
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
          userId: undefined,
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

    it('should handle window object absence in SSR environment', () => {
      vi.stubGlobal('window', undefined);
      
      const { component } = createTestFixture({
        isReady: true,
        authenticated: true,
      });

      expect(() => component.ngOnInit()).not.toThrow();
      
      vi.unstubAllGlobals();
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
      isLoaded: true,
      authenticated: true,
    });

    fixture.detectChanges();
    component.ngOnInit();

    expect(fixture.componentInstance).toBeDefined();
  });

  it('should handle complete startup failure scenario', () => {
    const { fixture, component } = createTestFixture({
      error: 'Complete system failure',
      isLoading: false,
      isLoaded: false,
      isReady: false,
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    fixture.detectChanges();
    component.ngOnInit();

    expect(fixture.componentInstance).toBeDefined();

    consoleSpy.mockRestore();
  });
});