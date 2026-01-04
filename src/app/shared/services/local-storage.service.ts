import { Injectable, inject } from '@angular/core';
import { Task } from '../models/task.model';

export interface StorageError extends Error {
  name: 'QuotaExceededError' | 'SecurityError' | 'StorageDisabledError' | 'SerializationError' | 'ValidationError' | 'UnknownError';
  isQuotaExceeded?: boolean;
  isSecurityError?: boolean;
  isStorageDisabled?: boolean;
}

export interface StorageResult<T> {
  success: boolean;
  data?: T;
  error?: StorageError;
  fallbackUsed?: boolean;
}

export interface StorageConfig {
  enableFallback: boolean;
  enableRetry: boolean;
  maxRetries: number;
  retryDelay: number;
  enableValidation: boolean;
  enableCompression: boolean;
}

export interface StorageMetadata {
  version: string;
  timestamp: number;
  checksum?: string;
}

@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {
  private readonly CONFIG: StorageConfig = {
    enableFallback: true,
    enableRetry: true,
    maxRetries: 3,
    retryDelay: 1000,
    enableValidation: true,
    enableCompression: false
  };

  private readonly STORAGE_PREFIX = 'taskgo_';
  private readonly CURRENT_VERSION = '1.0.0';
  private readonly STORAGE_KEY_PREFIX = 'tg_';

  private readonly supportedStorage: Storage[] = [];
  private fallbackToSessionStorage = false;

  constructor() {
    this.initializeStorage();
  }

  private initializeStorage(): void {
    if (this.isLocalStorageAvailable()) {
      this.supportedStorage.push(localStorage);
    }
    if (this.isSessionStorageAvailable()) {
      this.supportedStorage.push(sessionStorage);
    }

    if (this.supportedStorage.length === 0) {
      console.warn('No storage mechanisms available');
    }
  }

  private isLocalStorageAvailable(): boolean {
    try {
      const testKey = '__localStorage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  private isSessionStorageAvailable(): boolean {
    try {
      const testKey = '__sessionStorage_test__';
      sessionStorage.setItem(testKey, 'test');
      sessionStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  private getStorageKey(key: string): string {
    return `${this.STORAGE_KEY_PREFIX}${key}`;
  }

  private getFullKey(key: string): string {
    return `${this.STORAGE_PREFIX}${key}`;
  }

  private createError(name: StorageError['name'], message: string, originalError?: Error): StorageError {
    const error: StorageError = new Error(message) as StorageError;
    error.name = name;
    
    if (originalError) {
      error.stack = originalError.stack;
    }

    switch (name) {
      case 'QuotaExceededError':
        error.isQuotaExceeded = true;
        break;
      case 'SecurityError':
        error.isSecurityError = true;
        break;
      case 'StorageDisabledError':
        error.isStorageDisabled = true;
        break;
    }

    return error;
  }

  private generateChecksum(data: any): string {
    const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < dataStr.length; i++) {
      const char = dataStr.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

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
      t.createdAt instanceof Date &&
      t.updatedAt instanceof Date
    );
  }

  private validateTaskList(tasks: unknown): tasks is Task[] {
    if (!Array.isArray(tasks)) {
      return false;
    }

    return tasks.every(task => this.validateTask(task));
  }

  private validateData(key: string, data: unknown): boolean {
    if (!this.CONFIG.enableValidation) {
      return true;
    }

    try {
      switch (key) {
        case 'tasks':
        case 'archived_tasks':
          return this.validateTaskList(data);
        case 'current_task':
          return data === null || this.validateTask(data);
        default:
          return true;
      }
    } catch {
      return false;
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async attemptStorageOperation<T>(
    key: string, 
    operation: () => T, 
    attempts: number = 0
  ): Promise<T> {
    try {
      return operation();
    } catch (error) {
      const originalError = error as Error;

      // Don't retry our custom storage errors - they're final
      if (originalError.name === 'QuotaExceededError' || 
          originalError.name === 'SecurityError' || 
          originalError.name === 'StorageDisabledError' ||
          originalError.name === 'SerializationError' ||
          originalError.name === 'ValidationError' ||
          (originalError.name === 'TypeError' && originalError.message.toLowerCase().includes('storage'))) {
        // Handle TypeError with storage message by converting it to StorageDisabledError
        if (originalError.name === 'TypeError' && originalError.message.toLowerCase().includes('storage')) {
          throw this.createError('StorageDisabledError', `Storage is disabled or unavailable for key: ${key}`, originalError);
        }
        // Ensure custom error properties are set even if error has correct name
        const enhancedError = this.createError(
          originalError.name as StorageError['name'], 
          originalError.message, 
          originalError
        );
        throw enhancedError;
      }

      if (this.CONFIG.enableRetry && attempts < this.CONFIG.maxRetries) {
        await this.delay(this.CONFIG.retryDelay * (attempts + 1));
        return this.attemptStorageOperation(key, operation, attempts + 1);
      }

      if (originalError.name === 'QuotaExceededError') {
        throw this.createError('QuotaExceededError', `Storage quota exceeded for key: ${key}`, originalError);
      }

      if (originalError.name === 'SecurityError' || originalError.message.toLowerCase().includes('security')) {
        throw this.createError('SecurityError', `Security error accessing storage for key: ${key}`, originalError);
      }

      throw this.createError('UnknownError', `Unknown storage error for key: ${key}`, originalError);
    }
  }

  private async writeToStorage(
    storage: Storage, 
    key: string, 
    value: unknown, 
    attempts: number = 0
  ): Promise<void> {
    await this.attemptStorageOperation(key, () => {
      const fullKey = this.getFullKey(key);
      const metadata: StorageMetadata = {
        version: this.CURRENT_VERSION,
        timestamp: Date.now()
      };

      const payload = {
        data: value,
        metadata
      };

      if (this.CONFIG.enableValidation) {
        metadata.checksum = this.generateChecksum(value);
      }

      const serialized = JSON.stringify(payload);
      storage.setItem(fullKey, serialized);
    }, attempts);
  }

  private async readFromStorage<T>(
    storage: Storage, 
    key: string, 
    attempts: number = 0
  ): Promise<T | null> {
    return await this.attemptStorageOperation(key, () => {
      const fullKey = this.getFullKey(key);
      const serialized = storage.getItem(fullKey);

      if (serialized === null) {
        return null;
      }

      try {
        const payload = JSON.parse(serialized);
        
        if (!payload.metadata || !payload.data) {
          throw new Error('Invalid storage payload structure');
        }

        if (this.CONFIG.enableValidation && payload.metadata.checksum) {
          const expectedChecksum = this.generateChecksum(payload.data);
          if (payload.metadata.checksum !== expectedChecksum) {
            throw new Error('Data integrity check failed');
          }
        }

        if (!this.validateData(key, payload.data)) {
          throw new Error('Data validation failed');
        }

        return payload.data as T;
      } catch (error) {
        const originalError = error as Error;
        if (originalError instanceof SyntaxError) {
          const serializationError = this.createError('SerializationError', `Invalid JSON format for key: ${key}`, originalError);
          throw serializationError;
        }
        if (originalError.message.includes('Invalid storage payload structure') || 
            originalError.message.includes('Data integrity check failed') || 
            originalError.message.includes('Data validation failed')) {
          const validationError = this.createError('ValidationError', `Data validation failed for key: ${key}`, originalError);
          throw validationError;
        }
        throw originalError;
      }
    }, attempts);
  }

  private async tryAllStoragesForWrite<T>(key: string, value: T): Promise<StorageResult<T>> {
    let lastError: StorageError | undefined;

    for (const storage of this.supportedStorage) {
      try {
        await this.writeToStorage(storage, key, value);
        
        const fallbackUsed = storage !== this.supportedStorage[0];
        if (fallbackUsed) {
          this.fallbackToSessionStorage = storage === sessionStorage;
        }

        return {
          success: true,
          data: value,
          fallbackUsed
        };
      } catch (error) {
        lastError = error as StorageError;
        continue;
      }
    }

    // Ensure we preserve the full error object with all properties
    return {
      success: false,
      error: lastError
    };
  }

  private async tryAllStoragesForRead<T>(key: string): Promise<StorageResult<T>> {
    let lastError: StorageError | undefined;

    for (const storage of this.supportedStorage) {
      try {
        const data = await this.readFromStorage<T>(storage, key);
        if (data !== null) {
          const fallbackUsed = storage !== this.supportedStorage[0];
          return {
            success: true,
            data,
            fallbackUsed
          };
        }
      } catch (error) {
        lastError = error as StorageError;
        continue;
      }
    }

    return {
      success: false,
      error: lastError
    };
  }

  async setItem<T>(key: string, value: T): Promise<StorageResult<T>> {
    if (!this.CONFIG.enableValidation || this.validateData(key, value)) {
      return await this.tryAllStoragesForWrite(key, value);
    } else {
      return {
        success: false,
        error: this.createError('ValidationError', `Data validation failed for key: ${key}`)
      };
    }
  }

  async getItem<T>(key: string): Promise<StorageResult<T>> {
    return await this.tryAllStoragesForRead<T>(key);
  }

  async removeItem(key: string): Promise<StorageResult<boolean>> {
    let lastError: StorageError | undefined;

    for (const storage of this.supportedStorage) {
      try {
        await this.attemptStorageOperation(key, () => {
          const fullKey = this.getFullKey(key);
          storage.removeItem(fullKey);
        });

        const fallbackUsed = storage !== this.supportedStorage[0];
        return {
          success: true,
          data: true,
          fallbackUsed
        };
      } catch (error) {
        lastError = error as StorageError;
        continue;
      }
    }

    return {
      success: false,
      error: lastError
    };
  }

  async clear(prefix?: string): Promise<StorageResult<boolean>> {
    let lastError: StorageError | undefined;
    const searchPrefix = prefix ? this.getFullKey(prefix) : this.STORAGE_PREFIX;

    for (const storage of this.supportedStorage) {
      try {
        await this.attemptStorageOperation('clear', () => {
          const keysToRemove: string[] = [];
          for (let i = 0; i < storage.length; i++) {
            const key = storage.key(i);
            if (key && key.startsWith(searchPrefix)) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach(key => storage.removeItem(key));
        });

        const fallbackUsed = storage !== this.supportedStorage[0];
        return {
          success: true,
          data: true,
          fallbackUsed
        };
      } catch (error) {
        lastError = error as StorageError;
        continue;
      }
    }

    return {
      success: false,
      error: lastError
    };
  }

  async getStorageUsage(): Promise<StorageResult<{ used: number; available: number; percentage: number }>> {
    try {
      if (!this.supportedStorage.length) {
        return {
          success: false,
          error: this.createError('StorageDisabledError', 'No storage available')
        };
      }

      let totalUsed = 0;
      for (const storage of this.supportedStorage) {
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (key && key.startsWith(this.STORAGE_PREFIX)) {
            const value = storage.getItem(key);
            if (value) {
              totalUsed += new Blob([key + value]).size;
            }
          }
        }
      }

      const estimatedTotal = 5 * 1024 * 1024;
      const percentage = Math.min((totalUsed / estimatedTotal) * 100, 100);

      return {
        success: true,
        data: {
          used: totalUsed,
          available: estimatedTotal - totalUsed,
          percentage
        }
      };
    } catch (error) {
      return {
        success: false,
        error: this.createError('UnknownError', 'Failed to calculate storage usage', error as Error)
      };
    }
  }

  isUsingFallbackStorage(): boolean {
    return this.fallbackToSessionStorage;
  }

  getStorageStatus(): {
    localStorage: boolean;
    sessionStorage: boolean;
    fallbackActive: boolean;
  } {
    return {
      localStorage: this.isLocalStorageAvailable(),
      sessionStorage: this.isSessionStorageAvailable(),
      fallbackActive: this.isUsingFallbackStorage()
    };
  }
}