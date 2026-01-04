import { Injectable, signal, inject, DestroyRef } from '@angular/core';
import { debounceTime, distinctUntilChanged, filter, from, Subject, switchMap, timer, catchError, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Task } from '../models/task.model';
import { LocalStorageService, StorageResult } from './local-storage.service';
import { AuthService } from './auth.service';

export interface AutoSaveOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  timestamp: number;
  data: Task | string;
  optimisticData?: Task[];
  rollbackData?: Task[];
}

export interface AutoSaveConfig {
  debounceTimeMs: number;
  maxRetries: number;
  retryDelayMs: number;
  enableOptimisticUpdates: boolean;
  enablePerformanceMonitoring: boolean;
}

export interface AutoSaveMetrics {
  totalOperations: number;
  successfulSaves: number;
  failedSaves: number;
  averageSaveTime: number;
  lastSaveTime: number;
  conflictCount: number;
  rollbackCount: number;
}

export interface ConflictResolution {
  strategy: 'client-wins' | 'server-wins' | 'merge';
  resolution: () => Promise<Task[]>;
}

@Injectable({
  providedIn: 'root',
})
export class AutoSaveService {
  private localStorageService = inject(LocalStorageService);
  private authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);

  private readonly DEFAULT_CONFIG: AutoSaveConfig = {
    debounceTimeMs: 500,
    maxRetries: 3,
    retryDelayMs: 1000,
    enableOptimisticUpdates: true,
    enablePerformanceMonitoring: true,
  };

  private config = this.DEFAULT_CONFIG;
  private operationQueue$ = new Subject<AutoSaveOperation>();
  private pendingOperations = new Map<string, AutoSaveOperation>();
  private isProcessing = false;

  private metrics = signal<AutoSaveMetrics>({
    totalOperations: 0,
    successfulSaves: 0,
    failedSaves: 0,
    averageSaveTime: 0,
    lastSaveTime: 0,
    conflictCount: 0,
    rollbackCount: 0,
  });

  private lastKnownState = signal<Task[]>([]);
  private conflictResolutions = new Map<string, ConflictResolution>();

  constructor() {
    this.initializeAutoSave();
    this.loadInitialState();
  }

  private initializeAutoSave(): void {
    this.operationQueue$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        distinctUntilChanged((prev, curr) => this.isSameOperation(prev, curr)),
        debounceTime(this.config.debounceTimeMs),
        filter(() => !this.isProcessing),
        switchMap((operation) => this.processOperation(operation))
      )
      .subscribe({
        next: (result) => this.handleOperationResult(result),
        error: (error) => this.handleOperationError(error),
      });
  }

  private async loadInitialState(): Promise<void> {
    try {
      const result = await this.localStorageService.getItem<Task[]>('tasks');
      if (result.success && result.data) {
        this.lastKnownState.set(result.data);
      }
    } catch (error) {
      console.warn('Failed to load initial state:', error);
    }
  }

  private isSameOperation(op1: AutoSaveOperation, op2: AutoSaveOperation): boolean {
    return op1.type === op2.type && 
           op1.id === op2.id && 
           JSON.stringify(op1.data) === JSON.stringify(op2.data);
  }

  private async processOperation(operation: AutoSaveOperation): Promise<{ operation: AutoSaveOperation; success: boolean; error?: Error }> {
    this.isProcessing = true;
    const startTime = performance.now();

    try {
      let result: StorageResult<Task[]>;

      switch (operation.type) {
        case 'create':
          result = await this.handleCreateOperation(operation);
          break;
        case 'update':
          result = await this.handleUpdateOperation(operation);
          break;
        case 'delete':
          result = await this.handleDeleteOperation(operation);
          break;
        default:
          throw new Error(`Unknown operation type: ${(operation as any).type}`);
      }

      if (result.success) {
        this.updateMetrics(true, performance.now() - startTime);
        this.lastKnownState.set(result.data!);
        
        if (operation.optimisticData) {
          this.validateOptimisticUpdate(operation.optimisticData, result.data!);
        }

        return { operation, success: true };
      } else {
        throw result.error || new Error('Operation failed');
      }
    } catch (error) {
      this.updateMetrics(false, performance.now() - startTime);
      
      if (this.config.enableOptimisticUpdates && operation.rollbackData) {
        await this.performRollback(operation);
      }

      return { operation, success: false, error: error as Error };
    } finally {
      this.isProcessing = false;
    }
  }

  private async handleCreateOperation(operation: AutoSaveOperation): Promise<StorageResult<Task[]>> {
    const newTask = operation.data as Task;
    const currentState = this.lastKnownState();
    
    if (currentState.some(task => task.id === newTask.id)) {
      throw new Error(`Task with ID ${newTask.id} already exists`);
    }

    const updatedState = [...currentState, newTask];
    return await this.saveWithRetry(updatedState);
  }

  private async handleUpdateOperation(operation: AutoSaveOperation): Promise<StorageResult<Task[]>> {
    const updatedTask = operation.data as Task;
    const currentState = this.lastKnownState();
    
    const taskIndex = currentState.findIndex(task => task.id === updatedTask.id);
    if (taskIndex === -1) {
      throw new Error(`Task with ID ${updatedTask.id} not found`);
    }

    const existingTask = currentState[taskIndex];
    
    if (existingTask.updatedAt > updatedTask.updatedAt) {
      this.metrics.update(m => ({ ...m, conflictCount: m.conflictCount + 1 }));
      
      const resolution = this.conflictResolutions.get('update') || {
        strategy: 'client-wins' as const,
        resolution: async () => {
          const newState = [...currentState];
          newState[taskIndex] = updatedTask;
          return newState;
        }
      };
      
      const resolvedState = await resolution.resolution();
      return await this.saveWithRetry(resolvedState);
    }

    // Use optimistic data if available, otherwise use current state with update
    const updatedState = operation.optimisticData || [...currentState];
    const optimisticIndex = updatedState.findIndex(task => task.id === updatedTask.id);
    if (optimisticIndex !== -1) {
      updatedState[optimisticIndex] = updatedTask;
    }
    
    return await this.saveWithRetry(updatedState);
  }

  private async handleDeleteOperation(operation: AutoSaveOperation): Promise<StorageResult<Task[]>> {
    const taskId = operation.data as string;
    
    // Use optimistic data if available, otherwise use current state
    const currentState = operation.optimisticData || this.lastKnownState();
    
    const taskExists = currentState.some(task => task.id === taskId);
    if (!taskExists) {
      throw new Error(`Task with ID ${taskId} not found`);
    }

    const updatedState = currentState.filter(task => task.id !== taskId);
    return await this.saveWithRetry(updatedState);
  }

  private async saveWithRetry(tasks: Task[], attempts: number = 0): Promise<StorageResult<Task[]>> {
    try {
      return await this.localStorageService.setItem('tasks', tasks);
    } catch (error) {
      if (attempts < this.config.maxRetries) {
        await timer(this.config.retryDelayMs * (attempts + 1)).toPromise();
        return this.saveWithRetry(tasks, attempts + 1);
      }
      throw error;
    }
  }

  private validateOptimisticUpdate(optimisticData: Task[], actualData: Task[]): void {
    const optimisticIds = new Set(optimisticData.map(t => t.id));
    const actualIds = new Set(actualData.map(t => t.id));
    
    if (optimisticIds.size !== actualIds.size || 
        ![...optimisticIds].every(id => actualIds.has(id))) {
      this.metrics.update(m => ({ ...m, conflictCount: m.conflictCount + 1 }));
      console.warn('Optimistic update validation failed - data inconsistency detected');
    }
  }

  private async performRollback(operation: AutoSaveOperation): Promise<void> {
    try {
      if (operation.rollbackData) {
        await this.localStorageService.setItem('tasks', operation.rollbackData);
        this.lastKnownState.set(operation.rollbackData);
        this.metrics.update(m => ({ ...m, rollbackCount: m.rollbackCount + 1 }));
        
        this.authService.logSecurityEvent({
          type: 'DATA_ACCESS',
          message: `Auto-save rollback performed for operation ${operation.id}`,
          timestamp: new Date(),
          userId: this.authService.getUserContext()?.userId,
        });
      }
    } catch (error) {
      console.error('Rollback failed:', error);
    }
  }

  private handleOperationResult(result: { operation: AutoSaveOperation; success: boolean }): void {
    this.pendingOperations.delete(result.operation.id);
    
    if (result.success) {
      this.authService.logSecurityEvent({
        type: 'DATA_ACCESS',
        message: `Auto-save operation completed: ${result.operation.type} for ${result.operation.id}`,
        timestamp: new Date(),
        userId: this.authService.getUserContext()?.userId,
      });
    }
  }

  private handleOperationError(error: Error): void {
    console.error('Auto-save operation error:', error);
    
    this.authService.logSecurityEvent({
      type: 'VALIDATION_FAILURE',
      message: `Auto-save operation failed: ${error.message}`,
      timestamp: new Date(),
      userId: this.authService.getUserContext()?.userId,
    });
  }

  private updateMetrics(success: boolean, duration: number): void {
    this.metrics.update(m => {
      const newTotal = m.totalOperations + 1;
      const newSuccessful = success ? m.successfulSaves + 1 : m.successfulSaves;
      const newFailed = success ? m.failedSaves : m.failedSaves + 1;
      const newAverage = ((m.averageSaveTime * m.totalOperations) + duration) / newTotal;

      return {
        totalOperations: newTotal,
        successfulSaves: newSuccessful,
        failedSaves: newFailed,
        averageSaveTime: newAverage,
        lastSaveTime: Date.now(),
        conflictCount: m.conflictCount,
        rollbackCount: m.rollbackCount,
      };
    });
  }

  public queueTaskCreation(task: Task, currentTasks: Task[]): void {
    const operation: AutoSaveOperation = {
      id: `create_${task.id}_${Date.now()}`,
      type: 'create',
      timestamp: Date.now(),
      data: task,
      optimisticData: this.config.enableOptimisticUpdates ? [...currentTasks, task] : undefined,
      rollbackData: this.config.enableOptimisticUpdates ? [...currentTasks] : undefined,
    };

    this.pendingOperations.set(operation.id, operation);
    this.operationQueue$.next(operation);
  }

  public queueTaskUpdate(task: Task, currentTasks: Task[]): void {
    const operation: AutoSaveOperation = {
      id: `update_${task.id}_${Date.now()}`,
      type: 'update',
      timestamp: Date.now(),
      data: task,
      optimisticData: this.config.enableOptimisticUpdates ? currentTasks.map(t => t.id === task.id ? task : t) : undefined,
      rollbackData: this.config.enableOptimisticUpdates ? [...currentTasks] : undefined,
    };

    this.pendingOperations.set(operation.id, operation);
    this.operationQueue$.next(operation);
  }

  public queueTaskDeletion(taskId: string, currentTasks: Task[]): void {
    const operation: AutoSaveOperation = {
      id: `delete_${taskId}_${Date.now()}`,
      type: 'delete',
      timestamp: Date.now(),
      data: taskId,
      optimisticData: this.config.enableOptimisticUpdates ? currentTasks.filter(t => t.id !== taskId) : undefined,
      rollbackData: this.config.enableOptimisticUpdates ? [...currentTasks] : undefined,
    };

    this.pendingOperations.set(operation.id, operation);
    this.operationQueue$.next(operation);
  }

  public forceSync(): Promise<StorageResult<Task[]>> {
    return this.localStorageService.getItem<Task[]>('tasks');
  }

  public setConflictResolution(operationType: string, resolution: ConflictResolution): void {
    this.conflictResolutions.set(operationType, resolution);
  }

  public updateConfig(config: Partial<AutoSaveConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public getMetrics(): AutoSaveMetrics {
    return this.metrics();
  }

  public getPendingOperations(): AutoSaveOperation[] {
    return Array.from(this.pendingOperations.values());
  }

  public isOperationPending(operationId: string): boolean {
    return this.pendingOperations.has(operationId);
  }

  public cancelPendingOperation(operationId: string): boolean {
    return this.pendingOperations.delete(operationId);
  }

  public clearPendingOperations(): void {
    this.pendingOperations.clear();
  }

  public getLastKnownState(): Task[] {
    return this.lastKnownState();
  }

  public resetMetrics(): void {
    this.metrics.set({
      totalOperations: 0,
      successfulSaves: 0,
      failedSaves: 0,
      averageSaveTime: 0,
      lastSaveTime: 0,
      conflictCount: 0,
      rollbackCount: 0,
    });
  }
}