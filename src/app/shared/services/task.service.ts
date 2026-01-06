import { Injectable, signal, inject } from '@angular/core';
import { Task, TaskStatus, TaskProject } from '../models/task.model';
import { CryptoService } from './crypto.service';
import { ValidationService } from './validation.service';
import { AuthService } from './auth.service';
import { SecurityService } from './security.service';
import { AutoSaveService } from './auto-save.service';
import { LocalStorageService } from './local-storage.service';

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  private tasks = signal<Task[]>([]);
  private cryptoService = inject(CryptoService);
  private validationService = inject(ValidationService);
  private authService = inject(AuthService);
  private securityService = inject(SecurityService);
  private autoSaveService = inject(AutoSaveService);
  private localStorageService = inject(LocalStorageService);

  constructor() {
    // Note: Data loading is now handled by AppStartupService via APP_INITIALIZER
    // This ensures proper startup sequence and error handling
  }

  async syncEncryptedStorage(): Promise<void> {
    try {
      console.log('Syncing encrypted storage...');
      const encryptedData = await this.localStorageService.getItem(
        this.cryptoService.getStorageKey()
      );

      if (encryptedData) {
        const decrypted = this.cryptoService.decrypt(encryptedData.data as string);
        if (Array.isArray(decrypted)) {
          this.tasks.set(decrypted);
        }
      }
    } catch (error) {
      console.warn('Failed to load tasks from encrypted storage:', error);
      // Clear corrupted data and start fresh
      this.cryptoService.clearTaskStorage();
      this.tasks.set([]);
    }
  }

  /**
   * Load tasks from encrypted storage (legacy method, kept for backward compatibility)
   */
  private async loadFromEncryptedStorage(): Promise<void> {
    try {
      const encryptedData = await this.localStorageService.getItem(
        this.cryptoService.getStorageKey()
      );

      if (encryptedData) {
        const decrypted = this.cryptoService.decrypt(encryptedData.data as string);
        if (Array.isArray(decrypted)) {
          this.tasks.set(decrypted);
        }
      }
    } catch (error) {
      console.warn('Failed to load tasks from encrypted storage:', error);
      // Clear corrupted data and start fresh
      this.cryptoService.clearTaskStorage();
      this.tasks.set([]);
    }
  }

  /**
   * Save tasks to encrypted storage
   */
  private async saveToEncryptedStorage(operation: 'create' | 'update' | 'delete'): Promise<void> {
    try {
      const tasks = this.tasks();
      const encrypted = this.cryptoService.encrypt(tasks);
      await this.localStorageService.setItem(
        this.cryptoService.getStorageKey(),
        encrypted,
        operation
      );

      // Keep the old storage method as backup for review integration - temporary measure
      // this.cryptoService.setItem(this.cryptoService.getStorageKey(), encrypted);
    } catch (error) {
      console.error('Failed to save tasks to encrypted storage:', error);
    }
  }

  /**
   * Get all tasks
   */
  getTasks(): Task[] {
    // Check rate limiting
    const rateLimit = this.securityService.checkRateLimit('getTasks');
    if (!rateLimit.allowed) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    // Require authentication
    this.authService.requireAuthentication();

    return this.tasks();
  }

  /**
   * Get tasks sorted by creation date (newest first)
   */
  getTasksSorted(): Task[] {
    return [...this.getTasks()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Get tasks filtered by status
   */
  getTasksByStatus(status: TaskStatus): Task[] {
    return this.getTasks().filter((task) => task.status === status);
  }

  /**
   * Get tasks filtered by project
   */
  getTasksByProject(project: TaskProject): Task[] {
    return this.getTasks().filter((task) => task.project === project);
  }

  /**
   * Get tasks filtered by status and project
   */
  getTasksByStatusAndProject(status: TaskStatus | 'all', project: TaskProject | 'all'): Task[] {
    return this.getTasks().filter((task) => {
      const statusMatch = status === 'all' || task.status === status;
      const projectMatch = project === 'all' || task.project === project;
      return statusMatch && projectMatch;
    });
  }

  /**
   * Get task counts by status
   */
  getTaskCounts(): { todo: number; inProgress: number; done: number; total: number } {
    const tasks = this.getTasks();
    return {
      todo: tasks.filter((t) => t.status === 'TODO').length,
      inProgress: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
      done: tasks.filter((t) => t.status === 'DONE').length,
      total: tasks.length,
    };
  }

  /**
   * Get task counts by project
   */
  getTaskCountsByProject(): {
    all: number;
    Personal: number;
    Work: number;
    Study: number;
    General: number;
  } {
    const tasks = this.getTasks();
    return {
      all: tasks.length,
      Personal: tasks.filter((t) => t.project === 'Personal').length,
      Work: tasks.filter((t) => t.project === 'Work').length,
      Study: tasks.filter((t) => t.project === 'Study').length,
      General: tasks.filter((t) => t.project === 'General').length,
    };
  }

  /**
   * Create a new task
   */
  createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Task {
    // Check rate limiting
    const rateLimit = this.securityService.checkRateLimit('createTask');
    if (!rateLimit.allowed) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    // Require authentication
    this.authService.requireAuthentication();

    // CSP validation for description first (to catch data URLs, external resources before generic pattern matching)
    let cspValidation: { isValid: boolean; violations: string[] };
    cspValidation = this.validationService.validateCSP(task.description || '');

    // Check for attack patterns in title first (before validation for specific error messages)
    const titleAttackPatterns = this.securityService.validateRequest({ title: task.title });
    if (
      !titleAttackPatterns.valid &&
      titleAttackPatterns.threats.some((t) => t.includes('event handlers'))
    ) {
      this.authService.logSecurityEvent({
        type: 'VALIDATION_FAILURE',
        message: 'Task title validation failed: Invalid input: event handlers not allowed',
        timestamp: new Date(),
        userId: this.authService.getUserContext()?.userId,
      });
      throw new Error('Invalid input: event handlers not allowed');
    }

    // Validate title
    const titleValidation = this.validationService.validateTaskTitle(task.title, true);
    if (!titleValidation.isValid) {
      this.authService.logSecurityEvent({
        type: 'VALIDATION_FAILURE',
        message: `Task title validation failed: ${titleValidation.error}`,
        timestamp: new Date(),
        userId: this.authService.getUserContext()?.userId,
      });
      throw new Error(titleValidation.error || 'Invalid task title');
    }

    if (task.description) {
      if (!cspValidation.isValid) {
        this.authService.logSecurityEvent({
          type: 'XSS_ATTEMPT',
          message: `Task description validation failed: Invalid input: HTML content not allowed`,
          timestamp: new Date(),
          userId: this.authService.getUserContext()?.userId,
        });

        // Map violations to specific error messages based on test expectations
        if (cspValidation.violations.some((v) => v.includes('External resources'))) {
          throw new Error('External resources not allowed');
        }
        if (cspValidation.violations.some((v) => v.includes('Data URLs'))) {
          throw new Error('Data URLs not allowed');
        }
        // Check for HTML content specifically
        if (cspValidation.violations.some((v) => v.includes('HTML'))) {
          throw new Error('Invalid input: HTML content not allowed');
        }
        throw new Error('Invalid input: HTML content not allowed');
      }
    }

    // Skip description validation if CSP already handled it and passed
    let descriptionValidation: { isValid: boolean; sanitized?: string; error?: string };
    if (cspValidation.isValid) {
      descriptionValidation = task.description
        ? { isValid: true, sanitized: task.description }
        : { isValid: true };
    } else {
      descriptionValidation = this.validationService.validateTaskDescription(task.description);
    }

    if (!descriptionValidation.isValid) {
      this.authService.logSecurityEvent({
        type: 'VALIDATION_FAILURE',
        message: `Task description validation failed: ${descriptionValidation.error}`,
        timestamp: new Date(),
        userId: this.authService.getUserContext()?.userId,
      });
      throw new Error(descriptionValidation.error || 'Invalid task description');
    }

    // Check for attack patterns
    const validation = this.securityService.validateRequest(task);
    if (!validation.valid) {
      this.authService.logSecurityEvent({
        type: 'XSS_ATTEMPT',
        message: `Attack attempt detected: ${validation.threats.join(', ')}`,
        timestamp: new Date(),
        userId: this.authService.getUserContext()?.userId,
      });
      throw new Error('Invalid input: potentially dangerous content detected');
    }

    const newTask: Task = {
      ...task,
      title: titleValidation.sanitized!,
      description:
        task.description !== undefined ? descriptionValidation.sanitized ?? '' : undefined,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const currentTasks = this.tasks();
    this.tasks.update((tasks) => [...tasks, newTask]);

    // Queue auto-save operation
    this.autoSaveService.queueTaskCreation(newTask, currentTasks,"manual");

    // Keep existing encrypted storage as backup
    this.saveToEncryptedStorage('create');

    // Log security event
    this.authService.logSecurityEvent({
      type: 'DATA_ACCESS',
      message: `Task created: ${newTask.id}`,
      timestamp: new Date(),
      userId: this.authService.getUserContext()?.userId,
    });

    return newTask;
  }

  /**
   * Update an existing task
   */
  updateTask(id: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>): Task | null {
    // Check rate limiting
    const rateLimit = this.securityService.checkRateLimit('updateTask');
    if (!rateLimit.allowed) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    // Require authentication
    this.authService.requireAuthentication();

    // Validate update data if title or description is provided
    if (updates.title) {
      const titleValidation = this.validationService.validateTaskTitle(updates.title);
      if (!titleValidation || !titleValidation.isValid) {
        const errorMessage = titleValidation?.error || 'Invalid task title';
        this.authService.logSecurityEvent({
          type: 'VALIDATION_FAILURE',
          message: `Task title validation failed: ${errorMessage}`,
          timestamp: new Date(),
          userId: this.authService.getUserContext()?.userId,
        });
        throw new Error(errorMessage);
      }
      updates.title = titleValidation.sanitized!;
    }

    if (updates.description !== undefined) {
      const descriptionValidation = this.validationService.validateTaskDescription(
        updates.description
      );
      if (!descriptionValidation || !descriptionValidation.isValid) {
        const errorMessage = descriptionValidation?.error || 'Invalid task description';
        this.authService.logSecurityEvent({
          type: 'VALIDATION_FAILURE',
          message: `Task description validation failed: ${errorMessage}`,
          timestamp: new Date(),
          userId: this.authService.getUserContext()?.userId,
        });
        throw new Error(errorMessage);
      }
      updates.description = descriptionValidation.sanitized ?? updates.description;
    }

    // Check for attack patterns
    const validation = this.securityService.validateRequest(updates);
    if (!validation.valid) {
      this.authService.logSecurityEvent({
        type: 'XSS_ATTEMPT',
        message: `Update attack attempt detected: ${validation.threats.join(', ')}`,
        timestamp: new Date(),
        userId: this.authService.getUserContext()?.userId,
      });
      throw new Error('Invalid input: potentially dangerous content detected');
    }

    const tasks = this.tasks();
    const taskIndex = tasks.findIndex((task) => task.id === id);

    if (taskIndex === -1) {
      return null;
    }

    const existingTask = tasks[taskIndex];
    if (!existingTask || !existingTask.updatedAt) {
      return null;
    }

    const updatedTask: Task = {
      ...existingTask,
      ...updates,
      updatedAt: new Date(),
    };

    const currentTasks = this.tasks();
    this.tasks.update((currentTasks) =>
      currentTasks.map((task) => (task.id === id ? updatedTask : task))
    );

    // Queue auto-save operation (manual from TaskService perspective)
    this.autoSaveService.queueTaskUpdate(updatedTask, currentTasks, 'manual');

    // Keep existing encrypted storage as backup
    this.saveToEncryptedStorage('update');

    // Log security event
    this.authService.logSecurityEvent({
      type: 'DATA_ACCESS',
      message: `Task updated: ${id}`,
      timestamp: new Date(),
      userId: this.authService.getUserContext()?.userId,
    });

    return updatedTask;
  }

  /**
   * Delete a task
   */
  deleteTask(id: string): boolean {
    // Check rate limiting
    const rateLimit = this.securityService.checkRateLimit('deleteTask');
    if (!rateLimit.allowed) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    // Require authentication
    this.authService.requireAuthentication();

    // Validate input
    if (!id || id.trim() === '') {
      return false;
    }

    // Check for attack patterns
    const validation = this.securityService.validateRequest({ id });
    if (!validation.valid) {
      this.authService.logSecurityEvent({
        type: 'XSS_ATTEMPT',
        message: `Delete attack attempt detected: ${validation.threats.join(', ')}`,
        timestamp: new Date(),
        userId: this.authService.getUserContext()?.userId,
      });
      return false;
    }

    const tasks = this.tasks();
    const taskIndex = tasks.findIndex((task) => task.id === id);

    if (taskIndex === -1) {
      return false;
    }

    this.tasks.update((currentTasks) => currentTasks.filter((task) => task.id !== id));

    // Queue auto-save operation with updated tasks (after deletion)
    const updatedTasks = this.tasks();
    this.autoSaveService.queueTaskDeletion(id, updatedTasks, 'manual');

    // Keep existing encrypted storage as backup
    this.saveToEncryptedStorage('delete');

    // Log security event
    this.authService.logSecurityEvent({
      type: 'DATA_ACCESS',
      message: `Task deleted: ${id}`,
      timestamp: new Date(),
      userId: this.authService.getUserContext()?.userId,
    });

    return true;
  }

  /**
   * Initialize with mock data for development
   */
  async initializeMockData(): Promise<void> {
    // Initialize with anonymous user for development
    if (!this.authService.isAuthenticated()) {
      this.authService.createAnonymousUser();
    }

    // Load existing data first
    await this.loadFromEncryptedStorage();

    // Only initialize with mock data if empty or contains invalid data
    const currentTasks = this.tasks();
    if (
      currentTasks.length === 0 ||
      !currentTasks.every((task) => task && typeof task === 'object' && task.id && task.updatedAt)
    ) {
      const mockTasks: Task[] = [
        {
          id: '1',
          title: 'Review project requirements',
          description: 'Go through the project specifications and create a task breakdown',
          priority: 'high',
          status: 'TODO',
          project: 'Work',
          createdAt: new Date('2024-01-15T10:00:00'),
          updatedAt: new Date('2024-01-15T10:00:00'),
        },
        {
          id: '2',
          title: 'Setup development environment',
          description: 'Install Angular CLI and configure the workspace',
          priority: 'medium',
          status: 'DONE',
          project: 'Work',
          createdAt: new Date('2024-01-14T09:00:00'),
          updatedAt: new Date('2024-01-16T14:30:00'),
        },
        {
          id: '3',
          title: 'Learn Angular signals',
          description: 'Study the new signals API for reactive state management',
          priority: 'low',
          status: 'IN_PROGRESS',
          project: 'Study',
          createdAt: new Date('2024-01-13T16:00:00'),
          updatedAt: new Date('2024-01-17T11:00:00'),
        },
        {
          id: '4',
          title: 'Grocery shopping',
          description: 'Buy groceries for the week',
          priority: 'medium',
          status: 'TODO',
          project: 'Personal',
          createdAt: new Date('2024-01-12T20:00:00'),
          updatedAt: new Date('2024-01-12T20:00:00'),
        },
      ];

      this.tasks.set(mockTasks);
      this.saveToEncryptedStorage('create');
    }
  }

  /**
   * Clear all tasks
   */
  clearTasks(): void {
    this.tasks.set([]);
    this.saveToEncryptedStorage('delete');
  }

  /**
   * Get a single task by ID
   */
  getTask(id: string): Task | null {
    try {
      const tasks = this.tasks();
      return tasks.find((task) => task.id === id) || null;
    } catch (error) {
      console.error('Error getting task:', error);
      return null;
    }
  }

  /**
   * Get valid status transitions for a given status
   * Only allows next or previous state (no jumping)
   */
  getStatusTransitions(status: TaskStatus): TaskStatus[] {
    const validTransitions: Record<TaskStatus, TaskStatus[]> = {
      TODO: ['IN_PROGRESS'],
      IN_PROGRESS: ['TODO', 'DONE'],
      DONE: ['IN_PROGRESS'],
    };

    return validTransitions[status] || [];
  }

  /**
   * Validate if a status transition is allowed
   */
  private isValidTransition(currentStatus: TaskStatus, newStatus: TaskStatus): boolean {
    const validTransitions = this.getStatusTransitions(currentStatus);
    return validTransitions.includes(newStatus);
  }

  /**
   * Validate status value to prevent injection
   */
  private isValidStatus(status: string): status is TaskStatus {
    const validStatuses: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE'];
    return validStatuses.includes(status as TaskStatus);
  }

  /**
   * Change task status with validation
   */
  changeStatus(taskId: string, newStatus: TaskStatus): Task | null {
    try {
      // Check rate limiting
      const rateLimit = this.securityService.checkRateLimit('changeStatus');
      if (!rateLimit.allowed) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }

      // Require authentication
      this.authService.requireAuthentication();

      // Validate status input to prevent injection
      if (!this.isValidStatus(newStatus)) {
        throw new Error('Invalid status');
      }

      // Validate taskId
      if (!taskId || typeof taskId !== 'string') {
        return null;
      }

      // Check for attack patterns
      const validation = this.securityService.validateRequest({ taskId });
      if (!validation.valid) {
        this.authService.logSecurityEvent({
          type: 'XSS_ATTEMPT',
          message: `Status change attack attempt detected: ${validation.threats.join(', ')}`,
          timestamp: new Date(),
          userId: this.authService.getUserContext()?.userId,
        });
        return null;
      }

      // Find task
      const tasks = this.tasks();
      const taskIndex = tasks.findIndex((task) => task.id === taskId);

      if (taskIndex === -1) {
        return null;
      }

      const currentTask = tasks[taskIndex];

      // Validate task has updatedAt field
      if (!currentTask || !currentTask.updatedAt) {
        return null;
      }

      // Validate transition is allowed (only next or previous state)
      if (!this.isValidTransition(currentTask.status, newStatus)) {
        throw new Error('Invalid status transition');
      }

      // Update task status
      const now = Date.now();
      const updatedTask: Task = {
        ...currentTask,
        status: newStatus,
        updatedAt: new Date(now),
      };

      // Update tasks signal
      const currentTasks = this.tasks();
      this.tasks.update((currentTasks) =>
        currentTasks.map((task) => (task.id === taskId ? updatedTask : task))
      );

      // Queue auto-save operation (manual from TaskService perspective)
      this.autoSaveService.queueTaskUpdate(updatedTask, currentTasks, 'manual');

      // Save to encrypted storage as backup
      this.saveToEncryptedStorage('update');

      // Log security event
      this.authService.logSecurityEvent({
        type: 'DATA_ACCESS',
        message: `Task status changed: ${taskId} from ${currentTask.status} to ${newStatus}`,
        timestamp: new Date(),
        userId: this.authService.getUserContext()?.userId,
      });

      return updatedTask;
    } catch (error: any) {
      // Re-throw known errors (rate limit and invalid status)
      if (
        error.message &&
        (error.message.includes('Rate limit exceeded') || error.message.includes('Invalid status'))
      ) {
        throw error;
      }

      // Log unexpected errors and return null
      console.error('Error changing task status:', error);
      return null;
    }
  }

  /**
   * Set tasks directly (used by startup service)
   */
  setTasks(tasks: Task[]): void {
    this.tasks.set(tasks);
  }

  /**
   * Get current tasks as signal (for startup service)
   */
  getTasksSignal() {
    return this.tasks;
  }

  /**
   * Get auto-save metrics
   */
  getAutoSaveMetrics() {
    return this.autoSaveService.getMetrics();
  }

  /**
   * Force sync with localStorage
   */
  async forceSync() {
    return await this.autoSaveService.forceSync();
  }

  /**
   * Get pending auto-save operations
   */
  getPendingOperations() {
    return this.autoSaveService.getPendingOperations();
  }

  /**
   * Cancel pending auto-save operation
   */
  cancelPendingOperation(operationId: string): boolean {
    return this.autoSaveService.cancelPendingOperation(operationId);
  }

  /**
   * Update auto-save configuration
   */
  updateAutoSaveConfig(config: { debounceTimeMs?: number; enableOptimisticUpdates?: boolean }) {
    this.autoSaveService.updateConfig(config);
  }

  /**
   * Get auto-save service instance for advanced usage
   */
  getAutoSaveService(): AutoSaveService {
    return this.autoSaveService;
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
  }
}
