import { TestBed } from '@angular/core/testing';
import { AppStartupService, StartupState } from './app-startup.service';
import { DataValidationService } from './data-validation.service';
import { LocalStorageService } from './local-storage.service';
import { TaskService } from './task.service';

describe('AppStartupService', () => {
  let service: AppStartupService;
  let dataValidationServiceSpy: jasmine.SpyObj<DataValidationService>;
  let localStorageServiceSpy: jasmine.SpyObj<LocalStorageService>;
  let taskServiceSpy: jasmine.SpyObj<TaskService>;

  const mockTask = {
    id: 'test-1',
    title: 'Test Task',
    priority: 'medium' as const,
    status: 'TODO' as const,
    project: 'Work' as const,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    const dataValidationSpy = jasmine.createSpyObj('DataValidationService', [
      'loadTasksFromStorage',
      'getPerformanceMetrics'
    ]);
    const localStorageSpy = jasmine.createSpyObj('LocalStorageService', ['removeItem']);
    const taskServiceSpy = jasmine.createSpyObj('TaskService', [], ['tasks']);

    TestBed.configureTestingModule({
      providers: [
        AppStartupService,
        { provide: DataValidationService, useValue: dataValidationSpy },
        { provide: LocalStorageService, useValue: localStorageSpy },
        { provide: TaskService, useValue: taskServiceSpy }
      ]
    });

    service = TestBed.inject(AppStartupService);
    dataValidationServiceSpy = TestBed.inject(DataValidationService) as jasmine.SpyObj<DataValidationService>;
    localStorageServiceSpy = TestBed.inject(LocalStorageService) as jasmine.SpyObj<LocalStorageService>;
    taskServiceSpy = TestBed.inject(TaskService) as jasmine.SpyObj<TaskService>;
  });

  describe('initializeApp', () => {
    it('should return a function that performs startup sequence', () => {
      const initFn = service.initializeApp();
      expect(typeof initFn).toBe('function');
    });

    it('should handle successful data loading', async () => {
      const mockLoadResult = {
        success: true,
        data: [mockTask],
        loadingTime: 50,
        fromCache: true,
        fallbackUsed: false,
        errors: [],
        warnings: []
      };

      const mockMetrics = {
        loadTimeMs: 50,
        loadTimeCategory: 'fast' as const,
        cacheHit: true,
        fallbackUsed: false,
        migrationPerformed: false
      };

      dataValidationServiceSpy.loadTasksFromStorage.and.resolveTo(mockLoadResult);
      dataValidationServiceSpy.getPerformanceMetrics.and.returnValue(mockMetrics);

      const initFn = service.initializeApp();
      await initFn();

      expect(service.isReady()).toBe(true);
      expect(service.isLoading()).toBe(false);
      expect(service.error()).toBe(null);
    });

    it('should handle data loading with migration', async () => {
      const mockLoadResult = {
        success: true,
        data: [mockTask],
        loadingTime: 100,
        fromCache: true,
        fallbackUsed: false,
        errors: [],
        warnings: ['Data migrated from version 0.9.5'],
        migration: {
          success: true,
          fromVersion: '0.9.5',
          toVersion: '1.0.0',
          migrated: true,
          data: [mockTask]
        }
      };

      const mockMetrics = {
        loadTimeMs: 100,
        loadTimeCategory: 'medium' as const,
        cacheHit: true,
        fallbackUsed: false,
        migrationPerformed: true
      };

      dataValidationServiceSpy.loadTasksFromStorage.and.resolveTo(mockLoadResult);
      dataValidationServiceSpy.getPerformanceMetrics.and.returnValue(mockMetrics);
      localStorageServiceSpy.setItem.and.resolveTo({ success: true });

      const initFn = service.initializeApp();
      await initFn();

      expect(service.isReady()).toBe(true);
      expect(service.warnings()).toContain('Data migrated from version 0.9.5');
      expect(localStorageServiceSpy.setItem).toHaveBeenCalledWith('tasks', [mockTask]);
    });

    it('should handle data loading failure gracefully', async () => {
      const mockLoadResult = {
        success: false,
        loadingTime: 25,
        fromCache: false,
        fallbackUsed: false,
        errors: ['Corrupted data', 'Validation failed'],
        warnings: []
      };

      const mockMetrics = {
        loadTimeMs: 25,
        loadTimeCategory: 'fast' as const,
        cacheHit: false,
        fallbackUsed: false,
        migrationPerformed: false
      };

      dataValidationServiceSpy.loadTasksFromStorage.and.resolveTo(mockLoadResult);
      dataValidationServiceSpy.getPerformanceMetrics.and.returnValue(mockMetrics);
      localStorageServiceSpy.removeItem.and.resolveTo({ success: true });

      const initFn = service.initializeApp();
      await initFn();

      expect(service.isReady()).toBe(true);
      expect(service.warnings()).toContain('Started with empty state due to storage errors');
      expect(service.warnings()).toContain('Corrupted data');
      expect(service.warnings()).toContain('Validation failed');
      expect(localStorageServiceSpy.removeItem).toHaveBeenCalledWith('tasks');
    });

    it('should handle critical errors and still start app', async () => {
      dataValidationServiceSpy.loadTasksFromStorage.and.rejectWith(new Error('Critical storage error'));

      const initFn = service.initializeApp();
      await initFn();

      expect(service.isReady()).toBe(false);
      expect(service.error()).toBe('Critical storage error');
      expect(service.isLoading()).toBe(false);
    });
  });

  describe('getStartupState', () => {
    it('should return current startup state', () => {
      const state = service.getStartupState();
      expect(state).toBeDefined();
      expect(state.loading).toBeDefined();
      expect(state.loaded).toBeDefined();
      expect(state.error).toBeDefined();
      expect(state.warnings).toBeDefined();
    });
  });

  describe('isReady', () => {
    it('should return false when loading', () => {
      // Set initial loading state by simulating constructor
      const state = service.getStartupState();
      expect(state.loading).toBe(true);
      expect(service.isReady()).toBe(false);
    });
  });

  describe('reinitialize', () => {
    it('should force reinitialization', async () => {
      const mockLoadResult = {
        success: true,
        data: [],
        loadingTime: 10,
        fromCache: false,
        fallbackUsed: false,
        errors: [],
        warnings: []
      };

      const mockMetrics = {
        loadTimeMs: 10,
        loadTimeCategory: 'fast' as const,
        cacheHit: false,
        fallbackUsed: false,
        migrationPerformed: false
      };

      dataValidationServiceSpy.loadTasksFromStorage.and.resolveTo(mockLoadResult);
      dataValidationServiceSpy.getPerformanceMetrics.and.returnValue(mockMetrics);

      await service.reinitialize();

      expect(dataValidationServiceSpy.loadTasksFromStorage).toHaveBeenCalledTimes(1);
      expect(service.isReady()).toBe(true);
    });
  });

  describe('getStorageHealth', () => {
    it('should return storage health information', () => {
      spyOn(localStorageServiceSpy, 'getStorageStatus').and.returnValue({
        localStorage: true,
        sessionStorage: true,
        fallbackActive: false
      });

      const health = service.getStorageHealth();

      expect(health.available).toBe(true);
      expect(health.usingFallback).toBe(false);
      expect(localStorageServiceSpy.getStorageStatus).toHaveBeenCalled();
    });

    it('should detect when only sessionStorage is available', () => {
      spyOn(localStorageServiceSpy, 'getStorageStatus').and.returnValue({
        localStorage: false,
        sessionStorage: true,
        fallbackActive: true
      });

      const health = service.getStorageHealth();

      expect(health.available).toBe(true);
      expect(health.usingFallback).toBe(true);
    });

    it('should detect when no storage is available', () => {
      spyOn(localStorageServiceSpy, 'getStorageStatus').and.returnValue({
        localStorage: false,
        sessionStorage: false,
        fallbackActive: false
      });

      const health = service.getStorageHealth();

      expect(health.available).toBe(false);
      expect(health.usingFallback).toBe(false);
    });
  });

  describe('signal updates', () => {
    it('should provide reactive signals for state changes', async () => {
      const initialState = service.getStartupState();
      expect(initialState.loading).toBe(true);

      // Simulate successful startup
      const mockLoadResult = {
        success: true,
        data: [],
        loadingTime: 10,
        fromCache: false,
        fallbackUsed: false,
        errors: [],
        warnings: []
      };

      const mockMetrics = {
        loadTimeMs: 10,
        loadTimeCategory: 'fast' as const,
        cacheHit: false,
        fallbackUsed: false,
        migrationPerformed: false
      };

      dataValidationServiceSpy.loadTasksFromStorage.and.resolveTo(mockLoadResult);
      dataValidationServiceSpy.getPerformanceMetrics.and.returnValue(mockMetrics);

      const initFn = service.initializeApp();
      await initFn();

      const finalState = service.getStartupState();
      expect(finalState.loading).toBe(false);
      expect(finalState.loaded).toBe(true);
      expect(finalState.error).toBe(null);
      expect(finalState.metrics).toEqual(mockMetrics);
    });
  });
});