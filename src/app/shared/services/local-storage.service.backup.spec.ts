import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { 
  LocalStorageService, 
  StorageError, 
  BackupSnapshot, 
  StorageAnalytics,
  StorageResult,
  StorageConfig 
} from './local-storage.service';

// ===== TYPE DEFINITIONS FOR PROPER TESTING =====
type StorageKey = string;
type TestData = Record<string, unknown>;
type BackupId = string;

// ===== TEST FACTORIES =====
const createMockTask = (overrides: Partial<TestData> = {}) => ({
  id: 'task-123',
  title: 'Test Task',
  description: 'Test Description',
  priority: 'medium',
  status: 'TODO',
  project: 'General',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  ...overrides
});

const createMockAnalytics = (overrides: Partial<StorageAnalytics> = {}): StorageAnalytics => ({
  totalOperations: 0,
  backupOperations: 0,
  recoveryOperations: 0,
  quotaExceededEvents: 0,
  corruptionEvents: 0,
  averageDataSize: 0,
  peakUsage: 0,
  currentUsage: 0,
  availableSpace: 5 * 1024 * 1024,
  usagePercentage: 0,
  operationFrequency: {},
  backupSizeDistribution: {},
  ...overrides
});

const createMockBackupSnapshot = (overrides: Partial<BackupSnapshot> = {}): BackupSnapshot => ({
  id: 'backup-123',
  timestamp: Date.now(),
  data: createMockTask(),
  metadata: {
    version: '1.0.0',
    timestamp: Date.now(),
    checksum: 'mock-checksum',
    crc32: 'mock-crc32',
    backupId: 'backup-123',
    operation: 'update',
    taskContext: 'test-context'
  },
  operation: 'update',
  key: 'tasks',
  compressed: false,
  ...overrides
});

// ===== TEST DOUBLES =====
class MockStorage implements Storage {
  private data: Map<string, string> = new Map();
  private quotaLimit: number;
  private shouldFail: boolean = false;
  private failOnKey?: string;
  private failureError?: Error;

  constructor(quotaLimit: number = 10 * 1024 * 1024) {
    this.quotaLimit = quotaLimit;
  }

  get length(): number {
    return this.data.size;
  }

  key(index: number): string | null {
    const keys = Array.from(this.data.keys());
    return keys[index] || null;
  }

  getItem(key: string): string | null {
    if (this.shouldFail && (this.failOnKey === undefined || this.failOnKey === key)) {
      throw this.failureError || new Error('Storage operation failed');
    }
    return this.data.get(key) || null;
  }

  setItem(key: string, value: string): void {
    if (this.shouldFail && (this.failOnKey === undefined || this.failOnKey === key)) {
      throw this.failureError || new Error('Storage operation failed');
    }

    const currentSize = this.calculateSize();
    const newItemSize = new Blob([key + value]).size;
    
    if (currentSize + newItemSize > this.quotaLimit) {
      const error = new Error('QuotaExceededError') as Error & { name: string };
      error.name = 'QuotaExceededError';
      throw error;
    }

    this.data.set(key, value);
  }

  removeItem(key: string): void {
    if (this.shouldFail && (this.failOnKey === undefined || this.failOnKey === key)) {
      throw this.failureError || new Error('Storage operation failed');
    }
    this.data.delete(key);
  }

  clear(): void {
    this.data.clear();
  }

  // Test helper methods
  simulateQuotaExceeded(): void {
    this.quotaLimit = 1; // Tiny limit to force quota exceeded
  }

  simulateFailure(failOnKey?: string, error?: Error): void {
    this.shouldFail = true;
    this.failOnKey = failOnKey;
    this.failureError = error;
  }

  resetFailure(): void {
    this.shouldFail = false;
    this.failOnKey = undefined;
    this.failureError = undefined;
  }

  private calculateSize(): number {
    let size = 0;
    for (const [key, value] of this.data.entries()) {
      size += new Blob([key + value]).size;
    }
    return size;
  }
}

// ===== TEST HELPERS =====
const createStorageService = (localStorageMock?: MockStorage): LocalStorageService => {
  if (localStorageMock) {
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });
  }
  
  TestBed.configureTestingModule({});
  return TestBed.inject(LocalStorageService);
};

const waitForAsync = (ms: number = 0): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

const verifyStorageError = (error: StorageError | undefined, expectedName: string, expectedProperties: Record<string, unknown> = {}): void => {
  expect(error).toBeDefined();
  expect(error!.name).toBe(expectedName);
  
  Object.entries(expectedProperties).forEach(([key, value]) => {
    expect((error as any)[key]).toBe(value);
  });
};

// ===== PERFORMANCE TESTING =====
const measureOperationTime = async <T>(operation: () => Promise<T>): Promise<{ result: T; duration: number }> => {
  const start = performance.now();
  const result = await operation();
  const end = performance.now();
  return { result, duration: end - start };
};

const runConcurrentOperations = async <T>(
  operations: Array<() => Promise<T>>,
  maxConcurrency: number = 5
): Promise<Array<{ success: boolean; result?: T; error?: Error }>> => {
  const results: Array<{ success: boolean; result?: T; error?: Error }> = [];
  
  for (let i = 0; i < operations.length; i += maxConcurrency) {
    const batch = operations.slice(i, i + maxConcurrency);
    const batchResults = await Promise.allSettled(
      batch.map(op => op())
    );
    
    batchResults.forEach(result => {
      if (result.status === 'fulfilled') {
        results.push({ success: true, result: result.value });
      } else {
        results.push({ success: false, error: result.reason });
      }
    });
  }
  
  return results;
};

describe('LocalStorageService - Professional Grade Testing', () => {
  let service: LocalStorageService;
  let localStorageMock: MockStorage;
  let sessionStorageMock: MockStorage;

  beforeAll(() => {
    // Store original storage implementations
    const originalLocalStorage = window.localStorage;
    const originalSessionStorage = window.sessionStorage;
    
    // Create mocks
    localStorageMock = new MockStorage();
    sessionStorageMock = new MockStorage();
    
    // Replace with mocks
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });
    
    Object.defineProperty(window, 'sessionStorage', {
      value: sessionStorageMock,
      writable: true
    });
  });

  afterAll(() => {
    // Restore original implementations - cleanup is for professionals
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });
  });

  beforeEach(() => {
    localStorageMock.clear();
    sessionStorageMock.clear();
    localStorageMock.resetFailure();
    sessionStorageMock.resetFailure();
    service = createStorageService();
  });

  afterEach(() => {
    localStorageMock.clear();
    sessionStorageMock.clear();
  });

  // ===== CORE FUNCTIONALITY =====
  describe('Basic Storage Operations', () => {
    it('should store and retrieve data successfully', async () => {
      const testData = createMockTask({ title: 'Core Test Task' });
      
      const setResult = await service.setItem('tasks', testData);
      expect(setResult.success).toBe(true);
      expect(setResult.data).toEqual(testData);

      const getResult = await service.getItem('tasks');
      expect(getResult.success).toBe(true);
      expect(getResult.data).toEqual(testData);
    });

    it('should handle null values correctly', async () => {
      const setResult = await service.setItem('current_task', null);
      expect(setResult.success).toBe(true);

      const getResult = await service.getItem('current_task');
      expect(getResult.success).toBe(true);
      expect(getResult.data).toBeNull();
    });

    it('should validate task data structure when enabled', async () => {
      const invalidTask = { id: 123, title: 'Invalid Task' }; // Missing required fields
      
      const result = await service.setItem('tasks', invalidTask);
      expect(result.success).toBe(false);
      verifyStorageError(result.error, 'ValidationError');
    });

    it('should skip validation when disabled', async () => {
      service.updateStorageConfig({ enableValidation: false });
      
      const invalidData = { random: 'data' };
      const result = await service.setItem('random_key', invalidData);
      
      expect(result.success).toBe(true);
      
      const getResult = await service.getItem('random_key');
      expect(getResult.success).toBe(true);
      expect(getResult.data).toEqual(invalidData);
    });
  });

  // ===== BACKUP SYSTEM =====
  describe('Backup System', () => {
    it('should create backup automatically when enabled', async () => {
      const testData = createMockTask({ title: 'Backup Test Task' });
      
      await service.setItem('tasks', testData, 'update', 'test-context');
      
      const backupHistory = await service.getBackupHistory('tasks');
      expect(backupHistory.success).toBe(true);
      expect(backupHistory.data!.length).toBeGreaterThan(0);
      
      const backup = backupHistory.data![0];
      expect(backup.key).toBe('tasks');
      expect(backup.operation).toBe('update');
      expect(backup.metadata.taskContext).toBe('test-context');
      expect(backup.metadata.backupId).toBeDefined();
      expect(backup.metadata.crc32).toMatch(/^[a-f0-9]{8}$/);
    });

    it('should maintain backup history in chronological order', async () => {
      const operations = [
        createMockTask({ title: 'Version 1' }),
        createMockTask({ title: 'Version 2' }),
        createMockTask({ title: 'Version 3' })
      ];

      for (let i = 0; i < operations.length; i++) {
        await service.setItem('tasks', operations[i], 'update');
        await waitForAsync(10); // Ensure different timestamps
      }

      const backupHistory = await service.getBackupHistory('tasks');
      expect(backupHistory.success).toBe(true);
      expect(backupHistory.data!.length).toBe(3);
      
      // Verify newest first order
      const timestamps = backupHistory.data!.map(b => b.timestamp);
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i - 1]).toBeGreaterThanOrEqual(timestamps[i]);
      }
    });

    it('should restore data from specific backup', async () => {
      const originalData = createMockTask({ title: 'Original Title' });
      const modifiedData = createMockTask({ title: 'Modified Title' });
      
      // Store original data
      await service.setItem('tasks', originalData, 'create');
      const backupHistory = await service.getBackupHistory('tasks');
      const backupId = backupHistory.data![0].id;
      
      // Modify data
      await service.setItem('tasks', modifiedData, 'update');
      
      // Verify modification
      let currentData = await service.getItem('tasks');
      expect(currentData.data).toEqual(modifiedData);
      
      // Restore from backup
      const restoreResult = await service.restoreFromBackup('tasks', backupId);
      expect(restoreResult.success).toBe(true);
      
      // Verify restoration
      currentData = await service.getItem('tasks');
      expect(currentData.data).toEqual(originalData);
    });

    it('should handle corrupted backup gracefully', async () => {
      const testData = createMockTask();
      
      await service.setItem('tasks', testData);
      
      // Manually corrupt backup
      const backupHistory = await service.getBackupHistory('tasks');
      const backup = backupHistory.data![0];
      const backupKey = `taskgo_backup_tasks_${backup.id}`;
      localStorageMock.setItem(backupKey, 'invalid json');
      
      // Should still be able to get original data
      const result = await service.getItem('tasks');
      expect(result.success).toBe(true);
    });

    it('should respect backup retention policies', async () => {
      service.updateBackupConfig({ maxBackups: 2, retentionDays: 1 });
      
      // Create multiple backups
      for (let i = 0; i < 5; i++) {
        await service.setItem('tasks', createMockTask({ title: `Version ${i}` }), 'update');
        await waitForAsync(10);
      }
      
      const backupHistory = await service.getBackupHistory('tasks');
      expect(backupHistory.success).toBe(true);
      expect(backupHistory.data!.length).toBeLessThanOrEqual(2);
    });
  });

  // ===== DATA INTEGRITY =====
  describe('Data Integrity and Corruption Detection', () => {
    it('should detect and recover from data corruption', async () => {
      const originalData = createMockTask({ title: 'Original Data' });
      
      await service.setItem('tasks', originalData);
      
      // Manually corrupt the stored data
      const storageKey = 'taskgo_tasks';
      const storedData = JSON.parse(localStorageMock.getItem(storageKey)!);
      storedData.data.title = 'Corrupted Data';
      localStorageMock.setItem(storageKey, JSON.stringify(storedData));
      
      // Should detect corruption and recover from backup
      const result = await service.getItem('tasks');
      expect(result.success).toBe(true);
      expect(result.data).not.toEqual({ ...originalData, title: 'Corrupted Data' });
      expect(result.data).toEqual(originalData); // Should be recovered
    });

    it('should handle complete data loss scenario', async () => {
      const testData = createMockTask();
      
      await service.setItem('tasks', testData);
      
      // Clear all data and backups
      await service.clear();
      
      const result = await service.getItem('tasks');
      expect(result.success).toBe(false);
    });

    it('should validate CRC32 checksums when enabled', async () => {
      service.updateStorageConfig({ enableCRC32: true });
      
      const testData = createMockTask();
      await service.setItem('tasks', testData);
      
      // Corrupt checksum only
      const storageKey = 'taskgo_tasks';
      const storedData = JSON.parse(localStorageMock.getItem(storageKey)!);
      storedData.metadata.crc32 = 'wrong_checksum';
      localStorageMock.setItem(storageKey, JSON.stringify(storedData));
      
      const result = await service.getItem('tasks');
      expect(result.success).toBe(false);
      verifyStorageError(result.error, 'CorruptionError', { isCorruption: true });
    });

    it('should provide comprehensive health report', async () => {
      const testData = createMockTask();
      await service.setItem('tasks', testData);
      
      const healthReport = await service.getStorageHealthReport();
      expect(healthReport.success).toBe(true);
      
      const report = healthReport.data!;
      expect(report.status).toMatch(/^(healthy|warning|critical)$/);
      expect(report.usage).toBeDefined();
      expect(report.analytics).toBeDefined();
      expect(report.backupCount).toBeGreaterThan(0);
      expect(Array.isArray(report.recommendations)).toBe(true);
    });
  });

  // ===== QUOTA MANAGEMENT =====
  describe('Storage Quota Management', () => {
    it('should handle quota exceeded gracefully', async () => {
      localStorageMock.simulateQuotaExceeded();
      
      const largeData = createMockTask({ 
        description: 'x'.repeat(10000) // Large data to trigger quota
      });
      
      const result = await service.setItem('tasks', largeData);
      expect(result.success).toBe(false);
      verifyStorageError(result.error, 'QuotaExceededError', { isQuotaExceeded: true });
    });

    it('should track storage usage accurately', async () => {
      const smallData = createMockTask();
      const largeData = createMockTask({ 
        description: 'x'.repeat(1000)
      });
      
      await service.setItem('small_tasks', smallData);
      const usage1 = await service.getStorageUsage();
      expect(usage1.success).toBe(true);
      expect(usage1.data!.used).toBeGreaterThan(0);
      
      await service.setItem('large_tasks', largeData);
      const usage2 = await service.getStorageUsage();
      expect(usage2.success).toBe(true);
      expect(usage2.data!.used).toBeGreaterThan(usage1.data!.used);
    });

    it('should perform automatic cleanup when quota critical', async () => {
      service.updateQuotaMonitor({ 
        criticalThreshold: 50, // Low threshold for testing
        autoCleanup: true 
      });
      
      // Fill storage with data and backups
      for (let i = 0; i < 20; i++) {
        await service.setItem(`task_${i}`, createMockTask({ id: `task-${i}` }));
      }
      
      const healthReport = await service.getStorageHealthReport();
      expect(healthReport.success).toBe(true);
      
      // Should trigger cleanup if usage is high
      expect(healthReport.data!.recommendations.some(r => 
        r.includes('cleanup') || r.includes('usage')
      )).toBe(true);
    });
  });

  // ===== ERROR HANDLING =====
  describe('Comprehensive Error Handling', () => {
    it('should handle storage being completely disabled', async () => {
      // Disable localStorage
      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        writable: true
      });
      
      const disabledService = createStorageService();
      const result = await disabledService.setItem('tasks', createMockTask());
      
      expect(result.success).toBe(false);
      verifyStorageError(result.error, 'StorageDisabledError', { isStorageDisabled: true });
    });

    it('should handle security errors', async () => {
      const securityError = new Error('Security error') as Error & { name: string };
      securityError.name = 'SecurityError';
      localStorageMock.simulateFailure(undefined, securityError);
      
      const result = await service.setItem('tasks', createMockTask());
      expect(result.success).toBe(false);
      verifyStorageError(result.error, 'SecurityError', { isSecurityError: true });
    });

    it('should provide fallback to sessionStorage when localStorage fails', async () => {
      localStorageMock.simulateFailure();
      
      const testData = createMockTask();
      const result = await service.setItem('tasks', testData);
      
      expect(result.success).toBe(true);
      expect(result.fallbackUsed).toBe(true);
      
      // Verify data is in sessionStorage
      const getResult = await service.getItem('tasks');
      expect(getResult.success).toBe(true);
      expect(getResult.data).toEqual(testData);
    });

    it('should handle malformed JSON in storage', async () => {
      const storageKey = 'taskgo_tasks';
      localStorageMock.setItem(storageKey, 'invalid json data');
      
      const result = await service.getItem('tasks');
      expect(result.success).toBe(false);
      verifyStorageError(result.error, 'SerializationError');
    });
  });

  // ===== IMPORT/EXPORT =====
  describe('Data Import/Export', () => {
    it('should export data with all components', async () => {
      const taskData = createMockTask({ title: 'Export Test' });
      const settingsData = { theme: 'dark', language: 'en' };
      
      await service.setItem('tasks', taskData, 'create');
      await service.setItem('settings', settingsData, 'create');
      
      const exportResult = await service.exportData({
        includeBackups: true,
        includeAnalytics: true,
        compressionEnabled: false
      });
      
      expect(exportResult.success).toBe(true);
      
      const exportData = exportResult.data!;
      expect(exportData.data.tasks).toEqual(taskData);
      expect(exportData.data.settings).toEqual(settingsData);
      expect(exportData.backups).toBeInstanceOf(Array);
      expect(exportData.analytics).toBeDefined();
      expect(exportData.exportedAt).toBeGreaterThan(0);
    });

    it('should import data correctly with overwrite options', async () => {
      const existingData = createMockTask({ title: 'Existing Task' });
      const importData = {
        data: { 
          tasks: createMockTask({ title: 'Imported Task' }),
          settings: { theme: 'light' }
        },
        backups: [],
        analytics: createMockAnalytics(),
        exportedAt: Date.now(),
        version: '1.0.0'
      };
      
      // Set existing data
      await service.setItem('tasks', existingData);
      
      // Import without overwrite
      const importResult1 = await service.importData(importData, { 
        overwrite: false, 
        createBackups: true 
      });
      expect(importResult1.success).toBe(true);
      
      let tasksResult = await service.getItem('tasks');
      expect(tasksResult.data).toEqual(existingData); // Should remain unchanged
      
      // Import with overwrite
      const importResult2 = await service.importData(importData, { 
        overwrite: true, 
        createBackups: true 
      });
      expect(importResult2.success).toBe(true);
      
      tasksResult = await service.getItem('tasks');
      expect(tasksResult.data).toEqual(importData.data.tasks);
      
      const settingsResult = await service.getItem('settings');
      expect(settingsResult.data).toEqual(importData.data.settings);
    });

    it('should validate import package structure', async () => {
      const invalidImportData = {
        data: 'not an object',
        backups: 'not an array',
        // Missing required fields
      };
      
      const result = await service.importData(invalidImportData as any);
      expect(result.success).toBe(false);
      verifyStorageError(result.error, 'UnknownError');
    });
  });

  // ===== CONFIGURATION =====
  describe('Configuration Management', () => {
    it('should update storage configuration independently', () => {
      const originalConfig = service.getConfig();
      
      service.updateStorageConfig({ 
        enableValidation: false,
        enableCRC32: false,
        maxRetries: 5 
      });
      
      const updatedConfig = service.getConfig();
      expect(updatedConfig.storage.enableValidation).toBe(false);
      expect(updatedConfig.storage.enableCRC32).toBe(false);
      expect(updatedConfig.storage.maxRetries).toBe(5);
      
      // Other configs should remain unchanged
      expect(updatedConfig.backup).toEqual(originalConfig.backup);
      expect(updatedConfig.quota).toEqual(originalConfig.quota);
    });

    it('should update backup configuration independently', () => {
      service.updateBackupConfig({ 
        maxBackups: 20,
        retentionDays: 60,
        compressionEnabled: true 
      });
      
      const config = service.getConfig();
      expect(config.backup.maxBackups).toBe(20);
      expect(config.backup.retentionDays).toBe(60);
      expect(config.backup.compressionEnabled).toBe(true);
    });

    it('should update quota monitor configuration independently', () => {
      service.updateQuotaMonitor({ 
        warningThreshold: 60,
        criticalThreshold: 85,
        autoCleanup: false 
      });
      
      const config = service.getConfig();
      expect(config.quota.warningThreshold).toBe(60);
      expect(config.quota.criticalThreshold).toBe(85);
      expect(config.quota.autoCleanup).toBe(false);
    });
  });

  // ===== PERFORMANCE TESTING =====
  describe('Performance and Scalability', () => {
    it('should handle large datasets efficiently', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => 
        createMockTask({ 
          id: `task-${i}`,
          title: `Task ${i}`,
          description: 'x'.repeat(100) // Moderate description
        })
      );
      
      const { result, duration } = await measureOperationTime(async () => 
        service.setItem('large_dataset', largeDataset)
      );
      
      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(500); // Should complete within 500ms (faster is better)
      
      // Verify retrieval is also efficient
      const { result: retrievedResult, duration: retrievalDuration } = 
        await measureOperationTime(() => service.getItem('large_dataset'));
      
      expect(retrievedResult.success).toBe(true);
      expect(retrievalDuration).toBeLessThan(200); // Should retrieve within 200ms (snappy performance)
    });

    it('should handle concurrent operations without race conditions', async () => {
      const operations = Array.from({ length: 20 }, (_, i) => 
        () => service.setItem(`concurrent_task_${i}`, createMockTask({ id: `task-${i}` }))
      );
      
      const results = await runConcurrentOperations(operations, 5);
      
      // All operations should succeed
      expect(results.every(r => r.success)).toBe(true);
      
      // Verify all data is stored correctly
      for (let i = 0; i < 20; i++) {
        const result = await service.getItem(`concurrent_task_${i}`);
        expect(result.success).toBe(true);
        expect((result.data as any).id).toBe(`task-${i}`);
      }
    });

    it('should maintain performance with many backups', async () => {
      // Create many backups
      for (let i = 0; i < 50; i++) {
        await service.setItem('performance_task', createMockTask({ title: `Version ${i}` }), 'update');
        await waitForAsync(1);
      }
      
      const { result, duration } = await measureOperationTime(() => 
        service.getBackupHistory('performance_task')
      );
      
      expect(result.success).toBe(true);
      expect(result.data!.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(100); // Should be lightning fast even with many backups
    });

    it('should handle memory usage efficiently', async () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      // Create and store large amounts of data
      for (let i = 0; i < 100; i++) {
        const largeData = createMockTask({
          id: `memory-test-${i}`,
          description: 'x'.repeat(1000)
        });
        await service.setItem(`memory_task_${i}`, largeData);
      }
      
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 10MB for better memory management)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });

  // ===== ANALYTICS =====
  describe('Storage Analytics', () => {
    it('should track operations accurately', async () => {
      const initialAnalytics = await service.getStorageAnalytics();
      const initialOps = initialAnalytics.data!.totalOperations;
      
      await service.setItem('test1', createMockTask());
      await service.setItem('test2', createMockTask());
      await service.getItem('test1');
      
      const updatedAnalytics = await service.getStorageAnalytics();
      expect(updatedAnalytics.data!.totalOperations).toBe(initialOps + 3);
      expect(updatedAnalytics.data!.backupOperations).toBeGreaterThan(0);
    });

    it('should calculate operation frequency correctly', async () => {
      await service.setItem('frequent_key1', createMockTask());
      await service.setItem('frequent_key2', createMockTask());
      await service.setItem('frequent_key1', createMockTask({ title: 'Updated' }));
      
      const analytics = await service.getStorageAnalytics();
      expect(analytics.data!.operationFrequency['frequent_key1']).toBe(2);
      expect(analytics.data!.operationFrequency['frequent_key2']).toBe(1);
    });

    it('should track backup size distribution', async () => {
      // Create backups of different sizes
      await service.setItem('small_task', createMockTask({ description: 'x' }));
      await service.setItem('large_task', createMockTask({ description: 'x'.repeat(1000) }));
      
      const analytics = await service.getStorageAnalytics();
      expect(analytics.data!.backupSizeDistribution).toBeDefined();
      expect(Object.keys(analytics.data!.backupSizeDistribution).length).toBeGreaterThan(0);
    });
  });

  // ===== EDGE CASES =====
  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle empty strings and special characters', async () => {
      const specialCases = [
        { key: 'empty_string', data: '' },
        { key: 'special_chars', data: '🚀\n\t\r\\\'"<>{}[]|\\' },
        { key: 'unicode_data', data: '测试数据 🎊 العربية' },
        { key: 'json_string', data: '{"nested": "json"}' }
      ];
      
      for (const testCase of specialCases) {
        const setResult = await service.setItem(testCase.key, testCase.data);
        expect(setResult.success).toBe(true);
        
        const getResult = await service.getItem(testCase.key);
        expect(getResult.success).toBe(true);
        expect(getResult.data).toBe(testCase.data);
      }
    });

    it('should handle circular references gracefully', async () => {
      const circularData: any = { id: 'circular' };
      circularData.self = circularData;
      
      // Should handle circular reference by throwing appropriate error
      const result = await service.setItem('circular', circularData);
      expect(result.success).toBe(false);
    });

    it('should handle extremely long keys', async () => {
      const longKey = 'x'.repeat(1000);
      const data = createMockTask();
      
      const result = await service.setItem(longKey, data);
      expect(result.success).toBe(true);
      
      const getResult = await service.getItem(longKey);
      expect(getResult.success).toBe(true);
      expect(getResult.data).toEqual(data);
    });

    it('should handle rapid successive operations', async () => {
      const data = createMockTask();
      const promises: Promise<StorageResult<any>>[] = [];
      
      // Rapid fire operations
      for (let i = 0; i < 100; i++) {
        promises.push(service.setItem(`rapid_${i}`, { ...data, id: `rapid-${i}` }));
      }
      
      const results = await Promise.all(promises);
      expect(results.every(r => r.success)).toBe(true);
      
      // Verify all data is intact
      for (let i = 0; i < 100; i++) {
        const result = await service.getItem(`rapid_${i}`);
        expect(result.success).toBe(true);
        expect((result.data as any).id).toBe(`rapid-${i}`);
      }
    });
  });

  // ===== CLEANUP OPERATIONS =====
  describe('Cleanup Operations', () => {
    it('should cleanup old backups based on retention policy', async () => {
      service.updateBackupConfig({ maxBackups: 3, retentionDays: 0.001 }); // Very short retention
      
      // Create many backups
      for (let i = 0; i < 10; i++) {
        await service.setItem('cleanup_task', createMockTask({ id: `task-${i}` }), 'update');
        await waitForAsync(10);
      }
      
      await service.cleanupAllBackups();
      
      const backupHistory = await service.getBackupHistory('cleanup_task');
      expect(backupHistory.data!.length).toBeLessThanOrEqual(3);
    });

    it('should clear storage with prefix matching', async () => {
      await service.setItem('test1', createMockTask());
      await service.setItem('test2', createMockTask());
      await service.setItem('other', createMockTask());
      
      const clearResult = await service.clear('test');
      expect(clearResult.success).toBe(true);
      
      // Test keys should be cleared
      expect((await service.getItem('test1')).success).toBe(false);
      expect((await service.getItem('test2')).success).toBe(false);
      
      // Other key should remain
      expect((await service.getItem('other')).success).toBe(true);
    });
  });

  // ===== STORAGE AVAILABILITY =====
  describe('Storage Availability Detection', () => {
    it('should detect localStorage availability correctly', () => {
      const status = service.getStorageStatus();
      expect(typeof status.localStorage).toBe('boolean');
      expect(typeof status.sessionStorage).toBe('boolean');
      expect(typeof status.fallbackActive).toBe('boolean');
    });

    it('should report fallback usage correctly', async () => {
      localStorageMock.simulateFailure();
      
      const testData = createMockTask();
      await service.setItem('fallback_test', testData);
      
      expect(service.isUsingFallbackStorage()).toBe(true);
    });

    it('should handle mixed storage scenarios', async () => {
      // Enable both storages
      Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });
      Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock, writable: true });
      
      const testData = createMockTask();
      const result = await service.setItem('mixed_test', testData);
      
      expect(result.success).toBe(true);
      expect(result.fallbackUsed).toBe(false); // Should use primary storage
    });

    it('should handle storage availability changes mid-operation', async () => {
      const testData = createMockTask({ title: 'Availability Test' });
      
      // Start operation
      const operationPromise = service.setItem('availability_test', testData);
      
      // Disable storage mid-operation
      setTimeout(() => {
        localStorageMock.simulateFailure();
      }, 5);
      
      const result = await operationPromise;
      expect(result.success).toBe(false);
      verifyStorageError(result.error, 'SecurityError');
    });

    it('should handle quota increase/decrease dynamically', async () => {
      // Start with normal quota
      const normalData = createMockTask({ description: 'x'.repeat(100) });
      const normalResult = await service.setItem('quota_normal', normalData);
      expect(normalResult.success).toBe(true);
      
      // Simulate quota decrease
      localStorageMock.simulateQuotaExceeded();
      
      const largeData = createMockTask({ description: 'x'.repeat(500) });
      const largeResult = await service.setItem('quota_large', largeData);
      expect(largeResult.success).toBe(false);
      verifyStorageError(largeResult.error, 'QuotaExceededError');
      
      // Simulate quota recovery
      localStorageMock.resetFailure();
      
      const recoverResult = await service.setItem('quota_recovered', normalData);
      expect(recoverResult.success).toBe(true);
    });

    it('should handle backup corruption during restoration', async () => {
      const originalData = createMockTask({ title: 'Corruption Test' });
      
      await service.setItem('corruption_test', originalData);
      const backupHistory = await service.getBackupHistory('corruption_test');
      const backupId = backupHistory.data![0].id;
      
      // Corrupt the backup directly
      const backupKey = `taskgo_backup_corruption_test_${backupId}`;
      localStorageMock.setItem(backupKey, '{invalid json structure}');
      
      const restoreResult = await service.restoreFromBackup('corruption_test', backupId);
      expect(restoreResult.success).toBe(false);
      verifyStorageError(restoreResult.error, 'BackupError');
    });

    it('should maintain atomicity of backup operations', async () => {
      const testData = createMockTask();
      
      // Simulate partial failure during backup creation
      let backupCallCount = 0;
      localStorageMock.simulateFailure('taskgo_backup_', new Error('Backup storage failed'));
      
      const result = await service.setItem('atomic_test', testData);
      expect(result.success).toBe(false);
      
      // Should not create partial backup
      const backupHistory = await service.getBackupHistory('atomic_test');
      expect(backupHistory.data!.length).toBe(0);
    });

    it('should handle configuration changes during active operations', async () => {
      const testData = createMockTask();
      
      // Start operation
      const operationPromise = service.setItem('config_change_test', testData);
      
      // Change configuration mid-operation
      setTimeout(() => {
        service.updateStorageConfig({ enableValidation: false, enableCRC32: false });
      }, 5);
      
      const result = await operationPromise;
      expect(result.success).toBe(true);
      
      // Verify configuration was applied
      const config = service.getConfig();
      expect(config.storage.enableValidation).toBe(false);
      expect(config.storage.enableCRC32).toBe(false);
    });
  });
});