import { Injectable, inject, signal, computed } from '@angular/core';
import { Task } from '../models/task.model';
import { DataValidationService, StartupLoadResult } from './data-validation.service';
import { LocalStorageService } from './local-storage.service';
import { TaskService } from './task.service';

export interface StartupState {
  loading: boolean;
  loaded: boolean;
  error: string | null;
  warnings: string[];
  metrics?: {
    loadTimeMs: number;
    loadTimeCategory: 'fast' | 'medium' | 'slow';
    cacheHit: boolean;
    fallbackUsed: boolean;
    migrationPerformed: boolean;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AppStartupService {
  private dataValidationService = inject(DataValidationService);
  private localStorageService = inject(LocalStorageService);
  private taskService = inject(TaskService);

  // Signals for reactive loading state
  private startupState = signal<StartupState>({
    loading: true,
    loaded: false,
    error: null,
    warnings: []
  });

  // Public readonly signals
  public isLoading = computed(() => this.startupState().loading);
  public isLoaded = computed(() => this.startupState().loaded);
  public error = computed(() => this.startupState().error);
  public warnings = computed(() => this.startupState().warnings);
  public metrics = computed(() => this.startupState().metrics);

  constructor() {}

  /**
   * APP_INITIALIZER factory function
   * This will be called during Angular bootstrap
   */
  initializeApp(): () => Promise<void> {
    return () => this.performStartupSequence();
  }

  /**
   * Main startup sequence that loads and validates data
   */
  private async performStartupSequence(): Promise<void> {
    try {
      this.updateState({ 
        loading: true, 
        loaded: false, 
        error: null, 
        warnings: [] 
      });

      console.log('🚀 Starting application data load...');

      // Step 1: Load and validate tasks from storage
      const loadResult = await this.loadAndValidateTasks();

      // Step 2: Get performance metrics
      const metrics = this.dataValidationService.getPerformanceMetrics(loadResult);

      // Step 3: Log startup information
      this.logStartupInformation(loadResult, metrics);

      // Step 4: Handle success or failure
      if (loadResult.success && loadResult.data) {
        // Load data into TaskService
        this.loadTasksIntoService(loadResult.data);
        
        // Save migrated data if migration occurred
        if (loadResult.migration?.migrated) {
          await this.saveMigratedData(loadResult.data);
        }

        this.updateState({
          loading: false,
          loaded: true,
          error: null,
          warnings: loadResult.warnings,
          metrics
        });

        console.log('✅ Application startup completed successfully');
      } else {
        // Handle startup failure with fallback
        await this.handleStartupFailure(loadResult);
      }

    } catch (error) {
      console.error('❌ Critical startup error:', error);
      
      this.updateState({
        loading: false,
        loaded: false,
        error: error instanceof Error ? error.message : 'Unknown startup error',
        warnings: [],
        metrics: {
          loadTimeMs: 0,
          loadTimeCategory: 'slow',
          cacheHit: false,
          fallbackUsed: false,
          migrationPerformed: false
        }
      });

      // Still try to start app with empty state
      this.loadTasksIntoService([]);
    }
  }

  /**
   * Load and validate tasks from storage
   */
  private async loadAndValidateTasks(): Promise<StartupLoadResult> {
    try {
      const result = await this.dataValidationService.loadTasksFromStorage();
      
      console.log('📊 Data loading result:', {
        success: result.success,
        taskCount: result.data?.length || 0,
        loadTime: `${result.loadingTime.toFixed(2)}ms`,
        fromCache: result.fromCache,
        fallbackUsed: result.fallbackUsed,
        migration: result.migration?.migrated ? `${result.migration.fromVersion} → ${result.migration.toVersion}` : 'none'
      });

      return result;
    } catch (error) {
      console.error('📦 Failed to load tasks from storage:', error);
      throw error;
    }
  }

  /**
   * Load validated tasks into TaskService
   */
  private loadTasksIntoService(tasks: Task[]): void {
    try {
      // Use TaskService's public method to set data
      if (tasks.length > 0) {
        this.taskService.setTasks(tasks);
        console.log(`📋 Loaded ${tasks.length} tasks into TaskService`);
      } else {
        this.taskService.setTasks([]);
        console.log('📋 No tasks found, starting with empty state');
      }
    } catch (error) {
      console.error('❌ Failed to load tasks into service:', error);
      throw error;
    }
  }

  /**
   * Save migrated data back to storage
   */
  private async saveMigratedData(tasks: Task[]): Promise<void> {
    try {
      const saveResult = await this.localStorageService.setItem('tasks', tasks);
      
      if (saveResult.success) {
        console.log('💾 Migrated data saved successfully');
        if (saveResult.fallbackUsed) {
          console.warn('⚠️ Used fallback storage for migrated data');
        }
      } else {
        console.warn('⚠️ Failed to save migrated data:', saveResult.error?.message);
      }
    } catch (error) {
      console.error('❌ Error saving migrated data:', error);
    }
  }

  /**
   * Handle startup failure with appropriate fallbacks
   */
  private async handleStartupFailure(loadResult: StartupLoadResult): Promise<void> {
    console.warn('⚠️ Startup data loading failed, attempting recovery...');

    const errors = loadResult.errors;
    const warnings = loadResult.warnings;

    // Try to create default empty state
    try {
      this.loadTasksIntoService([]);
      
      // Clear potentially corrupted storage
      await this.localStorageService.removeItem('tasks');
      
      console.warn('🔄 Recovery: Cleared corrupted storage and started with empty state');

      const metrics = this.dataValidationService.getPerformanceMetrics(loadResult);

      this.updateState({
        loading: false,
        loaded: true,
        error: null,
        warnings: [...warnings, 'Started with empty state due to storage errors', ...errors],
        metrics: {
          ...metrics,
          loadTimeCategory: 'slow' // Mark as slow since we had to recover
        }
      });

    } catch (recoveryError) {
      console.error('❌ Recovery failed:', recoveryError);
      
      this.updateState({
        loading: false,
        loaded: false,
        error: `Failed to load data (${errors.join(', ')}) and recovery failed`,
        warnings,
        metrics: {
          loadTimeMs: 0,
          loadTimeCategory: 'slow',
          cacheHit: false,
          fallbackUsed: false,
          migrationPerformed: false
        }
      });
    }
  }

  /**
   * Log detailed startup information for debugging
   */
  private logStartupInformation(result: StartupLoadResult, metrics: any): void {
    const logData = {
      success: result.success,
      taskCount: result.data?.length || 0,
      performance: {
        loadTime: `${metrics.loadTimeMs}ms`,
        category: metrics.loadTimeCategory,
        cacheHit: metrics.cacheHit
      },
      storage: {
        fallbackUsed: result.fallbackUsed,
        storageStatus: this.localStorageService.getStorageStatus()
      },
      migration: result.migration ? {
        performed: result.migration.migrated,
        fromVersion: result.migration.fromVersion,
        toVersion: result.migration.toVersion
      } : undefined,
      issues: {
        errors: result.errors,
        warnings: result.warnings
      }
    };

    console.group('📊 Application Startup Metrics');
    console.table(logData);
    console.groupEnd();

    // Log performance warnings
    if (metrics.loadTimeCategory === 'slow') {
      console.warn('⚠️ Slow startup detected. Consider optimizing data size or storage access.');
    }

    if (result.fallbackUsed) {
      console.warn('⚠️ Fallback storage is active. localStorage may be unavailable or full.');
    }

    // Log migration success
    if (result.migration?.migrated) {
      console.log(`✨ Data migration completed: ${result.migration.fromVersion} → ${result.migration.toVersion}`);
    }
  }

  /**
   * Update the internal startup state signal
   */
  private updateState(updates: Partial<StartupState>): void {
    this.startupState.set({
      ...this.startupState(),
      ...updates
    });
  }

  /**
   * Get current startup state for components to consume
   */
  getStartupState(): StartupState {
    return this.startupState();
  }

  /**
   * Get startup state as readonly signal for computed properties
   */
  getStartupStateSignal() {
    return this.startupState.asReadonly();
  }

  /**
   * Check if application is ready (data loaded)
   */
  isReady(): boolean {
    const state = this.startupState();
    return state.loaded && !state.loading && !state.error;
  }

  /**
   * Force reinitialize data (useful for testing or manual refresh)
   */
  async reinitialize(): Promise<void> {
    console.log('🔄 Forcing application reinitialization...');
    await this.performStartupSequence();
  }

  /**
   * Get storage health information
   */
  getStorageHealth(): {
    available: boolean;
    usingFallback: boolean;
    usage?: { used: number; available: number; percentage: number };
  } {
    const status = this.localStorageService.getStorageStatus();
    
    return {
      available: status.localStorage || status.sessionStorage,
      usingFallback: status.fallbackActive,
      usage: undefined // Could be populated with getStorageUsage() if needed
    };
  }
}