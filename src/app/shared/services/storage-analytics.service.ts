import { Injectable, inject } from '@angular/core';
import { LocalStorageService, StorageAnalytics, StorageResult, BackupSnapshot } from './local-storage.service';
import { AuthService } from './auth.service';

export interface DetailedAnalytics extends StorageAnalytics {
  growthRate: number; // bytes per day
  averageBackupSize: number;
  compressionRatio: number;
  hotKeys: { key: string; accessCount: number; lastAccess: number }[];
  cleanupEfficiency: {
    totalCleanupRuns: number;
    spaceFreed: number;
    averageRunTime: number;
  };
  patterns: {
    peakUsageTimes: { hour: number; usage: number }[];
    operationBursts: { timestamp: number; operations: number; type: string }[];
    errorPatterns: { error: string; frequency: number; lastOccurrence: number }[];
  };
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
}

export interface AnalyticsConfig {
  enablePatternAnalysis: boolean;
  enableGrowthPrediction: boolean;
  recommendationThresholds: {
    quotaWarning: number;
    quotaCritical: number;
    errorRateThreshold: number;
    growthRateThreshold: number;
  };
  dataRetentionDays: number;
  aggregationInterval: number; // minutes
}

export interface StorageTrend {
  timestamp: number;
  usage: number;
  operations: number;
  errors: number;
  backups: number;
}

@Injectable({
  providedIn: 'root'
})
export class StorageAnalyticsService {
  private localStorageService = inject(LocalStorageService);
  private authService = inject(AuthService);

  private readonly ANALYTICS_CONFIG: AnalyticsConfig = {
    enablePatternAnalysis: true,
    enableGrowthPrediction: true,
    recommendationThresholds: {
      quotaWarning: 70,
      quotaCritical: 90,
      errorRateThreshold: 5, // 5% error rate
      growthRateThreshold: 1024 * 100 // 100KB/day
    },
    dataRetentionDays: 30,
    aggregationInterval: 60 // 1 hour
  };

  private readonly ANALYTICS_HISTORY_KEY = 'taskgo_analytics_history';
  private readonly PATTERNS_KEY = 'taskgo_usage_patterns';

  constructor() {
    this.initializeAnalyticsCollection();
  }

  /**
   * Initialize periodic analytics collection
   */
  private initializeAnalyticsCollection(): void {
    // Collect analytics data periodically
    setInterval(() => {
      this.collectAnalyticsSnapshot();
    }, this.ANALYTICS_CONFIG.aggregationInterval * 60 * 1000);

    // Clean old data periodically
    setInterval(() => {
      this.cleanupOldData();
    }, 24 * 60 * 60 * 1000); // Daily cleanup
  }

  /**
   * Collect snapshot of current storage state
   */
  private async collectAnalyticsSnapshot(): Promise<void> {
    try {
      const currentAnalytics = await this.localStorageService.getStorageAnalytics();
      if (!currentAnalytics.success) {
        return;
      }

      const snapshot: StorageTrend = {
        timestamp: Date.now(),
        usage: currentAnalytics.data!.currentUsage,
        operations: currentAnalytics.data!.totalOperations,
        errors: currentAnalytics.data!.quotaExceededEvents + currentAnalytics.data!.corruptionEvents,
        backups: currentAnalytics.data!.backupOperations
      };

      await this.saveAnalyticsSnapshot(snapshot);
    } catch (error) {
      console.warn('Failed to collect analytics snapshot:', error);
    }
  }

  /**
   * Save analytics snapshot to storage
   */
  private async saveAnalyticsSnapshot(snapshot: StorageTrend): Promise<void> {
    try {
      const historyResult = await this.localStorageService.getItem<StorageTrend[]>(this.ANALYTICS_HISTORY_KEY);
      const history = historyResult.success ? historyResult.data || [] : [];

      // Add new snapshot
      history.push(snapshot);

      // Remove old snapshots based on retention policy
      const cutoffTime = Date.now() - (this.ANALYTICS_CONFIG.dataRetentionDays * 24 * 60 * 60 * 1000);
      const filteredHistory = history.filter(s => s.timestamp > cutoffTime);

      await this.localStorageService.setItem(this.ANALYTICS_HISTORY_KEY, filteredHistory);
    } catch (error) {
      console.warn('Failed to save analytics snapshot:', error);
    }
  }

  /**
   * Clean old analytics data
   */
  private async cleanupOldData(): Promise<void> {
    try {
      // Clean analytics history
      const historyResult = await this.localStorageService.getItem<StorageTrend[]>(this.ANALYTICS_HISTORY_KEY);
      if (historyResult.success && historyResult.data) {
        const cutoffTime = Date.now() - (this.ANALYTICS_CONFIG.dataRetentionDays * 24 * 60 * 60 * 1000);
        const filteredHistory = historyResult.data.filter(s => s.timestamp > cutoffTime);
        
        await this.localStorageService.setItem(this.ANALYTICS_HISTORY_KEY, filteredHistory);
      }

      // Clean patterns data
      const patternsResult = await this.localStorageService.getItem(this.PATTERNS_KEY);
      if (patternsResult.success && patternsResult.data) {
        const cutoffTime = Date.now() - (this.ANALYTICS_CONFIG.dataRetentionDays * 24 * 60 * 60 * 1000);
        const filteredPatterns: Record<string, any[]> = { ...patternsResult.data };
        
        // Clean pattern arrays based on cutoff time
        Object.keys(filteredPatterns).forEach(key => {
          if (Array.isArray(filteredPatterns[key])) {
            filteredPatterns[key] = filteredPatterns[key].filter((item: any) => 
              item.timestamp > cutoffTime
            );
          }
        });
        
        await this.localStorageService.setItem(this.PATTERNS_KEY, filteredPatterns);
      }
    } catch (error) {
      console.warn('Failed to cleanup old analytics data:', error);
    }
  }

  /**
   * Generate comprehensive storage analytics
   */
  async generateDetailedAnalytics(): Promise<DetailedAnalytics> {
    try {
      // Get current analytics
      const currentAnalytics = await this.localStorageService.getStorageAnalytics();
      if (!currentAnalytics.success) {
        throw new Error('Failed to get current analytics');
      }

      const base = currentAnalytics.data!;

      // Get historical data
      const history = await this.getAnalyticsHistory();

      // Calculate advanced metrics
      const growthRate = this.calculateGrowthRate(history);
      const averageBackupSize = await this.calculateAverageBackupSize();
      const compressionRatio = await this.calculateCompressionRatio();
      const hotKeys = await this.identifyHotKeys();
      const cleanupEfficiency = await this.calculateCleanupEfficiency();
      const patterns = await this.analyzePatterns(history);
      const recommendations = this.generateRecommendations(base, patterns, growthRate);

      return {
        ...base,
        growthRate,
        averageBackupSize,
        compressionRatio,
        hotKeys,
        cleanupEfficiency,
        patterns,
        recommendations
      };

    } catch (error) {
      console.error('Failed to generate detailed analytics:', error);
      throw error;
    }
  }

  /**
   * Get analytics history
   */
  private async getAnalyticsHistory(): Promise<StorageTrend[]> {
    const historyResult = await this.localStorageService.getItem<StorageTrend[]>(this.ANALYTICS_HISTORY_KEY);
    return historyResult.success ? historyResult.data || [] : [];
  }

  /**
   * Calculate storage growth rate
   */
  private calculateGrowthRate(history: StorageTrend[]): number {
    if (history.length < 2) {
      return 0;
    }

    // Sort by timestamp
    const sortedHistory = history.sort((a, b) => a.timestamp - b.timestamp);
    
    // Calculate growth over the period
    const oldest = sortedHistory[0];
    const newest = sortedHistory[sortedHistory.length - 1];
    
    const timeDiffDays = (newest.timestamp - oldest.timestamp) / (24 * 60 * 60 * 1000);
    const usageDiff = newest.usage - oldest.usage;
    
    return timeDiffDays > 0 ? usageDiff / timeDiffDays : 0;
  }

  /**
   * Calculate average backup size
   */
  private async calculateAverageBackupSize(): Promise<number> {
    try {
      let totalSize = 0;
      let backupCount = 0;

      for (const storage of [localStorage, sessionStorage]) {
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (key && key.includes('backup_')) {
            const value = storage.getItem(key);
            if (value) {
              totalSize += new Blob([key + value]).size;
              backupCount++;
            }
          }
        }
      }

      return backupCount > 0 ? totalSize / backupCount : 0;
    } catch (error) {
      console.warn('Failed to calculate average backup size:', error);
      return 0;
    }
  }

  /**
   * Calculate compression ratio (if compression is used)
   */
  private async calculateCompressionRatio(): Promise<number> {
    // Placeholder for future compression analysis
    // Would compare compressed vs uncompressed backup sizes
    return 1.0; // No compression currently
  }

  /**
   * Identify most frequently accessed keys
   */
  private async identifyHotKeys(): Promise<{ key: string; accessCount: number; lastAccess: number }[]> {
    try {
      const currentAnalytics = await this.localStorageService.getStorageAnalytics();
      if (!currentAnalytics.success) {
        return [];
      }

      const base = currentAnalytics.data!;
      const operationFrequency = base.operationFrequency;

      // Convert to array and sort by access count
      const hotKeys = Object.entries(operationFrequency)
        .map(([key, accessCount]) => ({
          key,
          accessCount,
          lastAccess: Date.now() // Placeholder - would need tracking
        }))
        .sort((a, b) => b.accessCount - a.accessCount)
        .slice(0, 10); // Top 10 hot keys

      return hotKeys;
    } catch (error) {
      console.warn('Failed to identify hot keys:', error);
      return [];
    }
  }

  /**
   * Calculate cleanup efficiency metrics
   */
  private async calculateCleanupEfficiency(): Promise<{
    totalCleanupRuns: number;
    spaceFreed: number;
    averageRunTime: number;
  }> {
    // Placeholder - would need to track cleanup operations
    return {
      totalCleanupRuns: 0,
      spaceFreed: 0,
      averageRunTime: 0
    };
  }

  /**
   * Analyze usage patterns
   */
  private async analyzePatterns(history: StorageTrend[]): Promise<{
    peakUsageTimes: { hour: number; usage: number }[];
    operationBursts: { timestamp: number; operations: number; type: string }[];
    errorPatterns: { error: string; frequency: number; lastOccurrence: number }[];
  }> {
    const peakUsageTimes = this.analyzePeakUsageTimes(history);
    const operationBursts = this.analyzeOperationBursts(history);
    const errorPatterns = await this.analyzeErrorPatterns();

    return {
      peakUsageTimes,
      operationBursts,
      errorPatterns
    };
  }

  /**
   * Analyze peak usage times by hour
   */
  private analyzePeakUsageTimes(history: StorageTrend[]): { hour: number; usage: number }[] {
    const hourlyUsage: { [hour: number]: number[] } = {};

    // Group usage by hour
    history.forEach(snapshot => {
      const hour = new Date(snapshot.timestamp).getHours();
      if (!hourlyUsage[hour]) {
        hourlyUsage[hour] = [];
      }
      hourlyUsage[hour].push(snapshot.usage);
    });

    // Calculate average usage per hour
    const peakUsageTimes = Object.entries(hourlyUsage)
      .map(([hour, usages]) => ({
        hour: parseInt(hour),
        usage: usages.reduce((sum, usage) => sum + usage, 0) / usages.length
      }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 5); // Top 5 peak hours

    return peakUsageTimes;
  }

  /**
   * Analyze operation bursts (high activity periods)
   */
  private analyzeOperationBursts(history: StorageTrend[]): { timestamp: number; operations: number; type: string }[] {
    const bursts: { timestamp: number; operations: number; type: string }[] = [];

    for (let i = 1; i < history.length; i++) {
      const prev = history[i - 1];
      const curr = history[i];
      
      const operationDiff = curr.operations - prev.operations;
      const timeDiff = curr.timestamp - prev.timestamp;
      const operationsPerMinute = (operationDiff / timeDiff) * 60 * 1000;

      // If operations per minute is high, mark as burst
      if (operationsPerMinute > 10) { // 10 ops/min threshold
        bursts.push({
          timestamp: curr.timestamp,
          operations: operationDiff,
          type: 'high_activity'
        });
      }
    }

    return bursts.sort((a, b) => b.operations - a.operations).slice(0, 10);
  }

  /**
   * Analyze error patterns
   */
  private async analyzeErrorPatterns(): Promise<{ error: string; frequency: number; lastOccurrence: number }[]> {
    // This would track error occurrences over time
    // For now, return empty array as placeholder
    return [];
  }

  /**
   * Generate intelligent recommendations based on analytics
   */
  private generateRecommendations(
    base: StorageAnalytics,
    patterns: any,
    growthRate: number
  ): {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  } {
    const immediate: string[] = [];
    const shortTerm: string[] = [];
    const longTerm: string[] = [];

    const { quotaWarning, quotaCritical } = this.ANALYTICS_CONFIG.recommendationThresholds;

    // Immediate recommendations
    if (base.usagePercentage >= quotaCritical) {
      immediate.push('Critical: Storage usage is critically high. Immediate cleanup required.');
      immediate.push('Consider deleting old backups and compressing data.');
    } else if (base.usagePercentage >= quotaWarning) {
      shortTerm.push('Warning: Storage usage is getting high. Plan cleanup soon.');
    }

    if (base.corruptionEvents > 0) {
      immediate.push(`${base.corruptionEvents} corruption events detected. Review backup integrity.`);
    }

    if (base.quotaExceededEvents > 0) {
      immediate.push(`${base.quotaExceededEvents} quota exceeded events. Check cleanup strategies.`);
    }

    // Growth-based recommendations
    if (Math.abs(growthRate) > this.ANALYTICS_CONFIG.recommendationThresholds.growthRateThreshold) {
      if (growthRate > 0) {
        shortTerm.push(`Storage is growing rapidly (${(growthRate / 1024).toFixed(1)}KB/day). Consider archiving old data.`);
      } else {
        shortTerm.push(`Storage is shrinking. Good data management practices detected.`);
      }
    }

    // Pattern-based recommendations
    if (patterns.peakUsageTimes.length > 0) {
      const peakHour = patterns.peakUsageTimes[0];
      longTerm.push(`Peak usage occurs at ${peakHour.hour}:00. Consider pre-emptive cleanup before this time.`);
    }

    // Operation-based recommendations
    if (Object.keys(base.operationFrequency).length > 10) {
      longTerm.push('Many different keys in use. Consider data consolidation strategies.');
    }

    // Backup recommendations
    const avgBackupSize = base.backupSizeDistribution['100KB-1MB'] || 0;
    if (avgBackupSize > 5) {
      shortTerm.push('Large backups detected. Consider compression or selective backup policies.');
    }

    if (immediate.length === 0 && shortTerm.length === 0 && longTerm.length === 0) {
      shortTerm.push('Storage system is operating optimally. Continue current practices.');
    }

    return { immediate, shortTerm, longTerm };
  }

  /**
   * Get storage growth prediction
   */
  async getStorageGrowthPrediction(days: number = 30): Promise<{
    predictedUsage: number;
    quotaReachedDate?: Date;
    confidence: number;
  }> {
    try {
      const history = await this.getAnalyticsHistory();
      const growthRate = this.calculateGrowthRate(history);
      
      const currentAnalytics = await this.localStorageService.getStorageAnalytics();
      const currentUsage = currentAnalytics.success ? currentAnalytics.data!.currentUsage : 0;
      
      const predictedUsage = currentUsage + (growthRate * days);
      
      // Estimate when quota will be reached
      const availableSpace = currentAnalytics.success ? 
        currentAnalytics.data!.availableSpace : 5 * 1024 * 1024;
      const remainingSpace = availableSpace - currentUsage;
      
      let quotaReachedDate: Date | undefined;
      let confidence = 0.5; // Default confidence
      
      if (growthRate > 0) {
        const daysToQuota = remainingSpace / growthRate;
        if (daysToQuota > 0 && daysToQuota < 365) { // Within a year
          quotaReachedDate = new Date(Date.now() + (daysToQuota * 24 * 60 * 60 * 1000));
          confidence = Math.min(0.9, Math.max(0.3, history.length / 30)); // More history = more confidence
        }
      }

      return {
        predictedUsage,
        quotaReachedDate,
        confidence
      };
    } catch (error) {
      console.warn('Failed to generate growth prediction:', error);
      return {
        predictedUsage: 0,
        confidence: 0
      };
    }
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(): Promise<StorageResult<{
    detailed: DetailedAnalytics;
    history: StorageTrend[];
    prediction: any;
    exportedAt: number;
  }>> {
    try {
      const detailed = await this.generateDetailedAnalytics();
      const history = await this.getAnalyticsHistory();
      const prediction = await this.getStorageGrowthPrediction();

      const exportData = {
        detailed,
        history,
        prediction,
        exportedAt: Date.now()
      };

      // Log security event
      this.authService.logSecurityEvent({
        type: 'DATA_ACCESS',
        message: 'Storage analytics exported',
        timestamp: new Date(),
        userId: this.authService.getUserContext()?.userId,
      });

      return {
        success: true,
        data: exportData
      };
    } catch (error) {
      return {
        success: false,
        error: {
          name: 'UnknownError',
          message: 'Failed to export analytics',
          isStorageDisabled: false
        }
      };
    }
  }

  /**
   * Update analytics configuration
   */
  updateConfig(config: Partial<AnalyticsConfig>): void {
    Object.assign(this.ANALYTICS_CONFIG, config);
  }

  /**
   * Get current analytics configuration
   */
  getConfig(): AnalyticsConfig {
    return { ...this.ANALYTICS_CONFIG };
  }
}