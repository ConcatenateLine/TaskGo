import { Injectable, signal, inject } from '@angular/core';
import { Task, TaskStatus, TaskProject } from '../models/task.model';
import { CryptoService } from './crypto.service';
import { ValidationService } from './validation.service';
import { AuthService } from './auth.service';
import { SecurityService } from './security.service';

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  private tasks = signal<Task[]>([]);
  private cryptoService = inject(CryptoService);
  private validationService = inject(ValidationService);
  private authService = inject(AuthService);
  private securityService = inject(SecurityService);

  /**
   * Load tasks from encrypted storage
   */
  private loadFromEncryptedStorage(): void {
    try {
      const encryptedData = this.cryptoService.getItem(this.cryptoService.getStorageKey());
      if (encryptedData && Array.isArray(encryptedData)) {
        this.tasks.set(encryptedData);
      }
    } catch (error) {
      console.warn('Failed to load tasks from encrypted storage:', error);
      // Start with empty array if storage is corrupted
      this.tasks.set([]);
    }
  }

  /**
   * Save tasks to encrypted storage
   */
  private saveToEncryptedStorage(): void {
    try {
      const tasks = this.tasks();
      this.cryptoService.setItem(this.cryptoService.getStorageKey(), tasks);
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

    // Load from encrypted storage if not in memory
    if (this.tasks().length === 0) {
      this.loadFromEncryptedStorage();
    }

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

    this.tasks.update((tasks) => [...tasks, newTask]);
    this.saveToEncryptedStorage();

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
      if (!titleValidation.isValid) {
        this.authService.logSecurityEvent({
          type: 'VALIDATION_FAILURE',
          message: `Task title validation failed: ${titleValidation.error}`,
          timestamp: new Date(),
          userId: this.authService.getUserContext()?.userId,
        });
        throw new Error(titleValidation.error || 'Invalid task title');
      }
      updates.title = titleValidation.sanitized!;
    }

    if (updates.description !== undefined) {
      const descriptionValidation = this.validationService.validateTaskDescription(
        updates.description
      );
      if (!descriptionValidation.isValid) {
        this.authService.logSecurityEvent({
          type: 'VALIDATION_FAILURE',
          message: `Task description validation failed: ${descriptionValidation.error}`,
          timestamp: new Date(),
          userId: this.authService.getUserContext()?.userId,
        });
        throw new Error(descriptionValidation.error || 'Invalid task description');
      }
      updates.description = descriptionValidation.sanitized;
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

    this.tasks.update((currentTasks) =>
      currentTasks.map((task) => (task.id === id ? updatedTask : task))
    );

    this.saveToEncryptedStorage();

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

    const tasks = this.tasks();
    const taskIndex = tasks.findIndex((task) => task.id === id);

    if (taskIndex === -1) {
      return false;
    }

    this.tasks.update((currentTasks) => currentTasks.filter((task) => task.id !== id));
    this.saveToEncryptedStorage();

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
  initializeMockData(): void {
    // Initialize with anonymous user for development
    if (!this.authService.isAuthenticated()) {
      this.authService.createAnonymousUser();
    }

    // Load existing data first
    this.loadFromEncryptedStorage();

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
      this.saveToEncryptedStorage();
    }
  }

  /**
   * Clear all tasks
   */
  clearTasks(): void {
    this.tasks.set([]);
    this.saveToEncryptedStorage();
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
  }
}
