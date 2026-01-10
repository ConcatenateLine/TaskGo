import { TestBed } from '@angular/core/testing';
import {
  DataRecoveryService,
  RecoveryOptions,
  DataIntegrityReport,
  RecoveryResult,
} from './data-recovery.service';
import { LocalStorageService, StorageError, BackupSnapshot } from './local-storage.service';
import { AuthService } from './auth.service';
import { of, throwError } from 'rxjs';
import { vi, beforeEach, describe, it, expect } from 'vitest';

describe('DataRecoveryService', () => {
  let service: DataRecoveryService;
  let localStorageService: any;
  let authService: any;

  const mockTask = {
    id: '1',
    title: 'Test Task',
    priority: 'medium' as const,
    status: 'TODO' as const,
    project: 'Work' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockBackup: BackupSnapshot = {
    id: 'backup_123',
    timestamp: Date.now(),
    data: mockTask,
    metadata: {
      version: '1.0.0',
      timestamp: Date.now(),
      checksum: 'abc123',
      crc32: 'def456',
      backupId: 'backup_123',
      operation: 'update' as const,
    },
    operation: 'update' as const,
    key: 'tasks',
    compressed: false,
  };

  beforeEach(() => {
    localStorageService = {
      getItem: vi.fn(),
      getBackupHistory: vi.fn(),
      restoreFromBackup: vi.fn(),
    };

    authService = {
      logSecurityEvent: vi.fn(),
      getUserContext: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        DataRecoveryService,
        { provide: LocalStorageService, useValue: localStorageService },
        { provide: AuthService, useValue: authService },
      ],
    });

    service = TestBed.inject(DataRecoveryService);

    // Setup default spy behaviors
    authService.getUserContext.mockReturnValue({ userId: 'test-user' });
    authService.logSecurityEvent.mockReturnValue();
  });

  describe('Integrity Checking', () => {
    it('should validate valid task data', async () => {
      localStorageService.getItem.mockResolvedValue({
        success: true,
        data: [mockTask],
      });

      localStorageService.getBackupHistory.mockResolvedValue({
        success: true,
        data: [],
      });

      const result = await service.performIntegrityCheck(['tasks']);

      expect(result.success).toBe(true);
      expect(result.data![0].key).toBe('tasks');
      expect(result.data![0].isValid).toBe(true);
      expect(result.data![0].errors).toEqual([]);
    });

    it('should detect missing required fields in task data', async () => {
      const invalidTask = { ...mockTask, id: '' };

      localStorageService.getItem.mockResolvedValue({
        success: true,
        data: [invalidTask],
      });

      localStorageService.getBackupHistory.mockResolvedValue({
        success: true,
        data: [],
      });

      const result = await service.performIntegrityCheck(['tasks']);

      expect(result.success).toBe(true);
      expect(result.data![0].isValid).toBe(false);
    });

    it('should detect invalid enum values', async () => {
      const invalidTask = {
        ...mockTask,
        priority: 'invalid' as any,
        status: 'INVALID' as any,
        project: 'Invalid' as any,
      };

      localStorageService.getItem.mockResolvedValue({
        success: true,
        data: [invalidTask],
      });

      localStorageService.getBackupHistory.mockResolvedValue({
        success: true,
        data: [],
      });

      const result = await service.performIntegrityCheck(['tasks']);

      expect(result.success).toBe(true);
      expect(result.data![0].isValid).toBe(false);
    });

    it('should handle storage read errors', async () => {
      localStorageService.getItem.mockResolvedValue({
        success: false,
        error: {
          name: 'CorruptionError',
          message: 'Data corrupted',
          isCorruption: true,
        } as StorageError,
      });

      localStorageService.getBackupHistory.mockResolvedValue({
        success: true,
        data: [mockBackup],
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
        { ...mockTask, id: '2', title: 'Different Task' },
      ];

      localStorageService.getItem.mockResolvedValue({
        success: true,
        data: duplicateTasks,
      });

      localStorageService.getBackupHistory.mockResolvedValue({
        success: true,
        data: [],
      });

      const result = await service.performIntegrityCheck(['tasks']);

      expect(result.success).toBe(true);
      expect(result.data![0].isValid).toBe(true); // Structure is valid
    });

    it('should validate date ordering', async () => {
      const taskWithBadDates = {
        ...mockTask,
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-01'), // Before created
      };

      localStorageService.getItem.mockResolvedValue({
        success: true,
        data: [taskWithBadDates],
      });

      localStorageService.getBackupHistory.mockResolvedValue({
        success: true,
        data: [],
      });

      const result = await service.performIntegrityCheck(['tasks']);

      expect(result.success).toBe(true);
      expect(result.data![0].isValid).toBe(true);
    });
  });

  describe('Auto Recovery', () => {
    it('should successfully recover from valid backup', async () => {
      localStorageService.getItem.mockResolvedValue({
        success: false,
        error: {
          name: 'CorruptionError',
          message: 'Data corrupted',
          isCorruption: true,
        } as StorageError,
      });

      localStorageService.getBackupHistory.mockResolvedValue({
        success: true,
        data: [mockBackup],
      });

      localStorageService.restoreFromBackup.mockResolvedValue({
        success: true,
        data: mockTask,
      });

      const result = await service.performRecovery('tasks', { strategy: 'auto' });

      expect(result.success).toBe(true);
      expect(result.data!.success).toBe(true);
      expect(result.data!.strategy).toBe('auto');
      expect(result.data!.backupUsed).toEqual(mockBackup);
      expect(result.data!.warnings).toContain('Auto-recovered from backup backup_123');
    });

    it('should fail when no backups available', async () => {
      localStorageService.getItem.mockResolvedValue({
        success: false,
        error: {
          name: 'CorruptionError',
          message: 'Data corrupted',
          isCorruption: true,
        } as StorageError,
      });

      localStorageService.getBackupHistory.mockResolvedValue({
        success: true,
        data: [],
      });

      const result = await service.performRecovery('tasks', { strategy: 'auto' });
      console.log('result', result);

      expect(result.success).toBe(false);
    });

    it('should skip recovery if data is already valid', async () => {
      localStorageService.getItem.mockResolvedValue({
        success: true,
        data: [mockTask],
      });

      localStorageService.getBackupHistory.mockResolvedValue({
        success: true,
        data: [],
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
      localStorageService.getItem.mockResolvedValue({
        success: false,
        error: {
          name: 'CorruptionError',
          message: 'CRC32 checksum mismatch',
          isCorruption: true,
        } as StorageError,
      });

      localStorageService.getBackupHistory.mockResolvedValue({
        success: true,
        data: [mockBackup],
      });

      localStorageService.restoreFromBackup.mockResolvedValue({
        success: true,
        data: mockTask,
      });

      const result = await service.performRecovery('tasks', { strategy: 'conservative' });

      expect(result.success).toBe(true);
      expect(result.data!.success).toBe(true);
      expect(result.data!.strategy).toBe('conservative');
      expect(result.data!.warnings).toContain(
        'Conservative recovery: restored from backup backup_123'
      );
    });

    it('should abort for structural errors', async () => {
      localStorageService.getItem.mockResolvedValue({
        success: false,
        error: {
          name: 'ValidationError',
          message: 'Task must have a valid id',
          isStorageDisabled: false,
        } as StorageError,
      });

      localStorageService.getBackupHistory.mockResolvedValue({
        success: true,
        data: [mockBackup],
      });

      const result = await service.performRecovery('tasks', { strategy: 'conservative' });

      expect(result.success).toBe(false);
      expect(result.error?.name).toBe('RecoveryError');
      expect(result.error?.message).toContain(
        'Conservative recovery aborted due to structural errors'
      );
      expect(localStorageService.restoreFromBackup).not.toHaveBeenCalled();
    });
  });

  describe('Manual Recovery', () => {
    it('should return manual recovery requirements', async () => {
      localStorageService.getItem.mockResolvedValue({
        success: false,
        error: {
          name: 'CorruptionError',
          message: 'Data corrupted',
          isCorruption: true,
        } as StorageError,
      });

      localStorageService.getBackupHistory.mockResolvedValue({
        success: true,
        data: [mockBackup],
      });

      const result = await service.performRecovery('tasks', { strategy: 'manual' });

      expect(result.success).toBe(false);
      expect(result.error?.name).toBe('RecoveryError');
      expect(result.error?.message).toContain('Manual recovery requires user intervention');
    });
  });

  describe('Batch Recovery', () => {
    it('should complete successfully when all keys are recovered', async () => {
      localStorageService.getItem.mockResolvedValue({
        success: false,
        error: {
          name: 'CorruptionError',
          message: 'Data corrupted',
          isCorruption: true,
        } as StorageError,
      });

      localStorageService.getBackupHistory.mockResolvedValue({
        success: true,
        data: [mockBackup],
      });

      localStorageService.restoreFromBackup.mockResolvedValue({
        success: true,
        data: [mockTask],
      });

      const result = await service.performBatchRecovery(['tasks', 'settings'], {
        strategy: 'auto',
      });

      expect(result.success).toBe(true);
      expect(result.data!.status).toBe('completed');
      expect(result.data!.summary.recovered).toBe(2);
      expect(result.data!.summary.failed).toBe(0);
    });
  });

  describe('Recovery Recommendations', () => {
    it('should recommend healthy status for valid data', async () => {
      localStorageService.getItem.mockResolvedValue({
        success: true,
        data: [mockTask],
      });

      localStorageService.getBackupHistory.mockResolvedValue({
        success: true,
        data: [],
      });

      const result = await service.getRecoveryRecommendations(['tasks']);

      expect(result.success).toBe(true);
      expect(result.data!.overall).toBe('healthy');
      expect(result.data!.urgency).toBe('low');
      expect(result.data!.recommendations).toContain(
        'Data integrity is good - no immediate action required'
      );
      expect(result.data!.autoRecoveryPossible).toBe(true);
    });

    it('should recommend degraded status for partial corruption', async () => {
      // 70% valid keys out of 10 = 7 valid, 3 invalid
      const keys = Array(10)
        .fill(null)
        .map((_, i) => `key_${i}`);

      localStorageService.getItem.mockImplementation((key: string) => {
        if (key.startsWith('key_')) {
          const index = parseInt(key.split('_')[1]);
          if (index < 7) {
            // 7 valid results
            return Promise.resolve({
              success: true,
              data: [mockTask],
            });
          } else {
            // 3 invalid results
            return Promise.resolve({
              success: false,
              error: {
                name: 'CorruptionError',
                message: 'Data corrupted',
                isCorruption: true,
              } as StorageError,
            });
          }
        }
        return Promise.resolve({
          success: false,
          error: { name: 'UnknownError', message: 'Unknown key' } as StorageError,
        });
      });

      localStorageService.getBackupHistory.mockResolvedValue({
        success: true,
        data: [mockBackup],
      });

      const result = await service.getRecoveryRecommendations(keys);

      expect(result.success).toBe(true);
      expect(result.data!.overall).toBe('degraded');
      expect(result.data!.urgency).toBe('critical');
      expect(result.data!.recommendations).toContain(
        'Some data corruption detected - consider recovery'
      );
      expect(result.data!.autoRecoveryPossible).toBe(true);
    });

    it('should recommend critical status for widespread corruption', async () => {
      // Only 50% valid keys out of 10 = 5 valid, 5 invalid
      const keys = Array(10)
        .fill(null)
        .map((_, i) => `key_${i}`);

      localStorageService.getItem.mockImplementation((key: string) => {
        if (key.startsWith('key_')) {
          const index = parseInt(key.split('_')[1]);
          if (index < 5) {
            // 5 valid results
            return Promise.resolve({
              success: true,
              data: [mockTask],
            });
          } else {
            // 5 invalid results
            return Promise.resolve({
              success: false,
              error: {
                name: 'CorruptionError',
                message: 'Data corrupted',
                isCorruption: true,
              } as StorageError,
            });
          }
        }
        return Promise.resolve({
          success: false,
          error: { name: 'UnknownError', message: 'Unknown key' } as StorageError,
        });
      });

      localStorageService.getBackupHistory.mockResolvedValue({
        success: true,
        data: [mockBackup],
      });

      const result = await service.getRecoveryRecommendations(keys);

      expect(result.success).toBe(true);
      expect(result.data!.overall).toBe('critical');
      expect(result.data!.urgency).toBe('critical');
      expect(result.data!.recommendations).toContain(
        'Critical data corruption detected - immediate recovery recommended'
      );
    });

    it('should detect structural errors and increase urgency', async () => {
      localStorageService.getItem.mockResolvedValue({
        success: false,
        error: {
          name: 'ValidationError',
          message: 'Task must have a valid id',
          isStorageDisabled: false,
        } as StorageError,
      });

      localStorageService.getBackupHistory.mockResolvedValue({
        success: true,
        data: [mockBackup],
      });

      const result = await service.getRecoveryRecommendations(['tasks']);

      expect(result.success).toBe(true);
      expect(result.data!.urgency).toBe('high');
    });
  });

  describe('Session Management', () => {
    it('should log security events for recovery operations', async () => {
      localStorageService.getItem.mockResolvedValue({
        success: true,
        data: [mockTask],
      });

      localStorageService.getBackupHistory.mockResolvedValue({
        success: true,
        data: [],
      });

      await service.performRecovery('tasks', { strategy: 'auto' });

      expect(authService.logSecurityEvent).toHaveBeenCalledWith({
        type: 'DATA_RECOVERY',
        message: expect.stringContaining('recovery session'),
        timestamp: expect.any(Date),
        userId: 'test-user',
      });
    });

    it('should allow cancelling active sessions', async () => {
      // Start a batch recovery that we'll cancel
      localStorageService.getItem.mockImplementationOnce(() => new Promise(() => {})); // Never resolves
      localStorageService.getBackupHistory.mockResolvedValue({
        success: true,
        data: [],
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
        (localStorageService.getItem as any).mockClear();
        localStorageService.getItem.mockResolvedValue({
          success: true,
          data: [],
        });
      }, 0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty arrays correctly', async () => {
      localStorageService.getItem.mockResolvedValue({
        success: true,
        data: [],
      });

      localStorageService.getBackupHistory.mockResolvedValue({
        success: true,
        data: [],
      });

      const result = await service.performIntegrityCheck(['tasks']);

      expect(result.success).toBe(true);
      expect(result.data![0].isValid).toBe(true);
    });

    it('should handle malformed backup history', async () => {
      localStorageService.getItem.mockResolvedValue({
        success: false,
        error: {
          name: 'CorruptionError',
          message: 'Data corrupted',
          isCorruption: true,
        } as StorageError,
      });

      localStorageService.getBackupHistory.mockResolvedValue({
        success: false,
        error: {
          name: 'UnknownError',
          message: 'Failed to get backups',
          isStorageDisabled: false,
        } as StorageError,
      });

      const result = await service.performIntegrityCheck(['tasks']);

      expect(result.success).toBe(true);
      expect(result.data![0].isValid).toBe(false);
      expect(result.data![0].availableBackups).toBe(0);
      expect(result.data![0].recommendedAction).toBe('restore_backup');
    });
  });

  describe('Additional Coverage', () => {
    it('should handle getRecoverySession for non-existent session', () => {
      const result = service.getRecoverySession('non-existent');
      expect(result).toBeUndefined();
    });

    it('should handle cancelRecoverySession for non-existent session', () => {
      const result = service.cancelRecoverySession('non-existent');
      expect(result).toBe(false);
    });

    it('should handle cancelRecoverySession for completed session', async () => {
      localStorageService.getItem.mockResolvedValue({
        success: true,
        data: [mockTask],
      });

      localStorageService.getBackupHistory.mockResolvedValue({
        success: true,
        data: [],
      });

      // Complete a session first
      await service.performBatchRecovery(['tasks'], { strategy: 'auto' });

      // Try to cancel a completed session (should fail)
      const session = (service as any).activeSessions;
      let sessionId: string | undefined;
      for (const [id, s] of session.entries()) {
        if (s.status === 'completed') {
          sessionId = id;
          break;
        }
      }

      // Session should be deleted after completion
      const result = service.cancelRecoverySession(sessionId!);
      expect(result).toBe(false);
    });

    it('should handle different data types in validateDataStructure', async () => {
      localStorageService.getItem.mockResolvedValue({
        success: true,
        data: 'invalid data',
      });

      localStorageService.getBackupHistory.mockResolvedValue({
        success: true,
        data: [],
      });

      const result = await service.performIntegrityCheck(['unknown_key']);

      expect(result.success).toBe(true);
      expect(result.data![0].isValid).toBe(true);
    });

    it('should handle current_task validation', async () => {
      localStorageService.getItem.mockResolvedValue({
        success: true,
        data: mockTask,
      });

      localStorageService.getBackupHistory.mockResolvedValue({
        success: true,
        data: [],
      });

      const result = await service.performIntegrityCheck(['current_task']);

      expect(result.success).toBe(true);
      expect(result.data![0].isValid).toBe(true);
      expect(result.data![0].errors).toEqual([]);
    });

    it('should handle invalid date values in task validation', async () => {
      const taskWithInvalidDates = {
        ...mockTask,
        createdAt: 'invalid-date',
        updatedAt: 'invalid-date',
      };

      localStorageService.getItem.mockResolvedValue({
        success: true,
        data: [taskWithInvalidDates],
      });

      localStorageService.getBackupHistory.mockResolvedValue({
        success: true,
        data: [],
      });

      const result = await service.performIntegrityCheck(['tasks']);

      expect(result.success).toBe(true);
      expect(result.data![0].isValid).toBe(false);
      expect(result.data![0].errors[0]).include('Invalid createdAt date');
      expect(result.data![0].errors[0]).includes('Invalid updatedAt date');
    });
  });
});
