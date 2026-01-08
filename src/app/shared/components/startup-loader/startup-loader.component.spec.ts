import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { StartupLoaderComponent } from './startup-loader.component';
import { AppStartupService } from '../../services/app-startup.service';
import { vi } from 'vitest';

describe('StartupLoaderComponent', () => {
  let component: StartupLoaderComponent;
  let fixture: ComponentFixture<StartupLoaderComponent>;
  let mockStartupService: any;

  beforeEach(async () => {
    // Create fresh mock for each test to prevent state bleeding
    mockStartupService = {
      isLoading: vi.fn().mockReturnValue(false),
      isLoaded: vi.fn().mockReturnValue(false),
      error: vi.fn().mockReturnValue(null),
      warnings: vi.fn().mockReturnValue([]),
      metrics: vi.fn().mockReturnValue(undefined),
      reinitialize: vi.fn().mockResolvedValue(undefined)
    };

    // Clear any existing DOM elements
    document.body.innerHTML = '';

    await TestBed.configureTestingModule({
      imports: [StartupLoaderComponent],
      providers: [
        { provide: AppStartupService, useValue: mockStartupService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StartupLoaderComponent);
    component = fixture.componentInstance;
  });

  describe('Loading State Display', () => {
    it('should show loading spinner and message when loading', () => {
      // Arrange: Set loading state
      mockStartupService.isLoading.mockReturnValue(true);
      mockStartupService.isLoaded.mockReturnValue(false);
      mockStartupService.error.mockReturnValue(null);

      // Act: Trigger change detection
      fixture.detectChanges();

      // Assert: Check for loading elements
      const loaderSpinner = fixture.debugElement.query(By.css('.loader-spinner'));
      const loadingMessage = fixture.debugElement.query(By.css('.loading-message'));
      
      expect(loaderSpinner).toBeTruthy();
      expect(loadingMessage).toBeTruthy();
      expect(loadingMessage.nativeElement.textContent).toContain('Loading your tasks...');
    });

    it('should show loading details when metrics are available', () => {
      // Arrange: Set loading state with metrics
      mockStartupService.isLoading.mockReturnValue(true);
      mockStartupService.isLoaded.mockReturnValue(false);
      mockStartupService.error.mockReturnValue(null);
      mockStartupService.metrics.mockReturnValue({
        loadTimeMs: 50,
        loadTimeCategory: 'fast',
        cacheHit: true,
        fallbackUsed: false,
        migrationPerformed: false
      });

      // Act: Trigger change detection
      fixture.detectChanges();

      // Assert: Check for detailed metrics
      const loadingDetails = fixture.debugElement.query(By.css('.loading-details'));
      const storageMetric = fixture.debugElement.query(By.css('.metric'));
      
      expect(loadingDetails).toBeTruthy();
      expect(storageMetric).toBeTruthy();
      expect(storageMetric.nativeElement.textContent).toContain('Local Storage');
    });

    it('should show fallback storage warning when fallback is used', () => {
      // Arrange: Set loading state with fallback metrics
      mockStartupService.isLoading.mockReturnValue(true);
      mockStartupService.isLoaded.mockReturnValue(false);
      mockStartupService.error.mockReturnValue(null);
      mockStartupService.metrics.mockReturnValue({
        loadTimeMs: 50,
        loadTimeCategory: 'fast',
        cacheHit: true,
        fallbackUsed: true,
        migrationPerformed: false
      });

      // Act: Trigger change detection
      fixture.detectChanges();

      // Assert: Check for warning styling and text
      const storageMetric = fixture.debugElement.query(By.css('.metric'));
      expect(storageMetric.nativeElement.classList.contains('warning')).toBe(true);
      expect(storageMetric.nativeElement.textContent).toContain('Fallback Active');
    });

    it('should show migration indicator when migration is performed', () => {
      // Arrange: Set loading state with migration metrics
      mockStartupService.isLoading.mockReturnValue(true);
      mockStartupService.isLoaded.mockReturnValue(false);
      mockStartupService.error.mockReturnValue(null);
      mockStartupService.metrics.mockReturnValue({
        loadTimeMs: 100,
        loadTimeCategory: 'medium',
        cacheHit: true,
        fallbackUsed: false,
        migrationPerformed: true
      });

      // Act: Trigger change detection
      fixture.detectChanges();

      // Assert: Check for migration indicator
      const migrationMetric = fixture.debugElement.query(By.css('.metric.migration'));
      expect(migrationMetric).toBeTruthy();
      expect(migrationMetric.nativeElement.textContent).toContain('Data Updated');
    });
  });

  describe('Error State Display', () => {
    it('should display error content when startup fails', () => {
      // Arrange: Set error state
      const errorMessage = 'Storage initialization failed';
      mockStartupService.isLoading.mockReturnValue(false);
      mockStartupService.isLoaded.mockReturnValue(false);
      mockStartupService.error.mockReturnValue(errorMessage);

      // Act: Trigger change detection
      fixture.detectChanges();

      // Assert: Check for error display elements
      const errorIcon = fixture.debugElement.query(By.css('.error-icon'));
      const errorText = fixture.debugElement.query(By.css('.error-message'));
      const retryButton = fixture.debugElement.query(By.css('.retry-button'));
      const continueButton = fixture.debugElement.query(By.css('.continue-button'));
      
      expect(errorIcon).toBeTruthy();
      expect(errorIcon.nativeElement.textContent).toBe('⚠️');
      expect(errorText).toBeTruthy();
      expect(errorText.nativeElement.textContent).toContain(errorMessage);
      expect(retryButton).toBeTruthy();
      expect(continueButton).toBeTruthy();
    });

    it('should display warnings when present with error', () => {
      // Arrange: Set error state with warnings
      const warnings = ['Warning 1', 'Warning 2'];
      mockStartupService.isLoading.mockReturnValue(false);
      mockStartupService.isLoaded.mockReturnValue(false);
      mockStartupService.error.mockReturnValue('Storage initialization failed');
      mockStartupService.warnings.mockReturnValue(warnings);

      // Act: Trigger change detection
      fixture.detectChanges();

      // Assert: Check for warning display
      const warningsElement = fixture.debugElement.query(By.css('.warnings'));
      const warningItems = fixture.debugElement.queryAll(By.css('.warnings li'));
      
      expect(warningsElement).toBeTruthy();
      expect(warningItems.length).toBe(2);
      expect(warningItems[0].nativeElement.textContent).toContain('Warning 1');
      expect(warningItems[1].nativeElement.textContent).toContain('Warning 2');
    });

    it('should handle retry button click correctly', async () => {
      // Arrange: Set error state and mock retry
      mockStartupService.isLoading.mockReturnValue(false);
      mockStartupService.isLoaded.mockReturnValue(false);
      mockStartupService.error.mockReturnValue('Storage failed');
      mockStartupService.reinitialize.mockResolvedValue(undefined);

      // Act: Trigger change detection and click retry
      fixture.detectChanges();
      
      const retryButton = fixture.debugElement.query(By.css('.retry-button'));
      retryButton.nativeElement.click();

      // Assert: Check retry was called
      expect(mockStartupService.reinitialize).toHaveBeenCalled();

      // Wait for async operation to complete
      await fixture.whenStable();
      fixture.detectChanges();
      
      // Button should exist and be enabled after retry
      expect(retryButton.nativeElement).toBeTruthy();
      expect(retryButton.nativeElement.disabled).toBe(false);
    });

    it('should handle continue button click correctly', () => {
      // Arrange: Set error state and spy on console
      mockStartupService.isLoading.mockReturnValue(false);
      mockStartupService.isLoaded.mockReturnValue(false);
      mockStartupService.error.mockReturnValue('Storage failed');
      const consoleSpy = vi.spyOn(console, 'warn');

      // Act: Trigger change detection and click continue
      fixture.detectChanges();
      
      const continueButton = fixture.debugElement.query(By.css('.continue-button'));
      continueButton.nativeElement.click();

      // Assert: Check console warning was logged
      expect(consoleSpy).toHaveBeenCalledWith('User chose to continue despite startup errors');
      
      // Cleanup: Restore console spy
      consoleSpy.mockRestore();
    });
  });

  describe('Success State Display', () => {
    it('should display success content when loaded without errors', () => {
      // Arrange: Set success state
      mockStartupService.isLoading.mockReturnValue(false);
      mockStartupService.isLoaded.mockReturnValue(true);
      mockStartupService.error.mockReturnValue(null);
      mockStartupService.metrics.mockReturnValue({
        loadTimeMs: 50,
        loadTimeCategory: 'fast',
        cacheHit: true,
        fallbackUsed: false,
        migrationPerformed: false
      });

      // Act: Trigger change detection
      fixture.detectChanges();

      // Assert: Check for success display elements
      const successIcon = fixture.debugElement.query(By.css('.success-icon'));
      const successMessage = fixture.debugElement.query(By.css('.success-content h2'));
      
      expect(successIcon).toBeTruthy();
      expect(successIcon.nativeElement.textContent).toBe('✅');
      expect(successMessage.nativeElement.textContent).toContain('Ready!');
    });

    it('should display warnings in success state', () => {
      // Arrange: Set success state with warnings
      const warnings = ['Data migration completed', 'Using fallback storage'];
      mockStartupService.isLoading.mockReturnValue(false);
      mockStartupService.isLoaded.mockReturnValue(true);
      mockStartupService.error.mockReturnValue(null);
      mockStartupService.warnings.mockReturnValue(warnings);

      // Act: Trigger change detection
      fixture.detectChanges();

      // Assert: Check for warning display
      const warningsElement = fixture.debugElement.query(By.css('.warnings'));
      const warningItems = fixture.debugElement.queryAll(By.css('.warning-item'));
      
      expect(warningsElement).toBeTruthy();
      expect(warningItems.length).toBe(2);
      expect(warningItems[0].nativeElement.textContent).toContain('Data migration completed');
      expect(warningItems[1].nativeElement.textContent).toContain('Using fallback storage');
    });
  });

  describe('Component Visual Styling', () => {
    it('should apply error class when there is an error', () => {
      // Arrange: Set error state
      mockStartupService.isLoading.mockReturnValue(false);
      mockStartupService.isLoaded.mockReturnValue(false);
      mockStartupService.error.mockReturnValue('Test error');

      // Act: Trigger change detection
      fixture.detectChanges();

      // Assert: Check for error styling
      const startupLoader = fixture.debugElement.query(By.css('.startup-loader'));
      expect(startupLoader.nativeElement.classList.contains('has-error')).toBe(true);
    });

    it('should not apply error class when loading', () => {
      // Arrange: Set loading state
      mockStartupService.isLoading.mockReturnValue(true);
      mockStartupService.isLoaded.mockReturnValue(false);
      mockStartupService.error.mockReturnValue(null);

      // Act: Trigger change detection
      fixture.detectChanges();

      // Assert: Check no error styling
      const startupLoader = fixture.debugElement.query(By.css('.startup-loader'));
      expect(startupLoader.nativeElement.classList.contains('has-error')).toBe(false);
    });
  });
});