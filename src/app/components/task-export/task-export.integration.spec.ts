import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TaskExportComponent } from './task-export.component';
import { TaskExportService } from '../shared/services/task-export.service';
import { LocalStorageService } from '../shared/services/local-storage.service';
import { Task } from '../shared/models/task.model';
import { vi } from 'vitest';

describe('TaskExport Integration', () => {
  let component: TaskExportComponent;
  let fixture: ComponentFixture<TaskExportComponent>;
  let taskExportService: TaskExportService;
  let localStorageServiceSpy: jasmine.SpyObj<LocalStorageService>;

  const sampleTasks: Task[] = [
    {
      id: '1',
      title: 'Integration Test Task',
      description: 'Task description for integration testing',
      priority: 'high',
      status: 'TODO',
      project: 'Work',
      createdAt: new Date('2024-01-15T10:30:00.000Z'),
      updatedAt: new Date('2024-01-15T10:30:00.000Z'),
    },
    {
      id: '2',
      title: 'Another Task',
      priority: 'medium',
      status: 'IN_PROGRESS',
      project: 'Personal',
      createdAt: new Date('2024-01-16T14:20:00.000Z'),
      updatedAt: new Date('2024-01-16T14:20:00.000Z'),
    },
  ];

  beforeEach(async () => {
    localStorageServiceSpy = jasmine.createSpyObj('LocalStorageService', ['getItem']);
    localStorageServiceSpy.getItem.and.returnValue(JSON.stringify(sampleTasks));

    await TestBed.configureTestingModule({
      imports: [TaskExportComponent],
      providers: [
        TaskExportService,
        { provide: LocalStorageService, useValue: localStorageServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskExportComponent);
    component = fixture.componentInstance;
    taskExportService = TestBed.inject(TaskExportService);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Export Flow', () => {
    it('should export tasks from click to download', async () => {
      // Mock DOM methods
      const mockAnchor = document.createElement('a');
      const createElementSpy = spyOn(document, 'createElement').and.returnValue(mockAnchor);
      const appendChildSpy = spyOn(document.body, 'appendChild').and.callThrough();
      const removeChildSpy = spyOn(document.body, 'removeChild').and.callThrough();
      const clickSpy = spyOn(mockAnchor, 'click');
      const createObjectURLSpy = spyOn(URL, 'createObjectURL').and.returnValue('blob:test-url');
      const revokeObjectURLSpy = spyOn(URL, 'revokeObjectURL');

      // Click export button
      const exportButton = fixture.debugElement.query(By.css('button[aria-label="Export tasks"]'));
      exportButton.nativeElement.click();
      await fixture.whenStable();

      // Verify service was called
      expect(localStorageServiceSpy.getItem).toHaveBeenCalled();

      // Verify file download was triggered
      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(appendChildSpy).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
      expect(createObjectURLSpy).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:test-url');

      // Verify filename format
      expect(mockAnchor.download).toMatch(/^taskflow_backup_\d{4}-\d{2}-\d{2}\.json$/);

      // Verify component state
      expect(component.exportResult()?.success).toBe(true);
      expect(component.isExporting()).toBe(false);
    });

    it('should export all tasks with correct structure', async () => {
      spyOn(document, 'createElement').and.callThrough();
      spyOn(document.body, 'appendChild').and.callThrough();
      spyOn(document.body, 'removeChild').and.callThrough();
      spyOn(URL, 'createObjectURL').and.returnValue('blob:test-url');
      spyOn(URL, 'revokeObjectURL');

      const exportButton = fixture.debugElement.query(By.css('button[aria-label="Export tasks"]'));
      exportButton.nativeElement.click();
      await fixture.whenStable();

      const result = component.exportResult();
      expect(result?.success).toBe(true);
      expect(result?.data?.tasks).toHaveLength(2);
      expect(result?.data?.tasks[0].title).toBe('Integration Test Task');
      expect(result?.data?.tasks[1].title).toBe('Another Task');
    });

    it('should include metadata in exported file', async () => {
      spyOn(document, 'createElement').and.callThrough();
      spyOn(document.body, 'appendChild').and.callThrough();
      spyOn(document.body, 'removeChild').and.callThrough();
      spyOn(URL, 'createObjectURL').and.returnValue('blob:test-url');
      spyOn(URL, 'revokeObjectURL');

      const exportButton = fixture.debugElement.query(By.css('button[aria-label="Export tasks"]'));
      exportButton.nativeElement.click();
      await fixture.whenStable();

      const result = component.exportResult();
      expect(result?.data?.metadata).toBeDefined();
      expect(result?.data?.metadata.version).toBeDefined();
      expect(result?.data?.metadata.exportedAt).toBeDefined();
      expect(result?.data?.metadata.taskCount).toBe(2);
    });

    it('should have correct JSON formatting', async () => {
      spyOn(document, 'createElement').and.callThrough();
      spyOn(document.body, 'appendChild').and.callThrough();
      spyOn(document.body, 'removeChild').and.callThrough();
      spyOn(URL, 'createObjectURL').and.returnValue('blob:test-url');
      spyOn(URL, 'revokeObjectURL');

      const exportButton = fixture.debugElement.query(By.css('button[aria-label="Export tasks"]'));
      exportButton.nativeElement.click();
      await fixture.whenStable();

      const jsonString = component.exportResult()?.data?.jsonString;
      expect(jsonString).toBeDefined();

      // Verify indentation (2 spaces)
      expect(jsonString).toContain('  ');

      // Verify it's valid JSON
      const parsed = JSON.parse(jsonString!);
      expect(parsed.tasks).toBeDefined();
      expect(parsed.metadata).toBeDefined();
    });
  });

  describe('Integration with LocalStorage', () => {
    it('should retrieve tasks from localStorage', async () => {
      spyOn(document, 'createElement').and.callThrough();
      spyOn(document.body, 'appendChild').and.callThrough();
      spyOn(document.body, 'removeChild').and.callThrough();
      spyOn(URL, 'createObjectURL').and.returnValue('blob:test-url');
      spyOn(URL, 'revokeObjectURL');

      const exportButton = fixture.debugElement.query(By.css('button[aria-label="Export tasks"]'));
      exportButton.nativeElement.click();
      await fixture.whenStable();

      expect(localStorageServiceSpy.getItem).toHaveBeenCalledWith('taskgo_tasks');
    });

    it('should handle empty localStorage', async () => {
      localStorageServiceSpy.getItem.and.returnValue(null);

      spyOn(document, 'createElement').and.callThrough();
      spyOn(document.body, 'appendChild').and.callThrough();
      spyOn(document.body, 'removeChild').and.callThrough();
      spyOn(URL, 'createObjectURL').and.returnValue('blob:test-url');
      spyOn(URL, 'revokeObjectURL');

      const exportButton = fixture.debugElement.query(By.css('button[aria-label="Export tasks"]'));
      exportButton.nativeElement.click();
      await fixture.whenStable();

      expect(component.exportResult()?.success).toBe(false);
      expect(component.errorMessage()).toBeDefined();
    });

    it('should handle localStorage quota exceeded', async () => {
      localStorageServiceSpy.getItem.and.throwError(
        new DOMException('Quota exceeded', 'QuotaExceededError')
      );

      spyOn(document, 'createElement').and.callThrough();
      spyOn(document.body, 'appendChild').and.callThrough();
      spyOn(document.body, 'removeChild').and.callThrough();
      spyOn(URL, 'createObjectURL').and.returnValue('blob:test-url');
      spyOn(URL, 'revokeObjectURL');

      const exportButton = fixture.debugElement.query(By.css('button[aria-label="Export tasks"]'));
      exportButton.nativeElement.click();
      await fixture.whenStable();

      expect(component.exportResult()?.success).toBe(false);
      expect(component.errorMessage()).toContain('quota');
    });

    it('should handle localStorage security errors', async () => {
      localStorageServiceSpy.getItem.and.throwError(
        new DOMException('Access denied', 'SecurityError')
      );

      spyOn(document, 'createElement').and.callThrough();
      spyOn(document.body, 'appendChild').and.callThrough();
      spyOn(document.body, 'removeChild').and.callThrough();
      spyOn(URL, 'createObjectURL').and.returnValue('blob:test-url');
      spyOn(URL, 'revokeObjectURL');

      const exportButton = fixture.debugElement.query(By.css('button[aria-label="Export tasks"]'));
      exportButton.nativeElement.click();
      await fixture.whenStable();

      expect(component.exportResult()?.success).toBe(false);
      expect(component.errorMessage()).toContain('security');
    });
  });

  describe('Filename Generation Integration', () => {
    it('should generate correct filename based on current date', async () => {
      vi.spyOn(Date.prototype, 'toISOString').mockReturnValue('2024-12-25T15:30:45.000Z');

      spyOn(document, 'createElement').and.callThrough();
      spyOn(document.body, 'appendChild').and.callThrough();
      spyOn(document.body, 'removeChild').and.callThrough();
      spyOn(URL, 'createObjectURL').and.returnValue('blob:test-url');
      spyOn(URL, 'revokeObjectURL');

      const exportButton = fixture.debugElement.query(By.css('button[aria-label="Export tasks"]'));
      exportButton.nativeElement.click();
      await fixture.whenStable();

      expect(component.exportResult()?.data?.filename).toBe('taskflow_backup_2024-12-25.json');
    });

    it('should use consistent filename format across multiple exports', async () => {
      vi.spyOn(Date.prototype, 'toISOString').mockReturnValue('2024-06-15T10:00:00.000Z');

      // First export
      let createElementSpy = spyOn(document, 'createElement').and.callThrough();
      let appendChildSpy = spyOn(document.body, 'appendChild').and.callThrough();
      let removeChildSpy = spyOn(document.body, 'removeChild').and.callThrough();
      let createObjectURLSpy = spyOn(URL, 'createObjectURL').and.returnValue('blob:test-url');
      let revokeObjectURLSpy = spyOn(URL, 'revokeObjectURL');

      const exportButton = fixture.debugElement.query(By.css('button[aria-label="Export tasks"]'));
      exportButton.nativeElement.click();
      await fixture.whenStable();

      const firstFilename = component.exportResult()?.data?.filename;

      // Second export (reset spies)
      vi.clearAllMocks();
      vi.spyOn(Date.prototype, 'toISOString').mockReturnValue('2024-06-15T10:01:00.000Z');

      createElementSpy = spyOn(document, 'createElement').and.callThrough();
      appendChildSpy = spyOn(document.body, 'appendChild').and.callThrough();
      removeChildSpy = spyOn(document.body, 'removeChild').and.callThrough();
      createObjectURLSpy = spyOn(URL, 'createObjectURL').and.returnValue('blob:test-url');
      revokeObjectURLSpy = spyOn(URL, 'revokeObjectURL');

      exportButton.nativeElement.click();
      await fixture.whenStable();

      const secondFilename = component.exportResult()?.data?.filename;

      expect(firstFilename).toBe('taskflow_backup_2024-06-15.json');
      expect(secondFilename).toBe('taskflow_backup_2024-06-15.json');
    });
  });

  describe('Data Integrity', () => {
    it('should preserve all task fields in export', async () => {
      spyOn(document, 'createElement').and.callThrough();
      spyOn(document.body, 'appendChild').and.callThrough();
      spyOn(document.body, 'removeChild').and.callThrough();
      spyOn(URL, 'createObjectURL').and.returnValue('blob:test-url');
      spyOn(URL, 'revokeObjectURL');

      const exportButton = fixture.debugElement.query(By.css('button[aria-label="Export tasks"]'));
      exportButton.nativeElement.click();
      await fixture.whenStable();

      const exportedTasks = component.exportResult()?.data?.tasks;

      expect(exportedTasks).toHaveLength(2);

      // Check first task
      expect(exportedTasks![0].id).toBe('1');
      expect(exportedTasks![0].title).toBe('Integration Test Task');
      expect(exportedTasks![0].description).toBe('Task description for integration testing');
      expect(exportedTasks![0].priority).toBe('high');
      expect(exportedTasks![0].status).toBe('TODO');
      expect(exportedTasks![0].project).toBe('Work');

      // Check second task
      expect(exportedTasks![1].id).toBe('2');
      expect(exportedTasks![1].title).toBe('Another Task');
      expect(exportedTasks![1].priority).toBe('medium');
      expect(exportedTasks![1].status).toBe('IN_PROGRESS');
      expect(exportedTasks![1].project).toBe('Personal');
    });

    it('should preserve date objects correctly', async () => {
      spyOn(document, 'createElement').and.callThrough();
      spyOn(document.body, 'appendChild').and.callThrough();
      spyOn(document.body, 'removeChild').and.callThrough();
      spyOn(URL, 'createObjectURL').and.returnValue('blob:test-url');
      spyOn(URL, 'revokeObjectURL');

      const exportButton = fixture.debugElement.query(By.css('button[aria-label="Export tasks"]'));
      exportButton.nativeElement.click();
      await fixture.whenStable();

      const jsonString = component.exportResult()?.data?.jsonString;
      const parsed = JSON.parse(jsonString!);

      expect(parsed.tasks[0].createdAt).toBe('2024-01-15T10:30:00.000Z');
      expect(parsed.tasks[0].updatedAt).toBe('2024-01-15T10:30:00.000Z');
      expect(parsed.tasks[1].createdAt).toBe('2024-01-16T14:20:00.000Z');
      expect(parsed.tasks[1].updatedAt).toBe('2024-01-16T14:20:00.000Z');
    });

    it('should handle special characters in data', async () => {
      const tasksWithSpecialChars: Task[] = [
        {
          id: '1',
          title: 'Task with <script>alert("XSS")</script> & "quotes"',
          description: 'Test: <tag> & "test"',
          priority: 'high',
          status: 'TODO',
          project: 'Work',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      localStorageServiceSpy.getItem.and.returnValue(JSON.stringify(tasksWithSpecialChars));

      spyOn(document, 'createElement').and.callThrough();
      spyOn(document.body, 'appendChild').and.callThrough();
      spyOn(document.body, 'removeChild').and.callThrough();
      spyOn(URL, 'createObjectURL').and.returnValue('blob:test-url');
      spyOn(URL, 'revokeObjectURL');

      const exportButton = fixture.debugElement.query(By.css('button[aria-label="Export tasks"]'));
      exportButton.nativeElement.click();
      await fixture.whenStable();

      const jsonString = component.exportResult()?.data?.jsonString;
      const parsed = JSON.parse(jsonString!);

      expect(parsed.tasks[0].title).toContain('XSS');
      expect(parsed.tasks[0].description).toContain('test');
    });

    it('should handle unicode characters', async () => {
      const tasksWithUnicode: Task[] = [
        {
          id: '1',
          title: 'Task with emojis 🎉🚀✨ and unicode 中文 日本語',
          priority: 'medium',
          status: 'TODO',
          project: 'Personal',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      localStorageServiceSpy.getItem.and.returnValue(JSON.stringify(tasksWithUnicode));

      spyOn(document, 'createElement').and.callThrough();
      spyOn(document.body, 'appendChild').and.callThrough();
      spyOn(document.body, 'removeChild').and.callThrough();
      spyOn(URL, 'createObjectURL').and.returnValue('blob:test-url');
      spyOn(URL, 'revokeObjectURL');

      const exportButton = fixture.debugElement.query(By.css('button[aria-label="Export tasks"]'));
      exportButton.nativeElement.click();
      await fixture.whenStable();

      const jsonString = component.exportResult()?.data?.jsonString;
      const parsed = JSON.parse(jsonString!);

      expect(parsed.tasks[0].title).toContain('🎉');
      expect(parsed.tasks[0].title).toContain('中文');
    });
  });

  describe('Error Recovery', () => {
    it('should allow retry after error', async () => {
      // First attempt fails
      localStorageServiceSpy.getItem.and.returnValue(null);

      spyOn(document, 'createElement').and.callThrough();
      spyOn(document.body, 'appendChild').and.callThrough();
      spyOn(document.body, 'removeChild').and.callThrough();
      spyOn(URL, 'createObjectURL').and.returnValue('blob:test-url');
      spyOn(URL, 'revokeObjectURL');

      const exportButton = fixture.debugElement.query(By.css('button[aria-label="Export tasks"]'));
      exportButton.nativeElement.click();
      await fixture.whenStable();

      expect(component.exportResult()?.success).toBe(false);
      expect(component.errorMessage()).not.toBeNull();

      // Reset for second attempt
      vi.clearAllMocks();
      localStorageServiceSpy.getItem.and.returnValue(JSON.stringify(sampleTasks));

      spyOn(document, 'createElement').and.callThrough();
      spyOn(document.body, 'appendChild').and.callThrough();
      spyOn(document.body, 'removeChild').and.callThrough();
      spyOn(URL, 'createObjectURL').and.returnValue('blob:test-url');
      spyOn(URL, 'revokeObjectURL');

      // Retry
      exportButton.nativeElement.click();
      await fixture.whenStable();

      expect(component.exportResult()?.success).toBe(true);
      expect(component.errorMessage()).toBeNull();
    });

    it('should handle network/service errors gracefully', async () => {
      localStorageServiceSpy.getItem.and.throwError(new Error('Network error'));

      spyOn(document, 'createElement').and.callThrough();
      spyOn(document.body, 'appendChild').and.callThrough();
      spyOn(document.body, 'removeChild').and.callThrough();
      spyOn(URL, 'createObjectURL').and.returnValue('blob:test-url');
      spyOn(URL, 'revokeObjectURL');

      const exportButton = fixture.debugElement.query(By.css('button[aria-label="Export tasks"]'));
      exportButton.nativeElement.click();
      await fixture.whenStable();

      expect(component.isExporting()).toBe(false);
      expect(component.errorMessage()).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should handle large datasets efficiently', async () => {
      const largeTasks = Array.from({ length: 500 }, (_, i) => ({
        id: `task-${i}`,
        title: `Task ${i}`,
        description: `Description for task ${i}`,
        priority: ['low', 'medium', 'high'][i % 3] as Task['priority'],
        status: ['TODO', 'IN_PROGRESS', 'DONE'][i % 3] as Task['status'],
        project: ['Personal', 'Work', 'Study', 'General'][i % 4] as Task['project'],
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      localStorageServiceSpy.getItem.and.returnValue(JSON.stringify(largeTasks));

      const startTime = Date.now();

      spyOn(document, 'createElement').and.callThrough();
      spyOn(document.body, 'appendChild').and.callThrough();
      spyOn(document.body, 'removeChild').and.callThrough();
      spyOn(URL, 'createObjectURL').and.returnValue('blob:test-url');
      spyOn(URL, 'revokeObjectURL');

      const exportButton = fixture.debugElement.query(By.css('button[aria-label="Export tasks"]'));
      exportButton.nativeElement.click();
      await fixture.whenStable();

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(component.exportResult()?.success).toBe(true);
      expect(component.exportResult()?.data?.tasks).toHaveLength(500);
      // Should complete within 5 seconds
      expect(duration).toBeLessThan(5000);
    });

    it('should cleanup resources after export', async () => {
      spyOn(document, 'createElement').and.callThrough();
      spyOn(document.body, 'appendChild').and.callThrough();
      spyOn(document.body, 'removeChild').and.callThrough();
      spyOn(URL, 'createObjectURL').and.returnValue('blob:test-url');
      const revokeObjectURLSpy = spyOn(URL, 'revokeObjectURL');

      const exportButton = fixture.debugElement.query(By.css('button[aria-label="Export tasks"]'));
      exportButton.nativeElement.click();
      await fixture.whenStable();

      expect(revokeObjectURLSpy).toHaveBeenCalled();
    });
  });

  describe('Accessibility Integration', () => {
    it('should announce export start to screen readers', async () => {
      let resolveExport: any;
      taskExportService['exportTasks'] = vi.fn().mockReturnValue(
        new Promise((resolve) => {
          resolveExport = resolve;
        })
      );

      const exportButton = fixture.debugElement.query(By.css('button[aria-label="Export tasks"]'));
      exportButton.nativeElement.click();
      fixture.detectChanges();

      expect(exportButton.nativeElement.getAttribute('aria-busy')).toBe('true');

      resolveExport({
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
          filename: 'test.json',
          jsonString: '{}',
        },
      });
      await fixture.whenStable();
    });

    it('should announce export completion', async () => {
      spyOn(document, 'createElement').and.callThrough();
      spyOn(document.body, 'appendChild').and.callThrough();
      spyOn(document.body, 'removeChild').and.callThrough();
      spyOn(URL, 'createObjectURL').and.returnValue('blob:test-url');
      spyOn(URL, 'revokeObjectURL');

      const exportButton = fixture.debugElement.query(By.css('button[aria-label="Export tasks"]'));
      exportButton.nativeElement.click();
      await fixture.whenStable();

      expect(exportButton.nativeElement.getAttribute('aria-busy')).toBe('false');
    });
  });
});
