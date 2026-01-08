import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StorageManagementComponent } from './storage-management.component';
import { LocalStorageService, BackupSnapshot } from '../../shared/services/local-storage.service';
import { DataRecoveryService } from '../../shared/services/data-recovery.service';
import { StorageAnalyticsService } from '../../shared/services/storage-analytics.service';
import { AuthService } from '../../shared/services/auth.service';
import { TaskExportService } from '../../shared/services/task-export.service';
import { Task } from '../../shared/models/task.model';

// Create mock implementations that we can control more granularly
const createLocalStorageServiceMock = () => {
  const mock = {
    getStorageAnalytics: vi.fn(),
    getStorageHealthReport: vi.fn(),
    getBackupHistory: vi.fn(),
    cleanupAllBackups: vi.fn(),
    exportData: vi.fn(),
    importData: vi.fn(),
    restoreFromBackup: vi.fn(),
    getItem: vi.fn(),
    setItem: vi.fn(),
  };
  return mock;
};

const createDataRecoveryServiceMock = () => ({
  performRecovery: vi.fn(),
  performBatchRecovery: vi.fn(),
});

const createStorageAnalyticsServiceMock = () => ({
  generateDetailedAnalytics: vi.fn(),
  getStorageGrowthPrediction: vi.fn(),
});

const createAuthServiceMock = () => ({
  getUserContext: vi.fn(),
  logSecurityEvent: vi.fn(),
});

const createTaskExportServiceMock = () => ({
  exportTasks: vi.fn(),
});

// Test data factory functions for consistency
const createMockTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'test-task-1',
  title: 'Test Task',
  priority: 'medium',
  status: 'TODO',
  project: 'Work',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

const createMockBackup = (overrides: Partial<BackupSnapshot> = {}): BackupSnapshot => ({
  id: 'backup_123',
  timestamp: Date.now(),
  data: [createMockTask()],
  metadata: {
    version: '1.0.0',
    timestamp: Date.now(),
    checksum: 'abc123',
    crc32: 'def456',
    backupId: 'backup_123',
    operation: 'update',
  },
  operation: 'update',
  key: 'taskgo_tasks',
  compressed: false,
  ...overrides,
});

describe('StorageManagementComponent', () => {
  let component: StorageManagementComponent;
  let fixture: ComponentFixture<StorageManagementComponent>;
  let localStorageService: ReturnType<typeof createLocalStorageServiceMock>;
  let dataRecoveryService: ReturnType<typeof createDataRecoveryServiceMock>;
  let storageAnalyticsService: ReturnType<typeof createStorageAnalyticsServiceMock>;
  let authService: ReturnType<typeof createAuthServiceMock>;
  let taskExportService: ReturnType<typeof createTaskExportServiceMock>;

  // Helper to create file objects for testing
  const createMockFile = (content: string, filename = 'test.json'): File => {
    const file = new File([content], filename, { type: 'application/json' });
    // Mock the text() method for File objects in test environment
    Object.defineProperty(file, 'text', {
      value: () => Promise.resolve(content),
      writable: false,
    });
    return file;
  };

  // Helper to mock confirm dialogs
  const mockConfirm = (returnValue: boolean) => {
    vi.spyOn(window, 'confirm').mockReturnValue(returnValue);
  };

  // Helper to mock alerts
  const mockAlert = () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    return alertSpy;
  };

  // Helper to mock URL.createObjectURL and revokeObjectURL
  const mockBlobOperations = () => {
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('mock-url');
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    return { createObjectURLSpy, revokeObjectURLSpy };
  };

  beforeEach(async () => {
    // Create fresh mock instances
    localStorageService = createLocalStorageServiceMock();
    dataRecoveryService = createDataRecoveryServiceMock();
    storageAnalyticsService = createStorageAnalyticsServiceMock();
    authService = createAuthServiceMock();
    taskExportService = createTaskExportServiceMock();

    await TestBed.configureTestingModule({
      imports: [StorageManagementComponent],
      providers: [
        { provide: LocalStorageService, useValue: localStorageService },
        { provide: DataRecoveryService, useValue: dataRecoveryService },
        { provide: StorageAnalyticsService, useValue: storageAnalyticsService },
        { provide: AuthService, useValue: authService },
        { provide: TaskExportService, useValue: taskExportService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StorageManagementComponent);
    component = fixture.componentInstance;

    // Setup default mock behaviors - keep minimal
    authService.getUserContext.mockReturnValue({ userId: 'test-user' });
    authService.logSecurityEvent.mockReturnValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Initialization', () => {
    it('should create successfully', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default values', () => {
      expect(component.isLoading()).toBe(false);
      expect(component.activeTab()).toBe('overview');
      expect(component.analytics()).toBeNull();
      expect(component.healthReport()).toBeNull();
      expect(component.backupHistory()).toEqual([]);
      expect(component.selectedBackup()).toBeNull();
    });

    it('should load storage data on initialization', async () => {
      const mockAnalytics = { totalOperations: 10, backupOperations: 5 };
      const mockHealthReport = { status: 'healthy', usage: { percentage: 60, used: 1024 } };
      const mockBackupHistory = [createMockBackup()];

      // Clear any previous mock calls and reset
      localStorageService.getStorageAnalytics.mockReset();
      localStorageService.getStorageHealthReport.mockReset();
      localStorageService.getBackupHistory.mockReset();

      localStorageService.getStorageAnalytics.mockResolvedValue({
        success: true,
        data: mockAnalytics,
      });
      localStorageService.getStorageHealthReport.mockResolvedValue({
        success: true,
        data: mockHealthReport,
      });
      localStorageService.getBackupHistory.mockImplementation((key?: string) => {
        if (key === 'taskgo_tasks') {
          return Promise.resolve({
            success: true,
            data: mockBackupHistory,
          });
        }
        return Promise.resolve({
          success: true,
          data: [],
        });
      });

      await component.ngOnInit();
      await fixture.whenStable();

      expect(localStorageService.getStorageAnalytics).toHaveBeenCalledTimes(2); // One from ngOnInit, one from loadStorageData
      expect(localStorageService.getStorageHealthReport).toHaveBeenCalledTimes(2); // One from ngOnInit, one from loadStorageData
      expect(localStorageService.getBackupHistory).toHaveBeenCalledTimes(4); // tasks + archived (called twice)
      expect(component.analytics()).toEqual(mockAnalytics);
      expect(component.healthReport()).toEqual(mockHealthReport);
      expect(component.backupHistory()).toEqual(mockBackupHistory);
    });

    it('should handle initialization errors gracefully', async () => {
      localStorageService.getStorageAnalytics.mockRejectedValue(new Error('Service unavailable'));
      localStorageService.getStorageHealthReport.mockRejectedValue(
        new Error('Service unavailable')
      );
      localStorageService.getBackupHistory.mockRejectedValue(new Error('Service unavailable'));

      await component.ngOnInit();
      await fixture.whenStable();

      expect(component.isLoading()).toBe(false);
      expect(component.analytics()).toBeNull();
      expect(component.healthReport()).toBeNull();
      expect(component.backupHistory()).toEqual([]);
    });
  });

  describe('Computed Properties', () => {
    beforeEach(() => {
      component.healthReport.set({ status: 'healthy', usage: { percentage: 75, used: 1024 } });
      component.backupHistory.set([createMockBackup()]);
    });

    it('should compute isHealthy correctly', () => {
      expect(component.isHealthy()).toBe(true);

      component.healthReport.set({ status: 'warning' });
      expect(component.isHealthy()).toBe(false);

      component.healthReport.set({ status: 'critical' });
      expect(component.isHealthy()).toBe(false);
    });

    it('should compute storageUsagePercentage correctly', () => {
      expect(component.storageUsagePercentage()).toBe(75);

      component.healthReport.set({ usage: { percentage: 90, used: 1024 } });
      expect(component.storageUsagePercentage()).toBe(90);

      component.healthReport.set({});
      expect(component.storageUsagePercentage()).toBe(0);
    });

    it('should compute hasBackups correctly', () => {
      expect(component.hasBackups()).toBe(true);

      component.backupHistory.set([]);
      expect(component.hasBackups()).toBe(false);
    });

    it('should compute canRecover correctly', () => {
      expect(component.canRecover()).toBe(true); // has backups

      component.backupHistory.set([]);
      expect(component.canRecover()).toBe(false); // no backups, healthy status - recovery not needed

      component.healthReport.set({ status: 'critical' });
      expect(component.canRecover()).toBe(true); // critical status - recovery always available
    });
  });

  describe('Storage Operations', () => {
    describe('Export Functionality', () => {
      it('should export storage data successfully', async () => {
        const mockExportData = {
          data: { tasks: [createMockTask()] },
          backups: [createMockBackup()],
          exportedAt: Date.now(),
          version: '1.0.0',
        };

        localStorageService.exportData.mockResolvedValue({
          success: true,
          data: mockExportData,
        });

        const { createObjectURLSpy, revokeObjectURLSpy } = mockBlobOperations();
        const mockCreateElement = vi
          .spyOn(document, 'createElement')
          .mockImplementation((tagName) => {
            if (tagName === 'a') {
              const link = {
                href: '',
                download: '',
                click: vi.fn(),
              } as any;
              return link;
            }
            return document.createElement(tagName);
          });
        const mockAppendChild = vi
          .spyOn(document.body, 'appendChild')
          .mockImplementation(() => document.body);
        const mockRemoveChild = vi
          .spyOn(document.body, 'removeChild')
          .mockImplementation(() => document.body);
        const alertSpy = mockAlert();

        await component.exportStorageData();

        expect(localStorageService.exportData).toHaveBeenCalledWith(component.exportOptions());
        expect(createObjectURLSpy).toHaveBeenCalled();
        expect(revokeObjectURLSpy).toHaveBeenCalled();
        expect(mockCreateElement).toHaveBeenCalledWith('a');
        expect(mockAppendChild).toHaveBeenCalled();
        expect(mockRemoveChild).toHaveBeenCalled();
        expect(alertSpy).toHaveBeenCalledWith('Storage data exported successfully!');
        expect(component.isLoading()).toBe(false);
      });

      it('should handle export failures', async () => {
        localStorageService.exportData.mockResolvedValue({
          success: false,
          error: { message: 'Export failed' },
        });

        const alertSpy = mockAlert();

        await component.exportStorageData();

        expect(alertSpy).toHaveBeenCalledWith('Export failed: Export failed');
        expect(component.isLoading()).toBe(false);
      });

      it('should handle export exceptions', async () => {
        localStorageService.exportData.mockRejectedValue(new Error('Network error'));

        const alertSpy = mockAlert();

        await component.exportStorageData();

        expect(alertSpy).toHaveBeenCalledWith('Export failed: Network error');
        expect(component.isLoading()).toBe(false);
      });
    });

    describe('Import Functionality', () => {
      it('should import storage data successfully', async () => {
        const mockImportData = {
          data: { tasks: [JSON.parse(JSON.stringify(createMockTask()))] },
          version: '1.0.0',
        };

        localStorageService.importData.mockResolvedValue({
          success: true,
        });

        mockConfirm(true);
        const alertSpy = mockAlert();
        const loadStorageDataSpy = vi
          .spyOn(component, 'loadStorageData')
          .mockResolvedValue(undefined);

        const mockEvent = {
          target: {
            files: [createMockFile(JSON.stringify(mockImportData))],
          },
        } as any;

        await component.importStorageData(mockEvent);

        expect(localStorageService.importData).toHaveBeenCalledWith(
          {
            data: { tasks: [JSON.parse(JSON.stringify(createMockTask()))] },
            version: '1.0.0',
          },
          {
            overwrite: true,
            createBackups: true,
          }
        );
        expect(alertSpy).toHaveBeenCalledWith('Storage data imported successfully!');
        expect(loadStorageDataSpy).toHaveBeenCalled();
        expect(component.isLoading()).toBe(false);
      });

      it('should cancel import when confirmation is rejected', async () => {
        mockConfirm(false);

        const mockEvent = {
          target: { files: null },
        } as any;

        await component.importStorageData(mockEvent);

        expect(localStorageService.importData).not.toHaveBeenCalled();
        expect(component.isLoading()).toBe(false);
      });

      it('should handle invalid file format', async () => {
        mockConfirm(true);
        const alertSpy = mockAlert();

        const mockEvent = {
          target: {
            files: [createMockFile('invalid json')],
          },
        } as any;

        await component.importStorageData(mockEvent);

        expect(alertSpy).toHaveBeenCalledWith('Import failed: Unexpected token \'i\', "invalid json" is not valid JSON');
        expect(component.isLoading()).toBe(false);
      });
    });

    describe('Cleanup Functionality', () => {
      it('should perform cleanup successfully', async () => {
        localStorageService.cleanupAllBackups.mockResolvedValue({
          success: true,
          data: true,
        });

        mockConfirm(true);
        const alertSpy = mockAlert();
        const loadBackupHistorySpy = vi
          .spyOn(component, 'loadBackupHistory')
          .mockResolvedValue(undefined);
        const loadHealthReportSpy = vi
          .spyOn(component, 'loadHealthReport')
          .mockResolvedValue(undefined);

        await component.performCleanup();

        expect(localStorageService.cleanupAllBackups).toHaveBeenCalled();
        expect(alertSpy).toHaveBeenCalledWith('Cleanup completed successfully!');
        expect(loadBackupHistorySpy).toHaveBeenCalled();
        expect(loadHealthReportSpy).toHaveBeenCalled();
        expect(component.isLoading()).toBe(false);
      });

      it('should cancel cleanup when confirmation is rejected', async () => {
        mockConfirm(false);

        await component.performCleanup();

        expect(localStorageService.cleanupAllBackups).not.toHaveBeenCalled();
        expect(component.isLoading()).toBe(false);
      });

      it('should handle cleanup failures', async () => {
        localStorageService.cleanupAllBackups.mockResolvedValue({
          success: false,
          error: { message: 'Cleanup failed' },
        });

        mockConfirm(true);
        const alertSpy = mockAlert();

        await component.performCleanup();

        expect(alertSpy).toHaveBeenCalledWith('Cleanup failed: Cleanup failed');
        expect(component.isLoading()).toBe(false);
      });
    });

    describe('Recovery Functionality', () => {
      it('should perform single key recovery successfully', async () => {
        const mockRecoveryResult = {
          success: true,
          data: {
            success: true,
            strategy: 'auto',
            summary: { recovered: 5, failed: 0, warnings: 0 },
          },
        };

        dataRecoveryService.performRecovery.mockResolvedValue(mockRecoveryResult);

        component.recoveryOptions.set({ strategy: 'auto', keys: [] });
        mockConfirm(true);
        const alertSpy = mockAlert();
        const loadStorageDataSpy = vi
          .spyOn(component, 'loadStorageData')
          .mockResolvedValue(undefined);

        await component.performRecovery();

        expect(dataRecoveryService.performRecovery).toHaveBeenCalledWith('taskgo_tasks', {
          strategy: 'auto',
        });
        expect(alertSpy).toHaveBeenCalledWith(
          'Recovery completed successfully!\n\nRecovered: 5\nFailed: 0\nWarnings: 0'
        );
        expect(loadStorageDataSpy).toHaveBeenCalled();
        expect(component.isLoading()).toBe(false);
      });

      it('should perform batch recovery when keys are specified', async () => {
        const mockRecoveryResult = {
          success: true,
          data: {
            success: true,
            strategy: 'auto',
            summary: { recovered: 3, failed: 1, warnings: 1 },
          },
        };

        dataRecoveryService.performBatchRecovery.mockResolvedValue(mockRecoveryResult);

        component.recoveryOptions.set({ strategy: 'auto', keys: ['tasks', 'settings'] });
        mockConfirm(true);
        const alertSpy = mockAlert();
        const loadStorageDataSpy = vi
          .spyOn(component, 'loadStorageData')
          .mockResolvedValue(undefined);

        await component.performRecovery();

        expect(dataRecoveryService.performBatchRecovery).toHaveBeenCalledWith(
          ['tasks', 'settings'],
          {
            strategy: 'auto',
          }
        );
        expect(alertSpy).toHaveBeenCalledWith(
          'Recovery completed successfully!\n\nRecovered: 3\nFailed: 1\nWarnings: 1'
        );
        expect(loadStorageDataSpy).toHaveBeenCalled();
        expect(component.isLoading()).toBe(false);
      });

      it('should handle recovery with no data recovered', async () => {
        const mockRecoveryResult = {
          success: true,
          data: {
            success: true,
            strategy: 'auto',
            summary: { recovered: 0, failed: 0, warnings: 0 },
          },
        };

        dataRecoveryService.performRecovery.mockResolvedValue(mockRecoveryResult);

        component.recoveryOptions.set({ strategy: 'auto', keys: [] });
        mockConfirm(true);
        const alertSpy = mockAlert();

        await component.performRecovery();

        expect(alertSpy).toHaveBeenCalledWith(
          'Recovery completed but no data was recovered. Data may already be valid.'
        );
        expect(component.isLoading()).toBe(false);
      });

      it('should handle recovery failures', async () => {
        dataRecoveryService.performRecovery.mockResolvedValue({
          success: false,
          error: { message: 'Recovery failed' },
        });

        component.recoveryOptions.set({ strategy: 'auto', keys: [] });
        mockConfirm(true);
        const alertSpy = mockAlert();

        await component.performRecovery();

        expect(alertSpy).toHaveBeenCalledWith('Recovery failed: Recovery failed');
        expect(component.isLoading()).toBe(false);
      });
    });

    describe('Backup Restoration', () => {
      it('should restore from backup successfully', async () => {
        const mockBackup = createMockBackup();
        const mockRestoreResult = { success: true, data: [createMockTask()] };

        localStorageService.restoreFromBackup.mockResolvedValue(mockRestoreResult);

        mockConfirm(true);
        const alertSpy = mockAlert();
        const loadStorageDataSpy = vi
          .spyOn(component, 'loadStorageData')
          .mockResolvedValue(undefined);

        await component.restoreFromBackup(mockBackup);

        expect(localStorageService.restoreFromBackup).toHaveBeenCalledWith(
          'taskgo_tasks',
          'backup_123'
        );
        expect(alertSpy).toHaveBeenCalledWith('Successfully restored taskgo_tasks from backup!');
        expect(loadStorageDataSpy).toHaveBeenCalled();
        expect(component.isLoading()).toBe(false);
      });

      it('should cancel restore when confirmation is rejected', async () => {
        const mockBackup = createMockBackup();
        mockConfirm(false);

        await component.restoreFromBackup(mockBackup);

        expect(localStorageService.restoreFromBackup).not.toHaveBeenCalled();
        expect(component.isLoading()).toBe(false);
      });

      it('should handle restore failures', async () => {
        const mockBackup = createMockBackup();
        localStorageService.restoreFromBackup.mockResolvedValue({
          success: false,
          error: { message: 'Restore failed' },
        });

        mockConfirm(true);
        const alertSpy = mockAlert();

        await component.restoreFromBackup(mockBackup);

        expect(alertSpy).toHaveBeenCalledWith('Restore failed: Restore failed');
        expect(component.isLoading()).toBe(false);
      });
    });
  });

  describe('Task Export (US-010)', () => {
    it('should export tasks successfully', async () => {
      const mockTaskExportResult = {
        success: true,
        data: {
          tasks: [createMockTask()],
          exportedAt: Date.now(),
          totalTasks: 1,
        },
      };

      taskExportService.exportTasks.mockResolvedValue(mockTaskExportResult);

      await component.exportTasksOnly();

      expect(taskExportService.exportTasks).toHaveBeenCalled();
      expect(component.taskExportResult()).toEqual(mockTaskExportResult);
      expect(component.taskExportError()).toBeNull();
      expect(component.isLoading()).toBe(false);
    });

    it('should handle task export failures', async () => {
      const mockTaskExportResult = {
        success: false,
        error: { message: 'Task export failed' },
      };

      taskExportService.exportTasks.mockResolvedValue(mockTaskExportResult);

      await component.exportTasksOnly();

      expect(component.taskExportResult()).toEqual(mockTaskExportResult);
      expect(component.taskExportError()).toBe('Task export failed');
      expect(component.isLoading()).toBe(false);
    });

    it('should handle task export exceptions', async () => {
      taskExportService.exportTasks.mockRejectedValue(new Error('Service unavailable'));

      await component.exportTasksOnly();

      expect(component.taskExportError()).toBe('Service unavailable');
      expect(component.isLoading()).toBe(false);
    });
  });

  describe('Utility Methods', () => {
    it('should format bytes correctly', () => {
      expect(component.formatBytes(0)).toBe('0 Bytes');
      expect(component.formatBytes(1024)).toBe('1 KB');
      expect(component.formatBytes(1024 * 1024)).toBe('1 MB');
      expect(component.formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
      expect(component.formatBytes(1536)).toBe('1.5 KB');
    });

    it('should format dates correctly', () => {
      const timestamp = Date.now();
      const formattedDate = component.formatDate(timestamp);
      expect(formattedDate).toBe(new Date(timestamp).toLocaleString());
    });

    it('should get operation colors correctly', () => {
      expect(component.getOperationColor('create')).toBe('#10b981');
      expect(component.getOperationColor('update')).toBe('#3b82f6');
      expect(component.getOperationColor('delete')).toBe('#ef4444');
      expect(component.getOperationColor('unknown')).toBe('#6b7280');
    });

    it('should get storage status colors correctly', () => {
      expect(component.getStorageStatusColor('healthy')).toBe('#10b981');
      expect(component.getStorageStatusColor('warning')).toBe('#f59e0b');
      expect(component.getStorageStatusColor('critical')).toBe('#ef4444');
      expect(component.getStorageStatusColor('unknown')).toBe('#6b7280');
    });

    it('should get storage status icons correctly', () => {
      expect(component.getStorageStatusIcon('healthy')).toBe('✅');
      expect(component.getStorageStatusIcon('warning')).toBe('⚠️');
      expect(component.getStorageStatusIcon('critical')).toBe('🚨');
      expect(component.getStorageStatusIcon('unknown')).toBe('❓');
    });

    it('should get JSON size correctly', () => {
      const obj = { name: 'test', value: 123 };
      expect(component.getJsonSize(obj)).toBe(JSON.stringify(obj).length);
    });

    it('should get object keys correctly', () => {
      const obj = { key1: 'value1', key2: 'value2' };
      expect(component.getObjectKeys(obj)).toEqual(['key1', 'key2']);
    });

    it('should get object entries correctly', () => {
      const obj = { key1: 'value1', key2: 'value2' };
      expect(component.getObjectEntries(obj)).toEqual([
        ['key1', 'value1'],
        ['key2', 'value2'],
      ]);
    });
  });

  describe('State Management', () => {
    it('should manage tab navigation correctly', () => {
      expect(component.activeTab()).toBe('overview');

      component.setActiveTab('backups');
      expect(component.activeTab()).toBe('backups');

      component.setActiveTab('invalid-tab');
      expect(component.activeTab()).toBe('backups'); // should not change
    });

    it('should manage recovery options correctly', () => {
      expect(component.recoveryOptions()).toEqual({ strategy: 'auto', keys: [] });

      component.addRecoveryKey('test-key');
      expect(component.recoveryOptions().keys).toContain('test-key');

      component.addRecoveryKey(''); // should not add empty key
      expect(component.recoveryOptions().keys.length).toBe(1);

      component.addRecoveryKey('test-key'); // should not add duplicate
      expect(component.recoveryOptions().keys.length).toBe(1);

      component.removeRecoveryKey(0);
      expect(component.recoveryOptions().keys).toEqual([]);

      component.updateRecoveryStrategy('manual');
      expect(component.recoveryOptions().strategy).toBe('manual');
    });

    it('should manage export options correctly', () => {
      expect(component.exportOptions()).toEqual({
        includeBackups: true,
        includeAnalytics: true,
        compressionEnabled: false,
      });

      component.updateExportOption('includeBackups', false);
      expect(component.exportOptions().includeBackups).toBe(false);
    });

    it('should manage backup selection correctly', () => {
      const mockBackup = createMockBackup();

      expect(component.selectedBackup()).toBeNull();

      component.selectBackup(mockBackup);
      expect(component.selectedBackup()).toBe(mockBackup);
    });
  });

  describe('Event Handlers', () => {
    it('should handle recovery key press correctly', () => {
      const mockEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
      });
      Object.defineProperty(mockEvent, 'target', {
        writable: false,
        value: {
          value: 'test-key',
        },
      });

      component.handleRecoveryKeyPress(mockEvent);
      expect(component.recoveryOptions().keys).toContain('test-key');
      expect((mockEvent.target as any).value).toBe('');

      // Test non-Enter key
      const mockEvent2 = new KeyboardEvent('keydown', {
        key: 'Tab',
      });
      Object.defineProperty(mockEvent2, 'target', {
        writable: false,
        value: {
          value: 'another-key',
        },
      });

      component.handleRecoveryKeyPress(mockEvent2);
      expect(component.recoveryOptions().keys).not.toContain('another-key');
    });
  });

  describe('Data Corruption Simulation', () => {
    it('should simulate data corruption successfully', async () => {
      const mockCurrentData = [createMockTask()];
      localStorageService.getItem.mockResolvedValue({
        success: true,
        data: mockCurrentData,
      });
      localStorageService.setItem.mockResolvedValue({
        success: true,
      });

      mockConfirm(true);
      const alertSpy = mockAlert();
      const loadStorageDataSpy = vi
        .spyOn(component, 'loadStorageData')
        .mockResolvedValue(undefined);

      // Mock Math.random to get predictable corruption type
      vi.spyOn(Math, 'random').mockReturnValue(0.25); // Will select 'missing_structure' (index 1 of 4: 0, 0.25, 0.5, 0.75)

      await component.simulateCorruption();

      expect(localStorageService.getItem).toHaveBeenCalledWith('taskgo_tasks');
      expect(localStorageService.setItem).toHaveBeenCalledWith('taskgo_tasks', [
        {
          id: 'test-task-1',
        },
      ]);
      expect(alertSpy).toHaveBeenCalledWith(
        expect.stringContaining('Data corrupted using method: missing_structure')
      );
      expect(loadStorageDataSpy).toHaveBeenCalled();
      expect(component.isLoading()).toBe(false);
    });

    it('should handle corruption when no data exists', async () => {
      localStorageService.getItem.mockResolvedValue({
        success: true,
        data: null,
      });

      mockConfirm(true);
      const alertSpy = mockAlert();

      await component.simulateCorruption();

      expect(alertSpy).toHaveBeenCalledWith('No data found to corrupt. Add some tasks first.');
      expect(component.isLoading()).toBe(false);
    });

    it('should cancel corruption when confirmation is rejected', async () => {
      mockConfirm(false);

      await component.simulateCorruption();

      expect(localStorageService.getItem).not.toHaveBeenCalled();
      expect(component.isLoading()).toBe(false);
    });
  });

  describe('Detailed Analytics', () => {
    it('should generate detailed analytics successfully', async () => {
      const mockDetailedAnalytics = {
        growthRate: 512,
        averageBackupSize: 2048,
        compressionRatio: 1.0,
        hotKeys: [{ key: 'tasks', accessCount: 5, lastAccess: Date.now() }],
      };

      const mockGrowthPrediction = {
        predictedUsage: 4096,
        quotaReachedDate: undefined,
        confidence: 0.7,
      };

      storageAnalyticsService.generateDetailedAnalytics.mockResolvedValue(mockDetailedAnalytics);
      storageAnalyticsService.getStorageGrowthPrediction.mockResolvedValue(mockGrowthPrediction);

      const alertSpy = mockAlert();

      await component.getDetailedAnalytics();

      expect(storageAnalyticsService.generateDetailedAnalytics).toHaveBeenCalled();
      expect(storageAnalyticsService.getStorageGrowthPrediction).toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith(
        'Detailed analytics logged to console. Check developer tools for full report.'
      );
      expect(component.isLoading()).toBe(false);
    });

    it('should handle detailed analytics failures', async () => {
      storageAnalyticsService.generateDetailedAnalytics.mockRejectedValue(
        new Error('Analytics failed')
      );

      const alertSpy = mockAlert();

      await component.getDetailedAnalytics();

      expect(alertSpy).toHaveBeenCalledWith(
        'Failed to generate detailed analytics: Analytics failed'
      );
      expect(component.isLoading()).toBe(false);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete data refresh cycle', async () => {
      const mockAnalytics = { totalOperations: 10 };
      const mockHealthReport = { status: 'healthy', usage: { percentage: 60, used: 1024 } };
      const mockBackupHistory = [createMockBackup()];

      localStorageService.getStorageAnalytics.mockResolvedValue({
        success: true,
        data: mockAnalytics,
      });
      localStorageService.getStorageHealthReport.mockResolvedValue({
        success: true,
        data: mockHealthReport,
      });
      localStorageService.getBackupHistory.mockResolvedValue({
        success: true,
        data: mockBackupHistory,
      });

      // Clear any previous calls to ensure clean state
      localStorageService.getBackupHistory.mockClear();
      localStorageService.getStorageAnalytics.mockClear();
      localStorageService.getStorageHealthReport.mockClear();

      // Re-setup mocks after clearing
      localStorageService.getStorageAnalytics.mockResolvedValue({
        success: true,
        data: mockAnalytics,
      });
      localStorageService.getStorageHealthReport.mockResolvedValue({
        success: true,
        data: mockHealthReport,
      });
      localStorageService.getBackupHistory.mockImplementation((key?: string) => {
        if (key === 'taskgo_tasks') {
          return Promise.resolve({
            success: true,
            data: mockBackupHistory,
          });
        }
        return Promise.resolve({
          success: true,
          data: [],
        });
      });

      await component.refresh();

      expect(localStorageService.getStorageAnalytics).toHaveBeenCalledTimes(1);
      expect(localStorageService.getStorageHealthReport).toHaveBeenCalledTimes(1);
      expect(localStorageService.getBackupHistory).toHaveBeenCalledTimes(2); // tasks + archived
      expect(component.analytics()).toBe(mockAnalytics);
      expect(component.healthReport()).toBe(mockHealthReport);
      expect(component.backupHistory()).toEqual(mockBackupHistory);
    });

    it('should handle concurrent operations safely', async () => {
      // Simulate multiple operations happening at once
      const analyticsPromise = new Promise((resolve) =>
        setTimeout(() => resolve({ success: true, data: {} }), 50)
      );
      const healthPromise = new Promise((resolve) =>
        setTimeout(
          () =>
            resolve({
              success: true,
              data: {
                status: 'healthy',
                usage: {
                  percentage: 60,
                  used: 1024,
                },
              },
            }),
          30
        )
      );
      const backupPromise = new Promise((resolve) =>
        setTimeout(() => resolve({ success: true, data: [] }), 20)
      );

      localStorageService.getStorageAnalytics.mockReturnValue(analyticsPromise as any);
      localStorageService.getStorageHealthReport.mockReturnValue(healthPromise as any);
      localStorageService.getBackupHistory.mockReturnValue(backupPromise as any);

      const startTime = Date.now();
      await component.loadStorageData();
      const endTime = Date.now();

      // Should complete in roughly the time of the longest operation
      expect(endTime - startTime).toBeLessThan(100);
      expect(component.isLoading()).toBe(false);
    });
  });
});
