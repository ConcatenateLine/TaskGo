import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { LocalStorageService } from './local-storage.service';
import { Task } from '../models/task.model';
import type { StorageResult, StorageError } from './local-storage.service';

describe('LocalStorageService - Core Functionality', () => {
  let service: LocalStorageService;
  let mockLocalStorage: Storage;
  let mockSessionStorage: Storage;

  const mockTask: Task = {
    id: 'test-task-1',
    title: 'Test Task',
    description: 'Test Description',
    priority: 'medium' as const,
    status: 'TODO' as const,
    project: 'Work' as const,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  };

  beforeEach(() => {
    // Create mock storage objects with proper Vitest typing
    mockLocalStorage = {
      length: 0,
      clear: vi.fn(),
      getItem: vi.fn(() => null),
      key: vi.fn(() => null),
      removeItem: vi.fn(),
      setItem: vi.fn()
    } as any;

    mockSessionStorage = {
      length: 0,
      clear: vi.fn(),
      getItem: vi.fn(() => null),
      key: vi.fn(() => null),
      removeItem: vi.fn(),
      setItem: vi.fn()
    } as any;

    // Mock global storage objects before service creation
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    });

    Object.defineProperty(window, 'sessionStorage', {
      value: mockSessionStorage,
      writable: true
    });

    // Configure mocks for successful availability checks
    (mockLocalStorage.setItem as any).mockReturnValue(undefined);
    (mockSessionStorage.setItem as any).mockReturnValue(undefined);

    TestBed.configureTestingModule({
      providers: [LocalStorageService]
    });

    service = TestBed.inject(LocalStorageService);
  });

  it('should be created and detect storage availability', () => {
    expect(service).toBeTruthy();
    
    const status = service.getStorageStatus();
    expect(status.localStorage).toBe(true);
    expect(status.sessionStorage).toBe(true);
    expect(status.fallbackActive).toBe(false);
  });

  it('should validate task objects correctly', async () => {
    const invalidTask = { ...mockTask, priority: 'invalid' as any };
    
    const result = await service.setItem('current_task', invalidTask);
    expect(result.success).toBe(false);
    expect(result.error?.name).toBe('ValidationError');
  });

  it('should handle data removal', async () => {
    (mockLocalStorage.removeItem as any).mockReturnValue(undefined);

    const result = await service.removeItem('test_key');
    expect(result.success).toBe(true);
    expect(result.data).toBe(true);
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('taskgo_test_key');
  });

  it('should provide storage status information', () => {
    const status = service.getStorageStatus();
    expect(status).toBeDefined();
    expect(typeof status.localStorage).toBe('boolean');
    expect(typeof status.sessionStorage).toBe('boolean');
    expect(typeof status.fallbackActive).toBe('boolean');
  });

  it('should handle storage clearing with prefix', async () => {
    // Setup mocks for clear operation
    (mockLocalStorage as any).length = 3;
    (mockLocalStorage.key as any).mockImplementation((index: number) => {
      const keys = ['taskgo_task1', 'taskgo_task2', 'other_key'];
      return keys[index] || null;
    });
    (mockLocalStorage.removeItem as any).mockReturnValue(undefined);

    const result = await service.clear();
    expect(result.success).toBe(true);
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('taskgo_task1');
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('taskgo_task2');
    expect(mockLocalStorage.removeItem).not.toHaveBeenCalledWith('other_key');
  }, 10000);

  it('should handle storage usage calculation', async () => {
    (mockLocalStorage as any).length = 2;
    (mockLocalStorage.key as any).mockImplementation((index: number) => {
      const keys = ['taskgo_task1', 'taskgo_task2'];
      return keys[index] || null;
    });
    (mockLocalStorage.getItem as any).mockImplementation((key: string) => {
      if (key.startsWith('taskgo_')) {
        return 'test-data';
      }
      return null;
    });

    const result = await service.getStorageUsage();
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(typeof result.data!.used).toBe('number');
    expect(typeof result.data!.available).toBe('number');
    expect(typeof result.data!.percentage).toBe('number');
    expect(result.data!.percentage).toBeGreaterThanOrEqual(0);
    expect(result.data!.percentage).toBeLessThanOrEqual(100);
  }, 10000);
});

describe('LocalStorageService - Error Handling', () => {
  let service: LocalStorageService;
  let mockLocalStorage: Storage;
  let mockSessionStorage: Storage;

  const mockTask: Task = {
    id: 'test-task-1',
    title: 'Test Task',
    description: 'Test Description',
    priority: 'medium' as const,
    status: 'TODO' as const,
    project: 'Work' as const,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  };

  beforeEach(() => {
    // Create mock storage objects with proper Vitest typing
    mockLocalStorage = {
      length: 0,
      clear: vi.fn(),
      getItem: vi.fn(() => null),
      key: vi.fn(() => null),
      removeItem: vi.fn(),
      setItem: vi.fn()
    } as any;

    mockSessionStorage = {
      length: 0,
      clear: vi.fn(),
      getItem: vi.fn(() => null),
      key: vi.fn(() => null),
      removeItem: vi.fn(),
      setItem: vi.fn()
    } as any;

    // Mock global storage objects
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    });

    Object.defineProperty(window, 'sessionStorage', {
      value: mockSessionStorage,
      writable: true
    });

    // Configure mocks for availability checks
    (mockLocalStorage.setItem as any).mockReturnValue(undefined);
    (mockSessionStorage.setItem as any).mockReturnValue(undefined);

    TestBed.configureTestingModule({
      providers: [LocalStorageService]
    });

    service = TestBed.inject(LocalStorageService);
  });

  it('should handle localStorage quota exceeded', async () => {
    const quotaError = new Error('Storage quota exceeded');
    quotaError.name = 'QuotaExceededError';
    (mockLocalStorage.setItem as any).mockImplementation(() => { throw quotaError; });
    (mockSessionStorage.setItem as any).mockReturnValue(undefined);

    const result = await service.setItem('test_key', mockTask);
    expect(result.success).toBe(true);
    expect(result.fallbackUsed).toBe(true);
    expect(service.isUsingFallbackStorage()).toBe(true);
  }, 10000);

  it('should handle complete storage unavailability', async () => {
    // Simulate complete storage failure by mocking both storages to throw TypeError
    const storageError = new TypeError('storage is not available');
    
    (mockLocalStorage.setItem as any).mockImplementation(() => { throw storageError; });
    (mockSessionStorage.setItem as any).mockImplementation(() => { throw storageError; });

    const result = await service.setItem('test_key', mockTask);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.name).toBe('StorageDisabledError');
  }, 4000);

  it('should handle corrupted JSON data', async () => {
    (mockLocalStorage.getItem as any).mockReturnValue('invalid json{');

    const result = await service.getItem<Task>('corrupted_key');
    expect(result.success).toBe(false);
    expect(result.error?.name).toBe('SerializationError');
  }, 10000);

  it('should handle isUsingFallbackStorage method', () => {
    expect(typeof service.isUsingFallbackStorage()).toBe('boolean');
  });

  it('should handle fallback storage detection', async () => {
    const quotaError = new Error('Storage quota exceeded');
    quotaError.name = 'QuotaExceededError';
    (mockLocalStorage.setItem as any).mockImplementation(() => { throw quotaError; });
    (mockSessionStorage.setItem as any).mockReturnValue(undefined);

    await service.setItem('test_key', mockTask);
    expect(service.isUsingFallbackStorage()).toBe(true);
    
    const status = service.getStorageStatus();
    expect(status.fallbackActive).toBe(true);
  }, 10000);

  it('should handle null storage values', async () => {
    (mockLocalStorage.getItem as any).mockReturnValue(null);

    const result = await service.getItem<Task>('nonexistent_key');
    expect(result.success).toBe(false); // Service returns false when no data found in any storage
    expect(result.error).toBeUndefined(); // No error created when data simply doesn't exist
  }, 10000);

  it('should handle invalid payload structure', async () => {
    (mockLocalStorage.getItem as any).mockReturnValue(JSON.stringify({ invalid: 'structure' }));

    const result = await service.getItem<Task>('invalid_key');
    expect(result.success).toBe(false);
    expect(result.error?.name).toBe('ValidationError');
  }, 10000);

  it('should handle security errors', async () => {
    const securityError = new Error('Security error accessing storage');
    securityError.name = 'SecurityError';
    (mockLocalStorage.setItem as any).mockImplementation(() => { throw securityError; });
    (mockSessionStorage.setItem as any).mockImplementation(() => { throw securityError; });

    const result = await service.setItem('test_key', mockTask);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.name).toBe('SecurityError');
    expect(result.error?.isSecurityError).toBe(true);
  }, 20000);

  it('should handle quota exceeded errors directly', async () => {
    const quotaError = new Error('Storage quota exceeded');
    quotaError.name = 'QuotaExceededError';
    (mockLocalStorage.setItem as any).mockImplementation(() => { throw quotaError; });
    (mockSessionStorage.setItem as any).mockImplementation(() => { throw quotaError; });

    const result = await service.setItem('test_key', mockTask);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.name).toBe('QuotaExceededError');
    expect(result.error?.isQuotaExceeded).toBe(true);
  }, 20000);
});