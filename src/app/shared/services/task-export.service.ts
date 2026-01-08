import { Injectable, inject } from '@angular/core';
import { LocalStorageService, StorageError } from './local-storage.service';
import { Task } from '../models/task.model';
import { CryptoService } from './crypto.service';

export interface TaskExportMetadata {
  version: string;
  exportedAt: number;
  taskCount: number;
  projectBreakdown: { [key: string]: number };
  statusBreakdown: { [key: string]: number };
  priorityBreakdown: { [key: string]: number };
  dataSize: number;
}

export interface TaskExportData {
  tasks: Task[];
  metadata: TaskExportMetadata;
  filename: string;
  jsonString: string;
}

export interface TaskExportResult {
  success: boolean;
  data?: TaskExportData;
  error?: StorageError;
}

@Injectable({
  providedIn: 'root',
})
export class TaskExportService {
  private localStorageService = inject(LocalStorageService);
  private cryptoService = inject(CryptoService);

  private readonly FILENAME_PREFIX = 'taskgo_backup_';
  private readonly FILE_EXTENSION = '.json';
  private readonly VERSION = '1.0.0';

  /**
   * Export tasks with metadata and download as JSON file
   */
  async exportTasks(): Promise<TaskExportResult> {
    try {
      // Get tasks from localStorage
      const tasksResult = await this.localStorageService.getItem('taskgo_tasks');

      if (!tasksResult.success) {
        return {
          success: false,
          error: tasksResult.error || this.createError('UnknownError', 'Failed to retrieve tasks')
        };
      }

      const tasks = this.cryptoService.decrypt(tasksResult.data as string) ?? [];

      // Validate tasks
      if (!this.validateTasks(tasks)) {
        return {
          success: false,
          error: this.createError('ValidationError', 'Invalid task data structure')
        };
      }

      // Generate metadata
      const metadata = this.generateMetadata(tasks);

      // Create export data structure
      const exportData = {
        tasks,
        metadata
      };

      // Generate filename
      const filename = this.generateFilename();

      // Generate JSON string with indentation
      const jsonString = JSON.stringify(exportData, null, 2);

      // Calculate data size
      const dataSize = new Blob([jsonString]).size;

      // Update metadata with data size
      metadata.dataSize = dataSize;

      // Create final export data
      const taskExportData: TaskExportData = {
        tasks,
        metadata,
        filename,
        jsonString
      };

      // Trigger file download
      this.downloadFile(jsonString, filename);

      return {
        success: true,
        data: taskExportData
      };

    } catch (error) {
      if (error instanceof DOMException) {
        const storageError = this.handleDOMException(error);
        return {
          success: false,
          error: storageError
        };
      }

      return {
        success: false,
        error: this.createError('UnknownError', `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      };
    }
  }

  /**
   * Generate filename with YYYY-MM-DD format
   */
  private generateFilename(): string {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    return `${this.FILENAME_PREFIX}${dateStr}${this.FILE_EXTENSION}`;
  }

  /**
   * Generate metadata for export
   */
  private generateMetadata(tasks: Task[]): TaskExportMetadata {
    const projectBreakdown: { [key: string]: number } = {};
    const statusBreakdown: { [key: string]: number } = {};
    const priorityBreakdown: { [key: string]: number } = {};

    // Calculate breakdowns
    tasks.forEach(task => {
      projectBreakdown[task.project] = (projectBreakdown[task.project] || 0) + 1;
      statusBreakdown[task.status] = (statusBreakdown[task.status] || 0) + 1;
      priorityBreakdown[task.priority] = (priorityBreakdown[task.priority] || 0) + 1;
    });

    return {
      version: this.VERSION,
      exportedAt: Date.now(),
      taskCount: tasks.length,
      projectBreakdown,
      statusBreakdown,
      priorityBreakdown,
      dataSize: 0 // Will be updated after JSON generation
    };
  }

  /**
   * Validate task array structure
   */
  private validateTasks(tasks: unknown): tasks is Task[] {

    if (!Array.isArray(tasks)) {
      return false;
    }

    return tasks.every(task => this.validateTask(task));
  }

  /**
   * Validate single task structure
   */
  private validateTask(task: unknown): task is Task {
    if (!task || typeof task !== 'object') {
      return false;
    }

    const t = task as Task;
    return (
      typeof t.id === 'string' &&
      typeof t.title === 'string' &&
      ['low', 'medium', 'high'].includes(t.priority) &&
      ['TODO', 'IN_PROGRESS', 'DONE'].includes(t.status) &&
      ['Personal', 'Work', 'Study', 'General'].includes(t.project) &&
      (t.createdAt instanceof Date || typeof t.createdAt === 'string') &&
      (t.updatedAt instanceof Date || typeof t.updatedAt === 'string')
    );
  }

  /**
   * Download file using secure DOM manipulation
   */
  private downloadFile(content: string, filename: string): void {
    try {
      // Create blob with correct MIME type
      const blob = new Blob([content], { type: 'application/json' });

      // Create object URL
      const url = URL.createObjectURL(blob);

      // Create anchor element
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;

      // Use secure DOM manipulation
      try {
        // Append to body
        document.body.appendChild(anchor);

        // Trigger click
        anchor.click();

        // Clean up
        document.body.removeChild(anchor);
      } catch (domError) {
        // Fallback if DOM manipulation fails
        console.warn('DOM manipulation failed, trying alternative method:', domError);
        window.open(url, '_blank');
      }

      // Always revoke the URL to prevent memory leaks
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('File download failed:', error);
      throw new Error(`Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle DOM exceptions and convert to appropriate StorageError
   */
  private handleDOMException(error: DOMException): StorageError {
    const storageError: StorageError = new Error(error.message) as StorageError;
    storageError.name = 'UnknownError';

    if (error.name === 'QuotaExceededError') {
      storageError.name = 'QuotaExceededError';
      storageError.isQuotaExceeded = true;
    } else if (error.name === 'SecurityError') {
      storageError.name = 'SecurityError';
      storageError.isSecurityError = true;
    } else if (error.name === 'TypeError' && error.message.toLowerCase().includes('storage')) {
      storageError.name = 'StorageDisabledError';
      storageError.isStorageDisabled = true;
    }

    return storageError;
  }

  /**
   * Create a standardized error
   */
  private createError(name: StorageError['name'], message: string): StorageError {
    const error: StorageError = new Error(message) as StorageError;
    error.name = name;

    switch (name) {
      case 'ValidationError':
        error.isValidationError = true;
        break;
      case 'QuotaExceededError':
        error.isQuotaExceeded = true;
        break;
      case 'SecurityError':
        error.isSecurityError = true;
        break;
      case 'StorageDisabledError':
        error.isStorageDisabled = true;
        break;
      case 'SerializationError':
        error.isSerializationError = true;
        break;
      case 'CorruptionError':
        error.isCorruption = true;
        break;
      case 'BackupError':
        error.isBackupError = true;
        break;
      case 'RecoveryError':
        error.isRecoveryError = true;
        break;
    }

    return error;
  }
}
