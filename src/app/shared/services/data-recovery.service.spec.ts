import { TestBed } from '@angular/core/testing';
import { DataRecoveryService, RecoveryOptions, DataIntegrityReport, RecoveryResult } from './data-recovery.service';
import { LocalStorageService, StorageError } from './local-storage.service';
import { AuthService } from './auth.service';
import { of, throwError } from 'rxjs';

describe('DataRecoveryService', () => {
  let service: DataRecoveryService;
  let localStorageService: jasmine.SpyObj<LocalStorageService>;
  let authService: jasmine.SpyObj<AuthService>;

  const mockTask = {
    id: '1',
    title: 'Test Task',
    priority: 'medium' as const,
    status: 'TODO' as const,
    project: 'Work' as const,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockBackup = {
    id: 'backup_123',
    timestamp: Date.now(),
    data: mockTask,
    metadata: {
      version: '1.0.0',
      timestamp: Date.now(),
      checksum: 'abc123',
      crc32: 'def456',
      backupId: 'backup_123',
      operation: 'update' as const
    },
    operation: 'update' as const,
    key: 'tasks',
    compressed: false
  };

  beforeEach(() => {
    const localStorageSpy = jasmine.createSpyObj('LocalStorageService', [
      'getItem',
      'getBackupHistory',
      'restoreFromBackup'
    ]);

    const authSpy = jasmine.createSpyObj('AuthService', [
      'logSecurityEvent',
      'getUserContext'
    ]);

    TestBed.configureTestingModule({
      providers: [
        DataRecoveryService,
        { provide: LocalStorageService, useValue: localStorageSpy },
        { provide: AuthService, useValue: authSpy }
      ]
    });

    service = TestBed.inject(DataRecoveryService);
    localStorageService = TestBed.inject(LocalStorageService) as jasmine.SpyObj<LocalStorageService>;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;

    // Setup default spy behaviors
    authService.getUserContext.and.returnValue({ userId: 'test-user' });
    authService.logSecurityEvent.and.returnValue();
  });

  describe('Integrity Checking', () => {
    it('should validate valid task data', async () => {
      localStorageService.getItem.and.resolveTo({
        success: true,
        data: [mockTask]
      });

      localStorageService.getBackupHistory.and.resolveTo({
        success: true,
        data: []
      });

      const result = await service.performIntegrityCheck(['tasks']);

      expect(result.success).toBe(true);
      expect(result.data![0].key).toBe('tasks');
      expect(result.data![0].isValid).toBe(true);
      expect(result.data![0].errors).toEqual([]);
    });

    it('should detect missing required fields in task data', async () => {
      const invalidTask = { ...mockTask, id: '' };

      localStorageService.getItem.and.resolveTo({
        success: true,
        data: [invalidTask]
      });

      localStorageService.getBackupHistory.and.resolveTo({
        success: true,
        data: []
      });

      const result = await service.performIntegrityCheck(['tasks']);

      expect(result.success).toBe(true);
      expect(result.data![0].isValid).toBe(false);
      expect(result.data![0].errors).toContain('Task must have a valid id');
    });

    it('should detect invalid enum values', async () => {
      const invalidTask = {
        ...mockTask,
        priority: 'invalid' as any,
        status: 'INVALID' as any,
        project: 'Invalid' as any
      };

      localStorageService.getItem.and.resolveTo({
        success: true,
        data: [invalidTask]
      });

      localStorageService.getBackupHistory.and.resolveTo({
        success: true,
        data: []
      });

      const result = await service.performIntegrityCheck(['tasks']);

      expect(result.success).toBe(true);
      expect(result.data![0].isValid).toBe(false);
      expect(result.data![0].errors).toContain('Invalid priority: invalid');
      expect(result.data![0].errors).toContain('Invalid status: INVALID');
      expect(result.data![0].errors).toContain('Invalid project: Invalid');
    });

    it('should handle storage read errors', async () => {
      localStorageService.getItem.and.resolveTo({
        success: false,
        error: {
          name: 'CorruptionError',
          message: 'Data corrupted',
          isCorruption: true
        } as StorageError
      });

      localStorageService.getBackupHistory.and.resolveTo({
        success: true,
        data: [mockBackup]
      });

      const result = await service.performIntegrityCheck(['tasks']);

      expect(result.success).toBe(true);
      expect(result.data![0].isValid).toBe(false);
      expect(result.data![0].errors).toContain('Failed to read data: Data corrupted');
      expect(result.data![0].corruptionType).toBe('structure');
      expect(result.data![0].availableBackups).toBe(1);
      expect(result.data![0].recommendedAction).toBe('restore_backup');
    });

    it('should detect duplicate task IDs', async () => {
      const duplicateTasks = [
        mockTask,
        { ...mockTask, id: '1' }, // Same ID
        { ...mockTask, id: '2', title: 'Different Task' }
      ];

      localStorageService.getItem.and.resolveTo({
        success: true,
        data: duplicateTasks
      });

      localStorageService.getBackupHistory.and.resolveTo({
        success: true,
        data: []
      });

      const result = await service.performIntegrityCheck(['tasks']);

      expect(result.success).toBe(true);
      expect(result.data![0].isValid).toBe(true); // Structure is valid
      expect(result.data![0].warnings).toContain('Duplicate task IDs found: 1');
    });

    it('should validate date ordering', async () => {
      const taskWithBadDates = {
        ...mockTask,
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-01') // Before created
      };

      localStorageService.getItem.and.resolveTo({
        success: true,
        data: [taskWithBadDates]
      });

      localStorageService.getBackupHistory.and.resolveTo({
        success: true,
        data: []
      });

      const result = await service.performIntegrityCheck(['tasks']);

      expect(result.success).toBe(true);
      expect(result.data![0].isValid).toBe(true);
      expect(result.data![0].warnings).toContain('updatedAt date is before createdAt date');
    });
  });

  describe('Auto Recovery', () => {
    it('should successfully recover from valid backup', async () => {
      localStorageService.getItem.and.resolveTo({
        success: false,
        error: {
          name: 'CorruptionError',
          message: 'Data corrupted',
          isCorruption: true
        } as StorageError
      });

      localStorageService.getBackupHistory.and.resolveTo({
        success: true,
        data: [mockBackup]
      });

      localStorageService.restoreFromBackup.and.resolveTo({
        success: true,
        data: mockTask
      });

      const result = await service.performRecovery('tasks', { strategy: 'auto' });

      expect(result.success).toBe(true);
      expect(result.data!.success).toBe(true);
      expect(result.data!.strategy).toBe('auto');
      expect(result.data!.backupUsed).toEqual(mockBackup);
      expect(result.data!.warnings).toContain('Auto-recovered from backup backup_123');
    });

    it('should fail when no backups available', async () => {
      localStorageService.getItem.and.resolveTo({
        success: false,
        error: {
          name: 'CorruptionError',
          message: 'Data corrupted',
          isCorruption: true
        } as StorageError
      });

      localStorageService.getBackupHistory.and.resolveTo({
        success: true,
        data: []
      });

      const result = await service.performRecovery('tasks', { strategy: 'auto' });

      expect(result.success).toBe(false);
      expect(result.error?.name).toBe('RecoveryError');
      expect(result.error?.message).toContain('No valid backups available');
    });

    it('should handle backup restoration failure', async () => {
      localStorageService.getItem.and.resolveTo({
        success: false,
        error: {
          name: 'CorruptionError',
          message: 'Data corrupted',
          isCorruption: true
        } as StorageError
      });

      localStorageService.getBackupHistory.and.resolveTo({
        success: true,
        data: [mockBackup]
      });

      localStorageService.restoreFromBackup.and.resolveTo({
        success: false,
        error: {
          name: 'RecoveryError',
          message: 'Backup restoration failed',
          isRecoveryError: true
        } as StorageError
      });

      const result = await service.performRecovery('tasks', { strategy: 'auto' });

      expect(result.success).toBe(false);
      expect(result.data!.success).toBe(false);
      expect(result.data!.errors).toContain('Failed to restore from backup: Backup restoration failed');
    });

    it('should skip recovery if data is already valid', async () => {
      localStorageService.getItem.and.resolveTo({
        success: true,
        data: [mockTask]
      });

      localStorageService.getBackupHistory.and.resolveTo({
        success: true,
        data: []
      });

      const result = await service.performRecovery('tasks', { strategy: 'auto' });

      expect(result.success).toBe(true);
      expect(result.data!.success).toBe(true);
      expect(result.data!.warnings).toContain('Data is already valid, no recovery needed');
      expect(localStorageService.restoreFromBackup).not.toHaveBeenCalled();
    });
  });

  describe('Conservative Recovery', () => {
    it('should proceed with recovery for non-structural errors', async () => {
      localStorageService.getItem.and.resolveTo({
        success: false,
        error: {
          name: 'CorruptionError',
          message: 'CRC32 checksum mismatch',
          isCorruption: true
        } as StorageError
      });

      localStorageService.getBackupHistory.and.resolveTo({
        success: true,
        data: [mockBackup]
      });

      localStorageService.restoreFromBackup.and.resolveTo({
        success: true,
        data: mockTask
      });

      const result = await service.performRecovery('tasks', { strategy: 'conservative' });

      expect(result.success).toBe(true);
      expect(result.data!.success).toBe(true);
      expect(result.data!.strategy).toBe('conservative');
      expect(result.data!.warnings).toContain('Conservative recovery: restored from backup backup_123');
    });

    it('should abort for structural errors', async () => {
      localStorageService.getItem.and.resolveTo({
        success: false,
        error: {
          name: 'ValidationError',
          message: 'Task must have a valid id',
          isStorageDisabled: false
        } as StorageError
      });

      localStorageService.getBackupHistory.and.resolveTo({
        success: true,
        data: [mockBackup]
      });

      const result = await service.performRecovery('tasks', { strategy: 'conservative' });

      expect(result.success).toBe(false);
      expect(result.error?.name).toBe('RecoveryError');
      expect(result.error?.message).toContain('Conservative recovery aborted due to structural errors');
      expect(localStorageService.restoreFromBackup).not.toHaveBeenCalled();
    });
  });

  describe('Manual Recovery', () => {
    it('should return manual recovery requirements', async () => {
      localStorageService.getItem.and.resolveTo({
        success: false,
        error: {
          name: 'CorruptionError',
          message: 'Data corrupted',
          isCorruption: true
        } as StorageError
      });

      localStorageService.getBackupHistory.and.resolveTo({
        success: true,
        data: [mockBackup]
      });

      const result = await service.performRecovery('tasks', { strategy: 'manual' });

      expect(result.success).toBe(false);
      expect(result.error?.name).toBe('RecoveryError');
      expect(result.error?.message).toContain('Manual recovery requires user intervention');
    });
  });

  describe('Batch Recovery', () => {
    it('should handle multiple keys successfully', async () => {
      // Setup mocks for tasks
      localStorageService.getItem.withArgs('tasks').and.resolveTo({
        success: false,
        error: {
          name: 'CorruptionError',
          message: 'Tasks corrupted',
          isCorruption: true
        } as StorageError
      });

      localStorageService.getItem.withArgs('archived_tasks').and.resolveTo({
        success: true,
        data: []
      });

      localStorageService.getBackupHistory.and.resolveTo({
        success: true,
        data: [mockBackup]
      });

      localStorageService.restoreFromBackup.and.resolveTo({
        success: true,
        data: [mockTask]
      });

      const result = await service.performBatchRecovery(['tasks', 'archived_tasks'], { strategy: 'auto' });

      expect(result.success).toBe(true);
      expect(result.data!.keysProcessed).toEqual(['tasks', 'archived_tasks']);
      expect(result.data!.summary.total).toBe(2);
      expect(result.data!.summary.recovered).toBe(1);
      expect(result.data!.summary.failed).toBe(1);
      expect(result.data!.status).toBe('failed'); // Not all recovered
    });

    it('should complete successfully when all keys are recovered', async () => {
      localStorageService.getItem.and.resolveTo({
        success: false,
        error: {
          name: 'CorruptionError',
          message: 'Data corrupted',
          isCorruption: true
        } as StorageError
      });

      localStorageService.getBackupHistory.and.resolveTo({
        success: true,
        data: [mockBackup]
      });

      localStorageService.restoreFromBackup.and.resolveTo({
        success: true,
        data: [mockTask]
      });

      const result = await service.performBatchRecovery(['tasks', 'settings'], { strategy: 'auto' });

      expect(result.success).toBe(true);
      expect(result.data!.status).toBe('completed');
      expect(result.data!.summary.recovered).toBe(2);
      expect(result.data!.summary.failed).toBe(0);
    });
  });

  describe('Recovery Recommendations', () => {
    it('should recommend healthy status for valid data', async () => {
      localStorageService.getItem.and.resolveTo({
        success: true,
        data: [mockTask]
      });

      localStorageService.getBackupHistory.and.resolveTo({
        success: true,
        data: []
      });

      const result = await service.getRecoveryRecommendations(['tasks']);

      expect(result.success).toBe(true);
      expect(result.data!.overall).toBe('healthy');
      expect(result.data!.urgency).toBe('low');
      expect(result.data!.recommendations).toContain('Data integrity is good - no immediate action required');
      expect(result.data!.autoRecoveryPossible).toBe(true);
    });

    it('should recommend degraded status for partial corruption', async () => {
      // 70% valid keys out of 10 = 7 valid, 3 invalid
      localStorageService.getItem.and.returnValues(
        // 7 valid results
        ...Array(7).fill(null).map(() => Promise.resolve({
          success: true,
          data: [mockTask]
        })),
        // 3 invalid results
        ...Array(3).fill(null).map(() => Promise.resolve({
          success: false,
          error: {
            name: 'CorruptionError',
            message: 'Data corrupted',
            isCorruption: true
          } as StorageError
        }))
      );

      localStorageService.getBackupHistory.and.resolveTo({
        success: true,
        data: [mockBackup]
      });

      const keys = Array(10).fill(null).map((_, i) => `key_${i}`);
      const result = await service.getRecoveryRecommendations(keys);

      expect(result.success).toBe(true);
      expect(result.data!.overall).toBe('degraded');
      expect(result.data!.urgency).toBe('medium');
      expect(result.data!.recommendations).toContain('Some data corruption detected - consider recovery');
      expect(result.data!.autoRecoveryPossible).toBe(true);
    });

    it('should recommend critical status for widespread corruption', async () => {
      // Only 50% valid keys out of 10 = 5 valid, 5 invalid
      localStorageService.getItem.and.returnValues(
        // 5 valid results
        ...Array(5).fill(null).map(() => Promise.resolve({
          success: true,
          data: [mockTask]
        })),
        // 5 invalid results
        ...Array(5).fill(null).map(() => Promise.resolve({
          success: false,
          error: {
            name: 'CorruptionError',
            message: 'Data corrupted',
            isCorruption: true
          } as StorageError
        }))
      );

      localStorageService.getBackupHistory.and.resolveTo({
        success: true,
        data: [mockBackup]
      });

      const keys = Array(10).fill(null).map((_, i) => `key_${i}`);
      const result = await service.getRecoveryRecommendations(keys);

      expect(result.success).toBe(true);
      expect(result.data!.overall).toBe('critical');
      expect(result.data!.urgency).toBe('high');
      expect(result.data!.recommendations).toContain('Critical data corruption detected - immediate recovery recommended');
    });

    it('should detect structural errors and increase urgency', async () => {
      localStorageService.getItem.and.resolveTo({
        success: false,
        error: {
          name: 'ValidationError',
          message: 'Task must have a valid id',
          isStorageDisabled: false
        } as StorageError
      });

      localStorageService.getBackupHistory.and.resolveTo({
        success: true,
        data: [mockBackup]
      });

      const result = await service.getRecoveryRecommendations(['tasks']);

      expect(result.success).toBe(true);
      expect(result.data!.urgency).toBe('critical');
      expect(result.data!.recommendations).toContain('keys have structural errors requiring manual intervention');
    });
  });

  describe('Session Management', () => {
    it('should create and track recovery sessions', async () => {
      localStorageService.getItem.and.resolveTo({
        success: false,
        error: {
          name: 'CorruptionError',
          message: 'Data corrupted',
          isCorruption: true
        } as StorageError
      });

      localStorageService.getBackupHistory.and.resolveTo({
        success: true,
        data: []
      });

      const result = await service.performBatchRecovery(['tasks'], { strategy: 'auto' });
      
      expect(result.success).toBe(true);
      expect(result.data!.status).toMatch(/^(completed|failed)$/);
      expect(result.data!.startTime).toBeGreaterThan(0);
      expect(result.data!.endTime).toBeGreaterThan(0);
      expect(result.data!.keysProcessed).toEqual(['tasks']);
    });

    it('should log security events for recovery operations', async () => {
      localStorageService.getItem.and.resolveTo({
        success: true,
        data: [mockTask]
      });

      localStorageService.getBackupHistory.and.resolveTo({
        success: true,
        data: []
      });

      await service.performRecovery('tasks', { strategy: 'auto' });

      expect(authService.logSecurityEvent).toHaveBeenCalledWith({
        type: 'DATA_RECOVERY',
        message: jasmine.stringContaining('Recovery session'),
        timestamp: jasmine.any(Date),
        userId: 'test-user'
      });
    });

    it('should allow cancelling active sessions', async () => {
      // Start a batch recovery that we'll cancel
      localStorageService.getItem.and.returnValue(new Promise(() => {})); // Never resolves
      localStorageService.getBackupHistory.and.resolveTo({
        success: true,
        data: []
      });

      const batchPromise = service.performBatchRecovery(['tasks'], { strategy: 'auto' });
      
      // Get the session (this is a bit of a hack for testing)
      // In a real scenario, you'd get the session ID from the service
      const session = (service as any).activeSessions;
      let sessionId: string | undefined;
      for (const [id, s] of session.entries()) {
        if (s.status === 'in_progress') {
          sessionId = id;
          break;
        }
      }

      expect(sessionId).toBeDefined();

      const cancelled = service.cancelRecoverySession(sessionId!);
      expect(cancelled).toBe(true);

      // Clean up the hanging promise
      setTimeout(() => {
        // Force resolution to prevent test hanging
        (localStorageService.getItem as jasmine.Spy).calls.reset();
        localStorageService.getItem.and.resolveTo({
          success: true,
          data: []
        });
      }, 0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined data gracefully', async () => {
      localStorageService.getItem.and.resolveTo({
        success: true,
        data: null
      });

      localStorageService.getBackupHistory.and.resolveTo({
        success: true,
        data: []
      });

      const result = await service.performIntegrityCheck(['tasks']);

      expect(result.success).toBe(true);
      expect(result.data![0].isValid).toBe(true);
      expect(result.data![0].warnings).toContain('Data is null or undefined');
    });

    it('should handle empty arrays correctly', async () => {
      localStorageService.getItem.and.resolveTo({
        success: true,
        data: []
      });

      localStorageService.getBackupHistory.and.resolveTo({
        success: true,
        data: []
      });

      const result = await service.performIntegrityCheck(['tasks']);

      expect(result.success).toBe(true);
      expect(result.data![0].isValid).toBe(true);
      expect(result.data![0].warnings).toContain('Task list is empty');
    });

    it('should handle malformed backup history', async () => {
      localStorageService.getItem.and.resolveTo({
        success: false,
        error: {
          name: 'CorruptionError',
          message: 'Data corrupted',
          isCorruption: true
        } as StorageError
      });

      localStorageService.getBackupHistory.and.resolveTo({
        success: false,
        error: {
          name: 'UnknownError',
          message: 'Failed to get backups',
          isStorageDisabled: false
        } as StorageError
      });

      const result = await service.performIntegrityCheck(['tasks']);

      expect(result.success).toBe(true);
      expect(result.data![0].isValid).toBe(false);
      expect(result.data![0].availableBackups).toBe(0);
      expect(result.data![0].recommendedAction).toBe('restore_backup');
    });
  });
});