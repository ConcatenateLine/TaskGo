import { TestBed } from '@angular/core/testing';
import { LocalStorageService, StorageError, BackupSnapshot, StorageAnalytics } from './local-storage.service';

describe('LocalStorageService - Enhanced Data Integrity', () => {
  let service: LocalStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LocalStorageService);
    
    // Clear localStorage before each test
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('CRC32 Checksums', () => {
    it('should generate consistent CRC32 checksums for identical data', () => {
      const testData = { id: '1', title: 'Test Task' };
      
      // Access private method through type assertion for testing
      const checksum1 = (service as any).generateCRC32(testData);
      const checksum2 = (service as any).generateCRC32(testData);
      
      expect(checksum1).toBe(checksum2);
      expect(checksum1).toMatch(/^[a-f0-9]{8}$/); // 8 character hex string
    });

    it('should generate different CRC32 checksums for different data', () => {
      const data1 = { id: '1', title: 'Test Task' };
      const data2 = { id: '2', title: 'Different Task' };
      
      const checksum1 = (service as any).generateCRC32(data1);
      const checksum2 = (service as any).generateCRC32(data2);
      
      expect(checksum1).not.toBe(checksum2);
    });

    it('should handle different data types for CRC32', () => {
      const stringData = 'test string';
      const objectData = { test: 'object' };
      const arrayData = [1, 2, 3];
      
      const stringChecksum = (service as any).generateCRC32(stringData);
      const objectChecksum = (service as any).generateCRC32(objectData);
      const arrayChecksum = (service as any).generateCRC32(arrayData);
      
      expect(stringChecksum).toMatch(/^[a-f0-9]{8}$/);
      expect(objectChecksum).toMatch(/^[a-f0-9]{8}$/);
      expect(arrayChecksum).toMatch(/^[a-f0-9]{8}$/);
    });
  });

  describe('Backup Snapshots', () => {
    it('should create backup snapshot before write operation', async () => {
      const testData = { id: '1', title: 'Test Task' };
      
      const result = await service.setItem('tasks', testData, 'create');
      expect(result.success).toBe(true);
      
      // Check if backup was created
      const backupHistory = await service.getBackupHistory('tasks');
      expect(backupHistory.success).toBe(true);
      expect(backupHistory.data!.length).toBeGreaterThan(0);
      
      const backup = backupHistory.data![0];
      expect(backup.key).toBe('tasks');
      expect(backup.operation).toBe('create');
      expect(backup.metadata.backupId).toBeDefined();
      expect(backup.metadata.crc32).toBeDefined();
    });

    it('should store backup with correct metadata', async () => {
      const testData = { id: '1', title: 'Test Task' };
      
      await service.setItem('tasks', testData, 'update');
      
      const backupHistory = await service.getBackupHistory('tasks');
      const backup = backupHistory.data![0];
      
      expect(backup.metadata.version).toBeDefined();
      expect(backup.metadata.timestamp).toBeGreaterThan(0);
      expect(backup.metadata.checksum).toBeDefined();
      expect(backup.metadata.crc32).toBeDefined();
      expect(backup.compressed).toBe(false);
    });

    it('should restore data from backup', async () => {
      const originalData = { id: '1', title: 'Original Task' };
      const modifiedData = { id: '1', title: 'Modified Task' };
      
      // Store original data
      await service.setItem('tasks', originalData, 'create');
      const backupHistory1 = await service.getBackupHistory('tasks');
      const backupId = backupHistory1.data![0].id;
      
      // Modify data
      await service.setItem('tasks', modifiedData, 'update');
      
      // Verify data changed
      const currentData = await service.getItem('tasks');
      expect(currentData.data).toEqual(modifiedData);
      
      // Restore from backup
      const restoreResult = await service.restoreFromBackup('tasks', backupId);
      expect(restoreResult.success).toBe(true);
      
      // Verify data restored
      const restoredData = await service.getItem('tasks');
      expect(restoredData.data).toEqual(originalData);
    });

    it('should maintain backup history order (newest first)', async () => {
      const data1 = { id: '1', title: 'Task 1' };
      const data2 = { id: '2', title: 'Task 2' };
      const data3 = { id: '3', title: 'Task 3' };
      
      await service.setItem('tasks', data1, 'create');
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
      await service.setItem('tasks', data2, 'update');
      await new Promise(resolve => setTimeout(resolve, 10));
      await service.setItem('tasks', data3, 'update');
      
      const backupHistory = await service.getBackupHistory('tasks');
      expect(backupHistory.success).toBe(true);
      expect(backupHistory.data!.length).toBe(3);
      
      // Check timestamps are in descending order
      expect(backupHistory.data![0].timestamp).toBeGreaterThanOrEqual(backupHistory.data![1].timestamp);
      expect(backupHistory.data![1].timestamp).toBeGreaterThanOrEqual(backupHistory.data![2].timestamp);
    });
  });

  describe('Data Recovery and Corruption Detection', () => {
    it('should detect data corruption using CRC32', async () => {
      const testData = { id: '1', title: 'Test Task' };
      
      // Store valid data
      await service.setItem('tasks', testData);
      
      // Corrupt data directly in localStorage
      const storageKey = (service as any).getFullKey('tasks');
      const storedData = JSON.parse(localStorage.getItem(storageKey)!);
      storedData.data.title = 'Corrupted Task';
      localStorage.setItem(storageKey, JSON.stringify(storedData));
      
      // Should detect corruption and attempt recovery
      const result = await service.getItem('tasks');
      
      // Since we have backups, it should recover the data
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toEqual({ id: '1', title: 'Corrupted Task' });
      }
    });

    it('should handle corrupted backup gracefully', async () => {
      const testData = { id: '1', title: 'Test Task' };
      
      await service.setItem('tasks', testData);
      
      // Get backup keys
      const backupHistory = await service.getBackupHistory('tasks');
      const backup = backupHistory.data![0];
      const backupKey = (service as any).BACKUP_PREFIX + 'tasks_' + backup.id;
      
      // Corrupt backup directly
      localStorage.setItem(backupKey, 'invalid json');
      
      // Should still work with corrupted backup
      const result = await service.getItem('tasks');
      expect(result.success).toBe(true);
    });

    it('should create corruption error when no valid backups exist', async () => {
      const testData = { id: '1', title: 'Test Task' };
      
      await service.setItem('tasks', testData);
      
      // Corrupt main data
      const storageKey = (service as any).getFullKey('tasks');
      const storedData = JSON.parse(localStorage.getItem(storageKey)!);
      storedData.metadata.crc32 = 'invalid_checksum';
      localStorage.setItem(storageKey, JSON.stringify(storedData));
      
      // Clear all backups
      const backupHistory = await service.getBackupHistory('tasks');
      for (const backup of backupHistory.data!) {
        const backupKey = (service as any).BACKUP_PREFIX + 'tasks_' + backup.id;
        localStorage.removeItem(backupKey);
      }
      
      // Should fail with corruption error
      const result = await service.getItem('tasks');
      expect(result.success).toBe(false);
      expect(result.error?.name).toBe('CorruptionError');
      expect(result.error?.isCorruption).toBe(true);
    });
  });

  describe('Quota Monitoring and Cleanup', () => {
    it('should track storage usage correctly', async () => {
      const smallData = { id: '1', title: 'Small Task' };
      const largeData = { 
        id: '2', 
        title: 'Large Task',
        description: 'x'.repeat(1000) // 1KB of description
      };
      
      await service.setItem('tasks', smallData);
      const usage1 = await service.getStorageUsage();
      expect(usage1.success).toBe(true);
      expect(usage1.data!.used).toBeGreaterThan(0);
      
      await service.setItem('large_tasks', largeData);
      const usage2 = await service.getStorageUsage();
      expect(usage2.success).toBe(true);
      expect(usage2.data!.used).toBeGreaterThan(usage1.data!.used);
    });

    it('should provide storage analytics', async () => {
      const testData = { id: '1', title: 'Test Task' };
      
      await service.setItem('tasks', testData);
      
      const analytics = await service.getStorageAnalytics();
      expect(analytics.success).toBe(true);
      
      const data = analytics.data!;
      expect(data.totalOperations).toBeGreaterThan(0);
      expect(data.backupOperations).toBeGreaterThan(0);
      expect(data.currentUsage).toBeGreaterThan(0);
      expect(data.operationFrequency).toHaveProperty('tasks');
    });

    it('should generate comprehensive health report', async () => {
      const testData = { id: '1', title: 'Test Task' };
      
      await service.setItem('tasks', testData);
      
      const healthReport = await service.getStorageHealthReport();
      expect(healthReport.success).toBe(true);
      
      const report = healthReport.data!;
      expect(report.status).toMatch(/^(healthy|warning|critical)$/);
      expect(report.usage).toBeDefined();
      expect(report.analytics).toBeDefined();
      expect(report.backupCount).toBeGreaterThan(0);
      expect(report.corruptionEvents).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);
    });
  });

  describe('Export/Import Functionality', () => {
    it('should export data with backups and analytics', async () => {
      const testData1 = { id: '1', title: 'Task 1' };
      const testData2 = { id: '2', title: 'Task 2' };
      
      await service.setItem('tasks', testData1, 'create');
      await service.setItem('archived_tasks', testData2, 'create');
      
      const exportResult = await service.exportData();
      expect(exportResult.success).toBe(true);
      
      const exportData = exportResult.data!;
      expect(exportData.data).toHaveProperty('tasks');
      expect(exportData.data).toHaveProperty('archived_tasks');
      expect(exportData.backups).toBeInstanceOf(Array);
      expect(exportData.analytics).toBeDefined();
      expect(exportData.exportedAt).toBeGreaterThan(0);
      expect(exportData.version).toBeDefined();
    });

    it('should import data correctly', async () => {
      const originalData = {
        data: { 
          tasks: { id: '1', title: 'Imported Task' },
          settings: { theme: 'dark' }
        },
        backups: [],
        analytics: {
          totalOperations: 5,
          backupOperations: 2,
          recoveryOperations: 0,
          quotaExceededEvents: 0,
          corruptionEvents: 0,
          averageDataSize: 100,
          peakUsage: 1000,
          currentUsage: 1000,
          availableSpace: 5000000,
          usagePercentage: 0.02,
          operationFrequency: {},
          backupSizeDistribution: {}
        } as StorageAnalytics,
        exportedAt: Date.now(),
        version: '1.0.0'
      };
      
      const importResult = await service.importData(originalData);
      expect(importResult.success).toBe(true);
      
      const tasksResult = await service.getItem('tasks');
      expect(tasksResult.success).toBe(true);
      expect(tasksResult.data).toEqual({ id: '1', title: 'Imported Task' });
      
      const settingsResult = await service.getItem('settings');
      expect(settingsResult.success).toBe(true);
      expect(settingsResult.data).toEqual({ theme: 'dark' });
    });

    it('should handle import with overwrite option', async () => {
      const existingData = { id: '1', title: 'Existing Task' };
      const importData = {
        data: { 
          tasks: { id: '1', title: 'Overwritten Task' }
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
      
      // Set existing data
      await service.setItem('tasks', existingData);
      
      // Import with overwrite false (should not overwrite)
      const importResult1 = await service.importData(importData, { overwrite: false, createBackups: false });
      expect(importResult1.success).toBe(true);
      
      let tasksResult = await service.getItem('tasks');
      expect(tasksResult.data).toEqual(existingData); // Should remain unchanged
      
      // Import with overwrite true
      const importResult2 = await service.importData(importData, { overwrite: true, createBackups: false });
      expect(importResult2.success).toBe(true);
      
      tasksResult = await service.getItem('tasks');
      expect(tasksResult.data).toEqual({ id: '1', title: 'Overwritten Task' }); // Should be overwritten
    });
  });

  describe('Configuration Management', () => {
    it('should update storage configuration', () => {
      const originalConfig = service.getConfig();
      expect(originalConfig.storage.enableValidation).toBe(true);
      
      service.updateStorageConfig({ enableValidation: false });
      
      const updatedConfig = service.getConfig();
      expect(updatedConfig.storage.enableValidation).toBe(false);
      expect(updatedConfig.backup).toEqual(originalConfig.backup); // Other configs unchanged
    });

    it('should update backup configuration', () => {
      service.updateBackupConfig({ maxBackups: 20, retentionDays: 60 });
      
      const config = service.getConfig();
      expect(config.backup.maxBackups).toBe(20);
      expect(config.backup.retentionDays).toBe(60);
    });

    it('should update quota monitor configuration', () => {
      service.updateQuotaMonitor({ warningThreshold: 60, criticalThreshold: 85 });
      
      const config = service.getConfig();
      expect(config.quota.warningThreshold).toBe(60);
      expect(config.quota.criticalThreshold).toBe(85);
    });
  });

  describe('Error Handling', () => {
    it('should handle quota exceeded error', async () => {
      // Mock localStorage to simulate quota exceeded
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      });
      
      const testData = { id: '1', title: 'Large Task'.repeat(1000) };
      const result = await service.setItem('tasks', testData);
      
      expect(result.success).toBe(false);
      expect(result.error?.name).toBe('QuotaExceededError');
      expect(result.error?.isQuotaExceeded).toBe(true);
      
      // Restore original
      localStorage.setItem = originalSetItem;
    });

    it('should handle storage disabled error', async () => {
      // Temporarily disable localStorage
      const originalLocalStorage = window.localStorage;
      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        writable: true
      });
      
      // Create new service instance to detect disabled storage
      const disabledService = new LocalStorageService();
      const result = await disabledService.setItem('tasks', { id: '1', title: 'Test' });
      
      expect(result.success).toBe(false);
      
      // Restore localStorage
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        writable: true
      });
    });
  });

  describe('Cleanup Operations', () => {
    it('should cleanup old backups', async () => {
      const testData = { id: '1', title: 'Test Task' };
      
      // Create multiple backups
      await service.setItem('tasks', testData, 'create');
      await new Promise(resolve => setTimeout(resolve, 10));
      await service.setItem('tasks', { ...testData, title: 'Updated 1' }, 'update');
      await new Promise(resolve => setTimeout(resolve, 10));
      await service.setItem('tasks', { ...testData, title: 'Updated 2' }, 'update');
      
      const backupHistoryBefore = await service.getBackupHistory('tasks');
      expect(backupHistoryBefore.data!.length).toBe(3);
      
      // Cleanup all backups
      const cleanupResult = await service.cleanupAllBackups();
      expect(cleanupResult.success).toBe(true);
      
      // Should keep only recent backups within retention period
      const backupHistoryAfter = await service.getBackupHistory('tasks');
      expect(backupHistoryAfter.data!.length).toBeLessThanOrEqual(10); // maxBackups default
    });
  });

  describe('Integration with AutoSaveService', () => {
    it('should maintain compatibility with existing setItem calls', async () => {
      const testData = { id: '1', title: 'Test Task' };
      
      // Original setItem call (without operation parameter)
      const result = await service.setItem('tasks', testData);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(testData);
      
      // Should have created backup with default 'update' operation
      const backupHistory = await service.getBackupHistory('tasks');
      expect(backupHistory.success).toBe(true);
      expect(backupHistory.data![0].operation).toBe('update');
    });
  });
});