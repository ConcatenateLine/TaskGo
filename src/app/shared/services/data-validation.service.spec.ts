import { TestBed } from '@angular/core/testing';
import { DataValidationService } from './data-validation.service';
import { Task } from '../models/task.model';
import { LocalStorageService } from './local-storage.service';

describe('DataValidationService', () => {
  let service: DataValidationService;
  let localStorageServiceSpy: jasmine.SpyObj<LocalStorageService>;

  const mockValidTask: Task = {
    id: 'test-1',
    title: 'Test Task',
    description: 'Test Description',
    priority: 'medium',
    status: 'TODO',
    project: 'Work',
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z')
  };

  beforeEach(() => {
    const spy = jasmine.createSpyObj('LocalStorageService', ['getItem', 'setItem']);
    
    TestBed.configureTestingModule({
      providers: [
        DataValidationService,
        { provide: LocalStorageService, useValue: spy }
      ]
    });

    service = TestBed.inject(DataValidationService);
    localStorageServiceSpy = TestBed.inject(LocalStorageService) as jasmine.SpyObj<LocalStorageService>;
  });

  describe('validateTaskData', () => {
    it('should validate an array of valid tasks', () => {
      const result = service.validateTaskData([mockValidTask]);

      expect(result.isValid).toBe(true);
      expect(result.data).toEqual([mockValidTask]);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    it('should reject non-array data', () => {
      const result = service.validateTaskData('not an array');

      expect(result.isValid).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.errors).toEqual(['Data must be an array of tasks']);
    });

    it('should reject tasks with missing required fields', () => {
      const invalidTask = { id: 'test-1' }; // Missing required fields
      const result = service.validateTaskData([invalidTask]);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('Task must have a valid title'))).toBe(true);
    });

    it('should handle tasks with invalid priority', () => {
      const invalidTask = {
        ...mockValidTask,
        priority: 'invalid' as any
      };
      const result = service.validateTaskData([invalidTask]);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid priority'))).toBe(true);
    });

    it('should handle tasks with invalid status', () => {
      const invalidTask = {
        ...mockValidTask,
        status: 'invalid' as any
      };
      const result = service.validateTaskData([invalidTask]);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid status'))).toBe(true);
    });

    it('should handle tasks with invalid project', () => {
      const invalidTask = {
        ...mockValidTask,
        project: 'invalid' as any
      };
      const result = service.validateTaskData([invalidTask]);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid project'))).toBe(true);
    });

    it('should trim title and description', () => {
      const taskWithSpaces = {
        ...mockValidTask,
        title: '  Test Task  ',
        description: '  Test Description  '
      };
      const result = service.validateTaskData([taskWithSpaces]);

      expect(result.isValid).toBe(true);
      expect(result.data![0].title).toBe('Test Task');
      expect(result.data![0].description).toBe('Test Description');
    });

    it('should handle missing description', () => {
      const taskWithoutDesc = {
        ...mockValidTask,
        description: undefined
      };
      const result = service.validateTaskData([taskWithoutDesc]);

      expect(result.isValid).toBe(true);
      expect(result.data![0].description).toBeUndefined();
    });

    it('should convert string dates to Date objects', () => {
      const taskWithStringDates = {
        ...mockValidTask,
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z'
      };
      const result = service.validateTaskData([taskWithStringDates]);

      expect(result.isValid).toBe(true);
      expect(result.data![0].createdAt).toEqual(new Date('2024-01-15T10:00:00Z'));
      expect(result.data![0].updatedAt).toEqual(new Date('2024-01-15T10:00:00Z'));
    });
  });

  describe('detectDataVersion', () => {
    it('should detect current version format', () => {
      const result = service.detectDataVersion([mockValidTask]);
      expect(result).toBe('1.0.0');
    });

    it('should detect legacy format (missing fields)', () => {
      const legacyTask = {
        id: 'test-1',
        title: 'Test Task'
        // Missing status, priority, project
      };
      const result = service.detectDataVersion([legacyTask]);
      expect(result).toBe('0.9.0');
    });

    it('should detect 0.9.5 format (string dates)', () => {
      const oldFormatTask = {
        ...mockValidTask,
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z'
      };
      const result = service.detectDataVersion([oldFormatTask]);
      expect(result).toBe('0.9.5');
    });

    it('should handle empty array', () => {
      const result = service.detectDataVersion([]);
      expect(result).toBe('1.0.0');
    });

    it('should handle non-array data', () => {
      const result = service.detectDataVersion('not an array');
      expect(result).toBe('legacy');
    });
  });

  describe('migrateData', () => {
    it('should return success for current version data', () => {
      const result = service.migrateData([mockValidTask], '1.0.0');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([mockValidTask]);
      expect(result.migrated).toBe(false);
      expect(result.fromVersion).toBe('1.0.0');
      expect(result.toVersion).toBe('1.0.0');
    });

    it('should migrate legacy format data', () => {
      const legacyTask = {
        id: 'test-1',
        title: 'Test Task'
        // Missing required fields
      };
      const result = service.migrateData([legacyTask], 'legacy');

      expect(result.success).toBe(true);
      expect(result.migrated).toBe(true);
      expect(result.fromVersion).toBe('legacy');
      expect(result.toVersion).toBe('1.0.0');
      expect(result.data![0]).toEqual(jasmine.objectContaining({
        id: 'test-1',
        title: 'Test Task',
        priority: 'medium',
        status: 'TODO',
        project: 'General'
      }));
    });

    it('should migrate 0.9.5 format data', () => {
      const oldFormatTask = {
        ...mockValidTask,
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z'
      };
      const result = service.migrateData([oldFormatTask], '0.9.5');

      expect(result.success).toBe(true);
      expect(result.migrated).toBe(true);
      expect(result.fromVersion).toBe('0.9.5');
      expect(result.toVersion).toBe('1.0.0');
      expect(result.data![0].createdAt).toEqual(jasmine.any(Date));
      expect(result.data![0].updatedAt).toEqual(jasmine.any(Date));
    });

    it('should filter out null/undefined objects during migration', () => {
      const mixedData = [
        { id: 'test-1', title: 'Valid Task' },
        null,
        undefined,
        { id: 'test-2', title: 'Another Valid Task' }
      ];
      const result = service.migrateData(mixedData, 'legacy');

      expect(result.success).toBe(true);
      expect(result.data!.length).toBe(2);
      expect(result.data![0].title).toBe('Valid Task');
      expect(result.data![1].title).toBe('Another Valid Task');
    });
  });

  describe('loadTasksFromStorage', () => {
    it('should load and validate tasks from storage successfully', async () => {
      localStorageServiceSpy.getItem.and.resolveTo({
        success: true,
        data: [mockValidTask],
        fallbackUsed: false
      });

      const result = await service.loadTasksFromStorage();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([mockValidTask]);
      expect(result.fromCache).toBe(true);
      expect(result.fallbackUsed).toBe(false);
      expect(result.errors).toEqual([]);
      expect(result.migration).toBeUndefined();
    });

    it('should handle storage unavailability gracefully', async () => {
      localStorageServiceSpy.getItem.and.resolveTo({
        success: false,
        error: { message: 'Storage unavailable' }
      });

      const result = await service.loadTasksFromStorage();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.fromCache).toBe(false);
      expect(result.fallbackUsed).toBe(false);
    });

    it('should migrate data when validation fails', async () => {
      const oldFormatTask = {
        ...mockValidTask,
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z'
      };
      localStorageServiceSpy.getItem.and.resolveTo({
        success: true,
        data: [oldFormatTask],
        fallbackUsed: false
      });

      const result = await service.loadTasksFromStorage();

      expect(result.success).toBe(true);
      expect(result.data![0].createdAt).toEqual(jasmine.any(Date));
      expect(result.migration).toBeDefined();
      expect(result.migration!.migrated).toBe(true);
      expect(result.warnings).toContain('Data migrated from version 0.9.5');
    });

    it('should handle migration failure gracefully', async () => {
      const invalidTask = { id: 'test-1' }; // Cannot be migrated
      localStorageServiceSpy.getItem.and.resolveTo({
        success: true,
        data: [invalidTask],
        fallbackUsed: false
      });

      const result = await service.loadTasksFromStorage();

      expect(result.success).toBe(false);
      expect(result.migration).toBeDefined();
      expect(result.migration!.success).toBe(false);
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should categorize fast load times', () => {
      const mockResult = {
        success: true,
        loadingTime: 30,
        fromCache: true,
        fallbackUsed: false,
        errors: [],
        warnings: []
      };

      const metrics = service.getPerformanceMetrics(mockResult);

      expect(metrics.loadTimeCategory).toBe('fast');
      expect(metrics.loadTimeMs).toBe(30);
      expect(metrics.cacheHit).toBe(true);
      expect(metrics.fallbackUsed).toBe(false);
      expect(metrics.migrationPerformed).toBe(false);
    });

    it('should categorize medium load times', () => {
      const mockResult = {
        success: true,
        loadingTime: 100,
        fromCache: true,
        fallbackUsed: false,
        errors: [],
        warnings: []
      };

      const metrics = service.getPerformanceMetrics(mockResult);

      expect(metrics.loadTimeCategory).toBe('medium');
      expect(metrics.loadTimeMs).toBe(100);
    });

    it('should categorize slow load times', () => {
      const mockResult = {
        success: true,
        loadingTime: 250,
        fromCache: true,
        fallbackUsed: false,
        errors: [],
        warnings: []
      };

      const metrics = service.getPerformanceMetrics(mockResult);

      expect(metrics.loadTimeCategory).toBe('slow');
      expect(metrics.loadTimeMs).toBe(250);
    });

    it('should detect migration performed', () => {
      const mockResult = {
        success: true,
        loadingTime: 50,
        fromCache: true,
        fallbackUsed: false,
        errors: [],
        warnings: [],
        migration: { migrated: true } as any
      };

      const metrics = service.getPerformanceMetrics(mockResult);

      expect(metrics.migrationPerformed).toBe(true);
    });
  });
});