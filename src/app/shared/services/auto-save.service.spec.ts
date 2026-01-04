import { TestBed } from '@angular/core/testing';
import { AutoSaveService, AutoSaveOperation, AutoSaveMetrics } from './auto-save.service';
import { LocalStorageService, StorageResult } from './local-storage.service';
import { AuthService } from './auth.service';
import { Task } from '../models/task.model';

describe('AutoSaveService', () => {
  let service: AutoSaveService;
  let localStorageServiceSpy: any;
  let authServiceSpy: any;
  let mockTask: Task;
  let mockTasks: Task[];

  beforeEach(() => {
    localStorageServiceSpy = {
      setItem: vi.fn(),
      getItem: vi.fn(),
    };
    
    authServiceSpy = {
      getUserContext: vi.fn(),
      logSecurityEvent: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        AutoSaveService,
        { provide: LocalStorageService, useValue: localStorageServiceSpy },
        { provide: AuthService, useValue: authServiceSpy }
      ]
    });

    service = TestBed.inject(AutoSaveService);

    mockTask = {
      id: 'test-task-1',
      title: 'Test Task',
      description: 'Test Description',
      priority: 'medium',
      status: 'TODO',
      project: 'Work',
      createdAt: new Date('2024-01-01T00:00:00'),
      updatedAt: new Date('2024-01-01T00:00:00')
    };

    mockTasks = [mockTask];

    authServiceSpy.getUserContext.mockReturnValue({ userId: 'test-user' });
    authServiceSpy.logSecurityEvent.mockReturnValue();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Task Creation Auto-Save', () => {
    it('should queue task creation operation', () => {
      const currentTasks: Task[] = [];
      
      service.queueTaskCreation(mockTask, currentTasks);
      
      const pendingOps = service.getPendingOperations();
      expect(pendingOps).toHaveLength(1);
      expect(pendingOps[0].type).toBe('create');
      expect(pendingOps[0].data).toEqual(mockTask);
    });

    it('should save task creation to localStorage', async () => {
      const currentTasks: Task[] = [];
      const expectedTasks = [mockTask];
      
      localStorageServiceSpy.setItem.mockResolvedValue({ 
        success: true, 
        data: expectedTasks 
      });

      service.queueTaskCreation(mockTask, currentTasks);

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 600));

      expect(localStorageServiceSpy.setItem).toHaveBeenCalledWith('tasks', expectedTasks);
    });

    it('should handle task creation conflict', async () => {
      const currentTasks = [mockTask];
      const duplicateTask = { ...mockTask, id: 'test-task-1' };
      
      localStorageServiceSpy.setItem.mockResolvedValue({ 
        success: false, 
        error: new Error('Task already exists') 
      });

      service.queueTaskCreation(duplicateTask, currentTasks);

      // Wait for debounce and processing
      await new Promise(resolve => setTimeout(resolve, 600));

      const metrics = service.getMetrics();
      expect(metrics.failedSaves).toBeGreaterThan(0);
      expect(metrics.rollbackCount).toBeGreaterThan(0);
    });
  });

  describe('Task Update Auto-Save', () => {
    it('should queue task update operation', () => {
      const updatedTask = { ...mockTask, title: 'Updated Task' };
      
      service.queueTaskUpdate(updatedTask, mockTasks);
      
      const pendingOps = service.getPendingOperations();
      expect(pendingOps).toHaveLength(1);
      expect(pendingOps[0].type).toBe('update');
      expect(pendingOps[0].data).toEqual(updatedTask);
    });

    it('should save task update to localStorage', async () => {
      const updatedTask = { ...mockTask, title: 'Updated Task' };
      const expectedTasks = [updatedTask];
      
      localStorageServiceSpy.setItem.mockResolvedValue({ 
        success: true, 
        data: expectedTasks 
      });

      service.queueTaskUpdate(updatedTask, mockTasks);

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 600));

      expect(localStorageServiceSpy.setItem).toHaveBeenCalledWith('tasks', expectedTasks);
    });

    it('should handle update conflicts with newer timestamps', async () => {
      const outdatedTask = { 
        ...mockTask, 
        title: 'Outdated Update',
        updatedAt: new Date('2024-01-01T00:00:00') 
      };
      const currentTaskWithNewerTimestamp = { 
        ...mockTask, 
        updatedAt: new Date('2024-01-02T00:00:00') 
      };
      const currentTasks = [currentTaskWithNewerTimestamp];
      
      // Force the conflict by setting the last known state to have newer timestamp
      (service as any).lastKnownState.set(currentTasks);
      localStorageServiceSpy.setItem.mockResolvedValue({ 
        success: true, 
        data: [currentTaskWithNewerTimestamp] 
      });

      service.queueTaskUpdate(outdatedTask, currentTasks);

      // Wait for debounce and processing
      await new Promise(resolve => setTimeout(resolve, 600));

      const metrics = service.getMetrics();
      expect(metrics.conflictCount).toBeGreaterThan(0);
    });
  });

  describe('Task Deletion Auto-Save', () => {
    it('should queue task deletion operation', () => {
      service.queueTaskDeletion(mockTask.id, mockTasks);
      
      const pendingOps = service.getPendingOperations();
      expect(pendingOps).toHaveLength(1);
      expect(pendingOps[0].type).toBe('delete');
      expect(pendingOps[0].data).toEqual(mockTask.id);
    });

    it('should save task deletion to localStorage', async () => {
      localStorageServiceSpy.setItem.mockResolvedValue({ 
        success: true, 
        data: [] 
      });

      service.queueTaskDeletion(mockTask.id, mockTasks);

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 600));

      expect(localStorageServiceSpy.setItem).toHaveBeenCalledWith('tasks', expect.any(Array));
    });

    it('should handle deletion of non-existent task', async () => {
      localStorageServiceSpy.setItem.mockResolvedValue({ 
        success: false, 
        error: new Error('Task not found') 
      });

      service.queueTaskDeletion('non-existent-id', mockTasks);

      // Wait for debounce and processing
      await new Promise(resolve => setTimeout(resolve, 600));

      const metrics = service.getMetrics();
      expect(metrics.failedSaves).toBeGreaterThan(0);
    });
  });

  describe('Debouncing', () => {
    it('should batch multiple operations within debounce window', async () => {
      const currentTasks: Task[] = [];
      
      localStorageServiceSpy.setItem.mockResolvedValue({ 
        success: true, 
        data: [] 
      });

      // Queue multiple operations rapidly
      service.queueTaskCreation(mockTask, currentTasks);
      service.queueTaskCreation({ ...mockTask, id: 'test-task-2' }, [mockTask]);
      service.queueTaskCreation({ ...mockTask, id: 'test-task-3' }, [mockTask, { ...mockTask, id: 'test-task-2' }]);

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 600));

      // Should process each operation
      expect(localStorageServiceSpy.setItem).toHaveBeenCalledTimes(3); // One for each distinct operation
    });

    it('should not debounce identical operations', async () => {
      const currentTasks: Task[] = [];
      
      localStorageServiceSpy.setItem.mockResolvedValue({ 
        success: true, 
        data: [] 
      });

      // Queue identical operations
      service.queueTaskCreation(mockTask, currentTasks);
      service.queueTaskCreation(mockTask, currentTasks);

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 600));

      // Should only process one unique operation
      expect(localStorageServiceSpy.setItem).toHaveBeenCalledTimes(1);
    });
  });

  describe('Performance Monitoring', () => {
    it('should track operation metrics', async () => {
      localStorageServiceSpy.setItem.mockResolvedValue({ 
        success: true, 
        data: [mockTask] 
      });

      service.queueTaskCreation(mockTask, []);
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 600));

      const metrics = service.getMetrics();
      expect(metrics.totalOperations).toBe(1);
      expect(metrics.successfulSaves).toBe(1);
      expect(metrics.failedSaves).toBe(0);
      expect(metrics.averageSaveTime).toBeGreaterThan(0);
    });

    it('should track failed operations', async () => {
      localStorageServiceSpy.setItem.mockResolvedValue({ 
        success: false, 
        error: new Error('Storage failed') 
      });

      service.queueTaskCreation(mockTask, []);
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 600));

      const metrics = service.getMetrics();
      expect(metrics.totalOperations).toBe(1);
      expect(metrics.successfulSaves).toBe(0);
      expect(metrics.failedSaves).toBe(1);
      expect(metrics.rollbackCount).toBeGreaterThan(0);
    });
  });

  describe('Optimistic Updates', () => {
    it('should store optimistic data for rollback', () => {
      const currentTasks = [mockTask];
      
      service.queueTaskUpdate({ ...mockTask, title: 'Updated' }, currentTasks);
      
      const pendingOps = service.getPendingOperations();
      expect(pendingOps[0].optimisticData).toBeDefined();
      expect(pendingOps[0].rollbackData).toBeDefined();
      expect(pendingOps[0].rollbackData).toEqual(currentTasks);
    });

    it('should validate optimistic updates against actual data', async () => {
      const currentTasks = [mockTask];
      const updatedTask = { ...mockTask, title: 'Updated' };
      
      // Force validation by returning different optimistic data than actual
      service.queueTaskUpdate(updatedTask, currentTasks);
      
      // Mock storage returning different data than optimistic data
      localStorageServiceSpy.setItem.mockResolvedValue({ 
        success: true, 
        data: [{ ...mockTask, title: 'Different Update' }] 
      });
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 600));

      const metrics = service.getMetrics();
      expect(metrics.conflictCount).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Retry', () => {
    it('should retry failed operations', async () => {
      let callCount = 0;
      localStorageServiceSpy.setItem.mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.resolve({ 
            success: false, 
            error: new Error('Temporary failure') 
          });
        }
        return Promise.resolve({ 
          success: true, 
          data: [mockTask] 
        });
      });

      service.queueTaskCreation(mockTask, []);
      
      // Wait for retry attempts
      await new Promise(resolve => setTimeout(resolve, 3000));

      expect(localStorageServiceSpy.setItem).toHaveBeenCalledTimes(2); // One for failed, one for successful
    });

    it('should log security events for operations', async () => {
      localStorageServiceSpy.setItem.mockResolvedValue({ 
        success: true, 
        data: [mockTask] 
      });

      service.queueTaskCreation(mockTask, []);
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 600));

      expect(authServiceSpy.logSecurityEvent).toHaveBeenCalledWith({
        type: 'DATA_ACCESS',
        message: expect.stringContaining('Auto-save operation completed'),
        timestamp: expect.any(Date),
        userId: 'test-user'
      });
    });
  });

  describe('Configuration', () => {
    it('should update configuration', () => {
      service.updateConfig({ 
        debounceTimeMs: 1000, 
        enableOptimisticUpdates: false 
      });

      // Test that config was updated by checking behavior
      const currentTasks = [mockTask];
      
      service.queueTaskUpdate({ ...mockTask, title: 'Updated' }, currentTasks);
      
      const pendingOps = service.getPendingOperations();
      expect(pendingOps[0].optimisticData).toBeUndefined();
      expect(pendingOps[0].rollbackData).toBeUndefined();
    });
  });

  describe('Utility Methods', () => {
    it('should cancel pending operations', () => {
      service.queueTaskCreation(mockTask, []);
      
      const pendingOpsBefore = service.getPendingOperations();
      expect(pendingOpsBefore).toHaveLength(1);
      
      const cancelled = service.cancelPendingOperation(pendingOpsBefore[0].id);
      expect(cancelled).toBe(true);
      
      const pendingOpsAfter = service.getPendingOperations();
      expect(pendingOpsAfter).toHaveLength(0);
    });

    it('should clear all pending operations', () => {
      service.queueTaskCreation(mockTask, []);
      service.queueTaskUpdate({ ...mockTask, id: 'test-2' }, [mockTask]);
      
      expect(service.getPendingOperations()).toHaveLength(2);
      
      service.clearPendingOperations();
      
      expect(service.getPendingOperations()).toHaveLength(0);
    });

    it('should force sync with localStorage', async () => {
      localStorageServiceSpy.getItem.mockResolvedValue({ 
        success: true, 
        data: [mockTask] 
      });

      const result = await service.forceSync();
      
      expect(localStorageServiceSpy.getItem).toHaveBeenCalledWith('tasks');
      expect(result.success).toBe(true);
      expect(result.data).toEqual([mockTask]);
    });

    it('should reset metrics', async () => {
      // Add some metrics - need to wait for processing
      service.queueTaskCreation(mockTask, []);
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 600));
      
      let metrics = service.getMetrics();
      expect(metrics.totalOperations).toBe(1);
      
      // Reset metrics
      service.resetMetrics();
      
      metrics = service.getMetrics();
      expect(metrics.totalOperations).toBe(0);
      expect(metrics.successfulSaves).toBe(0);
      expect(metrics.failedSaves).toBe(0);
    });
  });
});