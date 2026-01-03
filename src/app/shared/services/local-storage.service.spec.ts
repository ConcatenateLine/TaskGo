import { TestBed } from '@angular/core/testing';
import { LocalStorageService } from './local-storage.service';
import { Task } from '../models/task.model';

describe('LocalStorageService - Core Functionality', () => {
  let service: LocalStorageService;
  let mockLocalStorage: Storage;
  let mockSessionStorage: Storage;

  const mockTask: Task = {
    id: 'test-task-1',
    title: 'Test Task',
    description: 'Test Description',
    priority: 'medium',
    status: 'TODO',
    project: 'Work',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  };

  beforeEach(() => {
    // Create mock storage objects
    mockLocalStorage = {
      length: 0,
      clear: vi.fn(),
      getItem: vi.fn(),
      key: vi.fn(),
      removeItem: vi.fn(),
      setItem: vi.fn()
    };

    mockSessionStorage = {
      length: 0,
      clear: vi.fn(),
      getItem: vi.fn(),
      key: vi.fn(),
      removeItem: vi.fn(),
      setItem: vi.fn()
    };

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
    mockLocalStorage.setItem.mockReturnValue(undefined);
    mockSessionStorage.setItem.mockReturnValue(undefined);

    TestBed.configureTestingModule({
      providers: [LocalStorageService]
    });

    service = TestBed.inject(LocalStorageService);

    // Reset all mocks after service creation
    vi.clearAllMocks();
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
    mockLocalStorage.removeItem.mockReturnValue(undefined);

    const result = await service.removeItem('test_key');
    expect(result.success).toBe(true);
    expect(result.data).toBe(true);
    expect(mockLocalStorage.removeItem).toHaveBeenCalled();
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
    mockLocalStorage.length = 3;
    mockLocalStorage.key.mockImplementation((index) => {
      const keys = ['taskgo_task1', 'taskgo_task2', 'other_key'];
      return keys[index] || null;
    });
    mockLocalStorage.removeItem.mockReturnValue(undefined);

    const result = await service.clear();
    expect(result.success).toBe(true);
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('taskgo_task1');
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('taskgo_task2');
    expect(mockLocalStorage.removeItem).not.toHaveBeenCalledWith('other_key');
  });

  it('should handle storage usage calculation', async () => {
    mockLocalStorage.length = 2;
    mockLocalStorage.key.mockImplementation((index) => {
      const keys = ['taskgo_task1', 'taskgo_task2'];
      return keys[index] || null;
    });
    mockLocalStorage.getItem.mockReturnValue('test-data');

    const result = await service.getStorageUsage();
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(typeof result.data!.used).toBe('number');
    expect(typeof result.data!.available).toBe('number');
    expect(typeof result.data!.percentage).toBe('number');
    expect(result.data!.percentage).toBeGreaterThanOrEqual(0);
    expect(result.data!.percentage).toBeLessThanOrEqual(100);
  });
});

describe('LocalStorageService - Error Handling', () => {
  let service: LocalStorageService;
  let mockLocalStorage: Storage;
  let mockSessionStorage: Storage;

  const mockTask: Task = {
    id: 'test-task-1',
    title: 'Test Task',
    priority: 'medium',
    status: 'TODO',
    project: 'Work',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  };

  beforeEach(() => {
    // Create mock storage objects
    mockLocalStorage = {
      length: 0,
      clear: vi.fn(),
      getItem: vi.fn(),
      key: vi.fn(),
      removeItem: vi.fn(),
      setItem: vi.fn()
    };

    mockSessionStorage = {
      length: 0,
      clear: vi.fn(),
      getItem: vi.fn(),
      key: vi.fn(),
      removeItem: vi.fn(),
      setItem: vi.fn()
    };

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
    mockLocalStorage.setItem.mockReturnValue(undefined);
    mockSessionStorage.setItem.mockReturnValue(undefined);

    TestBed.configureTestingModule({
      providers: [LocalStorageService]
    });

    service = TestBed.inject(LocalStorageService);
    vi.clearAllMocks();
  });

  it('should handle localStorage quota exceeded', async () => {
    const quotaError = new Error('Storage quota exceeded');
    quotaError.name = 'QuotaExceededError';
    mockLocalStorage.setItem.mockImplementation(() => { throw quotaError; });
    mockSessionStorage.setItem.mockReturnValue(undefined);

    const result = await service.setItem('test_key', mockTask);
    expect(result.success).toBe(true);
    expect(result.fallbackUsed).toBe(true);
  });

  it('should handle complete storage unavailability', async () => {
    const storageError = new Error('Storage not available');
    storageError.name = 'TypeError';
    mockLocalStorage.setItem.mockImplementation(() => { throw storageError; });
    mockSessionStorage.setItem.mockImplementation(() => { throw storageError; });

    const result = await service.setItem('test_key', mockTask);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.name).toBe('StorageDisabledError');
  });

  it('should handle corrupted JSON data', async () => {
    mockLocalStorage.getItem.mockReturnValue('invalid json{');

    const result = await service.getItem<Task>('corrupted_key');
    expect(result.success).toBe(false);
    expect(result.error?.name).toBe('SerializationError');
  });

  it('should handle null storage values', async () => {
    mockLocalStorage.getItem.mockReturnValue(null);

    const result = await service.getItem<Task>('nonexistent_key');
    expect(result.success).toBe(true);
    expect(result.data).toBeNull();
  });

  it('should handle invalid payload structure', async () => {
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify({ invalid: 'structure' }));

    const result = await service.getItem<Task>('invalid_key');
    expect(result.success).toBe(false);
    expect(result.error?.name).toBe('ValidationError');
  });
});