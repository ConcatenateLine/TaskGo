import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LocalStorageService, StorageAnalytics, BackupSnapshot } from '../services/local-storage.service';
import { DataRecoveryService, RecoveryResult } from '../services/data-recovery.service';
import { StorageAnalyticsService } from '../services/storage-analytics.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-storage-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './storage-management.component.html',
  styleUrl: './storage-management.component.scss',
  host: {
    'class': 'storage-management'
  }
})
export class StorageManagementComponent implements OnInit {
  private localStorageService = inject(LocalStorageService);
  private dataRecoveryService = inject(DataRecoveryService);
  private storageAnalyticsService = inject(StorageAnalyticsService);
  private authService = inject(AuthService);

  // Signals for reactive state
  readonly isLoading = signal(false);
  readonly activeTab = signal<'overview' | 'backups' | 'analytics' | 'recovery' | 'export'>('overview');
  readonly analytics = signal<StorageAnalytics | null>(null);
  readonly healthReport = signal<any>(null);
  readonly backupHistory = signal<BackupSnapshot[]>([]);
  readonly recoverySessions = signal<any[]>([]);
  readonly exportData = signal<string | null>(null);
  readonly selectedBackup = signal<BackupSnapshot | null>(null);

  // Computed properties
  readonly isHealthy = computed(() => {
    const health = this.healthReport();
    return health?.status === 'healthy';
  });

  readonly storageUsagePercentage = computed(() => {
    const health = this.healthReport();
    return health?.usage?.percentage || 0;
  });

  readonly hasBackups = computed(() => {
    return this.backupHistory().length > 0;
  });

  readonly canRecover = computed(() => {
    const health = this.healthReport();
    return health?.status !== 'healthy' || this.hasBackups();
  });

  // Form controls
  readonly exportOptions = signal({
    includeBackups: true,
    includeAnalytics: true,
    compressionEnabled: false
  });

  readonly recoveryOptions = signal({
    strategy: 'auto' as 'auto' | 'manual' | 'conservative',
    keys: [] as string[]
  });

  constructor() { }

  ngOnInit(): void {
    this.loadStorageData();
  }

  /**
   * Load initial storage data
   */
  async loadStorageData(): Promise<void> {
    this.isLoading.set(true);
    
    try {
      await Promise.all([
        this.loadAnalytics(),
        this.loadHealthReport(),
        this.loadBackupHistory()
      ]);
    } catch (error) {
      console.error('Failed to load storage data:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Load storage analytics
   */
  async loadAnalytics(): Promise<void> {
    try {
      const result = await this.localStorageService.getStorageAnalytics();
      if (result.success) {
        this.analytics.set(result.data);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  }

  /**
   * Load storage health report
   */
  async loadHealthReport(): Promise<void> {
    try {
      const result = await this.localStorageService.getStorageHealthReport();
      if (result.success) {
        this.healthReport.set(result.data);
      }
    } catch (error) {
      console.error('Failed to load health report:', error);
    }
  }

  /**
   * Load backup history
   */
  async loadBackupHistory(): Promise<void> {
    try {
      const tasksBackupResult = await this.localStorageService.getBackupHistory('tasks');
      const archivedBackupResult = await this.localStorageService.getBackupHistory('archived_tasks');
      
      const allBackups: BackupSnapshot[] = [];
      
      if (tasksBackupResult.success) {
        allBackups.push(...tasksBackupResult.data!);
      }
      
      if (archivedBackupResult.success) {
        allBackups.push(...archivedBackupResult.data!);
      }
      
      // Sort by timestamp (newest first)
      allBackups.sort((a, b) => b.timestamp - a.timestamp);
      
      this.backupHistory.set(allBackups);
    } catch (error) {
      console.error('Failed to load backup history:', error);
    }
  }

  /**
   * Perform storage cleanup
   */
  async performCleanup(): Promise<void> {
    if (!confirm('Are you sure you want to perform storage cleanup? This will remove old backups and cached data.')) {
      return;
    }

    this.isLoading.set(true);
    
    try {
      const result = await this.localStorageService.cleanupAllBackups();
      
      if (result.success) {
        alert('Cleanup completed successfully!');
        await this.loadBackupHistory();
        await this.loadHealthReport();
      } else {
        alert(`Cleanup failed: ${result.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      alert(`Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Perform data recovery
   */
  async performRecovery(): Promise<void> {
    const { strategy, keys } = this.recoveryOptions();
    
    if (!confirm(`Are you sure you want to perform ${strategy} recovery for ${keys.length > 0 ? keys.join(', ') : 'all keys'}?`)) {
      return;
    }

    this.isLoading.set(true);
    
    try {
      let result;
      
      if (keys.length > 0) {
        // Batch recovery for specific keys
        result = await this.dataRecoveryService.performBatchRecovery(keys, { strategy });
      } else {
        // Single key recovery (default to tasks)
        result = await this.dataRecoveryService.performRecovery('tasks', { strategy });
      }
      
      if (result.success) {
        const session = result.data as any;
        
        if (session.summary.recovered > 0) {
          alert(`Recovery completed successfully!\n\nRecovered: ${session.summary.recovered}\nFailed: ${session.summary.failed}\nWarnings: ${session.summary.warnings}`);
        } else {
          alert('Recovery completed but no data was recovered. Data may already be valid.');
        }
        
        await this.loadStorageData();
      } else {
        alert(`Recovery failed: ${result.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      alert(`Recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Restore from selected backup
   */
  async restoreFromBackup(backup: BackupSnapshot): Promise<void> {
    if (!confirm(`Are you sure you want to restore from backup created on ${new Date(backup.timestamp).toLocaleString()}?`)) {
      return;
    }

    this.isLoading.set(true);
    
    try {
      const result = await this.localStorageService.restoreFromBackup(backup.key, backup.id);
      
      if (result.success) {
        alert(`Successfully restored ${backup.key} from backup!`);
        await this.loadStorageData();
      } else {
        alert(`Restore failed: ${result.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      alert(`Restore failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Export storage data
   */
  async exportStorageData(): Promise<void> {
    this.isLoading.set(true);
    
    try {
      const result = await this.localStorageService.exportData();
      
      if (result.success) {
        const exportData = JSON.stringify(result.data, null, 2);
        this.exportData.set(exportData);
        
        // Download as file
        const blob = new Blob([exportData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `taskgo_storage_export_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert('Storage data exported successfully!');
      } else {
        alert(`Export failed: ${result.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Import storage data
   */
  async importStorageData(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) {
      return;
    }

    if (!confirm('Importing storage data will overwrite existing data. Are you sure you want to continue?')) {
      return;
    }

    this.isLoading.set(true);
    
    try {
      const text = await file.text();
      const importData = JSON.parse(text);
      
      const result = await this.localStorageService.importData(importData, {
        overwrite: true,
        createBackups: true
      });
      
      if (result.success) {
        alert('Storage data imported successfully!');
        await this.loadStorageData();
      } else {
        alert(`Import failed: ${result.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      alert(`Import failed: ${error instanceof Error ? error.message : 'Invalid file format'}`);
    } finally {
      this.isLoading.set(false);
      // Reset file input
      (event.target as HTMLInputElement).value = '';
    }
  }

  /**
   * Get detailed analytics
   */
  async getDetailedAnalytics(): Promise<void> {
    this.isLoading.set(true);
    
    try {
      const detailed = await this.storageAnalyticsService.generateDetailedAnalytics();
      
      // Log to console for now (could show in modal)
      console.group('📊 Detailed Storage Analytics');
      console.table(detailed);
      
      // Show growth prediction
      const prediction = await this.storageAnalyticsService.getStorageGrowthPrediction();
      console.log('📈 Growth Prediction:', prediction);
      console.groupEnd();
      
      alert('Detailed analytics logged to console. Check developer tools for full report.');
    } catch (error) {
      alert(`Failed to generate detailed analytics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Format timestamp to readable date
   */
  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  }

  /**
   * Get operation color based on status
   */
  getOperationColor(operation: string): string {
    switch (operation) {
      case 'create': return '#10b981'; // green
      case 'update': return '#3b82f6'; // blue
      case 'delete': return '#ef4444'; // red
      default: return '#6b7280'; // gray
    }
  }

  /**
   * Get storage status color
   */
  getStorageStatusColor(status: string): string {
    switch (status) {
      case 'healthy': return '#10b981'; // green
      case 'warning': return '#f59e0b'; // amber
      case 'critical': return '#ef4444'; // red
      default: return '#6b7280'; // gray
    }
  }

  /**
   * Get storage status icon
   */
  getStorageStatusIcon(status: string): string {
    switch (status) {
      case 'healthy': return '✅';
      case 'warning': return '⚠️';
      case 'critical': return '🚨';
      default: return '❓';
    }
  }

  /**
   * Refresh all data
   */
  async refresh(): Promise<void> {
    await this.loadStorageData();
  }

  /**
   * Add key to recovery options
   */
  addRecoveryKey(key: string): void {
    const current = this.recoveryOptions();
    if (key && !current.keys.includes(key)) {
      this.recoveryOptions.set({
        ...current,
        keys: [...current.keys, key]
      });
    }
  }

  /**
   * Remove key from recovery options
   */
  removeRecoveryKey(index: number): void {
    const current = this.recoveryOptions();
    const newKeys = current.keys.filter((_, i) => i !== index);
    this.recoveryOptions.set({
      ...current,
      keys: newKeys
    });
  }

  /**
   * Select backup for restoration
   */
  selectBackup(backup: BackupSnapshot): void {
    this.selectedBackup.set(backup);
  }
}