import { TestBed } from '@angular/core/testing';
import { AppStartupService } from './app-startup.service';
import { DataValidationService } from './data-validation.service';
import { LocalStorageService } from './local-storage.service';
import { TaskService } from './task.service';
import { Task } from '../models/task.model';
import { vi } from 'vitest';

describe('AppStartupService', () => {
  let service: AppStartupService;
  let dataValidationServiceSpy: { 
    loadTasksFromStorage: ReturnType<typeof vi.fn>, 
    getPerformanceMetrics: ReturnType<typeof vi.fn> 
  };
  let localStorageServiceSpy: { 
    removeItem: ReturnType<typeof vi.fn>, 
    getStorageStatus: ReturnType<typeof vi.fn>
  };
  let taskServiceSpy: any;

  const mockTask: Task = {
    id: 'test-1',
    title: 'Test Task',
    priority: 'medium' as Task['priority'],
    status: 'TODO' as Task['status'],
    project: 'Work' as Task['project'],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    dataValidationServiceSpy = {
      loadTasksFromStorage: vi.fn(),
      getPerformanceMetrics: vi.fn()
    };
    
    localStorageServiceSpy = {
      removeItem: vi.fn(),
      getStorageStatus: vi.fn().mockReturnValue({
        localStorage: true,
        sessionStorage: true,
        fallbackActive: false
      })
    };
    
    taskServiceSpy = {
      setTasks: vi.fn(),
      loadTasks: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        AppStartupService,
        { provide: DataValidationService, useValue: dataValidationServiceSpy },
        { provide: LocalStorageService, useValue: localStorageServiceSpy },
        { provide: TaskService, useValue: taskServiceSpy }
      ]
    });

    service = TestBed.inject(AppStartupService);
  });

  describe('initializeApp', () => {
    it('should return a function that performs startup sequence', () => {
      const initFn = service.initializeApp();
      expect(typeof initFn).toBe('function');
    });

    it('should handle successful startup', async () => {
      dataValidationServiceSpy.loadTasksFromStorage.mockResolvedValue({
        success: true,
        data: [mockTask],
        loadingTime: 50,
        fromCache: true,
        fallbackUsed: false,
        errors: [],
        warnings: []
      });

      dataValidationServiceSpy.getPerformanceMetrics.mockImplementation((result) => ({
        loadTimeCategory: 'fast',
        loadTimeMs: 50,
        cacheHit: true,
        fallbackUsed: false,
        migrationPerformed: false
      }));

      const initFn = service.initializeApp();
      await initFn();

      expect(service.isLoading()).toBe(false);
      expect(service.isLoaded()).toBe(true);
      expect(service.error()).toBeNull();
      expect(service.warnings()).toEqual([]);
      expect(taskServiceSpy.setTasks).toHaveBeenCalledWith([mockTask]);
      expect(service.metrics()).toEqual(expect.objectContaining({
        loadTimeCategory: 'fast',
        loadTimeMs: expect.any(Number),
        cacheHit: true,
        fallbackUsed: false,
        migrationPerformed: false
      }));
    });

    it('should handle startup with warnings', async () => {
      dataValidationServiceSpy.loadTasksFromStorage.mockResolvedValue({
        success: true,
        data: [mockTask],
        loadingTime: 100,
        fromCache: true,
        fallbackUsed: false,
        errors: [],
        warnings: ['Data migrated from legacy format']
      });

      dataValidationServiceSpy.getPerformanceMetrics.mockImplementation((result) => ({
        loadTimeCategory: 'medium',
        loadTimeMs: 100,
        cacheHit: true,
        fallbackUsed: false,
        migrationPerformed: true
      }));

      const initFn = service.initializeApp();
      await initFn();

      expect(service.warnings()).toEqual(['Data migrated from legacy format']);
      expect(service.metrics()?.migrationPerformed).toBe(true);
    });

    it('should handle startup failure', async () => {
      dataValidationServiceSpy.loadTasksFromStorage.mockResolvedValue({
        success: false,
        data: undefined,
        loadingTime: 0,
        fromCache: false,
        fallbackUsed: false,
        errors: ['Failed to load tasks'],
        warnings: []
      });

      dataValidationServiceSpy.getPerformanceMetrics.mockImplementation((result) => ({
        loadTimeCategory: 'slow',
        loadTimeMs: 0,
        cacheHit: false,
        fallbackUsed: false,
        migrationPerformed: false
      }));

      const initFn = service.initializeApp();
      await initFn();

      expect(service.isLoading()).toBe(false);
      expect(service.isLoaded()).toBe(true); // Service recovers and loads empty state
      expect(service.error()).toBeNull(); // Recovery succeeded
      expect(service.warnings()).toEqual([
        'Started with empty state due to storage errors',
        'Failed to load tasks'
      ]);
    });

    it('should handle empty task list successfully', async () => {
      dataValidationServiceSpy.loadTasksFromStorage.mockResolvedValue({
        success: true,
        data: [],
        loadingTime: 25,
        fromCache: true,
        fallbackUsed: false,
        errors: [],
        warnings: []
      });

      dataValidationServiceSpy.getPerformanceMetrics.mockImplementation((result) => ({
        loadTimeCategory: 'fast',
        loadTimeMs: 25,
        cacheHit: true,
        fallbackUsed: false,
        migrationPerformed: false
      }));

      const initFn = service.initializeApp();
      await initFn();

      expect(service.isLoaded()).toBe(true);
      expect(service.error()).toBeNull();
    });
  });

  describe('reinitialize', () => {
    it('should clear corrupted storage and retry initialization', async () => {
      // First call fails
      dataValidationServiceSpy.loadTasksFromStorage.mockResolvedValueOnce({
        success: false,
        data: undefined,
        loadingTime: 0,
        fromCache: false,
        fallbackUsed: false,
        errors: ['Corrupted data detected'],
        warnings: []
      });

      // Second call succeeds after clearing
      dataValidationServiceSpy.loadTasksFromStorage.mockResolvedValueOnce({
        success: true,
        data: [mockTask],
        loadingTime: 30,
        fromCache: true,
        fallbackUsed: false,
        errors: [],
        warnings: []
      });

      dataValidationServiceSpy.getPerformanceMetrics.mockImplementation((result) => ({
        loadTimeCategory: 'fast',
        loadTimeMs: 30,
        cacheHit: true,
        fallbackUsed: false,
        migrationPerformed: false
      }));

      await service.reinitialize();

      expect(localStorageServiceSpy.removeItem).toHaveBeenCalled();
      expect(service.isLoaded()).toBe(true);
      expect(service.error()).toBeNull();
    });

    it('should handle reinitialization failure', async () => {
      dataValidationServiceSpy.loadTasksFromStorage.mockResolvedValue({
        success: false,
        data: undefined,
        loadingTime: 0,
        fromCache: false,
        fallbackUsed: false,
        errors: ['Persistent failure'],
        warnings: []
      });

      dataValidationServiceSpy.getPerformanceMetrics.mockImplementation((result) => ({
        loadTimeCategory: 'slow',
        loadTimeMs: 0,
        cacheHit: false,
        fallbackUsed: false,
        migrationPerformed: false
      }));

      await service.reinitialize();

      expect(service.isLoaded()).toBe(true); // Service recovers
      expect(service.error()).toBeNull(); // Recovery succeeded
      expect(service.warnings()).toEqual([
        'Started with empty state due to storage errors',
        'Persistent failure'
      ]);
    });
  });

  describe('Computed Properties', () => {
    it('should return reactive loading state', async () => {
      dataValidationServiceSpy.loadTasksFromStorage.mockResolvedValue({
        success: true,
        data: [mockTask],
        loadingTime: 25,
        fromCache: true,
        fallbackUsed: false,
        errors: [],
        warnings: []
      });

      dataValidationServiceSpy.getPerformanceMetrics.mockImplementation((result) => ({
        loadTimeCategory: 'fast',
        loadTimeMs: 25,
        cacheHit: true,
        fallbackUsed: false,
        migrationPerformed: false
      }));

      // Initially should be loading
      expect(service.isLoading()).toBe(true);

      const initFn = service.initializeApp();
      await initFn();

      // Should be loaded after initialization
      expect(service.isLoading()).toBe(false);
      expect(service.isLoaded()).toBe(true);
      expect(service.error()).toBeNull();
    });

    it('should track warnings correctly', async () => {
      dataValidationServiceSpy.loadTasksFromStorage.mockResolvedValue({
        success: true,
        data: [mockTask],
        loadingTime: 100,
        fromCache: true,
        fallbackUsed: false,
        errors: [],
        warnings: ['Warning 1', 'Warning 2']
      });

      dataValidationServiceSpy.getPerformanceMetrics.mockImplementation((result) => ({
        loadTimeCategory: 'medium',
        loadTimeMs: 100,
        cacheHit: true,
        fallbackUsed: false,
        migrationPerformed: false
      }));

      const initFn = service.initializeApp();
      await initFn();

      expect(service.warnings()).toEqual(['Warning 1', 'Warning 2']);
    });
  });

  describe('Performance Metrics', () => {
    it('should track initialization time', async () => {
      dataValidationServiceSpy.loadTasksFromStorage.mockResolvedValue({
        success: true,
        data: [mockTask],
        loadingTime: 45,
        fromCache: true,
        fallbackUsed: false,
        errors: [],
        warnings: []
      });

      dataValidationServiceSpy.getPerformanceMetrics.mockImplementation((result) => ({
        loadTimeCategory: 'fast',
        loadTimeMs: 45,
        cacheHit: true,
        fallbackUsed: false,
        migrationPerformed: false
      }));

      const initFn = service.initializeApp();
      await initFn();

      expect(service.metrics()?.loadTimeMs).toBeGreaterThan(0);
    });

    it('should categorize load times correctly', async () => {
      dataValidationServiceSpy.loadTasksFromStorage.mockResolvedValue({
        success: true,
        data: [mockTask],
        loadingTime: 20,
        fromCache: true,
        fallbackUsed: false,
        errors: [],
        warnings: []
      });

      // Test fast load
      dataValidationServiceSpy.getPerformanceMetrics.mockImplementation((result) => ({
        loadTimeCategory: 'fast',
        loadTimeMs: 20,
        cacheHit: true,
        fallbackUsed: false,
        migrationPerformed: false
      }));

      const initFn = service.initializeApp();
      await initFn();

      expect(service.metrics()?.loadTimeCategory).toBe('fast');

      // Reset and test medium load
      await service.reinitialize();

      dataValidationServiceSpy.getPerformanceMetrics.mockImplementation((result) => ({
        loadTimeCategory: 'medium',
        loadTimeMs: 100,
        cacheHit: true,
        fallbackUsed: false,
        migrationPerformed: false
      }));

      await service.reinitialize();

      expect(service.metrics()?.loadTimeCategory).toBe('medium');
    });
  });
});