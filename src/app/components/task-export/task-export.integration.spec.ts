import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TaskExportComponent } from './task-export.component';
import { TaskExportService } from '../../shared/services/task-export.service';
import { LocalStorageService, StorageResult } from '../../shared/services/local-storage.service';
import { CryptoService } from '../../shared/services/crypto.service';
import { Task } from '../../shared/models/task.model';
import { vi } from 'vitest';
import { createCryptoServiceSpy, CryptoServiceSpy } from '../../../test-helpers/crypto-service.mock';

describe('TaskExport Integration', () => {
  let component: TaskExportComponent;
  let fixture: ComponentFixture<TaskExportComponent>;
  let taskExportService: TaskExportService;
  let localStorageServiceSpy: {
    getItem: ReturnType<typeof vi.fn>;
  };

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
    localStorageServiceSpy = {
      getItem: vi.fn()
    };
    localStorageServiceSpy.getItem.mockResolvedValue({
      success: true,
      data: JSON.stringify(sampleTasks)
    });

    const cryptoServiceSpy = createCryptoServiceSpy({
      decrypt: vi.fn().mockReturnValue(sampleTasks),
      encrypt: vi.fn().mockReturnValue('encrypted-data')
    });

    await TestBed.configureTestingModule({
      imports: [TaskExportComponent],
      providers: [
        TaskExportService,
        { provide: LocalStorageService, useValue: localStorageServiceSpy },
        { provide: CryptoService, useValue: cryptoServiceSpy }
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
      const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor);
      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => document.body.appendChild(mockAnchor));
      const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => document.body.removeChild(mockAnchor));
      const clickSpy = vi.spyOn(mockAnchor, 'click');
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-url');
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL');

      // Click export button
      const exportButton = fixture.debugElement.query(By.css('button[aria-label="Export tasks"]'));
      exportButton.nativeElement.click();
      await fixture.whenStable();

      // Verify service was called
      expect(localStorageServiceSpy.getItem).toHaveBeenCalledWith('taskgo_tasks');

      // Verify file download was triggered
      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(appendChildSpy).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
      expect(createObjectURLSpy).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:test-url');

      // Verify filename format
      expect(mockAnchor.download).toMatch(/^taskgo_backup_\d{4}-\d{2}-\d{2}\.json$/);

      // Verify component state
      expect(component.exportResult()?.success).toBe(true);
      expect(component.isExporting()).toBe(false);
    });

    it('should export all tasks with correct structure', async () => {
      vi.spyOn(document, 'createElement').mockImplementation(() => document.createElement('a'));
      vi.spyOn(document.body, 'appendChild').mockImplementation((node) => document.body.appendChild(node));
      vi.spyOn(document.body, 'removeChild').mockImplementation((node) => document.body.removeChild(node));
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-url');
      vi.spyOn(URL, 'revokeObjectURL');

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
      vi.spyOn(document, 'createElement').mockImplementation(() => document.createElement('a'));
      vi.spyOn(document.body, 'appendChild').mockImplementation((node) => document.body.appendChild(node));
      vi.spyOn(document.body, 'removeChild').mockImplementation((node) => document.body.removeChild(node));
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-url');
      vi.spyOn(URL, 'revokeObjectURL');

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
      vi.spyOn(document, 'createElement').mockImplementation(() => document.createElement('a'));
      vi.spyOn(document.body, 'appendChild').mockImplementation((node) => document.body.appendChild(node));
      vi.spyOn(document.body, 'removeChild').mockImplementation((node) => document.body.removeChild(node));
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-url');
      vi.spyOn(URL, 'revokeObjectURL');

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
      vi.spyOn(document, 'createElement').mockImplementation(() => document.createElement('a'));
      vi.spyOn(document.body, 'appendChild').mockImplementation((node) => document.body.appendChild(node));
      vi.spyOn(document.body, 'removeChild').mockImplementation((node) => document.body.removeChild(node));
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-url');
      vi.spyOn(URL, 'revokeObjectURL');

      const exportButton = fixture.debugElement.query(By.css('button[aria-label="Export tasks"]'));
      exportButton.nativeElement.click();
      await fixture.whenStable();

      expect(localStorageServiceSpy.getItem).toHaveBeenCalledWith('taskgo_tasks');
    });

    it('should handle empty localStorage', async () => {
      localStorageServiceSpy.getItem.mockResolvedValue({
        success: true,
        data: null
      });

      vi.spyOn(document, 'createElement').mockImplementation(() => document.createElement('a'));
      vi.spyOn(document.body, 'appendChild').mockImplementation((node) => document.body.appendChild(node));
      vi.spyOn(document.body, 'removeChild').mockImplementation((node) => document.body.removeChild(node));
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-url');
      vi.spyOn(URL, 'revokeObjectURL');

      const exportButton = fixture.debugElement.query(By.css('button[aria-label="Export tasks"]'));
      exportButton.nativeElement.click();
      await fixture.whenStable();

      expect(component.exportResult()?.success).toBe(false);
      expect(component.errorMessage()).toBeDefined();
    });

    it('should handle localStorage quota exceeded', async () => {
      localStorageServiceSpy.getItem.mockResolvedValue({
        success: false,
        error: {
          name: 'QuotaExceededError',
          message: 'Quota exceeded',
          isQuotaExceeded: true
        }
      });

      vi.spyOn(document, 'createElement').mockImplementation(() => document.createElement('a'));
      vi.spyOn(document.body, 'appendChild').mockImplementation((node) => document.body.appendChild(node));
      vi.spyOn(document.body, 'removeChild').mockImplementation((node) => document.body.removeChild(node));
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-url');
      vi.spyOn(URL, 'revokeObjectURL');

      const exportButton = fixture.debugElement.query(By.css('button[aria-label="Export tasks"]'));
      exportButton.nativeElement.click();
      await fixture.whenStable();

      expect(component.exportResult()?.success).toBe(false);
      expect(component.errorMessage()).toContain('quota');
    });

    it('should handle localStorage security errors', async () => {
      localStorageServiceSpy.getItem.mockResolvedValue({
        success: false,
        error: {
          name: 'SecurityError',
          message: 'Access denied',
          isSecurityError: true
        }
      });

      vi.spyOn(document, 'createElement').mockImplementation(() => document.createElement('a'));
      vi.spyOn(document.body, 'appendChild').mockImplementation((node) => document.body.appendChild(node));
      vi.spyOn(document.body, 'removeChild').mockImplementation((node) => document.body.removeChild(node));
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-url');
      vi.spyOn(URL, 'revokeObjectURL');

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

      vi.spyOn(document, 'createElement').mockImplementation(() => document.createElement('a'));
      vi.spyOn(document.body, 'appendChild').mockImplementation((node) => document.body.appendChild(node));
      vi.spyOn(document.body, 'removeChild').mockImplementation((node) => document.body.removeChild(node));
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-url');
      vi.spyOn(URL, 'revokeObjectURL');

      const exportButton = fixture.debugElement.query(By.css('button[aria-label="Export tasks"]'));
      exportButton.nativeElement.click();
      await fixture.whenStable();

      expect(component.exportResult()?.data?.filename).toBe('taskgo_backup_2024-12-25.json');
    });

    it('should use consistent filename format across multiple exports', async () => {
      vi.spyOn(Date.prototype, 'toISOString').mockReturnValue('2024-06-15T10:00:00.000Z');

      // First export
      let createElementSpy = vi.spyOn(document, 'createElement').mockImplementation(() => document.createElement('a'));
      let appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => document.body.appendChild(node));
      let removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation((node) => document.body.removeChild(node));
      let createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-url');
      let revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL');

      const exportButton = fixture.debugElement.query(By.css('button[aria-label="Export tasks"]'));
      exportButton.nativeElement.click();
      await fixture.whenStable();

      const firstFilename = component.exportResult()?.data?.filename;

      // Second export (reset spies)
      vi.clearAllMocks();
      vi.spyOn(Date.prototype, 'toISOString').mockReturnValue('2024-06-15T10:01:00.000Z');

      createElementSpy = vi.spyOn(document, 'createElement').mockImplementation(() => document.createElement('a'));
      appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => document.body.appendChild(node));
      removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation((node) => document.body.removeChild(node));
      createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-url');
      revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL');

      exportButton.nativeElement.click();
      await fixture.whenStable();

      const secondFilename = component.exportResult()?.data?.filename;

      expect(firstFilename).toBe('taskgo_backup_2024-06-15.json');
      expect(secondFilename).toBe('taskgo_backup_2024-06-15.json');
    });
  });

  describe('Data Integrity', () => {
    it('should preserve all task fields in export', async () => {
      vi.spyOn(document, 'createElement').mockImplementation(() => document.createElement('a'));
      vi.spyOn(document.body, 'appendChild').mockImplementation((node) => document.body.appendChild(node));
      vi.spyOn(document.body, 'removeChild').mockImplementation((node) => document.body.removeChild(node));
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-url');
      vi.spyOn(URL, 'revokeObjectURL');

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
      vi.spyOn(document, 'createElement').mockImplementation(() => document.createElement('a'));
      vi.spyOn(document.body, 'appendChild').mockImplementation((node) => document.body.appendChild(node));
      vi.spyOn(document.body, 'removeChild').mockImplementation((node) => document.body.removeChild(node));
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-url');
      vi.spyOn(URL, 'revokeObjectURL');

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

      localStorageServiceSpy.getItem.mockResolvedValue({
        success: true,
        data: JSON.stringify(tasksWithSpecialChars)
      });

      vi.spyOn(document, 'createElement').mockImplementation(() => document.createElement('a'));
      vi.spyOn(document.body, 'appendChild').mockImplementation((node) => document.body.appendChild(node));
      vi.spyOn(document.body, 'removeChild').mockImplementation((node) => document.body.removeChild(node));
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-url');
      vi.spyOn(URL, 'revokeObjectURL');

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

      localStorageServiceSpy.getItem.mockResolvedValue({
        success: true,
        data: JSON.stringify(tasksWithUnicode)
      });

      vi.spyOn(document, 'createElement').mockImplementation(() => document.createElement('a'));
      vi.spyOn(document.body, 'appendChild').mockImplementation((node) => document.body.appendChild(node));
      vi.spyOn(document.body, 'removeChild').mockImplementation((node) => document.body.removeChild(node));
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-url');
      vi.spyOn(URL, 'revokeObjectURL');

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
      localStorageServiceSpy.getItem.mockResolvedValue({
        success: true,
        data: null
      });

      vi.spyOn(document, 'createElement').mockImplementation(() => document.createElement('a'));
      vi.spyOn(document.body, 'appendChild').mockImplementation((node) => document.body.appendChild(node));
      vi.spyOn(document.body, 'removeChild').mockImplementation((node) => document.body.removeChild(node));
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-url');
      vi.spyOn(URL, 'revokeObjectURL');

      const exportButton = fixture.debugElement.query(By.css('button[aria-label="Export tasks"]'));
      exportButton.nativeElement.click();
      await fixture.whenStable();

      expect(component.exportResult()?.success).toBe(false);
      expect(component.errorMessage()).not.toBeNull();

      // Reset for second attempt
      vi.clearAllMocks();
      localStorageServiceSpy.getItem.mockResolvedValue({
        success: true,
        data: JSON.stringify(sampleTasks)
      });

      vi.spyOn(document, 'createElement').mockImplementation(() => document.createElement('a'));
      vi.spyOn(document.body, 'appendChild').mockImplementation((node) => document.body.appendChild(node));
      vi.spyOn(document.body, 'removeChild').mockImplementation((node) => document.body.removeChild(node));
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-url');
      vi.spyOn(URL, 'revokeObjectURL');

      // Retry
      exportButton.nativeElement.click();
      await fixture.whenStable();

      expect(component.exportResult()?.success).toBe(true);
      expect(component.errorMessage()).toBeNull();
    });

    it('should handle network/service errors gracefully', async () => {
      localStorageServiceSpy.getItem.mockResolvedValue({
        success: false,
        error: {
          name: 'UnknownError',
          message: 'Network error'
        }
      });

      vi.spyOn(document, 'createElement').mockImplementation(() => document.createElement('a'));
      vi.spyOn(document.body, 'appendChild').mockImplementation((node) => document.body.appendChild(node));
      vi.spyOn(document.body, 'removeChild').mockImplementation((node) => document.body.removeChild(node));
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-url');
      vi.spyOn(URL, 'revokeObjectURL');

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

      localStorageServiceSpy.getItem.mockResolvedValue({
        success: true,
        data: JSON.stringify(largeTasks)
      });

      const startTime = Date.now();

      vi.spyOn(document, 'createElement').mockImplementation(() => document.createElement('a'));
      vi.spyOn(document.body, 'appendChild').mockImplementation((node) => document.body.appendChild(node));
      vi.spyOn(document.body, 'removeChild').mockImplementation((node) => document.body.removeChild(node));
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-url');
      vi.spyOn(URL, 'revokeObjectURL');

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
      vi.spyOn(document, 'createElement').mockImplementation(() => document.createElement('a'));
      vi.spyOn(document.body, 'appendChild').mockImplementation((node) => document.body.appendChild(node));
      vi.spyOn(document.body, 'removeChild').mockImplementation((node) => document.body.removeChild(node));
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-url');
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL');

      const exportButton = fixture.debugElement.query(By.css('button[aria-label="Export tasks"]'));
      exportButton.nativeElement.click();
      await fixture.whenStable();

      expect(revokeObjectURLSpy).toHaveBeenCalled();
    });
  });

  describe('Encryption/Decryption Integration', () => {
    it('should handle encrypted data correctly', async () => {
      const cryptoServiceSpy = TestBed.inject(CryptoService);
      vi.spyOn(cryptoServiceSpy, 'decrypt').mockReturnValue(sampleTasks);
      
      vi.spyOn(document, 'createElement').mockImplementation(() => document.createElement('a'));
      vi.spyOn(document.body, 'appendChild').mockImplementation((node) => document.body.appendChild(node));
      vi.spyOn(document.body, 'removeChild').mockImplementation((node) => document.body.removeChild(node));
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-url');
      vi.spyOn(URL, 'revokeObjectURL');

      const exportButton = fixture.debugElement.query(By.css('button[aria-label="Export tasks"]'));
      exportButton.nativeElement.click();
      await fixture.whenStable();

      expect(cryptoServiceSpy.decrypt).toHaveBeenCalledWith(JSON.stringify(sampleTasks));
      expect(component.exportResult()?.success).toBe(true);
    });

    it('should handle decryption failures gracefully', async () => {
      const cryptoServiceSpy = TestBed.inject(CryptoService);
      vi.spyOn(cryptoServiceSpy, 'decrypt').mockReturnValue(null);
      
      vi.spyOn(document, 'createElement').mockImplementation(() => document.createElement('a'));
      vi.spyOn(document.body, 'appendChild').mockImplementation((node) => document.body.appendChild(node));
      vi.spyOn(document.body, 'removeChild').mockImplementation((node) => document.body.removeChild(node));
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-url');
      vi.spyOn(URL, 'revokeObjectURL');

      const exportButton = fixture.debugElement.query(By.css('button[aria-label="Export tasks"]'));
      exportButton.nativeElement.click();
      await fixture.whenStable();

      expect(component.exportResult()?.success).toBe(false);
      expect(component.errorMessage()).toContain('Invalid task data structure');
    });
  });

  describe('Accessibility Integration', () => {
    it('should announce export start to screen readers', async () => {
      let resolveExport: any;
      vi.spyOn(taskExportService, 'exportTasks').mockReturnValue(
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
      vi.spyOn(document, 'createElement').mockImplementation(() => document.createElement('a'));
      vi.spyOn(document.body, 'appendChild').mockImplementation((node) => document.body.appendChild(node));
      vi.spyOn(document.body, 'removeChild').mockImplementation((node) => document.body.removeChild(node));
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-url');
      vi.spyOn(URL, 'revokeObjectURL');

      const exportButton = fixture.debugElement.query(By.css('button[aria-label="Export tasks"]'));
      exportButton.nativeElement.click();
      await fixture.whenStable();

      expect(exportButton.nativeElement.getAttribute('aria-busy')).toBe('false');
    });
  });
});
