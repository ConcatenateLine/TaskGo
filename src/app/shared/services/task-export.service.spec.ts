import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import {
  TaskExportService,
  TaskExportResult,
  TaskExportMetadata,
} from './task-export.service';
import { LocalStorageService, StorageError, StorageResult } from './local-storage.service';
import { CryptoService } from './crypto.service';
import { Task } from '../models/task.model';


describe('TaskExportService', () => {
  let service: TaskExportService;
  let localStorageServiceSpy: any;
  let cryptoServiceSpy: any;
  let downloadSpy: any;

  // Mock tasks for testing
  const mockTasks: Task[] = [
    {
      id: '1',
      title: 'Test Task 1',
      description: 'Description with special characters: <>"\'&',
      priority: 'high',
      status: 'TODO',
      project: 'Work',
      createdAt: new Date('2024-01-15T10:30:00.000Z'),
      updatedAt: new Date('2024-01-15T10:30:00.000Z'),
    },
    {
      id: '2',
      title: 'Test Task 2',
      priority: 'medium',
      status: 'IN_PROGRESS',
      project: 'Personal',
      createdAt: new Date('2024-01-16T14:20:00.000Z'),
      updatedAt: new Date('2024-01-16T14:20:00.000Z'),
    },
  ];

  const emptyTasks: Task[] = [];

  const largeTaskDataset: Task[] = Array.from({ length: 1000 }, (_, i) => ({
    id: `task-${i}`,
    title: `Task ${i}`,
    description: `Description for task ${i}`,
    priority: ['low', 'medium', 'high'][i % 3] as Task['priority'],
    status: ['TODO', 'IN_PROGRESS', 'DONE'][i % 3] as Task['status'],
    project: ['Personal', 'Work', 'Study', 'General'][i % 4] as Task['project'],
    createdAt: new Date(`2024-01-${String((i % 30) + 1).padStart(2, '0')}`),
    updatedAt: new Date(`2024-01-${String((i % 30) + 1).padStart(2, '0')}`),
  }));

  beforeEach(async () => {
    localStorageServiceSpy = {
      getItem: vi.fn(),
    };

    cryptoServiceSpy = {
      decrypt: vi.fn((encryptedData: string) => {
        // Simulate decryption - return the mock tasks if encrypted data matches expected pattern
        if (encryptedData === 'encrypted-data') {
          return mockTasks;
        }
        if (encryptedData === 'encrypted-empty') {
          return emptyTasks;
        }
        if (encryptedData === 'encrypted-large') {
          return largeTaskDataset;
        }
        // Handle single task case for validation tests
        if (encryptedData === 'encrypted-single') {
          return [{
            id: 'test-id',
            title: 'Test Title',
            description: 'Test Description',
            priority: 'high',
            status: 'TODO',
            project: 'Work',
            createdAt: new Date(),
            updatedAt: new Date(),
          }];
        }
        // Handle task with dates case
        if (encryptedData === 'encrypted-dates') {
          return [{
            id: '1',
            title: 'Task with dates',
            priority: 'medium',
            status: 'TODO',
            project: 'General',
            createdAt: new Date('2024-01-15T10:30:00.000Z'),
            updatedAt: new Date('2024-01-15T10:30:00.000Z'),
          }];
        }
        // Handle cyclic reference case
        if (encryptedData === 'encrypted-cyclic') {
          return [{
            id: '1',
            title: 'Task 1',
            description: 'Refers to Task 2',
            priority: 'medium',
            status: 'TODO',
            project: 'General',
            createdAt: new Date(),
            updatedAt: new Date(),
          }, {
            id: '2',
            title: 'Task 2',
            description: 'Refers to Task 1',
            priority: 'medium',
            status: 'TODO',
            project: 'General',
            createdAt: new Date(),
            updatedAt: new Date(),
          }];
        }
        // Default to empty array for any other encrypted data
        return [];
      }),
    };

    // Mock download functionality
    downloadSpy = vi.fn();
    global.URL.createObjectURL = vi.fn(() => 'mock-url');
    global.URL.revokeObjectURL = vi.fn();
    
    // Create a proper Blob constructor mock
    const mockBlob = vi.fn(function(this: any, content: any, options: any) {
      this.content = content;
      this.options = options;
      this.size = JSON.stringify(content).length;
    });
    global.Blob = mockBlob as any;
    global.document = {
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
      },
      createElement: vi.fn((tagName: string) => {
        if (tagName === 'a') {
          return {
            href: '',
            download: '',
            click: downloadSpy,
          };
        }
        return {};
      }),
    } as any;

    await TestBed.configureTestingModule({
      providers: [
        TaskExportService,
        { provide: LocalStorageService, useValue: localStorageServiceSpy },
        { provide: CryptoService, useValue: cryptoServiceSpy },
      ],
    }).compileComponents();

    service = TestBed.inject(TaskExportService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should have default export filename prefix', () => {
      expect(service['FILENAME_PREFIX']).toBe('taskgo_backup_');
    });

    it('should have default file extension', () => {
      expect(service['FILE_EXTENSION']).toBe('.json');
    });
  });

  describe('Export Tasks - Happy Path', () => {
    it('should export tasks successfully', async () => {
      const mockStorageResult: StorageResult<string> = {
        success: true,
        data: 'encrypted-data',
      };
      localStorageServiceSpy.getItem.mockResolvedValue(mockStorageResult);

      const result = await service.exportTasks();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
      expect(downloadSpy).toHaveBeenCalled();
    });
  });

  describe('Export Tasks - Error Scenarios', () => {
    it('should handle localStorage service error', async () => {
      const mockError: StorageError = new Error('Storage disabled') as StorageError;
      mockError.name = 'StorageDisabledError';
      mockError.isStorageDisabled = true;
      
      const mockStorageResult: StorageResult<string> = {
        success: false,
        error: mockError,
      };
      localStorageServiceSpy.getItem.mockResolvedValue(mockStorageResult);

      const result = await service.exportTasks();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.name).toBe('StorageDisabledError');
    });

    it('should handle quota exceeded error', async () => {
      const mockError: StorageError = new Error('Quota exceeded') as StorageError;
      mockError.name = 'QuotaExceededError';
      mockError.isQuotaExceeded = true;
      
      const mockStorageResult: StorageResult<string> = {
        success: false,
        error: mockError,
      };
      localStorageServiceSpy.getItem.mockResolvedValue(mockStorageResult);

      const result = await service.exportTasks();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.name).toBe('QuotaExceededError');
    });

    it('should handle validation error for invalid task data', async () => {
      const mockStorageResult: StorageResult<string> = {
        success: true,
        data: 'encrypted-data',
      };
      localStorageServiceSpy.getItem.mockResolvedValue(mockStorageResult);
      cryptoServiceSpy.decrypt.mockReturnValue([{ invalid: 'task' }]);

      const result = await service.exportTasks();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.name).toBe('ValidationError');
    });

    it('should handle security error', async () => {
      const mockError: StorageError = new Error('Access denied') as StorageError;
      mockError.name = 'SecurityError';
      mockError.isSecurityError = true;
      
      const mockStorageResult: StorageResult<string> = {
        success: false,
        error: mockError,
      };
      localStorageServiceSpy.getItem.mockResolvedValue(mockStorageResult);

      const result = await service.exportTasks();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.name).toBe('SecurityError');
    });

  });

  describe('Filename Generation', () => {
    it('should generate correct filename for current date', () => {
      vi.spyOn(Date.prototype, 'toISOString').mockReturnValue('2024-12-25T12:00:00.000Z');

      const filename = service['generateFilename']();

      expect(filename).toBe('taskgo_backup_2024-12-25.json');
    });

    it('should not include time component in filename', () => {
      vi.spyOn(Date.prototype, 'toISOString').mockReturnValue('2024-06-15T14:30:45.123Z');

      const filename = service['generateFilename']();

      expect(filename).not.toContain('14:30');
      expect(filename).not.toContain('T');
      expect(filename).toBe('taskgo_backup_2024-06-15.json');
    });
  });
});
