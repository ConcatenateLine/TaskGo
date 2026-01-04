import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StartupLoaderComponent } from './startup-loader.component';
import { AppStartupService } from '../../services/app-startup.service';

@Component({
  template: '',
  standalone: true,
  imports: [CommonModule]
})
class TestHostComponent {}

describe('StartupLoaderComponent', () => {
  let component: StartupLoaderComponent;
  let fixture: ComponentFixture<StartupLoaderComponent>;
  let startupServiceSpy: jasmine.SpyObj<AppStartupService>;

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('AppStartupService', [
      'startupState',
      'reinitialize'
    ]);

    // Setup default spy behavior
    spy.startupState.and.returnValue({
      loading: true,
      loaded: false,
      error: null,
      warnings: [],
      metrics: undefined
    });

    await TestBed.configureTestingModule({
      imports: [StartupLoaderComponent, TestHostComponent],
      providers: [
        { provide: AppStartupService, useValue: spy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StartupLoaderComponent);
    component = fixture.componentInstance;
    startupServiceSpy = TestBed.inject(AppStartupService) as jasmine.SpyObj<AppStartupService>;
  });

  describe('Loading State', () => {
    it('should show loading spinner and message when loading', () => {
      startupServiceSpy.startupState.and.returnValue({
        loading: true,
        loaded: false,
        error: null,
        warnings: [],
        metrics: undefined
      });

      fixture.detectChanges();

      const loaderSpinner = fixture.nativeElement.querySelector('.loader-spinner');
      const loadingMessage = fixture.nativeElement.querySelector('.loading-message');
      
      expect(loaderSpinner).toBeTruthy();
      expect(loadingMessage).toBeTruthy();
      expect(loadingMessage.textContent).toContain('Loading your tasks...');
    });

    it('should rotate loading messages', () => {
      startupServiceSpy.startupState.and.returnValue({
        loading: true,
        loaded: false,
        error: null,
        warnings: [],
        metrics: undefined
      });

      fixture.detectChanges();

      const loadingMessage = component.getLoadingMessage();
      expect(loadingMessage).toBeTruthy();

      // Simulate message rotation
      (component as any).messageIndex = 1;
      const nextMessage = component.getLoadingMessage();
      expect(nextMessage).not.toBe(loadingMessage);
    });

    it('should show loading details when metrics are available', () => {
      startupServiceSpy.startupState.and.returnValue({
        loading: true,
        loaded: false,
        error: null,
        warnings: [],
        metrics: {
          loadTimeMs: 50,
          loadTimeCategory: 'fast' as const,
          cacheHit: true,
          fallbackUsed: false,
          migrationPerformed: false
        }
      });

      fixture.detectChanges();

      const loadingDetails = fixture.nativeElement.querySelector('.loading-details');
      const storageMetric = fixture.nativeElement.querySelector('.metric');
      
      expect(loadingDetails).toBeTruthy();
      expect(storageMetric).toBeTruthy();
      expect(storageMetric.textContent).toContain('Local Storage');
    });

    it('should show fallback storage warning when fallback is used', () => {
      startupServiceSpy.startupState.and.returnValue({
        loading: true,
        loaded: false,
        error: null,
        warnings: [],
        metrics: {
          loadTimeMs: 50,
          loadTimeCategory: 'fast' as const,
          cacheHit: true,
          fallbackUsed: true,
          migrationPerformed: false
        }
      });

      fixture.detectChanges();

      const storageMetric = fixture.nativeElement.querySelector('.metric');
      expect(storageMetric.classList.contains('warning')).toBe(true);
      expect(storageMetric.textContent).toContain('Fallback Active');
    });

    it('should show migration indicator when migration is performed', () => {
      startupServiceSpy.startupState.and.returnValue({
        loading: true,
        loaded: false,
        error: null,
        warnings: [],
        metrics: {
          loadTimeMs: 100,
          loadTimeCategory: 'medium' as const,
          cacheHit: true,
          fallbackUsed: false,
          migrationPerformed: true
        }
      });

      fixture.detectChanges();

      const migrationMetric = fixture.nativeElement.querySelector('.metric.migration');
      expect(migrationMetric).toBeTruthy();
      expect(migrationMetric.textContent).toContain('Data Updated');
    });
  });

  describe('Error State', () => {
    it('should show error content when startup has error', () => {
      startupServiceSpy.startupState.and.returnValue({
        loading: false,
        loaded: false,
        error: 'Storage initialization failed',
        warnings: [],
        metrics: undefined
      });

      fixture.detectChanges();

      const errorIcon = fixture.nativeElement.querySelector('.error-icon');
      const errorMessage = fixture.nativeElement.querySelector('.error-message');
      const retryButton = fixture.nativeElement.querySelector('.retry-button');
      const continueButton = fixture.nativeElement.querySelector('.continue-button');
      
      expect(errorIcon).toBeTruthy();
      expect(errorIcon.textContent).toBe('⚠️');
      expect(errorMessage).toBeTruthy();
      expect(errorMessage.textContent).toContain('Storage initialization failed');
      expect(retryButton).toBeTruthy();
      expect(continueButton).toBeTruthy();
    });

    it('should show warnings when present with error', () => {
      startupServiceSpy.startupState.and.returnValue({
        loading: false,
        loaded: false,
        error: 'Storage initialization failed',
        warnings: ['Warning 1', 'Warning 2'],
        metrics: undefined
      });

      fixture.detectChanges();

      const warnings = fixture.nativeElement.querySelector('.warnings');
      const warningItems = fixture.nativeElement.querySelectorAll('.warnings li');
      
      expect(warnings).toBeTruthy();
      expect(warningItems.length).toBe(2);
      expect(warningItems[0].textContent).toContain('Warning 1');
      expect(warningItems[1].textContent).toContain('Warning 2');
    });

    it('should handle retry button click', async () => {
      startupServiceSpy.startupState.and.returnValue({
        loading: false,
        loaded: false,
        error: 'Storage failed',
        warnings: [],
        metrics: undefined
      });

      startupServiceSpy.reinitialize.and.resolveTo(undefined);

      fixture.detectChanges();

      const retryButton = fixture.nativeElement.querySelector('.retry-button');
      retryButton.click();

      expect(startupServiceSpy.reinitialize).toHaveBeenCalled();
      expect(retryButton.textContent).toContain('Retrying...');
      expect(retryButton.disabled).toBe(true);

      // Wait for retry to complete
      await fixture.whenStable();
      expect(retryButton.disabled).toBe(false);
    });

    it('should handle continue anyway button click', () => {
      startupServiceSpy.startupState.and.returnValue({
        loading: false,
        loaded: false,
        error: 'Storage failed',
        warnings: [],
        metrics: undefined
      });

      fixture.detectChanges();

      const continueButton = fixture.nativeElement.querySelector('.continue-button');
      const consoleSpy = spyOn(console, 'warn');

      continueButton.click();

      expect(consoleSpy).toHaveBeenCalledWith('User chose to continue despite startup errors');
    });
  });

  describe('Success State', () => {
    it('should show success content when loaded without errors', () => {
      startupServiceSpy.startupState.and.returnValue({
        loading: false,
        loaded: true,
        error: null,
        warnings: [],
        metrics: {
          loadTimeMs: 50,
          loadTimeCategory: 'fast' as const,
          cacheHit: true,
          fallbackUsed: false,
          migrationPerformed: false
        }
      });

      fixture.detectChanges();

      const successIcon = fixture.nativeElement.querySelector('.success-icon');
      const successMessage = fixture.nativeElement.querySelector('.success-content h2');
      
      expect(successIcon).toBeTruthy();
      expect(successIcon.textContent).toBe('✅');
      expect(successMessage.textContent).toContain('Ready!');
    });

    it('should show warnings in success state', () => {
      startupServiceSpy.startupState.and.returnValue({
        loading: false,
        loaded: true,
        error: null,
        warnings: ['Data migration completed', 'Using fallback storage'],
        metrics: undefined
      });

      fixture.detectChanges();

      const warnings = fixture.nativeElement.querySelector('.warnings');
      const warningItems = fixture.nativeElement.querySelectorAll('.warning-item');
      
      expect(warnings).toBeTruthy();
      expect(warningItems.length).toBe(2);
      expect(warningItems[0].textContent).toContain('Data migration completed');
      expect(warningItems[1].textContent).toContain('Using fallback storage');
    });
  });

  describe('Component Styling', () => {
    it('should apply error class when there is an error', () => {
      startupServiceSpy.startupState.and.returnValue({
        loading: false,
        loaded: false,
        error: 'Test error',
        warnings: [],
        metrics: undefined
      });

      fixture.detectChanges();

      const startupLoader = fixture.nativeElement.querySelector('.startup-loader');
      expect(startupLoader.classList.contains('has-error')).toBe(true);
    });

    it('should not apply error class when loading or successful', () => {
      startupServiceSpy.startupState.and.returnValue({
        loading: true,
        loaded: false,
        error: null,
        warnings: [],
        metrics: undefined
      });

      fixture.detectChanges();

      const startupLoader = fixture.nativeElement.querySelector('.startup-loader');
      expect(startupLoader.classList.contains('has-error')).toBe(false);
    });
  });

  describe('Computed Properties', () => {
    it('should compute hasError correctly', () => {
      startupServiceSpy.startupState.and.returnValue({
        loading: false,
        loaded: false,
        error: null,
        warnings: [],
        metrics: undefined
      });

      fixture.detectChanges();
      expect(component.hasError()).toBe(false);

      startupServiceSpy.startupState.and.returnValue({
        loading: false,
        loaded: false,
        error: 'Some error',
        warnings: [],
        metrics: undefined
      });

      fixture.detectChanges();
      expect(component.hasError()).toBe(true);
    });

    it('should compute showDetailedInfo correctly', () => {
      startupServiceSpy.startupState.and.returnValue({
        loading: true,
        loaded: false,
        error: null,
        warnings: [],
        metrics: undefined
      });

      fixture.detectChanges();
      expect(component.showDetailedInfo()).toBe(false);

      startupServiceSpy.startupState.and.returnValue({
        loading: true,
        loaded: false,
        error: null,
        warnings: [],
        metrics: { loadTimeMs: 50 } as any
      });

      fixture.detectChanges();
      expect(component.showDetailedInfo()).toBe(true);
    });
  });
});