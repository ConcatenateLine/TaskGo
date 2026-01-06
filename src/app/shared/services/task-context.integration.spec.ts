import { TestBed } from '@angular/core/testing';
import { LocalStorageService } from './local-storage.service';
import { TaskService } from './task.service';
import { CryptoService } from './crypto.service';
import { ValidationService } from './validation.service';
import { AuthService } from './auth.service';
import { SecurityService } from './security.service';
import { AutoSaveService } from './auto-save.service';
import { Task } from '../models/task.model';

describe('TaskContext Integration Tests', () => {
  let taskService: TaskService;
  let localStorageService: LocalStorageService;
  let mockLocalStorage: Storage;

  const mockTask: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> = {
    title: 'Test Task for Context',
    description: 'Testing task context integration',
    priority: 'medium',
    status: 'TODO',
    project: 'Work'
  };

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {
      length: 0,
      clear: vi.fn(),
      getItem: vi.fn(() => null),
      key: vi.fn(() => null),
      removeItem: vi.fn(),
      setItem: vi.fn()
    } as any;

    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    });

    TestBed.configureTestingModule({
      providers: [
        TaskService,
        LocalStorageService,
        CryptoService,
        ValidationService,
        AuthService,
        SecurityService,
        AutoSaveService
      ]
    });

    taskService = TestBed.inject(TaskService);
    localStorageService = TestBed.inject(LocalStorageService);
  });

  it('should include task title in storage metadata when creating task', async () => {
    // Mock localStorage to capture the stored data
    let storedData: any = null;
    (mockLocalStorage.setItem as any).mockImplementation((key: string, value: string) => {
      storedData = JSON.parse(value);
    });

    // Create a task
    const createdTask = taskService.createTask(mockTask);

    // Wait a bit for async operations
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify the storage metadata includes the task title as context
    expect(storedData).toBeDefined();
    expect(storedData.metadata.taskContext).toBe(createdTask.title);
    expect(storedData.metadata.operation).toBe('create');
  });

  it('should include task title in storage metadata when updating task', async () => {
    // First create a task
    const createdTask = taskService.createTask(mockTask);
    
    // Mock localStorage to capture the stored data
    let storedData: any = null;
    (mockLocalStorage.setItem as any).mockImplementation((key: string, value: string) => {
      storedData = JSON.parse(value);
    });

    // Update the task
    const updatedTask = taskService.updateTask(createdTask.id, {
      title: 'Updated Test Task'
    });

    // Wait a bit for async operations
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify the storage metadata includes the updated task title as context
    expect(storedData).toBeDefined();
    expect(storedData.metadata.taskContext).toBe('Updated Test Task');
    expect(storedData.metadata.operation).toBe('update');
  });

  it('should include deletion context in storage metadata when deleting task', async () => {
    // First create a task
    const createdTask = taskService.createTask(mockTask);
    
    // Mock localStorage to capture the stored data
    let storedData: any = null;
    (mockLocalStorage.setItem as any).mockImplementation((key: string, value: string) => {
      storedData = JSON.parse(value);
    });

    // Delete the task
    const deleted = taskService.deleteTask(createdTask.id);

    // Wait a bit for async operations
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify the storage metadata includes deletion context
    expect(storedData).toBeDefined();
    expect(storedData.metadata.taskContext).toBe(`Deleted: ${createdTask.title}`);
    expect(storedData.metadata.operation).toBe('delete');
  });

  it('should include status change context in storage metadata when changing task status', async () => {
    // First create a task
    const createdTask = taskService.createTask(mockTask);
    
    // Mock localStorage to capture the stored data
    let storedData: any = null;
    (mockLocalStorage.setItem as any).mockImplementation((key: string, value: string) => {
      storedData = JSON.parse(value);
    });

    // Change task status
    const updatedTask = taskService.changeStatus(createdTask.id, 'IN_PROGRESS');

    // Wait a bit for async operations
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify the storage metadata includes status change context
    expect(storedData).toBeDefined();
    expect(storedData.metadata.taskContext).toBe(
      `Status change: ${createdTask.title} from TODO to IN_PROGRESS`
    );
    expect(storedData.metadata.operation).toBe('update');
  });

  it('should preserve task context in backup snapshots', async () => {
    // Mock localStorage to capture backup data
    let backupData: any = null;
    (mockLocalStorage.setItem as any).mockImplementation((key: string, value: string) => {
      if (key.includes('backup_')) {
        backupData = JSON.parse(value);
      }
    });

    // Create a task to trigger backup
    const createdTask = taskService.createTask(mockTask);

    // Wait a bit for backup operations
    await new Promise(resolve => setTimeout(resolve, 200));

    // Verify the backup metadata includes the task context
    expect(backupData).toBeDefined();
    expect(backupData.metadata.taskContext).toBe(createdTask.title);
    expect(backupData.operation).toBe('create');
  });
});
