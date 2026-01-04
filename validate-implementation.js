// Simple validation script for localStorage data integrity implementation
import { LocalStorageService } from './src/app/shared/services/local-storage.service.ts';
import { DataRecoveryService } from './src/app/shared/services/data-recovery.service.ts';
import { StorageAnalyticsService } from './src/app/shared/services/storage-analytics.service.ts';
import { AuthService } from './src/app/shared/services/auth.service.ts';

console.log('🔧 Validating localStorage data integrity implementation...');

// Test basic functionality
async function validateImplementation() {
  try {
    // Initialize services
    const authService = new AuthService();
    const localStorageService = new LocalStorageService();
    const dataRecoveryService = new DataRecoveryService();
    const storageAnalyticsService = new StorageAnalyticsService();

    console.log('✅ Services initialized successfully');

    // Test basic localStorage operations
    const testData = { id: 'test', title: 'Test Task', priority: 'medium', status: 'TODO', project: 'Work' };
    
    const setResult = await localStorageService.setItem('tasks', [testData], 'create');
    if (setResult.success) {
      console.log('✅ Data stored successfully');
    } else {
      console.error('❌ Failed to store data:', setResult.error?.message);
      return false;
    }

    // Test data retrieval
    const getResult = await localStorageService.getItem('tasks');
    if (getResult.success && getResult.data) {
      console.log('✅ Data retrieved successfully');
      console.log('📊 Retrieved data:', getResult.data);
    } else {
      console.error('❌ Failed to retrieve data:', getResult.error?.message);
      return false;
    }

    // Test backup creation
    const backupHistory = await localStorageService.getBackupHistory('tasks');
    if (backupHistory.success && backupHistory.data && backupHistory.data.length > 0) {
      console.log('✅ Backup system working');
      console.log('💾 Number of backups:', backupHistory.data.length);
    } else {
      console.error('❌ Backup system failed');
      return false;
    }

    // Test analytics
    const analytics = await localStorageService.getStorageAnalytics();
    if (analytics.success) {
      console.log('✅ Analytics system working');
      console.log('📈 Total operations:', analytics.data?.totalOperations);
      console.log('💾 Backup operations:', analytics.data?.backupOperations);
    } else {
      console.error('❌ Analytics system failed');
      return false;
    }

    // Test health report
    const healthReport = await localStorageService.getStorageHealthReport();
    if (healthReport.success) {
      console.log('✅ Health report system working');
      console.log('🏥 Storage status:', healthReport.data?.status);
      console.log('💾 Backup count:', healthReport.data?.backupCount);
      console.log('📝 Recommendations:', healthReport.data?.recommendations?.length);
    } else {
      console.error('❌ Health report system failed');
      return false;
    }

    // Test export functionality
    const exportResult = await localStorageService.exportData();
    if (exportResult.success) {
      console.log('✅ Export system working');
      console.log('📤 Exported data size:', JSON.stringify(exportResult.data).length, 'bytes');
    } else {
      console.error('❌ Export system failed');
      return false;
    }

    // Test recovery system
    const recoveryResult = await dataRecoveryService.performIntegrityCheck(['tasks']);
    if (recoveryResult.success) {
      console.log('✅ Data integrity checking working');
      const report = recoveryResult.data[0];
      console.log('🔍 Key validity:', report.isValid);
      console.log('📝 Errors:', report.errors.length);
      console.log('⚠️ Warnings:', report.warnings.length);
    } else {
      console.error('❌ Data integrity checking failed');
      return false;
    }

    // Test storage analytics service
    const detailedAnalytics = await storageAnalyticsService.generateDetailedAnalytics();
    if (detailedAnalytics) {
      console.log('✅ Detailed analytics working');
      console.log('📊 Growth rate:', detailedAnalytics.growthRate, 'bytes/day');
      console.log('🔥 Hot keys count:', detailedAnalytics.hotKeys.length);
      console.log('📝 Recommendations:', {
        immediate: detailedAnalytics.recommendations.immediate.length,
        shortTerm: detailedAnalytics.recommendations.shortTerm.length,
        longTerm: detailedAnalytics.recommendations.longTerm.length
      });
    } else {
      console.error('❌ Detailed analytics failed');
      return false;
    }

    console.log('🎉 All localStorage data integrity systems validated successfully!');
    return true;

  } catch (error) {
    console.error('💥 Validation failed with error:', error);
    return false;
  }
}

// Run validation
validateImplementation().then(success => {
  if (success) {
    console.log('✨ Implementation validation complete - All systems operational');
    process.exit(0);
  } else {
    console.log('❌ Implementation validation failed - Check errors above');
    process.exit(1);
  }
});