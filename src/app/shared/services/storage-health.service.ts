import { Injectable, inject, signal, computed } from '@angular/core';
import { LocalStorageService } from '../services/local-storage.service';
import { AuthService } from '../services/auth.service';

export interface StorageHealth {
  status: 'healthy' | 'warning' | 'critical';
  usage: number;
  lastBackup: Date | null;
  issues: string[];
  recommendations: string[];
}

@Injectable({
  providedIn: 'root'
})
export class StorageHealthService {
  private localStorageService = inject(LocalStorageService);
  private authService = inject(AuthService);

  private healthData = signal<StorageHealth>({
    status: 'healthy',
    usage: 0,
    lastBackup: null,
    issues: [],
    recommendations: []
  });

  readonly health = computed(() => this.healthData());

  async checkStorageHealth(): Promise<void> {
    try {
      const healthReport = await this.localStorageService.getStorageHealthReport();
      const backupHistory = await this.localStorageService.getBackupHistory('');
      
      const usage = healthReport.data?.usage?.percentage || 0;
      const lastBackup = backupHistory.data?.[0]?.timestamp || null;
      
      const issues: string[] = [];
      const recommendations: string[] = [];
      let status: 'healthy' | 'warning' | 'critical' = 'healthy';

      // Check storage usage
      if (usage > 90) {
        status = 'critical';
        issues.push('Storage usage is critically high');
        recommendations.push('Immediately free up storage space');
      } else if (usage > 75) {
        status = 'warning';
        issues.push('Storage usage is getting high');
        recommendations.push('Consider cleaning up old data');
      }

      // Check backup status
      if (!lastBackup) {
        status = status === 'critical' ? 'critical' : 'warning';
        issues.push('No backups found');
        recommendations.push('Create a backup to protect your data');
      } else {
        const daysSinceBackup = (Date.now() - new Date(lastBackup).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceBackup > 7) {
          status = status === 'critical' ? 'critical' : 'warning';
          issues.push('Last backup is more than 7 days old');
          recommendations.push('Create a fresh backup');
        }
      }

      // Check for data integrity issues
      if (healthReport.data?.corruptionEvents && healthReport.data.corruptionEvents > 0) {
        status = 'critical';
        issues.push(`${healthReport.data.corruptionEvents} corruption events detected`);
        recommendations.push('Run data recovery to fix corrupted data');
      }

      this.healthData.set({
        status,
        usage,
        lastBackup: lastBackup ? new Date(lastBackup) : null,
        issues,
        recommendations
      });

    } catch (error) {
      console.error('Failed to check storage health:', error);
      this.healthData.set({
        status: 'critical',
        usage: 0,
        lastBackup: null,
        issues: ['Unable to check storage health'],
        recommendations: ['Restart the application and try again']
      });
    }
  }

  getStatusIcon(): string {
    const health = this.health();
    switch (health.status) {
      case 'healthy': return '✅';
      case 'warning': return '⚠️';
      case 'critical': return '❌';
      default: return '❓';
    }
  }

  getStatusColor(): string {
    const health = this.health();
    switch (health.status) {
      case 'healthy': return '#10b981';
      case 'warning': return '#f59e0b';
      case 'critical': return '#ef4444';
      default: return '#6b7280';
    }
  }
}
