import { Injectable, inject } from '@angular/core';
import { Task } from '../models/task.model';

export interface StorageError extends Error {
  name: 'QuotaExceededError' | 'SecurityError' | 'StorageDisabledError' | 'SerializationError' | 'ValidationError' | 'UnknownError' | 'CorruptionError' | 'BackupError' | 'RecoveryError';
  isQuotaExceeded?: boolean;
  isSecurityError?: boolean;
  isStorageDisabled?: boolean;
  isCorruption?: boolean;
  isBackupError?: boolean;
  isRecoveryError?: boolean;
  corruptedData?: unknown;
  backupId?: string;
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
  enableCRC32: boolean;
  enableBackups: boolean;
  enableAnalytics: boolean;
}

export interface StorageMetadata {
  version: string;
  timestamp: number;
  checksum?: string;
  crc32?: string;
  backupId?: string;
  operation?: 'create' | 'update' | 'delete';
}

export interface BackupSnapshot {
  id: string;
  timestamp: number;
  data: unknown;
  metadata: StorageMetadata;
  operation: 'create' | 'update' | 'delete' | 'snapshot';
  key: string;
  compressed: boolean;
}

export interface BackupConfig {
  enableAutomatic: boolean;
  maxBackups: number;
  retentionDays: number;
  compressionEnabled: boolean;
  cleanupThreshold: number; // percentage of storage used
}

export interface StorageAnalytics {
  totalOperations: number;
  backupOperations: number;
  recoveryOperations: number;
  quotaExceededEvents: number;
  corruptionEvents: number;
  averageDataSize: number;
  peakUsage: number;
  currentUsage: number;
  availableSpace: number;
  usagePercentage: number;
  operationFrequency: { [key: string]: number };
  backupSizeDistribution: { [sizeRange: string]: number };
}

export interface QuotaMonitor {
  warningThreshold: number; // percentage
  criticalThreshold: number; // percentage
  autoCleanup: boolean;
  cleanupStrategies: ('old-backups' | 'compressed-backups' | 'clear-cache')[];
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
    enableCompression: false,
    enableCRC32: true,
    enableBackups: true,
    enableAnalytics: true
  };

  private readonly BACKUP_CONFIG: BackupConfig = {
    enableAutomatic: true,
    maxBackups: 10,
    retentionDays: 30,
    compressionEnabled: false,
    cleanupThreshold: 80
  };

  private readonly QUOTA_MONITOR: QuotaMonitor = {
    warningThreshold: 70,
    criticalThreshold: 90,
    autoCleanup: true,
    cleanupStrategies: ['old-backups', 'compressed-backups', 'clear-cache']
  };

  private readonly BACKUP_PREFIX = 'taskgo_backup_';
  private readonly ANALYTICS_KEY = 'taskgo_storage_analytics';
  private readonly QUOTA_KEY = 'taskgo_quota_info';

  private readonly STORAGE_PREFIX = 'taskgo_';
  private readonly CURRENT_VERSION = '1.0.0';
  private readonly STORAGE_KEY_PREFIX = 'tg_';

  private readonly supportedStorage: Storage[] = [];
  private fallbackToSessionStorage = false;
  private analytics: StorageAnalytics = {
    totalOperations: 0,
    backupOperations: 0,
    recoveryOperations: 0,
    quotaExceededEvents: 0,
    corruptionEvents: 0,
    averageDataSize: 0,
    peakUsage: 0,
    currentUsage: 0,
    availableSpace: 5 * 1024 * 1024, // 5MB estimate
    usagePercentage: 0,
    operationFrequency: {},
    backupSizeDistribution: {}
  };

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

  private createError(name: StorageError['name'], message: string, originalError?: Error, additionalData?: any): StorageError {
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
      case 'CorruptionError':
        error.isCorruption = true;
        error.corruptedData = additionalData?.corruptedData;
        break;
      case 'BackupError':
        error.isBackupError = true;
        error.backupId = additionalData?.backupId;
        break;
      case 'RecoveryError':
        error.isRecoveryError = true;
        break;
    }

    return error;
  }

  /**
   * Update operation frequency tracking
   */
  private updateOperationFrequency(key: string): void {
    if (!this.CONFIG.enableAnalytics) {
      return;
    }

    this.analytics.operationFrequency[key] = (this.analytics.operationFrequency[key] || 0) + 1;
    
    // Update average data size
    const allKeys = Object.keys(this.analytics.operationFrequency);
    if (allKeys.length > 0) {
      this.analytics.averageDataSize = this.analytics.currentUsage / allKeys.length;
    }
  }

  /**
   * Export all data with backups and metadata
   */
  async exportData(): Promise<StorageResult<{ data: any; backups: BackupSnapshot[]; analytics: StorageAnalytics; exportedAt: number }>> {
    try {
      const exportData: any = { tasks: [], settings: {} };
      const allBackups: BackupSnapshot[] = [];
      
      // Export main data
      for (const storage of this.supportedStorage) {
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (key && key.startsWith(this.getStorageKey(''))) {
            try {
              const value = storage.getItem(key);
              if (value) {
                const cleanKey = key.replace(this.getStorageKey(''), '');
                if (!cleanKey.startsWith('backup_') && cleanKey !== this.ANALYTICS_KEY) {
                  const result = await this.readFromStorage(storage, cleanKey);
                  if (result !== null) {
                    exportData[cleanKey] = result;
                  }
                }
              }
            } catch (error) {
              console.warn(`Failed to export key ${key}:`, error);
            }
          }
        }
      }

      // Export all backups
      for (const storage of this.supportedStorage) {
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (key && key.startsWith(this.BACKUP_PREFIX)) {
            try {
              const value = storage.getItem(key);
              if (value) {
                const backup: BackupSnapshot = JSON.parse(value);
                allBackups.push(backup);
              }
            } catch (error) {
              console.warn(`Failed to export backup ${key}:`, error);
            }
          }
        }
      }

      const exportPackage = {
        data: exportData,
        backups: allBackups,
        analytics: this.analytics,
        exportedAt: Date.now(),
        version: this.CURRENT_VERSION
      };

      return {
        success: true,
        data: exportPackage
      };
    } catch (error) {
      return {
        success: false,
        error: this.createError('UnknownError', 'Export failed', error as Error)
      };
    }
  }

  /**
   * Import data with validation and recovery options
   */
  async importData(importPackage: { data: any; backups: BackupSnapshot[]; analytics: StorageAnalytics; exportedAt: number; version: string }, options: { overwrite: boolean; createBackups: boolean } = { overwrite: false, createBackups: true }): Promise<StorageResult<boolean>> {
    try {
      // Validate import package structure
      if (!importPackage.data || !importPackage.backups || !Array.isArray(importPackage.backups)) {
        throw new Error('Invalid import package structure');
      }

      // Create backup of current data if requested
      if (options.createBackups) {
        await this.exportData().then(exportResult => {
          if (exportResult.success) {
            const backupKey = `import_backup_${Date.now()}`;
            this.tryAllStoragesForWrite(backupKey, exportResult.data);
          }
        });
      }

      // Import main data
      for (const [key, value] of Object.entries(importPackage.data)) {
        if (options.overwrite || !(await this.getItem(key)).success) {
          const result = await this.setItem(key, value);
          if (!result.success && result.error) {
            console.warn(`Failed to import key ${key}:`, result.error.message);
          }
        }
      }

      // Import backups
      for (const backup of importPackage.backups) {
        const backupKey = `${this.BACKUP_PREFIX}${backup.key}_${backup.id}`;
        const result = await this.tryAllStoragesForWrite(backupKey, backup);
        if (!result.success) {
          console.warn(`Failed to import backup ${backup.id}:`, result.error?.message);
        }
      }

      // Update analytics if available
      if (importPackage.analytics) {
        this.analytics = { ...this.analytics, ...importPackage.analytics };
        this.saveAnalytics();
      }

      return {
        success: true,
        data: true
      };
    } catch (error) {
      return {
        success: false,
        error: this.createError('UnknownError', 'Import failed', error as Error)
      };
    }
  }

  /**
   * Get comprehensive storage analytics
   */
  async getStorageAnalytics(): Promise<StorageResult<StorageAnalytics>> {
    try {
      // Update current usage
      this.updateCurrentUsage();
      
      // Calculate backup size distribution
      await this.calculateBackupSizeDistribution();
      
      return {
        success: true,
        data: { ...this.analytics }
      };
    } catch (error) {
      return {
        success: false,
        error: this.createError('UnknownError', 'Failed to get analytics', error as Error)
      };
    }
  }

  /**
   * Calculate backup size distribution for analytics
   */
  private async calculateBackupSizeDistribution(): Promise<void> {
    try {
      const sizeRanges = {
        '<1KB': 0,
        '1-10KB': 0,
        '10-100KB': 0,
        '100KB-1MB': 0,
        '>1MB': 0
      };

      for (const storage of this.supportedStorage) {
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (key && key.startsWith(this.BACKUP_PREFIX)) {
            const value = storage.getItem(key);
            if (value) {
              const size = new Blob([key + value]).size;
              
              if (size < 1024) sizeRanges['<1KB']++;
              else if (size < 10240) sizeRanges['1-10KB']++;
              else if (size < 102400) sizeRanges['10-100KB']++;
              else if (size < 1048576) sizeRanges['100KB-1MB']++;
              else sizeRanges['>1MB']++;
            }
          }
        }
      }

      this.analytics.backupSizeDistribution = sizeRanges;
    } catch (error) {
      console.warn('Failed to calculate backup size distribution:', error);
    }
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

  /**
   * Generate CRC32 checksum for robust data integrity checking
   */
  private generateCRC32(data: any): string {
    const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
    const crcTable = this.generateCRCTable();
    
    let crc = 0 ^ (-1);
    for (let i = 0; i < dataStr.length; i++) {
      const code = dataStr.charCodeAt(i);
      crc = (crc >>> 8) ^ crcTable[(crc ^ code) & 0xFF];
    }
    
    // Convert to positive number and then to hex string
    return ((crc ^ (-1)) >>> 0).toString(16).padStart(8, '0');
  }

  /**
   * Generate CRC32 lookup table for efficient calculation
   */
  private generateCRCTable(): number[] {
    const table: number[] = [];
    
    for (let i = 0; i < 256; i++) {
      let code = i;
      for (let j = 0; j < 8; j++) {
        code = (code & 1) ? (0xEDB88320 ^ (code >>> 1)) : (code >>> 1);
      }
      table[i] = code;
    }
    
    return table;
  }

  /**
   * Create backup snapshot before major operations
   */
  private async createBackupSnapshot(key: string, data: unknown, operation: 'create' | 'update' | 'delete'): Promise<BackupSnapshot | null> {
    if (!this.CONFIG.enableBackups || !this.BACKUP_CONFIG.enableAutomatic) {
      return null;
    }

    try {
      const backupId = this.generateSecureId();
      const timestamp = Date.now();
      
      const metadata: StorageMetadata = {
        version: this.CURRENT_VERSION,
        timestamp,
        checksum: this.generateChecksum(data),
        crc32: this.CONFIG.enableCRC32 ? this.generateCRC32(data) : undefined,
        backupId,
        operation
      };

      const backup: BackupSnapshot = {
        id: backupId,
        timestamp,
        data,
        metadata,
        operation,
        key,
        compressed: this.BACKUP_CONFIG.compressionEnabled
      };

      // Store backup with proper key naming
      const backupKey = `${this.BACKUP_PREFIX}${key}_${backupId}`;
      const backupResult = await this.tryAllStoragesForWrite(backupKey, backup);
      
      if (backupResult.success) {
        this.analytics.backupOperations++;
        this.updateAnalytics();
        
        // Clean old backups if needed
        await this.cleanupOldBackups(key);
        
        // Check quota and cleanup if needed
        await this.checkQuotaAndCleanup();
        
        return backup;
      }
      
      return null;
    } catch (error) {
      console.warn('Failed to create backup snapshot:', error);
      return null;
    }
  }

  /**
   * Generate secure random ID for backups and operations
   */
  private generateSecureId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    return `${timestamp}_${random}`;
  }

  /**
   * Clean old backups based on retention policy
   */
  private async cleanupOldBackups(key: string): Promise<void> {
    try {
      const cutoffTime = Date.now() - (this.BACKUP_CONFIG.retentionDays * 24 * 60 * 60 * 1000);
      const allBackups = await this.getAllBackupsForkey(key);
      
      // Sort by timestamp (newest first)
      const sortedBackups = allBackups
        .filter(backup => backup.timestamp < cutoffTime)
        .sort((a, b) => b.timestamp - a.timestamp);

      // Keep only the most recent backups within retention period
      const backupsToDelete = sortedBackups.slice(this.BACKUP_CONFIG.maxBackups);
      
      for (const backup of backupsToDelete) {
        const backupKey = `${this.BACKUP_PREFIX}${key}_${backup.id}`;
        await this.tryAllStoragesForDelete(backupKey);
      }
    } catch (error) {
      console.warn('Failed to cleanup old backups:', error);
    }
  }

  /**
   * Get all backups for a specific key
   */
  private async getAllBackupsForkey(key: string): Promise<BackupSnapshot[]> {
    const backups: BackupSnapshot[] = [];
    
    for (const storage of this.supportedStorage) {
      const keysToRemove: string[] = [];
      
      // Find all backup keys for this storage
      for (let i = 0; i < storage.length; i++) {
        const storageKey = storage.key(i);
        if (storageKey && storageKey.startsWith(`${this.BACKUP_PREFIX}${key}_`)) {
          try {
            const result = await this.readFromStorage<BackupSnapshot>(storage, storageKey);
            if (result.success && result.data) {
              backups.push(result.data);
            }
          } catch (error) {
            // Remove corrupted backup
            keysToRemove.push(storageKey);
          }
        }
      }
      
      // Clean up corrupted backups
      for (const corruptedKey of keysToRemove) {
        storage.removeItem(corruptedKey);
      }
    }
    
    return backups;
  }

  /**
   * Try all storages for delete operation
   */
  private async tryAllStoragesForDelete(key: string): Promise<StorageResult<boolean>> {
    let lastError: StorageError | undefined;

    for (const storage of this.supportedStorage) {
      try {
        await this.attemptStorageOperation(key, () => {
          storage.removeItem(key);
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

  /**
   * Check storage quota and perform cleanup if needed
   */
  private async checkQuotaAndCleanup(): Promise<void> {
    try {
      const usage = await this.getStorageUsage();
      
      if (!usage.success || !usage.data) {
        return;
      }

      const { percentage } = usage.data;
      
      if (percentage >= this.QUOTA_MONITOR.criticalThreshold && this.QUOTA_MONITOR.autoCleanup) {
        await this.performQuotaCleanup(percentage);
      }
    } catch (error) {
      console.warn('Failed to check quota and cleanup:', error);
    }
  }

  /**
   * Perform quota cleanup based on configured strategies
   */
  private async performQuotaCleanup(currentUsage: number): Promise<void> {
    console.warn(`Storage usage at ${currentUsage.toFixed(1)}%, performing cleanup...`);
    
    for (const strategy of this.QUOTA_MONITOR.cleanupStrategies) {
      try {
        switch (strategy) {
          case 'old-backups':
            await this.cleanupOldBackupsByPolicy();
            break;
          case 'compressed-backups':
            await this.compressOldBackups();
            break;
          case 'clear-cache':
            await this.clearCacheData();
            break;
        }
        
        // Check if cleanup was sufficient
        const newUsage = await this.getStorageUsage();
        if (newUsage.success && newUsage.data && newUsage.data.percentage < this.QUOTA_MONITOR.warningThreshold) {
          console.log('Cleanup successful, storage usage reduced');
          break;
        }
      } catch (error) {
        console.warn(`Cleanup strategy ${strategy} failed:`, error);
      }
    }
  }

  /**
   * Cleanup old backups by retention policy
   */
  private async cleanupOldBackupsByPolicy(): Promise<void> {
    try {
      const allKeys = new Set<string>();
      
      // Collect all unique keys that have backups
      for (const storage of this.supportedStorage) {
        for (let i = 0; i < storage.length; i++) {
          const storageKey = storage.key(i);
          if (storageKey && storageKey.startsWith(this.BACKUP_PREFIX)) {
            const keyMatch = storageKey.match(new RegExp(`${this.BACKUP_PREFIX.replace('_', '_')}(.*?)_`));
            if (keyMatch) {
              allKeys.add(keyMatch[1]);
            }
          }
        }
      }
      
      // Cleanup backups for each key
      for (const key of allKeys) {
        await this.cleanupOldBackups(key);
      }
    } catch (error) {
      console.warn('Failed to cleanup old backups by policy:', error);
    }
  }

  /**
   * Compress old backups to save space
   */
  private async compressOldBackups(): Promise<void> {
    console.log('Backup compression not implemented yet');
    // Implementation would involve compressing backup data
    // This is a placeholder for future enhancement
  }

  /**
   * Clear cache data to free up space
   */
  private async clearCacheData(): Promise<void> {
    try {
      // Clear analytics cache
      await this.removeItem(this.ANALYTICS_KEY);
      
      // Clear any temporary cache entries
      await this.clear('cache_');
    } catch (error) {
      console.warn('Failed to clear cache data:', error);
    }
  }

  /**
   * Update analytics information
   */
  private updateAnalytics(): void {
    if (!this.CONFIG.enableAnalytics) {
      return;
    }

    try {
      this.analytics.totalOperations++;
      
      // Update current usage
      this.updateCurrentUsage();
      
      // Save analytics to storage
      this.saveAnalytics();
    } catch (error) {
      console.warn('Failed to update analytics:', error);
    }
  }

  /**
   * Update current storage usage
   */
  private updateCurrentUsage(): void {
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
    
    this.analytics.currentUsage = totalUsed;
    this.analytics.usagePercentage = Math.min((totalUsed / this.analytics.availableSpace) * 100, 100);
    this.analytics.peakUsage = Math.max(this.analytics.peakUsage, totalUsed);
  }

  /**
   * Save analytics to storage
   */
  private saveAnalytics(): void {
    try {
      for (const storage of this.supportedStorage) {
        const analyticsKey = this.getFullKey(this.ANALYTICS_KEY);
        storage.setItem(analyticsKey, JSON.stringify(this.analytics));
        break; // Save to first available storage
      }
    } catch (error) {
      console.warn('Failed to save analytics:', error);
    }
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
    attempts: number = 0,
    operation: 'create' | 'update' | 'delete' = 'update'
  ): Promise<void> {
    await this.attemptStorageOperation(key, async () => {
      const fullKey = this.getFullKey(key);
      
      // Create backup before major operations
      const backup = await this.createBackupSnapshot(key, value, operation);
      
      const metadata: StorageMetadata = {
        version: this.CURRENT_VERSION,
        timestamp: Date.now(),
        backupId: backup?.id,
        operation
      };

      const payload = {
        data: value,
        metadata
      };

      // Add basic checksum
      if (this.CONFIG.enableValidation) {
        metadata.checksum = this.generateChecksum(value);
      }

      // Add CRC32 checksum if enabled
      if (this.CONFIG.enableCRC32) {
        metadata.crc32 = this.generateCRC32(value);
      }

      const serialized = JSON.stringify(payload);
      
      // Check quota before writing
      const dataSize = new Blob([fullKey + serialized]).size;
      const usageResult = await this.getStorageUsage();
      
      if (usageResult.success && usageResult.data) {
        const newSize = usageResult.data.used + dataSize;
        if (newSize > usageResult.data.available) {
          this.analytics.quotaExceededEvents++;
          throw this.createError('QuotaExceededError', `Storage quota exceeded. Required: ${dataSize} bytes, Available: ${usageResult.data.available - usageResult.data.used} bytes`);
        }
      }

      storage.setItem(fullKey, serialized);
      
      // Update analytics
      this.updateAnalytics();
      this.updateOperationFrequency(key);
      
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

        // Perform multiple integrity checks
        const integrityCheck = this.performIntegrityCheck(payload, key);
        if (!integrityCheck.isValid) {
          // Attempt recovery from backups
          const recoveredData = this.attemptDataRecovery<T>(key, integrityCheck);
          if (recoveredData) {
            this.analytics.recoveryOperations++;
            this.updateAnalytics();
            return recoveredData;
          }
          
          throw this.createError('CorruptionError', 
            `Data corruption detected for key: ${key}. ${integrityCheck.error}`, 
            new Error(integrityCheck.error),
            { corruptedData: payload }
          );
        }

        if (!this.validateData(key, payload.data)) {
          throw new Error('Data validation failed');
        }

        return payload.data as T;
      } catch (error) {
        const originalError = error as Error;
        
        // Handle corruption errors specifically
        if (originalError instanceof SyntaxError) {
          const recoveredData = this.attemptDataRecovery<T>(key, { isValid: false, error: 'JSON parsing failed' });
          if (recoveredData) {
            return recoveredData;
          }
          
          const serializationError = this.createError('SerializationError', `Invalid JSON format for key: ${key}`, originalError);
          throw serializationError;
        }
        
        if (originalError.message.includes('Invalid storage payload structure') || 
            originalError.message.includes('Data integrity check failed') || 
            originalError.message.includes('Data validation failed') ||
            originalError.name === 'CorruptionError') {
          
          // Try recovery before throwing validation error
          const recoveredData = this.attemptDataRecovery<T>(key, { isValid: false, error: originalError.message });
          if (recoveredData) {
            return recoveredData;
          }
          
          const validationError = this.createError('ValidationError', `Data validation failed for key: ${key}`, originalError);
          throw validationError;
        }
        
        throw originalError;
      }
    }, attempts);
  }

  /**
   * Perform comprehensive integrity check on payload
   */
  private performIntegrityCheck(payload: any, key: string): { isValid: boolean; error?: string } {
    try {
      // Check basic payload structure
      if (!payload.metadata || !payload.data) {
        return { isValid: false, error: 'Invalid storage payload structure' };
      }

      const metadata = payload.metadata;
      const data = payload.data;

      // Check basic checksum
      if (this.CONFIG.enableValidation && metadata.checksum) {
        const expectedChecksum = this.generateChecksum(data);
        if (metadata.checksum !== expectedChecksum) {
          return { isValid: false, error: 'Basic checksum mismatch - data corruption detected' };
        }
      }

      // Check CRC32 if enabled
      if (this.CONFIG.enableCRC32 && metadata.crc32) {
        const expectedCRC32 = this.generateCRC32(data);
        if (metadata.crc32 !== expectedCRC32) {
          this.analytics.corruptionEvents++;
          return { isValid: false, error: 'CRC32 checksum mismatch - data corruption detected' };
        }
      }

      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: `Integrity check failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  /**
   * Attempt data recovery from backups
   */
  private async attemptDataRecovery<T>(key: string, integrityCheck: { isValid: boolean; error?: string }): Promise<T | null> {
    if (!this.CONFIG.enableBackups) {
      return null;
    }

    try {
      console.warn(`Attempting data recovery for key: ${key} - ${integrityCheck.error}`);
      
      const backups = await this.getAllBackupsForkey(key);
      
      // Sort backups by timestamp (newest first) and find first valid backup
      for (const backup of backups.sort((a, b) => b.timestamp - a.timestamp)) {
        const backupIntegrityCheck = this.performIntegrityCheck({ metadata: backup.metadata, data: backup.data }, key);
        
        if (backupIntegrityCheck.isValid && this.validateData(key, backup.data)) {
          console.log(`Successfully recovered data for key: ${key} from backup: ${backup.id}`);
          
          // Restore the valid backup data
          const restoreResult = await this.tryAllStoragesForWrite(key, backup.data);
          if (restoreResult.success) {
            return backup.data as T;
          }
        }
      }
      
      console.error(`No valid backup found for key: ${key}`);
      return null;
    } catch (error) {
      console.error(`Data recovery failed for key: ${key}:`, error);
      return null;
    }
  }

  private async tryAllStoragesForWrite<T>(key: string, value: T, operation: 'create' | 'update' | 'delete' = 'update'): Promise<StorageResult<T>> {
    let lastError: StorageError | undefined;

    for (const storage of this.supportedStorage) {
      try {
        await this.writeToStorage(storage, key, value, 0, operation);
        
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

  async setItem<T>(key: string, value: T, operation: 'create' | 'update' | 'delete' = 'update'): Promise<StorageResult<T>> {
    if (!this.CONFIG.enableValidation || this.validateData(key, value)) {
      return await this.tryAllStoragesForWrite(key, value, operation);
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

  /**
   * Get backup management methods
   */
  async getBackupHistory(key: string): Promise<StorageResult<BackupSnapshot[]>> {
    try {
      const backups = await this.getAllBackupsForkey(key);
      return {
        success: true,
        data: backups.sort((a, b) => b.timestamp - a.timestamp) // Newest first
      };
    } catch (error) {
      return {
        success: false,
        error: this.createError('UnknownError', 'Failed to get backup history', error as Error)
      };
    }
  }

  async restoreFromBackup(key: string, backupId: string): Promise<StorageResult<unknown>> {
    try {
      const backups = await this.getAllBackupsForkey(key);
      const backupToRestore = backups.find(backup => backup.id === backupId);
      
      if (!backupToRestore) {
        throw new Error(`Backup ${backupId} not found for key ${key}`);
      }

      const integrityCheck = this.performIntegrityCheck({ metadata: backupToRestore.metadata, data: backupToRestore.data }, key);
      if (!integrityCheck.isValid) {
        throw new Error(`Backup ${backupId} is corrupted: ${integrityCheck.error}`);
      }

      // Create backup before restore
      await this.createBackupSnapshot(key, backupToRestore.data, 'update');
      
      // Restore the backup data
      const result = await this.setItem(key, backupToRestore.data);
      
      if (result.success) {
        console.log(`Successfully restored key ${key} from backup ${backupId}`);
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: this.createError('RecoveryError', `Failed to restore from backup: ${error instanceof Error ? error.message : 'Unknown error'}`, error as Error)
      };
    }
  }

  async cleanupAllBackups(): Promise<StorageResult<boolean>> {
    try {
      const allKeys = new Set<string>();
      
      // Collect all unique keys that have backups
      for (const storage of this.supportedStorage) {
        for (let i = 0; i < storage.length; i++) {
          const storageKey = storage.key(i);
          if (storageKey && storageKey.startsWith(this.BACKUP_PREFIX)) {
            const keyMatch = storageKey.match(new RegExp(`${this.BACKUP_PREFIX.replace('_', '_')}(.*?)_`));
            if (keyMatch) {
              allKeys.add(keyMatch[1]);
            }
          }
        }
      }
      
      // Cleanup backups for each key
      for (const key of allKeys) {
        await this.cleanupOldBackups(key);
      }
      
      return {
        success: true,
        data: true
      };
    } catch (error) {
      return {
        success: false,
        error: this.createError('UnknownError', 'Failed to cleanup backups', error as Error)
      };
    }
  }

  async getStorageHealthReport(): Promise<StorageResult<{
    status: 'healthy' | 'warning' | 'critical';
    usage: { used: number; available: number; percentage: number };
    analytics: StorageAnalytics;
    backupCount: number;
    corruptionEvents: number;
    recommendations: string[];
  }>> {
    try {
      const usageResult = await this.getStorageUsage();
      const analyticsResult = await this.getStorageAnalytics();
      
      if (!usageResult.success || !analyticsResult.success) {
        throw new Error('Failed to get storage health data');
      }

      const usage = usageResult.data!;
      const analytics = analyticsResult.data!;
      
      // Count total backups
      let backupCount = 0;
      for (const storage of this.supportedStorage) {
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (key && key.startsWith(this.BACKUP_PREFIX)) {
            backupCount++;
          }
        }
      }

      // Determine status
      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      const recommendations: string[] = [];

      if (usage.percentage >= this.QUOTA_MONITOR.criticalThreshold) {
        status = 'critical';
        recommendations.push('Immediate cleanup required - storage usage critical');
      } else if (usage.percentage >= this.QUOTA_MONITOR.warningThreshold) {
        status = 'warning';
        recommendations.push('Storage usage high - consider cleanup');
      }

      if (analytics.corruptionEvents > 0) {
        status = status === 'critical' ? 'critical' : 'warning';
        recommendations.push(`${analytics.corruptionEvents} corruption events detected`);
      }

      if (backupCount > this.BACKUP_CONFIG.maxBackups * 2) {
        recommendations.push('Excessive backups - cleanup recommended');
      }

      if (recommendations.length === 0) {
        recommendations.push('Storage system operating normally');
      }

      return {
        success: true,
        data: {
          status,
          usage,
          analytics,
          backupCount,
          corruptionEvents: analytics.corruptionEvents,
          recommendations
        }
      };
    } catch (error) {
      return {
        success: false,
        error: this.createError('UnknownError', 'Failed to generate health report', error as Error)
      };
    }
  }

  updateStorageConfig(config: Partial<StorageConfig>): void {
    this.CONFIG = { ...this.CONFIG, ...config };
  }

  updateBackupConfig(config: Partial<BackupConfig>): void {
    Object.assign(this.BACKUP_CONFIG, config);
  }

  updateQuotaMonitor(config: Partial<QuotaMonitor>): void {
    Object.assign(this.QUOTA_MONITOR, config);
  }

  getConfig(): { storage: StorageConfig; backup: BackupConfig; quota: QuotaMonitor } {
    return {
      storage: { ...this.CONFIG },
      backup: { ...this.BACKUP_CONFIG },
      quota: { ...this.QUOTA_MONITOR }
    };
  }
}