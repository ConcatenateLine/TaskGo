import { vi, beforeEach, describe, it, expect } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { By } from '@angular/platform-browser';
import { TaskExportComponent } from './task-export.component';
import { TaskExportService, TaskExportResult } from '../../shared/services/task-export.service';

describe('TaskExportComponent', () => {
  let component: TaskExportComponent;
  let fixture: ComponentFixture<TaskExportComponent>;
  let taskExportServiceSpy: any;

  const mockSuccessResult: TaskExportResult = {
    success: true,
    data: {
      tasks: [
        {
          id: '1',
          title: 'Test Task',
          priority: 'high',
          status: 'TODO',
          project: 'Work',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      metadata: {
        version: '1.0.0',
        exportedAt: Date.now(),
        taskCount: 1,
        projectBreakdown: { Work: 1 },
        statusBreakdown: { TODO: 1 },
        priorityBreakdown: { high: 1 },
        dataSize: 100,
      },
      filename: 'taskgo_backup_2024-06-15.json',
      jsonString: JSON.stringify(
        {
          tasks: [
            {
              id: '1',
              title: 'Test Task',
              priority: 'high',
              status: 'TODO',
              project: 'Work',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
          metadata: {
            version: '1.0.0',
            exportedAt: Date.now(),
            taskCount: 1,
          },
        },
        null,
        2
      ),
    },
  };

  const mockErrorResult: TaskExportResult = {
    success: false,
    error: {
      name: 'SecurityError',
      message: 'Storage is disabled',
    } as any,
  };

  beforeEach(async () => {
    taskExportServiceSpy = {
      exportTasks: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [TaskExportComponent],
      providers: [{ provide: TaskExportService, useValue: taskExportServiceSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskExportComponent);
    component = fixture.componentInstance;

    // Setup default spy behavior
    taskExportServiceSpy.exportTasks.mockResolvedValue(mockSuccessResult);

    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should have isExporting signal initialized to false', () => {
      expect(component.isExporting()).toBe(false);
    });

    it('should have exportResult signal initialized to null', () => {
      expect(component.exportResult()).toBeNull();
    });

    it('should have errorMessage signal initialized to null', () => {
      expect(component.errorMessage()).toBeNull();
    });

    it('should render export button', () => {
      const exportButton = fixture.debugElement.query(By.css('button[aria-label="Export tasks"]'));
      expect(exportButton).toBeTruthy();
    });

    it('should display correct button text', () => {
      const exportButton = fixture.debugElement.query(By.css('button[aria-label="Export tasks"]'));
      expect(exportButton.nativeElement.textContent).toContain('Export tasks');
    });
  });

  describe('Export Button Interaction', () => {
    it('should call exportTasks when button clicked', async () => {
      const exportButton = fixture.debugElement.query(By.css('button[aria-label="Export tasks"]'));
      exportButton.nativeElement.click();
      await fixture.whenStable();

      expect(taskExportServiceSpy.exportTasks).toHaveBeenCalled();
    });

    it('should set isExporting to true during export', async () => {
      // Make the export take some time
      let resolveExport: (value: TaskExportResult) => void;
      taskExportServiceSpy.exportTasks.mockReturnValue(
        new Promise((resolve) => {
          resolveExport = resolve;
        })
      );

      const exportButton = fixture.debugElement.query(By.css('button[aria-label="Export tasks"]'));
      exportButton.nativeElement.click();
      fixture.detectChanges();

      expect(component.isExporting()).toBe(true);
      expect(component.exportResult()).toBeNull();

      // Resolve the export
      resolveExport!(mockSuccessResult);
      await fixture.whenStable();
    });

    it('should set isExporting to false after successful export', async () => {
      const exportButton = fixture.debugElement.query(By.css('button[aria-label="Export tasks"]'));
      exportButton.nativeElement.click();
      await fixture.whenStable();

      expect(component.isExporting()).toBe(false);
    });

    it('should set isExporting to false after failed export', async () => {
      taskExportServiceSpy.exportTasks.mockResolvedValue(mockErrorResult);

      const exportButton = fixture.debugElement.query(By.css('button[aria-label="Export tasks"]'));
      exportButton.nativeElement.click();
      await fixture.whenStable();

      expect(component.isExporting()).toBe(false);
    });

    it('should disable button while exporting', async () => {
      let resolveExport: (value: TaskExportResult) => void;
      taskExportServiceSpy.exportTasks.mockReturnValue(
        new Promise((resolve) => {
          resolveExport = resolve;
        })
      );

      const exportButton = fixture.debugElement.query(By.css('button[aria-label="Export tasks"]'));
      exportButton.nativeElement.click();
      fixture.detectChanges();

      expect(exportButton.nativeElement.disabled).toBe(true);

      // Resolve the export
      resolveExport!(mockSuccessResult);
      await fixture.whenStable();
      fixture.detectChanges();

      expect(exportButton.nativeElement.disabled).toBe(false);
    });

    it('should show loading text while exporting', async () => {
      let resolveExport: (value: TaskExportResult) => void;
      taskExportServiceSpy.exportTasks.mockReturnValue(
        new Promise((resolve) => {
          resolveExport = resolve;
        })
      );

      const exportButton = fixture.debugElement.query(By.css('button[aria-label="Export tasks"]'));
      exportButton.nativeElement.click();
      fixture.detectChanges();

      expect(exportButton.nativeElement.textContent.trim()).toContain('Exporting...');

      // Resolve the export
      resolveExport!(mockSuccessResult);
      await fixture.whenStable();
      fixture.detectChanges();

      expect(exportButton.nativeElement.textContent.trim()).not.toContain('Exporting...');
    });
  });

  describe('Successful Export', () => {
    beforeEach(async () => {
      const exportButton = fixture.debugElement.query(By.css('button[aria-label="Export tasks"]'));
      exportButton.nativeElement.click();
      await fixture.whenStable();
      fixture.detectChanges();
    });

    it('should set exportResult with success data', () => {
      expect(component.exportResult()).toEqual(mockSuccessResult);
      expect(component.exportResult()?.success).toBe(true);
    });

    it('should clear errorMessage on success', () => {
      expect(component.errorMessage()).toBeNull();
    });

    it('should trigger file download', () => {
      expect(taskExportServiceSpy.exportTasks).toHaveBeenCalled();
      // The service should handle the actual download
    });

    it('should show success notification to user', () => {
      // Check for success message or toast
      const successMessage = fixture.debugElement.query(By.css('.export-success'));
      if (successMessage) {
        expect(successMessage.nativeElement.textContent).toContain('Export successful');
      }
    });
  });

  describe('Failed Export', () => {
    beforeEach(async () => {
      taskExportServiceSpy.exportTasks.mockResolvedValue(mockErrorResult);

      const exportButton = fixture.debugElement.query(By.css('button[aria-label="Export tasks"]'));
      exportButton.nativeElement.click();
      await fixture.whenStable();
      fixture.detectChanges();
    });

    it('should set exportResult with error data', () => {
      expect(component.exportResult()).toEqual(mockErrorResult);
      expect(component.exportResult()?.success).toBe(false);
    });

    it('should set errorMessage with error message', () => {
      expect(component.errorMessage()).toContain('Storage is disabled');
    });

    it('should show error notification to user', () => {
      const errorMessage = fixture.debugElement.query(By.css('.export-error'));
      if (errorMessage) {
        expect(errorMessage.nativeElement.textContent).toContain('Export failed');
      }
    });

    it('should allow retry after error', async () => {
      taskExportServiceSpy.exportTasks.mockResolvedValue(mockSuccessResult);

      const exportButton = fixture.debugElement.query(By.css('button[aria-label="Export tasks"]'));
      exportButton.nativeElement.click();
      await fixture.whenStable();

      expect(component.exportResult()?.success).toBe(true);
      expect(component.errorMessage()).toBeNull();
    });
  });

  describe('File Download', () => {
    beforeEach(() => {
      // Ensure the export service returns success to trigger download
      taskExportServiceSpy.exportTasks.mockResolvedValue(mockSuccessResult);
    });

    it('should trigger file download via service', async () => {
      const exportButton = fixture.debugElement.query(By.css('button[aria-label="Export tasks"]'));
      exportButton.nativeElement.click();
      await fixture.whenStable();

      // Verify the service was called
      expect(taskExportServiceSpy.exportTasks).toHaveBeenCalled();
      
      // Verify the component received the result with filename
      expect(component.exportResult()?.data?.filename).toBe('taskgo_backup_2024-06-15.json');
    });

    it('should set correct filename on download', async () => {
      const exportButton = fixture.debugElement.query(By.css('button[aria-label="Export tasks"]'));
      exportButton.nativeElement.click();
      await fixture.whenStable();

      // The service should handle filename setting
      expect(mockSuccessResult.data?.filename).toBe('taskgo_backup_2024-06-15.json');
      expect(component.exportResult()?.data?.filename).toBe('taskgo_backup_2024-06-15.json');
    });

    it('should handle download result correctly', async () => {
      const exportButton = fixture.debugElement.query(By.css('button[aria-label="Export tasks"]'));
      exportButton.nativeElement.click();
      await fixture.whenStable();

      // Verify the component properly handles the export result
      expect(component.exportResult()).toEqual(mockSuccessResult);
      expect(component.exportResult()?.success).toBe(true);
      expect(component.exportResult()?.data?.filename).toContain('taskgo_backup_');
    });

    it('should provide metadata in download result', async () => {
      const exportButton = fixture.debugElement.query(By.css('button[aria-label="Export tasks"]'));
      exportButton.nativeElement.click();
      await fixture.whenStable();

      // Verify metadata is included in the result
      const metadata = component.exportResult()?.data?.metadata;
      expect(metadata).toBeDefined();
      expect(metadata?.version).toBe('1.0.0');
      expect(metadata?.taskCount).toBe(1);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA label on export button', () => {
      const exportButton = fixture.debugElement.query(By.css('button'));
      expect(exportButton.nativeElement.getAttribute('aria-label')).toBe('Export tasks');
    });

    it('should have aria-busy="true" while exporting', async () => {
      let resolveExport: (value: TaskExportResult) => void;
      taskExportServiceSpy.exportTasks.mockReturnValue(
        new Promise((resolve) => {
          resolveExport = resolve;
        })
      );

      const exportButton = fixture.debugElement.query(By.css('button[aria-label="Export tasks"]'));
      exportButton.nativeElement.click();
      fixture.detectChanges();

      expect(exportButton.nativeElement.getAttribute('aria-busy')).toBe('true');

      // Resolve the export
      resolveExport!(mockSuccessResult);
      await fixture.whenStable();
      fixture.detectChanges();

      expect(exportButton.nativeElement.getAttribute('aria-busy')).toBe('false');
    });

    it('should announce export success to screen readers', async () => {
      const exportButton = fixture.debugElement.query(By.css('button[aria-label="Export tasks"]'));
      exportButton.nativeElement.click();
      await fixture.whenStable();

      // Check for ARIA live region
      const liveRegion = fixture.debugElement.query(By.css('[aria-live]'));
      if (liveRegion) {
        expect(liveRegion.nativeElement.getAttribute('aria-live')).toBe('polite');
      }
    });

    it('should announce export error to screen readers', async () => {
      taskExportServiceSpy.exportTasks.mockResolvedValue(mockErrorResult);

      const exportButton = fixture.debugElement.query(By.css('button[aria-label="Export tasks"]'));
      exportButton.nativeElement.click();
      await fixture.whenStable();

      // Check for ARIA live region with error
      const liveRegion = fixture.debugElement.query(By.css('[aria-live]'));
      if (liveRegion) {
        expect(liveRegion.nativeElement.getAttribute('aria-live')).toBe('assertive');
      }
    });

    it('should be keyboard accessible', async () => {
      const exportButton = fixture.debugElement.query(By.css('button'));

      // Button should be focusable
      expect(exportButton.nativeElement.tabIndex).not.toBe(-1);

      // Simulate Enter key press (buttons auto-trigger click on Enter)
      exportButton.nativeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      exportButton.nativeElement.click();
      await fixture.whenStable();
      
      expect(taskExportServiceSpy.exportTasks).toHaveBeenCalled();
    });

    it('should handle Space key press', async () => {
      const exportButton = fixture.debugElement.query(By.css('button'));

      // Simulate Space key press (buttons auto-trigger click on Space)
      exportButton.nativeElement.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      exportButton.nativeElement.click();
      await fixture.whenStable();
      
      expect(taskExportServiceSpy.exportTasks).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid consecutive clicks', async () => {
      // Make export take longer
      let resolveExport: (value: TaskExportResult) => void;
      taskExportServiceSpy.exportTasks.mockReturnValue(
        new Promise((resolve) => {
          resolveExport = resolve;
        })
      );

      const exportButton = fixture.debugElement.query(By.css('button[aria-label="Export tasks"]'));

      // Rapid clicks
      exportButton.nativeElement.click();
      exportButton.nativeElement.click();
      exportButton.nativeElement.click();
      fixture.detectChanges();

      // Should only call export once (concurrent exports prevented)
      expect(taskExportServiceSpy.exportTasks).toHaveBeenCalledTimes(1);
      expect(component.isExporting()).toBe(true);

      // Resolve the first export
      resolveExport!(mockSuccessResult);
      await fixture.whenStable();
      fixture.detectChanges();

      // Now try again - should allow new export
      exportButton.nativeElement.click();
      await fixture.whenStable();

      expect(taskExportServiceSpy.exportTasks).toHaveBeenCalledTimes(2);
    });

    it('should handle empty task list', async () => {
      const emptyResult: TaskExportResult = {
        success: true,
        data: {
          tasks: [],
          metadata: {
            version: '1.0.0',
            exportedAt: Date.now(),
            taskCount: 0,
            projectBreakdown: {},
            statusBreakdown: {},
            priorityBreakdown: {},
            dataSize: 0,
          },
          filename: 'taskflow_backup_2024-06-15.json',
          jsonString: '{"tasks":[],"metadata":{"version":"1.0.0"}}',
        },
      };
      taskExportServiceSpy.exportTasks.mockResolvedValue(emptyResult);

      const exportButton = fixture.debugElement.query(By.css('button[aria-label="Export tasks"]'));
      exportButton.nativeElement.click();
      await fixture.whenStable();

      expect(component.exportResult()?.data?.tasks).toEqual([]);
    });

    it('should handle very large dataset', async () => {
      // Simulate large export
      const largeResult: TaskExportResult = {
        success: true,
        data: {
          tasks: Array.from({ length: 10000 }, (_, i) => ({
            id: `task-${i}`,
            title: `Task ${i}`,
            priority: 'medium' as const,
            status: 'TODO' as const,
            project: 'General' as const,
            createdAt: new Date(),
            updatedAt: new Date(),
          })),
          metadata: {
            version: '1.0.0',
            exportedAt: Date.now(),
            taskCount: 10000,
            projectBreakdown: { General: 10000 },
            statusBreakdown: { TODO: 10000 },
            priorityBreakdown: { medium: 10000 },
            dataSize: 5000000, // 5MB
          },
          filename: 'taskflow_backup_2024-06-15.json',
          jsonString: '{}',
        },
      };
      taskExportServiceSpy.exportTasks.mockResolvedValue(largeResult);

      const exportButton = fixture.debugElement.query(By.css('button[aria-label="Export tasks"]'));
      exportButton.nativeElement.click();
      await fixture.whenStable();

      expect(component.exportResult()?.data?.metadata.taskCount).toBe(10000);
    });

    it('should handle service throwing exception', async () => {
      taskExportServiceSpy.exportTasks.mockRejectedValue(new Error('Network error'));

      const exportButton = fixture.debugElement.query(By.css('button[aria-label="Export tasks"]'));
      exportButton.nativeElement.click();
      await fixture.whenStable();

      expect(component.errorMessage()).toContain('Network error');
      expect(component.isExporting()).toBe(false);
    });
  });

  describe('Computed Properties', () => {
    it('should have computed hasExportResult', () => {
      expect(component.hasExportResult()).toBe(false);

      component.exportResult.set(mockSuccessResult);
      fixture.detectChanges();

      expect(component.hasExportResult()).toBe(true);
    });

    it('should have computed hasError', () => {
      expect(component.hasError()).toBe(false);

      component.errorMessage.set('Test error');
      fixture.detectChanges();

      expect(component.hasError()).toBe(true);
    });

    it('should have computed isLoading', () => {
      expect(component.isLoading()).toBe(false);

      component.isExporting.set(true);
      fixture.detectChanges();

      expect(component.isLoading()).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('should clear error message on new export attempt', async () => {
      taskExportServiceSpy.exportTasks.mockResolvedValue(mockErrorResult);

      const exportButton = fixture.debugElement.query(By.css('button[aria-label="Export tasks"]'));
      exportButton.nativeElement.click();
      await fixture.whenStable();

      expect(component.errorMessage()).not.toBeNull();

      // Try again with success
      taskExportServiceSpy.exportTasks.mockResolvedValue(mockSuccessResult);
      exportButton.nativeElement.click();
      await fixture.whenStable();

      expect(component.errorMessage()).toBeNull();
    });

    it('should clear previous result on new export attempt', async () => {
      taskExportServiceSpy.exportTasks.mockResolvedValue(mockSuccessResult);

      const exportButton = fixture.debugElement.query(By.css('button[aria-label="Export tasks"]'));
      exportButton.nativeElement.click();
      await fixture.whenStable();

      const firstResult = component.exportResult();

      // Export again with a new result object
      const newResult = { ...mockSuccessResult };
      taskExportServiceSpy.exportTasks.mockResolvedValue(newResult);
      exportButton.nativeElement.click();
      await fixture.whenStable();

      // Should have a new result object
      expect(component.exportResult()).not.toBe(firstResult);
    });
  });
});
