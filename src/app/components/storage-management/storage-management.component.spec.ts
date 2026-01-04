import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { By } from '@angular/platform-browser';
import { StorageManagementComponent } from './storage-management.component';
import { LocalStorageService, BackupSnapshot } from '../../shared/services/local-storage.service';
import { DataRecoveryService } from '../../shared/services/data-recovery.service';
import { StorageAnalyticsService } from '../../shared/services/storage-analytics.service';
import { AuthService } from '../../shared/services/auth.service';
import { Task } from '../../shared/models/task.model';

describe('StorageManagementComponent', () => {
  let component: StorageManagementComponent;
  let fixture: ComponentFixture<StorageManagementComponent>;
  let localStorageService: jasmine.SpyObj<LocalStorageService>;
  let dataRecoveryService: jasmine.SpyObj<DataRecoveryService>;
  let storageAnalyticsService: jasmine.SpyObj<StorageAnalyticsService>;
  let authService: jasmine.SpyObj<AuthService>;

  const mockTask: Task = {
    id: '1',
    title: 'Test Task',
    priority: 'medium',
    status: 'TODO',
    project: 'Work',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  };

  const mockBackup: BackupSnapshot = {
    id: 'backup_123',
    timestamp: Date.now(),
    data: [mockTask],
    metadata: {
      version: '1.0.0',
      timestamp: Date.now(),
      checksum: 'abc123',
      crc32: 'def456',
      backupId: 'backup_123',
      operation: 'update'
    },
    operation: 'update',
    key: 'tasks',
    compressed: false
  };

  beforeEach(async () => {
    const localStorageSpy = jasmine.createSpyObj('LocalStorageService', [
      'getStorageAnalytics',
      'getStorageHealthReport',
      'getBackupHistory',
      'cleanupAllBackups',
      'exportData',
      'importData',
      'restoreFromBackup'
    ]);

    const recoverySpy = jasmine.createSpyObj('DataRecoveryService', [
      'performRecovery',
      'performBatchRecovery'
    ]);

    const analyticsSpy = jasmine.createSpyObj('StorageAnalyticsService', [
      'generateDetailedAnalytics',
      'getStorageGrowthPrediction'
    ]);

    const authSpy = jasmine.createSpyObj('AuthService', [
      'getUserContext',
      'logSecurityEvent'
    ]);

    await TestBed.configureTestingModule({
      imports: [StorageManagementComponent],
      providers: [
        { provide: LocalStorageService, useValue: localStorageSpy },
        { provider: DataRecoveryService, useValue: recoverySpy },
        { provider: StorageAnalyticsService, useValue: analyticsSpy },
        { provider: AuthService, useValue: authSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StorageManagementComponent);
    component = fixture.componentInstance;
    localStorageService = TestBed.inject(LocalStorageService) as jasmine.SpyObj<LocalStorageService>;
    dataRecoveryService = TestBed.inject(DataRecoveryService) as jasmine.SpyObj<DataRecoveryService>;
    storageAnalyticsService = TestBed.inject(StorageAnalyticsService) as jasmine.SpyObj<StorageAnalyticsService>;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;

    // Setup default spy behaviors
    authService.getUserContext.and.returnValue({ userId: 'test-user' });
    authService.logSecurityEvent.and.returnValue();
    localStorageService.getStorageAnalytics.and.resolveTo({
      success: true,
      data: {
        totalOperations: 10,
        backupOperations: 5,
        recoveryOperations: 1,
        quotaExceededEvents: 0,
        corruptionEvents: 0,
        averageDataSize: 1024,
        peakUsage: 5120,
        currentUsage: 3072,
        availableSpace: 5 * 1024 * 1024,
        usagePercentage: 60,
        operationFrequency: { tasks: 5, settings: 2 },
        backupSizeDistribution: { '<1KB': 2, '1-10KB': 3 }
      }
    });

    localStorageService.getStorageHealthReport.and.resolveTo({
      success: true,
      data: {
        status: 'healthy',
        usage: {
          used: 3072,
          available: 5 * 1024 * 1024 - 3072,
          percentage: 60
        },
        analytics: jasmine.any(Object),
        backupCount: 5,
        corruptionEvents: 0,
        recommendations: ['Storage system operating normally']
      }
    });

    localStorageService.getBackupHistory.and.resolveTo({
      success: true,
      data: [mockBackup]
    });

    localStorageService.cleanupAllBackups.and.resolveTo({
      success: true,
      data: true
    });

    localStorageService.exportData.and.resolveTo({
      success: true,
      data: {
        data: { tasks: [mockTask] },
        backups: [mockBackup],
        analytics: jasmine.any(Object),
        exportedAt: Date.now(),
        version: '1.0.0'
      }
    });

    localStorageService.restoreFromBackup.and.resolveTo({
      success: true,
      data: [mockTask]
    });

    dataRecoveryService.performRecovery.and.resolveTo({
      success: true,
      data: {
        success: true,
        strategy: 'auto',
        attempts: 1,
        errors: [],
        warnings: [],
        recoveryTime: 100,
        backupUsed: mockBackup
      }
    });

    storageAnalyticsService.generateDetailedAnalytics.and.resolveTo({
      growthRate: 512,
      averageBackupSize: 2048,
      compressionRatio: 1.0,
      hotKeys: [{ key: 'tasks', accessCount: 5, lastAccess: Date.now() }],
      cleanupEfficiency: { totalCleanupRuns: 0, spaceFreed: 0, averageRunTime: 0 },
      patterns: { peakUsageTimes: [], operationBursts: [], errorPatterns: [] },
      recommendations: {
        immediate: [],
        shortTerm: ['Consider archiving old data'],
        longTerm: ['Implement data consolidation']
      }
    });

    storageAnalyticsService.getStorageGrowthPrediction.and.resolveTo({
      predictedUsage: 4096,
      quotaReachedDate: undefined,
      confidence: 0.7
    });

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initial Loading', () => {
    it('should load storage data on init', async () => {
      await fixture.whenStable();
      fixture.detectChanges();

      expect(localStorageService.getStorageAnalytics).toHaveBeenCalled();
      expect(localStorageService.getStorageHealthReport).toHaveBeenCalled();
      expect(localStorageService.getBackupHistory).toHaveBeenCalled();
      expect(component.analytics()).toBeTruthy();
      expect(component.healthReport()).toBeTruthy();
    });

    it('should show loading state during operations', () => {
      component.isLoading.set(true);
      fixture.detectChanges();

      const loadingIndicator = fixture.debugElement.query(By.css('.loading-indicator'));
      expect(loadingIndicator).toBeTruthy();
      expect(loadingIndicator.nativeElement.textContent).toContain('Processing...');
    });

    it('should hide loading indicator when not loading', () => {
      component.isLoading.set(false);
      fixture.detectChanges();

      const loadingIndicator = fixture.debugElement.query(By.css('.loading-indicator'));
      expect(loadingIndicator).toBeFalsy();
    });
  });

  describe('Storage Status Display', () => {
    it('should display healthy status correctly', async () => {
      await fixture.whenStable();
      fixture.detectChanges();

      const statusIcon = fixture.debugElement.query(By.css('.storage-status-icon'));
      const statusText = fixture.debugElement.query(By.css('h2'));
      
      expect(statusIcon.nativeElement.textContent).toBe('✅');
      expect(statusText.nativeElement.textContent).toContain('Healthy');
    });

    it('should display storage usage percentage', async () => {
      await fixture.whenStable();
      fixture.detectChanges();

      const progressFill = fixture.debugElement.query(By.css('.progress-fill'));
      const percentageText = fixture.debugElement.query(By.css('.metric span'));
      
      expect(progressFill.nativeElement.style.width).toBe('60%');
      expect(percentageText.nativeElement.textContent).toBe('60.0%');
    });

    it('should show recommendations when available', async () => {
      await fixture.whenStable();
      fixture.detectChanges();

      const recommendations = fixture.debugElement.query(By.css('.recommendations'));
      expect(recommendations).toBeTruthy();
      
      const recommendationItems = fixture.debugElement.queryAll(By.css('.recommendations li'));
      expect(recommendationItems.length).toBeGreaterThan(0);
      expect(recommendationItems[0].nativeElement.textContent).toContain('Storage system operating normally');
    });

    it('should format bytes correctly', () => {
      expect(component.formatBytes(1024)).toBe('1 KB');
      expect(component.formatBytes(1024 * 1024)).toBe('1 MB');
      expect(component.formatBytes(0)).toBe('0 Bytes');
    });

    it('should format dates correctly', () => {
      const timestamp = Date.now();
      const formattedDate = component.formatDate(timestamp);
      expect(formattedDate).toBe(new Date(timestamp).toLocaleString());
    });
  });

  describe('Tab Navigation', () => {
    it('should have all tabs', () => {
      const tabs = fixture.debugElement.queryAll(By.css('.tab-button'));
      expect(tabs.length).toBe(5);
      expect(tabs[0].nativeElement.textContent).toContain('Overview');
      expect(tabs[1].nativeElement.textContent).toContain('Backups');
      expect(tabs[2].nativeElement.textContent).toContain('Analytics');
      expect(tabs[3].nativeElement.textContent).toContain('Recovery');
      expect(tabs[4].nativeElement.textContent).toContain('Export');
    });

    it('should switch tabs when clicked', () => {
      const backupsTab = fixture.debugElement.queryAll(By.css('.tab-button'))[1];
      backupsTab.nativeElement.click();
      fixture.detectChanges();

      expect(component.activeTab()).toBe('backups');
      
      const backupsPanel = fixture.debugElement.query(By.css('#backups-panel'));
      expect(backupsPanel).toBeTruthy();
    });

    it('should show active tab styling', () => {
      const activeTab = fixture.debugElement.query(By.css('.tab-button.active'));
      expect(activeTab).toBeTruthy();
      expect(activeTab.nativeElement.textContent).toContain('Overview');
    });
  });

  describe('Backups Tab', () => {
    beforeEach(async () => {
      component.activeTab.set('backups');
      await fixture.whenStable();
      fixture.detectChanges();
    });

    it('should display backup history', () => {
      const backupCards = fixture.debugElement.queryAll(By.css('.backup-card'));
      expect(backupCards.length).toBe(1);
      
      const backupCard = backupCards[0];
      expect(backupCard.nativeElement.textContent).toContain('UPDATE');
      expect(backupCard.nativeElement.textContent).toContain('tasks');
      expect(backupCard.nativeElement.textContent).toContain('backup_123');
    });

    it('should show operation colors correctly', () => {
      const operationElement = fixture.debugElement.query(By.css('.backup-operation'));
      expect(operationElement.nativeElement.style.color).toBe(component.getOperationColor('update'));
    });

    it('should select backup when clicked', () => {
      const backupCard = fixture.debugElement.query(By.css('.backup-card'));
      backupCard.nativeElement.click();
      fixture.detectChanges();

      expect(component.selectedBackup()).toEqual(mockBackup);
      expect(backupCard.nativeElement.classList.contains('selected')).toBe(true);
    });

    it('should restore from backup when restore button clicked', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      
      const restoreButton = fixture.debugElement.query(By.css('.backup-actions button'));
      restoreButton.nativeElement.click();
      fixture.detectChanges();

      expect(localStorageService.restoreFromBackup).toHaveBeenCalledWith('tasks', 'backup_123');
    });

    it('should not restore when confirmation cancelled', () => {
      spyOn(window, 'confirm').and.returnValue(false);
      
      const restoreButton = fixture.debugElement.query(By.css('.backup-actions button'));
      restoreButton.nativeElement.click();
      fixture.detectChanges();

      expect(localStorageService.restoreFromBackup).not.toHaveBeenCalled();
    });
  });

  describe('Analytics Tab', () => {
    beforeEach(async () => {
      component.activeTab.set('analytics');
      await fixture.whenStable();
      fixture.detectChanges();
    });

    it('should display analytics overview', () => {
      const analyticsCards = fixture.debugElement.queryAll(By.css('.analytics-card'));
      expect(analyticsCards.length).toBeGreaterThan(0);
      
      const totalOperationsCard = analyticsCards.find(card => 
        card.nativeElement.textContent.includes('Total Operations')
      );
      expect(totalOperationsCard).toBeTruthy();
      expect(totalOperationsCard.nativeElement.textContent).toContain('10');
    });

    it('should show operation frequency', () => {
      const frequencyItems = fixture.debugElement.queryAll(By.css('.frequency-item'));
      expect(frequencyItems.length).toBeGreaterThan(0);
      
      const tasksFrequency = frequencyItems.find(item => 
        item.nativeElement.textContent.includes('tasks')
      );
      expect(tasksFrequency).toBeTruthy();
      expect(tasksFrequency.nativeElement.textContent).toContain('5 operations');
    });
  });

  describe('Recovery Tab', () => {
    beforeEach(async () => {
      component.activeTab.set('recovery');
      await fixture.whenStable();
      fixture.detectChanges();
    });

    it('should have recovery strategy selector', () => {
      const strategySelect = fixture.debugElement.query(By.css('#recovery-strategy'));
      expect(strategySelect).toBeTruthy();
      
      const options = strategySelect.nativeElement.querySelectorAll('option');
      expect(options.length).toBe(3);
      expect(options[0].value).toBe('auto');
      expect(options[1].value).toBe('conservative');
      expect(options[2].value).toBe('manual');
    });

    it('should add recovery keys', () => {
      const keyInput = fixture.debugElement.query(By.css('input[placeholder*="Enter key"]'));
      keyInput.nativeElement.value = 'test_key';
      keyInput.nativeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      fixture.detectChanges();

      expect(component.recoveryOptions().keys).toContain('test_key');
    });

    it('should remove recovery keys', () => {
      component.recoveryOptions.update(options => ({ ...options, keys: ['key1', 'key2'] }));
      fixture.detectChanges();

      const removeButtons = fixture.debugElement.queryAll(By.css('.btn-remove'));
      expect(removeButtons.length).toBe(2);
      
      removeButtons[0].nativeElement.click();
      fixture.detectChanges();

      expect(component.recoveryOptions().keys).toEqual(['key2']);
    });

    it('should perform recovery when start button clicked', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      
      component.recoveryOptions.update(options => ({ ...options, strategy: 'auto' }));
      const startButton = fixture.debugElement.query(By.css('.recovery-actions button'));
      startButton.nativeElement.click();
      fixture.detectChanges();

      expect(dataRecoveryService.performRecovery).toHaveBeenCalledWith('tasks', { strategy: 'auto' });
    });
  });

  describe('Export Tab', () => {
    beforeEach(async () => {
      component.activeTab.set('export');
      await fixture.whenStable();
      fixture.detectChanges();
    });

    it('should have export options', () => {
      const includeBackupsCheckbox = fixture.debugElement.query(By.css('input[type="checkbox"][value*="backups"]'));
      const includeAnalyticsCheckbox = fixture.debugElement.query(By.css('input[type="checkbox"][value*="analytics"]'));
      
      expect(includeBackupsCheckbox).toBeTruthy();
      expect(includeAnalyticsCheckbox).toBeTruthy();
    });

    it('should export data when export button clicked', () => {
      spyOn(component, 'exportStorageData').and.callThrough();
      spyOn(document, 'createElement').and.callThrough();
      spyOn(document.body, 'appendChild').and.callThrough();
      spyOn(document.body, 'removeChild').and.callThrough();
      spyOn(URL, 'createObjectURL').and.callThrough();
      spyOn(URL, 'revokeObjectURL').and.callThrough();
      
      const exportButton = fixture.debugElement.query(By.css('.export-section button'));
      exportButton.nativeElement.click();
      fixture.detectChanges();

      expect(localStorageService.exportData).toHaveBeenCalled();
    });

    it('should import data when file selected', () => {
      const file = new File(['{"test": "data"}'], 'test.json', { type: 'application/json' });
      const fileInput = fixture.debugElement.query(By.css('input[type="file"]'));
      
      spyOn(window, 'confirm').and.returnValue(true);
      spyOn(component, 'importStorageData').and.callThrough();
      
      fileInput.nativeElement.files = [file];
      fileInput.nativeElement.dispatchEvent(new Event('change', { bubbles: true }));
      fixture.detectChanges();

      expect(component.importStorageData).toHaveBeenCalled();
    });
  });

  describe('Actions', () => {
    it('should refresh data when refresh button clicked', async () => {
      spyOn(component, 'loadStorageData').and.callThrough();
      
      const refreshButton = fixture.debugElement.query(By.css('.storage-management__actions button'));
      refreshButton.nativeElement.click();
      fixture.detectChanges();

      expect(component.loadStorageData).toHaveBeenCalled();
    });

    it('should perform cleanup when cleanup button clicked', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      spyOn(component, 'performCleanup').and.callThrough();
      
      const cleanupButton = fixture.debugElement.queryAll(By.css('.storage-management__actions button'))[1];
      cleanupButton.nativeElement.click();
      fixture.detectChanges();

      expect(localStorageService.cleanupAllBackups).toHaveBeenCalled();
    });

    it('should export data when export button clicked', () => {
      spyOn(component, 'exportStorageData').and.callThrough();
      
      const exportButton = fixture.debugElement.queryAll(By.css('.storage-management__actions button'))[2];
      exportButton.nativeElement.click();
      fixture.detectChanges();

      expect(component.exportStorageData).toHaveBeenCalled();
    });
  });

  describe('Computed Properties', () => {
    it('should compute health status correctly', () => {
      component.healthReport.set({ status: 'healthy' });
      expect(component.isHealthy()).toBe(true);
      
      component.healthReport.set({ status: 'warning' });
      expect(component.isHealthy()).toBe(false);
    });

    it('should compute storage usage percentage correctly', () => {
      component.healthReport.set({
        usage: { percentage: 75 }
      });
      expect(component.storageUsagePercentage()).toBe(75);
    });

    it('should compute if backups exist correctly', () => {
      component.backupHistory.set([]);
      expect(component.hasBackups()).toBe(false);
      
      component.backupHistory.set([mockBackup]);
      expect(component.hasBackups()).toBe(true);
    });

    it('should compute if recovery is possible correctly', () => {
      component.healthReport.set({ status: 'critical' });
      component.backupHistory.set([mockBackup]);
      expect(component.canRecover()).toBe(true);
      
      component.healthReport.set({ status: 'healthy' });
      component.backupHistory.set([]);
      expect(component.canRecover()).toBe(false);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels on tabs', () => {
      const tabs = fixture.debugElement.queryAll(By.css('.tab-button'));
      tabs.forEach((tab, index) => {
        expect(tab.nativeElement.getAttribute('role')).toBe('tab');
        expect(tab.nativeElement.getAttribute('aria-selected')).toBe(index === 0 ? 'true' : 'false');
      });
    });

    it('should have proper ARIA labels on panels', () => {
      const panels = fixture.debugElement.queryAll(By.css('.tab-panel'));
      expect(panels[0].nativeElement.getAttribute('role')).toBe('tabpanel');
      expect(panels[0].nativeElement.getAttribute('aria-labelledby')).toBeDefined();
    });

    it('should have proper button labels', () => {
      const buttons = fixture.debugElement.queryAll(By.css('button'));
      buttons.forEach(button => {
        expect(button.nativeElement.getAttribute('aria-label')).toBeDefined();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle service failures gracefully', async () => {
      localStorageService.getStorageAnalytics.and.resolveTo({
        success: false,
        error: {
          name: 'UnknownError',
          message: 'Service unavailable',
          isStorageDisabled: false
        }
      });

      await component.loadStorageData();
      fixture.detectChanges();

      expect(component.analytics()).toBeNull();
      expect(component.isLoading()).toBe(false);
    });

    it('should handle export failures', async () => {
      localStorageService.exportData.and.resolveTo({
        success: false,
        error: {
          name: 'UnknownError',
          message: 'Export failed',
          isStorageDisabled: false
        }
      });

      spyOn(window, 'alert').and.callThrough();
      
      await component.exportStorageData();
      
      expect(window.alert).toHaveBeenCalledWith('Export failed: Export failed');
    });

    it('should handle recovery failures', async () => {
      dataRecoveryService.performRecovery.and.resolveTo({
        success: false,
        error: {
          name: 'RecoveryError',
          message: 'Recovery failed',
          isRecoveryError: true
        }
      });

      spyOn(window, 'confirm').and.returnValue(true);
      spyOn(window, 'alert').and.callThrough();
      
      component.activeTab.set('recovery');
      fixture.detectChanges();

      const startButton = fixture.debugElement.query(By.css('.recovery-actions button'));
      startButton.nativeElement.click();
      fixture.detectChanges();

      expect(window.alert).toHaveBeenCalledWith('Recovery failed: Recovery failed');
    });
  });
});