import { TestBed } from '@angular/core/testing';
import {
  TaskExportService,
  TaskExportResult,
  TaskExportMetadata,
} from './task-export.service';
import { LocalStorageService } from '../shared/services/local-storage.service';
import { Task } from '../shared/models/task.model';
import { vi } from 'vitest';

describe('TaskExportService', () => {
  let service: TaskExportService;
  let localStorageServiceSpy: jasmine.SpyObj<LocalStorageService>;

  // Mock tasks for testing
  const mockTasks: Task[] = [
    {
      id: '1',
      title: 'Test Task 1',
      description: 'Description with special characters: <>"\'&',
      priority: 'high',
      status: 'TODO',
      project: 'Work',
      createdAt: new Date('2024-01-15T10:30:00.000Z'),
      updatedAt: new Date('2024-01-15T10:30:00.000Z'),
    },
    {
      id: '2',
      title: 'Test Task 2',
      priority: 'medium',
      status: 'IN_PROGRESS',
      project: 'Personal',
      createdAt: new Date('2024-01-16T14:20:00.000Z'),
      updatedAt: new Date('2024-01-16T14:20:00.000Z'),
    },
  ];

  const emptyTasks: Task[] = [];

  const largeTaskDataset: Task[] = Array.from({ length: 1000 }, (_, i) => ({
    id: `task-${i}`,
    title: `Task ${i}`,
    description: `Description for task ${i}`,
    priority: ['low', 'medium', 'high'][i % 3] as Task['priority'],
    status: ['TODO', 'IN_PROGRESS', 'DONE'][i % 3] as Task['status'],
    project: ['Personal', 'Work', 'Study', 'General'][i % 4] as Task['project'],
    createdAt: new Date(`2024-01-${String((i % 30) + 1).padStart(2, '0')}`),
    updatedAt: new Date(`2024-01-${String((i % 30) + 1).padStart(2, '0')}`),
  }));

  beforeEach(async () => {
    localStorageServiceSpy = jasmine.createSpyObj('LocalStorageService', [
      'getItem',
      'setItem',
    ]);

    localStorageServiceSpy.getItem.and.returnValue(JSON.stringify(mockTasks));

    await TestBed.configureTestingModule({
      providers: [
        TaskExportService,
        { provide: LocalStorageService, useValue: localStorageServiceSpy },
      ],
    }).compileComponents();

    service = TestBed.inject(TaskExportService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should have default export filename prefix', () => {
      expect(service['FILENAME_PREFIX']).toBe('taskflow_backup_');
    });

    it('should have default file extension', () => {
      expect(service['FILE_EXTENSION']).toBe('.json');
    });
  });

  describe('Export Tasks - Happy Path', () => {
    it('should export tasks successfully', async () => {
      localStorageServiceSpy.getItem.and.returnValue(JSON.stringify(mockTasks));

      const result = await service.exportTasks();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should include all tasks in export data', async () => {
      localStorageServiceSpy.getItem.and.returnValue(JSON.stringify(mockTasks));

      const result = await service.exportTasks();

      expect(result.data?.tasks).toBeDefined();
      expect(result.data?.tasks).toHaveLength(2);
      expect(result.data?.tasks[0].id).toBe('1');
      expect(result.data?.tasks[1].id).toBe('2');
    });

    it('should include metadata in export data', async () => {
      localStorageServiceSpy.getItem.and.returnValue(JSON.stringify(mockTasks));

      const result = await service.exportTasks();

      expect(result.data?.metadata).toBeDefined();
      expect(result.data?.metadata.exportedAt).toBeDefined();
      expect(result.data?.metadata.version).toBeDefined();
      expect(result.data?.metadata.taskCount).toBe(2);
    });

    it('should include metadata with project breakdown', async () => {
      localStorageServiceSpy.getItem.and.returnValue(JSON.stringify(mockTasks));

      const result = await service.exportTasks();

      expect(result.data?.metadata.projectBreakdown).toBeDefined();
      expect(result.data?.metadata.projectBreakdown.Work).toBe(1);
      expect(result.data?.metadata.projectBreakdown.Personal).toBe(1);
    });

    it('should include metadata with status breakdown', async () => {
      localStorageServiceSpy.getItem.and.returnValue(JSON.stringify(mockTasks));

      const result = await service.exportTasks();

      expect(result.data?.metadata.statusBreakdown).toBeDefined();
      expect(result.data?.metadata.statusBreakdown.TODO).toBe(1);
      expect(result.data?.metadata.statusBreakdown['IN_PROGRESS']).toBe(1);
    });

    it('should generate correct filename with YYYY-MM-DD format', async () => {
      localStorageServiceSpy.getItem.and.returnValue(JSON.stringify(mockTasks));

      // Mock the date to a known value for testing
      const testDate = new Date('2024-06-15T10:30:00.000Z');
      vi.spyOn(Date.prototype, 'toISOString').mockReturnValue('2024-06-15T10:30:00.000Z');

      const result = await service.exportTasks();

      expect(result.data?.filename).toBe('taskflow_backup_2024-06-15.json');
    });

    it('should preserve task properties correctly', async () => {
      localStorageServiceSpy.getItem.and.returnValue(JSON.stringify(mockTasks));

      const result = await service.exportTasks();

      const exportedTask = result.data?.tasks[0];
      expect(exportedTask.id).toBe('1');
      expect(exportedTask.title).toBe('Test Task 1');
      expect(exportedTask.description).toContain('special characters');
      expect(exportedTask.priority).toBe('high');
      expect(exportedTask.status).toBe('TODO');
      expect(exportedTask.project).toBe('Work');
    });

    it('should format JSON with indentation', async () => {
      localStorageServiceSpy.getItem.and.returnValue(JSON.stringify(mockTasks));

      const result = await service.exportTasks();

      expect(result.data?.jsonString).toBeDefined();
      // Check that it's indented (contains newlines and spaces)
      expect(result.data?.jsonString).toContain('\n');
      expect(result.data?.jsonString).toContain('  ');
      // Verify it's valid JSON
      const parsed = JSON.parse(result.data!.jsonString);
      expect(parsed.tasks).toBeDefined();
    });

    it('should include version information in metadata', async () => {
      localStorageServiceSpy.getItem.and.returnValue(JSON.stringify(mockTasks));

      const result = await service.exportTasks();

      expect(result.data?.metadata.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should include exportedAt timestamp in metadata', async () => {
      localStorageServiceSpy.getItem.and.returnValue(JSON.stringify(mockTasks));

      const beforeTime = Date.now();
      const result = await service.exportTasks();
      const afterTime = Date.now();

      expect(result.data?.metadata.exportedAt).toBeGreaterThanOrEqual(beforeTime);
      expect(result.data?.metadata.exportedAt).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('Export Tasks - Edge Cases', () => {
    it('should handle empty task list', async () => {
      localStorageServiceSpy.getItem.and.returnValue(JSON.stringify(emptyTasks));

      const result = await service.exportTasks();

      expect(result.success).toBe(true);
      expect(result.data?.tasks).toEqual([]);
      expect(result.data?.metadata.taskCount).toBe(0);
    });

    it('should handle large task dataset', async () => {
      localStorageServiceSpy.getItem.and.returnValue(JSON.stringify(largeTaskDataset));

      const result = await service.exportTasks();

      expect(result.success).toBe(true);
      expect(result.data?.tasks).toHaveLength(1000);
      expect(result.data?.metadata.taskCount).toBe(1000);
    });

    it('should handle special characters in task data', async () => {
      const tasksWithSpecialChars: Task[] = [
        {
          id: '1',
          title: 'Task with <script>alert("XSS")</script>',
          description: 'Description with "quotes", \'apostrophes\', &ampersands, <tags>, {braces}',
          priority: 'high',
          status: 'TODO',
          project: 'Work',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          title: 'Task with emojis 🎉🚀✨',
          description: 'Description with unicode: 中文, 日本語, العربية',
          priority: 'medium',
          status: 'IN_PROGRESS',
          project: 'Personal',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      localStorageServiceSpy.getItem.and.returnValue(JSON.stringify(tasksWithSpecialChars));

      const result = await service.exportTasks();

      expect(result.success).toBe(true);
      expect(result.data?.tasks).toHaveLength(2);
      expect(result.data?.jsonString).toContain('&lt;script&gt;'); // Escaped HTML
      expect(result.data?.jsonString).toContain('🎉'); // Emoji preserved
    });

    it('should handle missing optional description field', async () => {
      const tasksWithoutDescription: Task[] = [
        {
          id: '1',
          title: 'Task without description',
          priority: 'low',
          status: 'TODO',
          project: 'General',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      localStorageServiceSpy.getItem.and.returnValue(JSON.stringify(tasksWithoutDescription));

      const result = await service.exportTasks();

      expect(result.success).toBe(true);
      expect(result.data?.tasks[0].description).toBeUndefined();
    });

    it('should handle tasks with very long titles', async () => {
      const longTitle = 'A'.repeat(100);
      const tasksWithLongTitle: Task[] = [
        {
          id: '1',
          title: longTitle,
          priority: 'medium',
          status: 'TODO',
          project: 'Work',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      localStorageServiceSpy.getItem.and.returnValue(JSON.stringify(tasksWithLongTitle));

      const result = await service.exportTasks();

      expect(result.success).toBe(true);
      expect(result.data?.tasks[0].title).toHaveLength(100);
    });

    it('should handle dates in different timezones', async () => {
      const tasksWithTimezones: Task[] = [
        {
          id: '1',
          title: 'Task with specific timezone',
          priority: 'high',
          status: 'TODO',
          project: 'Work',
          createdAt: new Date('2024-01-15T10:30:00.000Z'),
          updatedAt: new Date('2024-01-15T10:30:00.000Z'),
        },
      ];
      localStorageServiceSpy.getItem.and.returnValue(JSON.stringify(tasksWithTimezones));

      const result = await service.exportTasks();

      expect(result.success).toBe(true);
      // Ensure dates are serialized as ISO strings
      expect(result.data?.jsonString).toContain('2024-01-15T10:30:00.000Z');
    });

    it('should handle tasks from all project types', async () => {
      const tasksAllProjects: Task[] = [
        {
          id: '1',
          title: 'Personal Task',
          priority: 'low',
          status: 'TODO',
          project: 'Personal',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          title: 'Work Task',
          priority: 'medium',
          status: 'IN_PROGRESS',
          project: 'Work',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '3',
          title: 'Study Task',
          priority: 'high',
          status: 'DONE',
          project: 'Study',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '4',
          title: 'General Task',
          priority: 'low',
          status: 'TODO',
          project: 'General',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      localStorageServiceSpy.getItem.and.returnValue(JSON.stringify(tasksAllProjects));

      const result = await service.exportTasks();

      expect(result.success).toBe(true);
      expect(result.data?.metadata.projectBreakdown.Personal).toBe(1);
      expect(result.data?.metadata.projectBreakdown.Work).toBe(1);
      expect(result.data?.metadata.projectBreakdown.Study).toBe(1);
      expect(result.data?.metadata.projectBreakdown.General).toBe(1);
    });

    it('should handle tasks with all priority levels', async () => {
      const tasksAllPriorities: Task[] = [
        {
          id: '1',
          title: 'Low Priority',
          priority: 'low',
          status: 'TODO',
          project: 'General',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          title: 'Medium Priority',
          priority: 'medium',
          status: 'TODO',
          project: 'General',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '3',
          title: 'High Priority',
          priority: 'high',
          status: 'TODO',
          project: 'General',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      localStorageServiceSpy.getItem.and.returnValue(JSON.stringify(tasksAllPriorities));

      const result = await service.exportTasks();

      expect(result.success).toBe(true);
      expect(result.data?.metadata.priorityBreakdown.low).toBe(1);
      expect(result.data?.metadata.priorityBreakdown.medium).toBe(1);
      expect(result.data?.metadata.priorityBreakdown.high).toBe(1);
    });
  });

  describe('Export Tasks - Error Scenarios', () => {
    it('should handle localStorage disabled error', async () => {
      localStorageServiceSpy.getItem.and.throwError(
        new DOMException('Storage is disabled', 'SecurityError')
      );

      const result = await service.exportTasks();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('disabled');
    });

    it('should handle quota exceeded error', async () => {
      localStorageServiceSpy.getItem.and.throwError(
        new DOMException('Quota exceeded', 'QuotaExceededError')
      );

      const result = await service.exportTasks();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.name).toBe('QuotaExceededError');
    });

    it('should handle JSON parsing error', async () => {
      localStorageServiceSpy.getItem.and.returnValue('invalid json{{{');

      const result = await service.exportTasks();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('parse');
    });

    it('should handle null task data', async () => {
      localStorageServiceSpy.getItem.and.returnValue(null);

      const result = await service.exportTasks();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle corrupted task data', async () => {
      localStorageServiceSpy.getItem.and.returnValue('{"incomplete": "data"');

      const result = await service.exportTasks();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle empty string task data', async () => {
      localStorageServiceSpy.getItem.and.returnValue('');

      const result = await service.exportTasks();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle undefined task data', async () => {
      localStorageServiceSpy.getItem.and.returnValue(undefined);

      const result = await service.exportTasks();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle invalid task structure', async () => {
      localStorageServiceSpy.getItem.and.returnValue(JSON.stringify([{ invalid: 'task' }]));

      const result = await service.exportTasks();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle missing required fields in task', async () => {
      const invalidTasks = [
        {
          id: '1',
          // Missing required fields
        },
      ];
      localStorageServiceSpy.getItem.and.returnValue(JSON.stringify(invalidTasks));

      const result = await service.exportTasks();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle storage access denied error', async () => {
      localStorageServiceSpy.getItem.and.throwError(
        new DOMException('Access denied', 'SecurityError')
      );

      const result = await service.exportTasks();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.name).toBe('SecurityError');
    });
  });

  describe('Filename Generation', () => {
    it('should generate correct filename for current date', () => {
      vi.spyOn(Date.prototype, 'toISOString').mockReturnValue('2024-12-25T12:00:00.000Z');

      const filename = service['generateFilename']();

      expect(filename).toBe('taskflow_backup_2024-12-25.json');
    });

    it('should handle leap year dates', () => {
      vi.spyOn(Date.prototype, 'toISOString').mockReturnValue('2024-02-29T00:00:00.000Z');

      const filename = service['generateFilename']();

      expect(filename).toBe('taskflow_backup_2024-02-29.json');
    });

    it('should handle end of month dates', () => {
      vi.spyOn(Date.prototype, 'toISOString').mockReturnValue('2024-01-31T23:59:59.999Z');

      const filename = service['generateFilename']();

      expect(filename).toBe('taskflow_backup_2024-01-31.json');
    });

    it('should handle single-digit months and days', () => {
      vi.spyOn(Date.prototype, 'toISOString').mockReturnValue('2024-01-05T00:00:00.000Z');

      const filename = service['generateFilename']();

      expect(filename).toBe('taskflow_backup_2024-01-05.json');
    });

    it('should not include time component in filename', () => {
      vi.spyOn(Date.prototype, 'toISOString').mockReturnValue('2024-06-15T14:30:45.123Z');

      const filename = service['generateFilename']();

      expect(filename).not.toContain('14:30');
      expect(filename).not.toContain('T');
      expect(filename).toBe('taskflow_backup_2024-06-15.json');
    });
  });

  describe('Metadata Generation', () => {
    it('should generate metadata with correct structure', async () => {
      localStorageServiceSpy.getItem.and.returnValue(JSON.stringify(mockTasks));

      const result = await service.exportTasks();

      expect(result.data?.metadata).toMatchObject({
        version: expect.any(String),
        exportedAt: expect.any(Number),
        taskCount: 2,
        projectBreakdown: expect.any(Object),
        statusBreakdown: expect.any(Object),
        priorityBreakdown: expect.any(Object),
      });
    });

    it('should calculate correct project breakdown', async () => {
      localStorageServiceSpy.getItem.and.returnValue(JSON.stringify(mockTasks));

      const result = await service.exportTasks();

      expect(result.data?.metadata.projectBreakdown).toEqual({
        Work: 1,
        Personal: 1,
      });
    });

    it('should calculate correct status breakdown', async () => {
      localStorageServiceSpy.getItem.and.returnValue(JSON.stringify(mockTasks));

      const result = await service.exportTasks();

      expect(result.data?.metadata.statusBreakdown).toEqual({
        TODO: 1,
        IN_PROGRESS: 1,
      });
    });

    it('should calculate correct priority breakdown', async () => {
      localStorageServiceSpy.getItem.and.returnValue(JSON.stringify(mockTasks));

      const result = await service.exportTasks();

      expect(result.data?.metadata.priorityBreakdown).toEqual({
        high: 1,
        medium: 1,
      });
    });

    it('should include data size in metadata', async () => {
      localStorageServiceSpy.getItem.and.returnValue(JSON.stringify(mockTasks));

      const result = await service.exportTasks();

      expect(result.data?.metadata.dataSize).toBeGreaterThan(0);
      expect(result.data?.metadata.dataSize).toBeDefined();
    });
  });

  describe('Data Validation', () => {
    it('should validate required task fields', async () => {
      const taskWithAllFields: Task = {
        id: 'test-id',
        title: 'Test Title',
        description: 'Test Description',
        priority: 'high',
        status: 'TODO',
        project: 'Work',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      localStorageServiceSpy.getItem.and.returnValue(JSON.stringify([taskWithAllFields]));

      const result = await service.exportTasks();

      expect(result.success).toBe(true);
      expect(result.data?.tasks[0]).toMatchObject({
        id: 'test-id',
        title: 'Test Title',
        description: 'Test Description',
        priority: 'high',
        status: 'TODO',
        project: 'Work',
      });
    });

    it('should ensure dates are serialized correctly', async () => {
      const taskWithDates: Task = {
        id: '1',
        title: 'Task with dates',
        priority: 'low',
        status: 'TODO',
        project: 'General',
        createdAt: new Date('2024-01-15T10:30:00.000Z'),
        updatedAt: new Date('2024-01-20T15:45:00.000Z'),
      };

      localStorageServiceSpy.getItem.and.returnValue(JSON.stringify([taskWithDates]));

      const result = await service.exportTasks();
      const parsed = JSON.parse(result.data!.jsonString);

      expect(parsed.tasks[0].createdAt).toBe('2024-01-15T10:30:00.000Z');
      expect(parsed.tasks[0].updatedAt).toBe('2024-01-20T15:45:00.000Z');
    });

    it('should handle cyclic reference prevention', async () => {
      const task: Task = {
        id: '1',
        title: 'Cyclic test',
        priority: 'low',
        status: 'TODO',
        project: 'General',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Create cyclic reference (though Task type prevents this, test service handles it)
      (task as any).self = task;

      localStorageServiceSpy.getItem.and.returnValue(JSON.stringify([task]));

      // Service should handle this gracefully
      const result = await service.exportTasks();

      expect(result.success).toBe(true);
    });
  });
});
