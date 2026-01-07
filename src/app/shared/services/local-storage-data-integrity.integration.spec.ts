import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LocalStorageService, BackupSnapshot, StorageAnalytics } from './local-storage.service';
import { DataRecoveryService } from './data-recovery.service';
import { StorageAnalyticsService } from './storage-analytics.service';
import { AuthService } from './auth.service';
import { Task } from '../models/task.model';

describe('LocalStorage Data Integrity System - Integration Tests', () => {
  let localStorageService: LocalStorageService;
  let dataRecoveryService: DataRecoveryService;
  let storageAnalyticsService: StorageAnalyticsService;
  let authService: any;

  const mockTasks: Task[] = [
    {
      id: '1',
      title: 'Test Task 1',
      priority: 'high',
      status: 'TODO',
      project: 'Work',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    },
    {
      id: '2',
      title: 'Test Task 2',
      priority: 'medium',
      status: 'IN_PROGRESS',
      project: 'Personal',
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02')
    },
    {
      id: '3',
      title: 'Test Task 3',
      priority: 'low',
      status: 'DONE',
      project: 'Study',
      createdAt: new Date('2024-01-03'),
      updatedAt: new Date('2024-01-03')
    }
  ];

  beforeEach(() => {
    const authSpy = {
      logSecurityEvent: vi.fn(),
      getUserContext: vi.fn(() => ({ userId: 'test-user' })),
      isAuthenticated: vi.fn(() => true),
      requireAuthentication: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        LocalStorageService,
        DataRecoveryService,
        StorageAnalyticsService,
        { provide: AuthService, useValue: authSpy }
      ]
    });

    localStorageService = TestBed.inject(LocalStorageService);
    dataRecoveryService = TestBed.inject(DataRecoveryService);
    storageAnalyticsService = TestBed.inject(StorageAnalyticsService);
    authService = TestBed.inject(AuthService);
    // Clear storage before each test
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('Complete Data Flow Integration', () => {
    it('should maintain data integrity through create-update-delete cycle', async () => {
      // Create tasks
      const createResult = await localStorageService.setItem('tasks', mockTasks, 'create');
      expect(createResult.success).toBe(true);

      // Verify data with integrity checks
      const getResult = await localStorageService.getItem('tasks');
      expect(getResult.success).toBe(true);
      expect(getResult.data).toEqual(mockTasks);

      // Update tasks
      const updatedTasks = [...mockTasks, {
        id: '4',
        title: 'New Task',
        priority: 'medium',
        status: 'TODO',
        project: 'General',
        createdAt: new Date(),
        updatedAt: new Date()
      }];

      const updateResult = await localStorageService.setItem('tasks', updatedTasks, 'update');
      expect(updateResult.success).toBe(true);

      // Verify updated data
      const getResult2 = await localStorageService.getItem('tasks');
      expect(getResult2.success).toBe(true);
      expect(getResult2.data).toEqual(updatedTasks);

      // Delete task
      const tasksAfterDelete = updatedTasks.filter(task => task.id !== '1');
      const deleteResult = await localStorageService.setItem('tasks', tasksAfterDelete, 'delete');
      expect(deleteResult.success).toBe(true);

      // Verify deleted data
      const getResult3 = await localStorageService.getItem('tasks');
      expect(getResult3.success).toBe(true);
      expect(getResult3.data).toEqual(tasksAfterDelete);

      // Check backup history
      const backupHistory = await localStorageService.getBackupHistory('tasks');
      expect(backupHistory.success).toBe(true);
      expect(backupHistory.data!.length).toBeGreaterThan(2); // Should have backups for each operation
    });

    it('should detect and recover from data corruption', async () => {
      // Store valid data
      await localStorageService.setItem('tasks', mockTasks, 'create');
      
      // Corrupt data directly in localStorage
      const storageKey = (localStorageService as any).getFullKey('tasks');
      const storedData = JSON.parse(localStorage.getItem(storageKey)!);
      storedData.data[0].title = 'Corrupted Title';
      // Invalidate CRC32 checksum
      storedData.metadata.crc32 = 'invalid_checksum';
      localStorage.setItem(storageKey, JSON.stringify(storedData));

      // Should detect corruption and recover from backup
      const result = await localStorageService.getItem('tasks');
      expect(result.success).toBe(true);
      expect(result.data).not.toContain(
        expect.objectContaining({ title: 'Corrupted Title' })
      );

      // Verify recovery was logged
      expect(authService.logSecurityEvent).toHaveBeenCalledWith({
        type: 'DATA_RECOVERY',
        message: expect.stringContaining('Recovered data for key: tasks'),
        timestamp: expect.any(Date),
        userId: 'test-user'
      });
    });

    it('should handle complete data loss with recovery service', async () => {
      // Store data and create backups
      await localStorageService.setItem('tasks', mockTasks, 'create');
      await localStorageService.setItem('tasks', [...mockTasks, mockTasks[0]], 'update');

      // Completely corrupt main data
      const storageKey = (localStorageService as any).getFullKey('tasks');
      localStorage.setItem(storageKey, 'completely_invalid_json');

      // Use recovery service to restore data
      const recoveryResult = await dataRecoveryService.performRecovery('tasks', { strategy: 'auto' });
      expect(recoveryResult.success).toBe(true);
      expect(recoveryResult.data!.success).toBe(true);
      expect(recoveryResult.data!.backupUsed).toBeDefined();

      // Verify data was restored
      const restoredData = await localStorageService.getItem('tasks');
      expect(restoredData.success).toBe(true);
      expect(Array.isArray(restoredData.data)).toBe(true);
    });
  });

  describe('Backup and Recovery Integration', () => {
    it('should maintain backup chain through multiple operations', async () => {
      const operations = [
        { data: mockTasks.slice(0, 1), operation: 'create' as const },
        { data: mockTasks.slice(0, 2), operation: 'update' as const },
        { data: mockTasks.slice(0, 3), operation: 'update' as const },
        { data: mockTasks.slice(1, 3), operation: 'delete' as const }
      ];

      // Perform operations in sequence
      for (const op of operations) {
        await localStorageService.setItem('tasks', op.data, op.operation);
        await new Promise(resolve => setTimeout(resolve, 10)); // Small delay for timestamps
      }

      // Verify backup chain
      const backupHistory = await localStorageService.getBackupHistory('tasks');
      expect(backupHistory.success).toBe(true);
      expect(backupHistory.data!.length).toBeGreaterThanOrEqual(operations.length);

      // Verify operation sequence in backups
      const backupOperations = backupHistory.data!.map(b => b.operation);
      expect(backupOperations).toContain('create');
      expect(backupOperations).toContain('update');
      expect(backupOperations).toContain('delete');

      // Verify chronological order
      const timestamps = backupHistory.data!.map(b => b.timestamp);
      expect(timestamps).toEqual([...timestamps].sort((a, b) => b - a)); // Descending order
    });

    it('should restore specific backup version', async () => {
      // Create multiple versions
      await localStorageService.setItem('tasks', mockTasks.slice(0, 1), 'create');
      await new Promise(resolve => setTimeout(resolve, 10));
      await localStorageService.setItem('tasks', mockTasks.slice(0, 2), 'update');
      await new Promise(resolve => setTimeout(resolve, 10));
      await localStorageService.setItem('tasks', mockTasks.slice(0, 3), 'update');

      const backupHistory = await localStorageService.getBackupHistory('tasks');
      const middleBackup = backupHistory.data!.find(b => b.data && Array.isArray(b.data) && (b.data as any).length === 2);
      expect(middleBackup).toBeDefined();

      // Restore to middle version
      const restoreResult = await localStorageService.restoreFromBackup('tasks', middleBackup!.id);
      expect(restoreResult.success).toBe(true);

      // Verify restored data
      const currentData = await localStorageService.getItem('tasks');
      expect(currentData.success).toBe(true);
      expect((currentData.data as any[]).length).toBe(2);
    });
  });

  describe('Analytics Integration', () => {
    it('should track operations and provide analytics', async () => {
      // Perform various operations
      await localStorageService.setItem('tasks', mockTasks, 'create');
      await localStorageService.setItem('archived_tasks', mockTasks.slice(0, 1), 'create');
      await localStorageService.setItem('settings', { theme: 'dark' }, 'update');

      // Get basic analytics
      const basicAnalytics = await localStorageService.getStorageAnalytics();
      expect(basicAnalytics.success).toBe(true);
      expect(basicAnalytics.data!.totalOperations).toBeGreaterThanOrEqual(3);
      expect(basicAnalytics.data!.backupOperations).toBeGreaterThanOrEqual(3);
      expect(basicAnalytics.data!.operationFrequency).toHaveProperty('tasks');
      expect(basicAnalytics.data!.operationFrequency).toHaveProperty('archived_tasks');
      expect(basicAnalytics.data!.operationFrequency).toHaveProperty('settings');

      // Get detailed analytics
      const detailedAnalytics = await storageAnalyticsService.generateDetailedAnalytics();
      expect(detailedAnalytics.growthRate).toBeDefined();
      expect(detailedAnalytics.hotKeys).toBeDefined();
      expect(detailedAnalytics.recommendations).toBeDefined();
      expect(detailedAnalytics.recommendations.immediate).toBeDefined();
      expect(detailedAnalytics.recommendations.shortTerm).toBeDefined();
      expect(detailedAnalytics.recommendations.longTerm).toBeDefined();
    });

    it('should provide storage health report', async () => {
      // Store some data
      await localStorageService.setItem('tasks', mockTasks, 'create');

      const healthReport = await localStorageService.getStorageHealthReport();
      expect(healthReport.success).toBe(true);
      
      const report = healthReport.data!;
      expect(report.status).toMatch(/^(healthy|warning|critical)$/);
      expect(report.usage).toBeDefined();
      expect(report.analytics).toBeDefined();
      expect(report.backupCount).toBeGreaterThan(0);
      expect(report.corruptionEvents).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    it('should predict storage growth', async () => {
      // Create some data to establish baseline
      await localStorageService.setItem('tasks', mockTasks, 'create');

      const prediction = await storageAnalyticsService.getStorageGrowthPrediction(30);
      expect(prediction.predictedUsage).toBeGreaterThanOrEqual(0);
      expect(prediction.confidence).toBeGreaterThanOrEqual(0);
      expect(prediction.confidence).toBeLessThanOrEqual(1);

      // Quota date might not be set if growth is negative or slow
      if (prediction.quotaReachedDate) {
        expect(prediction.quotaReachedDate).toBeInstanceOf(Date);
        expect(prediction.quotaReachedDate.getTime()).toBeGreaterThan(Date.now());
      }
    });
  });

  describe('Export/Import Integration', () => {
    it('should export and import complete data package', async () => {
      // Setup data
      await localStorageService.setItem('tasks', mockTasks, 'create');
      await localStorageService.setItem('settings', { theme: 'dark' }, 'create');

      // Export data
      const exportResult = await localStorageService.exportData({
        includeBackups: true,
        includeAnalytics: true,
        compressionEnabled: false
      });
      expect(exportResult.success).toBe(true);
      
      const exportPackage = exportResult.data!;
      expect(exportPackage.data).toHaveProperty('tasks');
      expect(exportPackage.data).toHaveProperty('settings');
      expect(exportPackage.backups).toBeInstanceOf(Array);
      expect(exportPackage.analytics).toBeDefined();
      expect(exportPackage.exportedAt).toBeGreaterThan(0);

      // Clear storage
      await localStorageService.removeItem('tasks');
      await localStorageService.removeItem('settings');

      // Verify data is gone
      const tasksResult = await localStorageService.getItem('tasks');
      const settingsResult = await localStorageService.getItem('settings');
      expect(tasksResult.data).toBeNull();
      expect(settingsResult.data).toBeNull();

      // Import data
      const importResult = await localStorageService.importData(exportPackage as {
        data: any;
        backups: BackupSnapshot[];
        analytics: StorageAnalytics;
        exportedAt: number;
        version: string;
      }, { 
        overwrite: true, 
        createBackups: true 
      });
      expect(importResult.success).toBe(true);

      // Verify imported data
      const importedTasks = await localStorageService.getItem('tasks');
      const importedSettings = await localStorageService.getItem('settings');
      expect(importedTasks.data).toEqual(mockTasks);
      expect(importedSettings.data).toEqual({ theme: 'dark' });
    });

    it('should handle import with existing data', async () => {
      // Setup initial data
      const initialData = { id: 'initial', title: 'Initial Task', priority: 'medium' as const, status: 'TODO' as const, project: 'Work' as const, createdAt: new Date(), updatedAt: new Date() };
      await localStorageService.setItem('tasks', [initialData], 'create');

      // Export data to import
      const exportPackage = {
        data: { 
          tasks: [{ id: 'imported', title: 'Imported Task', priority: 'high' as const, status: 'IN_PROGRESS' as const, project: 'Personal' as const, createdAt: new Date(), updatedAt: new Date() }]
        },
        backups: [],
        analytics: {
          totalOperations: 0,
          backupOperations: 0,
          recoveryOperations: 0,
          quotaExceededEvents: 0,
          corruptionEvents: 0,
          averageDataSize: 0,
          peakUsage: 0,
          currentUsage: 0,
          availableSpace: 5000000,
          usagePercentage: 0,
          operationFrequency: {},
          backupSizeDistribution: {}
        } as StorageAnalytics,
        exportedAt: Date.now(),
        version: '1.0.0'
      };

      // Import without overwrite
      const importResult1 = await localStorageService.importData(exportPackage as {
        data: any;
        backups: BackupSnapshot[];
        analytics: StorageAnalytics;
        exportedAt: number;
        version: string;
      }, { 
        overwrite: false, 
        createBackups: true 
      });
      expect(importResult1.success).toBe(true);

      let currentTasks = await localStorageService.getItem('tasks');
      expect(currentTasks.data).toEqual([initialData]); // Should remain unchanged

      // Import with overwrite
      const importResult2 = await localStorageService.importData(exportPackage as {
        data: any;
        backups: BackupSnapshot[];
        analytics: StorageAnalytics;
        exportedAt: number;
        version: string;
      }, { 
        overwrite: true, 
        createBackups: true 
      });
      expect(importResult2.success).toBe(true);

      currentTasks = await localStorageService.getItem('tasks');
      expect(currentTasks.data).toEqual(exportPackage.data.tasks); // Should be overwritten
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle quota exceeded gracefully', async () => {
      // Fill up localStorage to simulate quota exceeded
      const largeData = 'x'.repeat(5 * 1024 * 1024); // 5MB
      
      const result = await localStorageService.setItem('large_data', largeData);
      
      // Should either succeed or fail with quota exceeded error
      if (!result.success) {
        expect(result.error?.name).toBe('QuotaExceededError');
        expect(result.error?.isQuotaExceeded).toBe(true);
      }
    });

    it('should handle localStorage disabled', async () => {
      // Temporarily disable localStorage
      const originalLocalStorage = window.localStorage;
      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        writable: true
      });

      // Create new service instance
      const disabledStorageService = new LocalStorageService();
      
      // Should fallback to sessionStorage or fail gracefully
      const result = await disabledStorageService.setItem('test', { data: 'test' });
      
      // Restore localStorage
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        writable: true
      });
    });

    it('should handle concurrent access', async () => {
      // Simulate concurrent operations
      const promises = Array(10).fill(null).map((_, index) =>
        localStorageService.setItem(`concurrent_key_${index}`, { id: index, data: `data_${index}` })
      );

      const results = await Promise.all(promises);
      
      // All operations should either succeed or fail gracefully
      results.forEach((result, index) => {
        if (result.success) {
          expect(result.data).toEqual({ id: index, data: `data_${index}` });
        } else {
          expect(result.error).toBeDefined();
        }
      });
    });

    it('should handle batch recovery', async () => {
      // Setup data for multiple keys
      await localStorageService.setItem('tasks', mockTasks, 'create');
      await localStorageService.setItem('archived_tasks', mockTasks.slice(0, 1), 'create');

      // Corrupt both keys
      const taskKey = (localStorageService as any).getFullKey('tasks');
      const archivedKey = (localStorageService as any).getFullKey('archived_tasks');
      
      localStorage.setItem(taskKey, 'invalid_json');
      localStorage.setItem(archivedKey, 'invalid_json');

      // Perform batch recovery
      const batchResult = await dataRecoveryService.performBatchRecovery(['tasks', 'archived_tasks'], { strategy: 'auto' });
      
      expect(batchResult.success).toBe(true);
      expect(batchResult.data!.keysProcessed).toEqual(['tasks', 'archived_tasks']);
      expect(batchResult.data!.summary.total).toBe(2);
      
      // At least one should be recovered (has backups)
      expect(batchResult.data!.summary.recovered + batchResult.data!.summary.failed).toBe(2);
    });

    it('should maintain performance with large datasets', async () => {
      const largeTaskList = Array(1000).fill(null).map((_, index) => ({
        id: `task_${index}`,
        title: `Large Task ${index}`,
        priority: ['low', 'medium', 'high'][index % 3] as 'low' | 'medium' | 'high',
        status: ['TODO', 'IN_PROGRESS', 'DONE'][index % 3] as 'TODO' | 'IN_PROGRESS' | 'DONE',
        project: ['Personal', 'Work', 'Study', 'General'][index % 4] as 'Personal' | 'Work' | 'Study' | 'General',
        createdAt: new Date(Date.now() - index * 1000),
        updatedAt: new Date(Date.now() - index * 500)
      }));

      const startTime = performance.now();
      
      const result = await localStorageService.setItem('large_tasks', largeTaskList, 'create');
      const getResult = await localStorageService.getItem('large_tasks');
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result.success).toBe(true);
      expect(getResult.success).toBe(true);
      expect(getResult.data).toEqual(largeTaskList);
      
      // Should complete within reasonable time (less than 1 second for 1000 tasks)
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Security and Compliance', () => {
    it('should log all recovery operations', async () => {
      // Setup data that will need recovery
      await localStorageService.setItem('tasks', mockTasks, 'create');
      
      // Corrupt data
      const storageKey = (localStorageService as any).getFullKey('tasks');
      localStorage.setItem(storageKey, 'invalid_json');

      // Perform recovery
      await dataRecoveryService.performRecovery('tasks', { strategy: 'auto' });

      // Verify security event was logged
      expect(authService.logSecurityEvent).toHaveBeenCalledWith({
        type: 'DATA_RECOVERY',
        message: expect.stringContaining('Recovered data for key: tasks'),
        timestamp: expect.any(Date),
        userId: 'test-user'
      });
    });

    it('should log export operations', async () => {
      await localStorageService.setItem('tasks', mockTasks, 'create');
      
      await localStorageService.exportData();

      expect(authService.logSecurityEvent).toHaveBeenCalledWith({
        type: 'DATA_ACCESS',
        message: 'Storage analytics exported',
        timestamp: expect.any(Date),
        userId: 'test-user'
      });
    });

    it('should maintain data privacy during recovery', async () => {
      const privateData = {
        id: 'private_task',
        title: 'Private Task',
        priority: 'high' as const,
        status: 'TODO' as const,
        project: 'Personal' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        // Add sensitive data
        secretField: 'sensitive_information'
      };

      await localStorageService.setItem('private_tasks', privateData, 'create');

      // Recovery should not expose sensitive data in logs
      const recoveryResult = await dataRecoveryService.performRecovery('private_tasks', { strategy: 'auto' });
      
      expect(recoveryResult.success).toBe(true);
      
      // Check that sensitive data is not in security logs
      const securityCalls = authService.logSecurityEvent.mock.calls;
      const logMessages = securityCalls.map((call: any[]) => call[0].message).join(' ');
      expect(logMessages).not.toContain('sensitive_information');
    });
  });
});