import { Injectable, inject } from '@angular/core';
import { Task } from '../models/task.model';
import { LocalStorageService } from './local-storage.service';

export interface DataMigrationResult {
  success: boolean;
  data?: Task[];
  fromVersion?: string;
  toVersion?: string;
  migrated: boolean;
  error?: string;
}

export interface ValidationResult {
  isValid: boolean;
  data?: Task[];
  errors: string[];
  warnings: string[];
}

export interface StartupLoadResult {
  success: boolean;
  data?: Task[];
  loadingTime: number;
  fromCache: boolean;
  fallbackUsed: boolean;
  errors: string[];
  warnings: string[];
  migration?: DataMigrationResult;
}

@Injectable({
  providedIn: 'root'
})
export class DataValidationService {
  private localStorageService = inject(LocalStorageService);
  private readonly CURRENT_VERSION = '1.0.0';
  
  constructor() {}

  /**
   * Validate raw task data against Task interface with runtime type checking
   */
  validateTaskData(data: unknown): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if data is an array
    if (!Array.isArray(data)) {
      errors.push('Data must be an array of tasks');
      return { isValid: false, errors, warnings };
    }

    const validTasks: Task[] = [];

    for (let i = 0; i < data.length; i++) {
      const task = data[i];
      const taskValidation = this.validateSingleTask(task, i);
      
      if (!taskValidation.isValid) {
        errors.push(`Task at index ${i}: ${taskValidation.errors.join(', ')}`);
        continue;
      }

      if (taskValidation.warnings.length > 0) {
        warnings.push(`Task at index ${i}: ${taskValidation.warnings.join(', ')}`);
      }

      validTasks.push(taskValidation.data!);
    }

    return {
      isValid: errors.length === 0,
      data: validTasks,
      errors,
      warnings
    };
  }

  /**
   * Validate a single task object
   */
  private validateSingleTask(task: unknown, index: number): { isValid: boolean; data?: Task; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!task || typeof task !== 'object') {
      errors.push('Task must be an object');
      return { isValid: false, errors, warnings };
    }

    const t = task as any;

    // Validate id
    if (typeof t.id !== 'string' || t.id.trim() === '') {
      errors.push('Task must have a valid id');
    }

    // Validate title
    if (typeof t.title !== 'string' || t.title.trim() === '') {
      errors.push('Task must have a valid title');
    }

    // Validate priority
    const validPriorities = ['low', 'medium', 'high'];
    if (!validPriorities.includes(t.priority)) {
      errors.push(`Invalid priority: ${t.priority}. Must be one of: ${validPriorities.join(', ')}`);
    }

    // Validate status
    const validStatuses = ['TODO', 'IN_PROGRESS', 'DONE'];
    if (!validStatuses.includes(t.status)) {
      errors.push(`Invalid status: ${t.status}. Must be one of: ${validStatuses.join(', ')}`);
    }

    // Validate project
    const validProjects = ['Personal', 'Work', 'Study', 'General'];
    if (!validProjects.includes(t.project)) {
      errors.push(`Invalid project: ${t.project}. Must be one of: ${validProjects.join(', ')}`);
    }

    // Validate dates
    if (!this.isValidDate(t.createdAt)) {
      errors.push('Invalid createdAt date');
    }

    if (!this.isValidDate(t.updatedAt)) {
      errors.push('Invalid updatedAt date');
    }

    // Check for description (optional)
    if (t.description !== undefined && typeof t.description !== 'string') {
      warnings.push('Description should be a string or omitted');
    }

    // If there are errors, return invalid
    if (errors.length > 0) {
      return { isValid: false, errors, warnings };
    }

    // Create proper Task object with Date objects
    const validTask: Task = {
      id: t.id,
      title: t.title.trim(),
      description: t.description?.trim() || undefined,
      priority: t.priority,
      status: t.status,
      project: t.project,
      createdAt: new Date(t.createdAt),
      updatedAt: new Date(t.updatedAt)
    };

    return { isValid: true, data: validTask, errors, warnings };
  }

  /**
   * Check if a value is a valid date
   */
  private isValidDate(date: any): boolean {
    if (!date) return false;
    const d = new Date(date);
    return d instanceof Date && !isNaN(d.getTime());
  }

  /**
   * Detect version of stored data format
   */
  detectDataVersion(data: unknown): string {
    if (!Array.isArray(data) || data.length === 0) {
      return '1.0.0';
    }

    const firstTask = data[0];
    if (!firstTask || typeof firstTask !== 'object') {
      return 'legacy';
    }

    const t = firstTask as any;

    // Check for legacy format (missing fields)
    if (!t.status || !t.priority || !t.project) {
      return '0.9.0';
    }

    // Check for string dates instead of Date objects
    if (typeof t.createdAt === 'string' || typeof t.updatedAt === 'string') {
      return '0.9.5';
    }

    return '1.0.0';
  }

  /**
   * Migrate data from older versions to current format
   */
  migrateData(data: unknown, fromVersion: string): DataMigrationResult {
    try {
      let migratedData = data;
      let currentVersion = fromVersion;

      // Step through migrations
      if (currentVersion === 'legacy' || currentVersion === '0.9.0') {
        migratedData = this.migrateFromLegacy(migratedData);
        currentVersion = '0.9.5';
      }

      if (currentVersion === '0.9.5') {
        migratedData = this.migrateFrom095(migratedData);
        currentVersion = '1.0.0';
      }

      // Validate final data
      const validation = this.validateTaskData(migratedData);
      if (!validation.isValid) {
        return {
          success: false,
          fromVersion,
          toVersion: this.CURRENT_VERSION,
          migrated: false,
          error: `Migration failed validation: ${validation.errors.join(', ')}`
        };
      }

      return {
        success: true,
        data: validation.data,
        fromVersion,
        toVersion: this.CURRENT_VERSION,
        migrated: fromVersion !== this.CURRENT_VERSION
      };
    } catch (error) {
      return {
        success: false,
        fromVersion,
        toVersion: this.CURRENT_VERSION,
        migrated: false,
        error: error instanceof Error ? error.message : 'Unknown migration error'
      };
    }
  }

  /**
   * Migrate from legacy format (missing required fields)
   */
  private migrateFromLegacy(data: unknown): unknown {
    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((task: any) => {
      if (!task || typeof task !== 'object') {
        return null;
      }

      return {
        id: task.id || this.generateId(),
        title: task.title || 'Untitled Task',
        description: task.description || undefined,
        priority: task.priority || 'medium',
        status: task.status || 'TODO',
        project: task.project || 'General',
        createdAt: task.createdAt ? new Date(task.createdAt) : new Date(),
        updatedAt: task.updatedAt ? new Date(task.updatedAt) : new Date()
      };
    }).filter(Boolean);
  }

  /**
   * Migrate from 0.9.5 (string dates to Date objects)
   */
  private migrateFrom095(data: unknown): unknown {
    if (!Array.isArray(data)) {
      return data;
    }

    return data.map((task: any) => {
      if (!task || typeof task !== 'object') {
        return task;
      }

      return {
        ...task,
        createdAt: new Date(task.createdAt),
        updatedAt: new Date(task.updatedAt)
      };
    });
  }

  /**
   * Generate a simple ID for migration purposes
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
  }

  /**
   * Load and validate tasks from storage with migration support
   */
  async loadTasksFromStorage(): Promise<StartupLoadResult> {
    const startTime = performance.now();
    const errors: string[] = [];
    const warnings: string[] = [];
    let fromCache = false;
    let fallbackUsed = false;
    let migration: DataMigrationResult | undefined;

    try {
      // Try to load from localStorage
      const storageResult = await this.localStorageService.getItem<Task[]>('tasks');
      
      if (!storageResult.success || !storageResult.data) {
        // No data or storage error - return empty state
        const loadTime = performance.now() - startTime;
        return {
          success: true,
          data: [],
          loadingTime: loadTime,
          fromCache: false,
          fallbackUsed: false,
          errors: storageResult.error ? [storageResult.error.message] : [],
          warnings: []
        };
      }

      fromCache = true;
      fallbackUsed = !!storageResult.fallbackUsed;

      // Detect data version
      const detectedVersion = this.detectDataVersion(storageResult.data);

      // Validate current data
      const validation = this.validateTaskData(storageResult.data);

      if (!validation.isValid) {
        // Try migration if validation fails
        migration = this.migrateData(storageResult.data, detectedVersion);
        
        if (!migration.success) {
          const loadTime = performance.now() - startTime;
          return {
            success: false,
            loadingTime: loadTime,
            fromCache,
            fallbackUsed,
            errors: validation.errors,
            warnings: validation.warnings,
            migration
          };
        }

        const loadTime = performance.now() - startTime;
        return {
          success: true,
          data: migration.data!,
          loadingTime: loadTime,
          fromCache,
          fallbackUsed,
          errors: [],
          warnings: migration.migrated ? [`Data migrated from version ${detectedVersion}`] : [],
          migration
        };
      }

      // Data is valid and current
      const loadTime = performance.now() - startTime;
      return {
        success: true,
        data: validation.data!,
        loadingTime: loadTime,
        fromCache,
        fallbackUsed,
        errors: [],
        warnings: validation.warnings,
        migration: undefined
      };

    } catch (error) {
      const loadTime = performance.now() - startTime;
      return {
        success: false,
        loadingTime: loadTime,
        fromCache,
        fallbackUsed,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings,
        migration
      };
    }
  }

  /**
   * Get performance metrics for startup loading
   */
  getPerformanceMetrics(result: StartupLoadResult): {
    loadTimeMs: number;
    loadTimeCategory: 'fast' | 'medium' | 'slow';
    cacheHit: boolean;
    fallbackUsed: boolean;
    migrationPerformed: boolean;
  } {
    let loadTimeCategory: 'fast' | 'medium' | 'slow';
    
    if (result.loadingTime < 50) {
      loadTimeCategory = 'fast';
    } else if (result.loadingTime < 200) {
      loadTimeCategory = 'medium';
    } else {
      loadTimeCategory = 'slow';
    }

    return {
      loadTimeMs: Math.round(result.loadingTime),
      loadTimeCategory,
      cacheHit: result.fromCache,
      fallbackUsed: result.fallbackUsed,
      migrationPerformed: !!result.migration?.migrated
    };
  }
}