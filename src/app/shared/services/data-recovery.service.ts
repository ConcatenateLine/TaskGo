import { Injectable, inject } from '@angular/core';
import {
  LocalStorageService,
  StorageError,
  StorageResult,
  BackupSnapshot,
} from './local-storage.service';
import { Task } from '../models/task.model';
import { AuthService } from './auth.service';

export interface RecoveryOptions {
  strategy: 'auto' | 'manual' | 'conservative';
  prioritizeBackups: boolean;
  requireValidation: boolean;
  maxRecoveryAttempts: number;
}

export interface RecoveryResult {
  success: boolean;
  recoveredData?: unknown;
  strategy: string;
  attempts: number;
  errors: string[];
  warnings: string[];
  backupUsed?: BackupSnapshot;
  recoveryTime: number;
}

export interface DataIntegrityReport {
  key: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  corruptionType?: 'json' | 'checksum' | 'crc32' | 'structure' | 'validation';
  availableBackups: number;
  lastValidBackup?: BackupSnapshot;
  recommendedAction: 'none' | 'restore_backup' | 'manual_review' | 'clear_data';
}

export interface RecoverySession {
  id: string;
  startTime: number;
  endTime?: number;
  status: 'in_progress' | 'completed' | 'failed';
  keysProcessed: string[];
  results: RecoveryResult[];
  summary: {
    total: number;
    recovered: number;
    failed: number;
    warnings: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class DataRecoveryService {
  private localStorageService = inject(LocalStorageService);
  private authService = inject(AuthService);

  private readonly DEFAULT_OPTIONS: RecoveryOptions = {
    strategy: 'auto',
    prioritizeBackups: true,
    requireValidation: true,
    maxRecoveryAttempts: 3,
  };

  private activeSessions = new Map<string, RecoverySession>();

  constructor() {
    this.initializeRecoveryMonitoring();
  }

  /**
   * Initialize recovery monitoring and periodic checks
   */
  private initializeRecoveryMonitoring(): void {
    // Could implement periodic integrity checks here
    // For now, we'll rely on on-demand checks
  }

  /**
   * Generate recovery session ID
   */
  private generateSessionId(): string {
    return `recovery_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Create new recovery session
   */
  private createRecoverySession(): RecoverySession {
    const sessionId = this.generateSessionId();
    const session: RecoverySession = {
      id: sessionId,
      startTime: Date.now(),
      status: 'in_progress',
      keysProcessed: [],
      results: [],
      summary: {
        total: 0,
        recovered: 0,
        failed: 0,
        warnings: 0,
      },
    };

    this.activeSessions.set(sessionId, session);
    return session;
  }

  /**
   * Update recovery session with result
   */
  private updateSession(sessionId: string, key: string, result: RecoveryResult): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return;
    }

    session.keysProcessed.push(key);
    session.results.push(result);
    session.summary.total++;

    if (result.success) {
      session.summary.recovered++;
    } else {
      session.summary.failed++;
    }

    if (result.warnings.length > 0) {
      session.summary.warnings++;
    }
  }

  /**
   * Complete recovery session
   */
  private completeSession(sessionId: string): RecoverySession {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Recovery session ${sessionId} not found`);
    }

    session.endTime = Date.now();
    session.status = session.summary.failed === 0 ? 'completed' : 'failed';

    // Log security event
    this.authService.logSecurityEvent({
      type: 'DATA_RECOVERY',
      message: `Recovery session ${session.id} completed: ${session.summary.recovered}/${session.summary.total} keys recovered`,
      timestamp: new Date(),
      userId: this.authService.getUserContext()?.userId,
    });

    return session;
  }

  /**
   * Perform comprehensive data integrity check
   */
  async performIntegrityCheck(keys: string[]): Promise<StorageResult<DataIntegrityReport[]>> {
    const reports: DataIntegrityReport[] = [];

    try {
      for (const key of keys) {
        const report = await this.checkKeyIntegrity(key);
        reports.push(report);
      }

      return {
        success: true,
        data: reports,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'UnknownError',
          message: 'Integrity check failed',
          isStorageDisabled: false,
        } as StorageError,
      };
    }
  }

  /**
   * Check integrity of specific key
   */
  private async checkKeyIntegrity(key: string): Promise<DataIntegrityReport> {
    const report: DataIntegrityReport = {
      key,
      isValid: true,
      errors: [],
      warnings: [],
      availableBackups: 0,
      recommendedAction: 'none',
    };

    try {
      // Try to get data
      console.log(`Checking integrity of key: ${key}`);

      const dataResult = await this.localStorageService.getItem(key);

      if (!dataResult.success) {
        report.isValid = false;
        report.errors.push(`Failed to read data: ${dataResult.error?.message || 'Unknown error'}`);

        if (dataResult.error?.name === 'CorruptionError') {
          report.corruptionType = 'structure';
        }

        report.recommendedAction = 'restore_backup';
      } else {
        // Validate data structure
        const validationResult = this.validateDataStructure(key, dataResult.data);
        if (!validationResult.isValid) {
          report.isValid = false;
          report.errors.push(...validationResult.errors);
          report.warnings.push(...validationResult.warnings);
          report.recommendedAction = 'restore_backup';
        }
      }

      // Get backup information
      console.log(`Getting backup history for key: ${key}`);
      const backupHistory = await this.localStorageService.getBackupHistory(key);
      console.log('Backup history result:', backupHistory);

      if (backupHistory.success) {
        report.availableBackups = backupHistory.data!.length;
        console.log(`Found ${backupHistory.data!.length} backups`);

        if (backupHistory.data!.length > 0) {
          report.lastValidBackup = backupHistory.data![0];
          console.log('Latest backup:', report.lastValidBackup);

          if (report.errors.length > 0 && report.availableBackups > 0) {
            report.recommendedAction = 'restore_backup';
          }
        } else {
          console.log('No backups found for key:', key);
        }
      } else {
        console.error('Failed to get backup history:', backupHistory.error);
      }

      if (report.errors.length === 0 && report.warnings.length > 0) {
        report.recommendedAction = 'manual_review';
      }
    } catch (error) {
      report.isValid = false;
      report.errors.push(
        `Integrity check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      report.recommendedAction = 'manual_review';
    }

    return report;
  }

  /**
   * Validate data structure based on key type
   */
  private validateDataStructure(
    key: string,
    data: unknown
  ): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      switch (key) {
        case 'tasks':
        case 'archived_tasks':
          return this.validateTaskList(data);
        case 'current_task':
          return this.validateSingleTask(data);
        default:
          // Generic validation
          if (data === null || data === undefined) {
            warnings.push('Data is null or undefined');
          }
          break;
      }
    } catch (error) {
      errors.push(
        `Structure validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate task list structure
   */
  private validateTaskList(data: unknown): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!Array.isArray(data)) {
      errors.push('Tasks data must be an array');
      return { isValid: false, errors, warnings };
    }

    if (data.length === 0) {
      warnings.push('Task list is empty');
      return { isValid: true, errors, warnings };
    }

    for (let i = 0; i < data.length; i++) {
      const taskValidation = this.validateSingleTask(data[i]);
      if (!taskValidation.isValid) {
        errors.push(`Task at index ${i}: ${taskValidation.errors.join(', ')}`);
      }
      warnings.push(...taskValidation.warnings);
    }

    // Check for duplicate IDs
    const ids = data.map((task: any) => task?.id).filter(Boolean);
    const duplicateIds = ids.filter((id: string, index: number) => ids.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      warnings.push(`Duplicate task IDs found: ${duplicateIds.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate single task structure
   */
  private validateSingleTask(data: unknown): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data || typeof data !== 'object') {
      errors.push('Task must be an object');
      return { isValid: false, errors, warnings };
    }

    const task = data as any;

    // Required fields
    if (typeof task.id !== 'string' || task.id.trim() === '') {
      errors.push('Task must have a valid id');
    }

    if (typeof task.title !== 'string' || task.title.trim() === '') {
      errors.push('Task must have a valid title');
    }

    // Enum fields
    const validPriorities = ['low', 'medium', 'high'];
    if (!validPriorities.includes(task.priority)) {
      errors.push(`Invalid priority: ${task.priority}`);
    }

    const validStatuses = ['TODO', 'IN_PROGRESS', 'DONE'];
    if (!validStatuses.includes(task.status)) {
      errors.push(`Invalid status: ${task.status}`);
    }

    const validProjects = ['Personal', 'Work', 'Study', 'General'];
    if (!validProjects.includes(task.project)) {
      errors.push(`Invalid project: ${task.project}`);
    }

    // Date validation
    if (!this.isValidDate(task.createdAt)) {
      errors.push('Invalid createdAt date');
    }

    if (!this.isValidDate(task.updatedAt)) {
      errors.push('Invalid updatedAt date');
    }

    // Optional fields
    if (task.description !== undefined && typeof task.description !== 'string') {
      warnings.push('Description should be a string or omitted');
    }

    // Logical validation
    if (this.isValidDate(task.createdAt) && this.isValidDate(task.updatedAt)) {
      const created = new Date(task.createdAt);
      const updated = new Date(task.updatedAt);
      if (updated < created) {
        warnings.push('updatedAt date is before createdAt date');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Check if value is a valid date
   */
  private isValidDate(date: any): boolean {
    if (!date) return false;
    const d = new Date(date);
    return d instanceof Date && !isNaN(d.getTime());
  }

  /**
   * Perform data recovery with specified options
   */
  async performRecovery(
    key: string,
    options: Partial<RecoveryOptions> = {}
  ): Promise<StorageResult<RecoveryResult>> {
    const startTime = Date.now();
    const finalOptions = { ...this.DEFAULT_OPTIONS, ...options };

    const result: RecoveryResult = {
      success: false,
      strategy: finalOptions.strategy,
      attempts: 0,
      errors: [],
      warnings: [],
      recoveryTime: 0,
    };

    try {
      // First, check integrity
      const integrityReport = await this.checkKeyIntegrity(key);

      if (integrityReport.isValid) {
        result.success = true;
        result.warnings.push('Data is already valid, no recovery needed');
        result.recoveryTime = Date.now() - startTime;

        this.authService.logSecurityEvent({
          type: 'DATA_RECOVERY',
          message: 'Data recovery session completed',
          timestamp: new Date(),
          userId: this.authService.getUserContext()?.userId,
        });
        
        return {
          success: true,
          data: result,
        };
      }

      // Perform recovery based on strategy
      switch (finalOptions.strategy) {
        case 'auto':
          return await this.performAutoRecovery(key, integrityReport, finalOptions, startTime);
        case 'manual':
          return await this.performManualRecovery(key, integrityReport, finalOptions, startTime);
        case 'conservative':
          return await this.performConservativeRecovery(
            key,
            integrityReport,
            finalOptions,
            startTime
          );
        default:
          throw new Error(`Unknown recovery strategy: ${finalOptions.strategy}`);
      }
    } catch (error) {
      result.errors.push(
        `Recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      result.recoveryTime = Date.now() - startTime;

      return {
        success: false,
        error: {
          name: 'RecoveryError',
          message: result.errors.join('; '),
          isRecoveryError: true,
        } as StorageError,
      };
    }
  }

  /**
   * Perform automatic recovery using best available backup
   */
  private async performAutoRecovery(
    key: string,
    integrityReport: DataIntegrityReport,
    options: RecoveryOptions,
    startTime: number
  ): Promise<StorageResult<RecoveryResult>> {
    const result: RecoveryResult = {
      success: false,
      strategy: 'auto',
      attempts: 1,
      errors: [...integrityReport.errors],
      warnings: [...integrityReport.warnings],
      recoveryTime: 0,
    };

    console.log('Performing auto-recovery...');
    console.log('Integrity report:', integrityReport);

    try {
      if (integrityReport.lastValidBackup) {
        // Try to restore from the latest valid backup
        console.log('Auto-recovering from backup:', integrityReport.lastValidBackup.id);

        const restoreResult = await this.localStorageService.restoreFromBackup(
          key,
          integrityReport.lastValidBackup.id
        );

        if (restoreResult.success) {
          result.success = true;
          result.backupUsed = integrityReport.lastValidBackup;
          result.warnings.push(`Auto-recovered from backup ${integrityReport.lastValidBackup.id}`);
        } else {
          result.errors.push(
            `Failed to restore from backup: ${restoreResult.error?.message || 'Unknown error'}`
          );
        }
      } else {
        result.errors.push('No valid backups available for auto-recovery');
      }
    } catch (error) {
      result.errors.push(
        `Auto-recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    result.recoveryTime = Date.now() - startTime;

    return {
      success: result.success,
      data: result,
    };
  }

  /**
   * Perform manual recovery (requires user intervention)
   */
  private async performManualRecovery(
    key: string,
    integrityReport: DataIntegrityReport,
    options: RecoveryOptions,
    startTime: number
  ): Promise<StorageResult<RecoveryResult>> {
    const result: RecoveryResult = {
      success: false,
      strategy: 'manual',
      attempts: 1,
      errors: [...integrityReport.errors],
      warnings: [...integrityReport.warnings],
      recoveryTime: 0,
    };

    // Manual recovery requires user to choose backup
    // For now, we'll return the available options
    result.warnings.push('Manual recovery requires user to select backup from available options');
    result.errors.push('Manual recovery not implemented - requires user interface');

    result.recoveryTime = Date.now() - startTime;

    return {
      success: false,
      error: {
        name: 'RecoveryError',
        message: 'Manual recovery requires user intervention',
        isRecoveryError: true,
      } as StorageError,
    };
  }

  /**
   * Perform conservative recovery (only if absolutely safe)
   */
  private async performConservativeRecovery(
    key: string,
    integrityReport: DataIntegrityReport,
    options: RecoveryOptions,
    startTime: number
  ): Promise<StorageResult<RecoveryResult>> {
    const result: RecoveryResult = {
      success: false,
      strategy: 'conservative',
      attempts: 1,
      errors: [...integrityReport.errors],
      warnings: [...integrityReport.warnings],
      recoveryTime: 0,
    };

    // Conservative recovery only proceeds if there are no structural errors
    const hasStructuralErrors = integrityReport.errors.some(
      (error) =>
        error.includes('structure') || error.includes('must have') || error.includes('Invalid')
    );

    if (hasStructuralErrors) {
      result.errors.push('Conservative recovery aborted: structural errors detected');
      result.recoveryTime = Date.now() - startTime;

      return {
        success: false,
        error: {
          name: 'RecoveryError',
          message: 'Conservative recovery aborted due to structural errors',
          isRecoveryError: true,
        } as StorageError,
      };
    }

    // Only proceed with backup restoration if absolutely necessary
    if (integrityReport.recommendedAction === 'restore_backup' && integrityReport.lastValidBackup) {
      const restoreResult = await this.localStorageService.restoreFromBackup(
        key,
        integrityReport.lastValidBackup.id
      );

      if (restoreResult.success) {
        result.success = true;
        result.backupUsed = integrityReport.lastValidBackup;
        result.warnings.push(
          `Conservative recovery: restored from backup ${integrityReport.lastValidBackup.id}`
        );
      } else {
        result.errors.push(
          `Conservative recovery failed: ${restoreResult.error?.message || 'Unknown error'}`
        );
      }
    } else {
      result.errors.push('Conservative recovery: no safe recovery path available');
    }

    result.recoveryTime = Date.now() - startTime;

    return {
      success: result.success,
      data: result,
    };
  }

  /**
   * Batch recovery for multiple keys
   */
  async performBatchRecovery(
    keys: string[],
    options: Partial<RecoveryOptions> = {}
  ): Promise<StorageResult<RecoverySession>> {
    const session = this.createRecoverySession();
    const finalOptions = { ...this.DEFAULT_OPTIONS, ...options };

    try {
      for (const key of keys) {
        const recoveryResult = await this.performRecovery(key, finalOptions);

        const result: RecoveryResult = recoveryResult.success
          ? recoveryResult.data!
          : {
              success: false,
              strategy: finalOptions.strategy,
              attempts: 0,
              errors: [recoveryResult.error?.message || 'Unknown error'],
              warnings: [],
              recoveryTime: 0,
            };

        this.updateSession(session.id, key, result);
      }

      const completedSession = this.completeSession(session.id);

      return {
        success: completedSession.status === 'completed',
        data: completedSession,
      };
    } catch (error) {
      const completedSession = this.completeSession(session.id);

      return {
        success: false,
        error: {
          name: 'RecoveryError',
          message: `Batch recovery failed: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
          isRecoveryError: true,
        } as StorageError,
        data: completedSession,
      };
    } finally {
      this.activeSessions.delete(session.id);
    }
  }

  /**
   * Get active recovery session
   */
  getRecoverySession(sessionId: string): RecoverySession | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Cancel active recovery session
   */
  cancelRecoverySession(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    if (session && session.status === 'in_progress') {
      session.status = 'failed';
      session.endTime = Date.now();

      this.authService.logSecurityEvent({
        type: 'DATA_RECOVERY',
        message: `Recovery session ${session.id} cancelled by user`,
        timestamp: new Date(),
        userId: this.authService.getUserContext()?.userId,
      });

      this.activeSessions.delete(sessionId);
      return true;
    }

    return false;
  }

  /**
   * Get recovery recommendations based on analysis
   */
  async getRecoveryRecommendations(keys: string[]): Promise<
    StorageResult<{
      overall: 'healthy' | 'degraded' | 'critical';
      recommendations: string[];
      urgency: 'low' | 'medium' | 'high' | 'critical';
      estimatedRecoveryTime: number;
      autoRecoveryPossible: boolean;
    }>
  > {
    try {
      const integrityReports = await this.performIntegrityCheck(keys);

      if (!integrityReports.success) {
        throw new Error('Failed to analyze data integrity');
      }

      const reports = integrityReports.data!;
      const totalKeys = reports.length;
      const validKeys = reports.filter((r: DataIntegrityReport) => r.isValid).length;
      const keysWithBackups = reports.filter(
        (r: DataIntegrityReport) => r.availableBackups > 0
      ).length;
      const structuralErrors = reports.filter(
        (r: DataIntegrityReport) => r.corruptionType === 'structure'
      ).length;

      let overall: 'healthy' | 'degraded' | 'critical';
      let urgency: 'low' | 'medium' | 'high' | 'critical';
      const recommendations: string[] = [];

      if (validKeys === totalKeys) {
        overall = 'healthy';
        urgency = 'low';
        recommendations.push('Data integrity is good - no immediate action required');
      } else if (validKeys >= totalKeys * 0.7) {
        overall = 'degraded';
        urgency = 'medium';
        recommendations.push('Some data corruption detected - consider recovery');
      } else {
        overall = 'critical';
        urgency = 'high';
        recommendations.push('Critical data corruption detected - immediate recovery recommended');
      }

      if (structuralErrors > 0) {
        recommendations.push(
          `${structuralErrors} keys have structural errors requiring manual intervention`
        );
        urgency = 'critical';
      }

      if (keysWithBackups < validKeys) {
        recommendations.push('Some corrupted data has no available backups');
      }

      const autoRecoveryPossible = keysWithBackups >= totalKeys - validKeys;
      const estimatedRecoveryTime = Math.max(totalKeys * 100, 1000); // Estimate 100ms per key, minimum 1 second

      return {
        success: true,
        data: {
          overall,
          recommendations,
          urgency,
          estimatedRecoveryTime,
          autoRecoveryPossible,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'RecoveryError',
          message: `Failed to get recommendations: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
          isRecoveryError: true,
        } as StorageError,
      };
    }
  }
}
