# US-010: Export Tasks - TDD Test Suite

## Overview
This document describes the comprehensive TDD test suite for the Task Export functionality (US-010). The tests follow the RED-GREEN-REFACTOR cycle and provide clear guidance for implementation.

## Test Files Created

### 1. Service Unit Tests
**File:** `src/app/shared/services/task-export.service.spec.ts`

**Purpose:** Test the core export business logic in isolation.

**Test Categories:**
- Service Initialization
- Export Tasks - Happy Path (8 tests)
- Export Tasks - Edge Cases (9 tests)
- Export Tasks - Error Scenarios (9 tests)
- Filename Generation (5 tests)
- Metadata Generation (5 tests)
- Data Validation (3 tests)

**Total Tests:** 39

### 2. Component Unit Tests
**File:** `src/app/components/task-export/task-export.component.spec.ts`

**Purpose:** Test the UI component behavior and user interactions.

**Test Categories:**
- Component Initialization (6 tests)
- Export Button Interaction (6 tests)
- Successful Export (4 tests)
- Failed Export (4 tests)
- File Download (4 tests)
- Accessibility (6 tests)
- Edge Cases (5 tests)
- Computed Properties (3 tests)
- Cleanup (2 tests)

**Total Tests:** 40

### 3. Integration Tests
**File:** `src/app/components/task-export/task-export.integration.spec.ts`

**Purpose:** Test complete flow from component to service to localStorage.

**Test Categories:**
- Complete Export Flow (4 tests)
- Integration with LocalStorage (4 tests)
- Filename Generation Integration (2 tests)
- Data Integrity (4 tests)
- Error Recovery (2 tests)
- Performance (2 tests)
- Accessibility Integration (2 tests)

**Total Tests:** 20

**Grand Total:** 99 comprehensive tests

## Implementation Roadmap

### Phase 1: Service Implementation (GREEN Phase)

#### Step 1: Create Service Interface and Types

```typescript
// src/app/shared/services/task-export.service.ts
import { Injectable, inject } from '@angular/core';
import { Task } from '../models/task.model';

export interface TaskExportMetadata {
  version: string;
  exportedAt: number;
  taskCount: number;
  projectBreakdown: Record<string, number>;
  statusBreakdown: Record<string, number>;
  priorityBreakdown: Record<string, number>;
  dataSize: number;
}

export interface TaskExportData {
  tasks: Task[];
  metadata: TaskExportMetadata;
  filename: string;
  jsonString: string;
}

export interface TaskExportResult {
  success: boolean;
  data?: TaskExportData;
  error?: {
    name: string;
    message: string;
    isQuotaExceeded?: boolean;
    isSecurityError?: boolean;
  };
}
```

#### Step 2: Implement Core Service

```typescript
@Injectable({
  providedIn: 'root',
})
export class TaskExportService {
  private readonly localStorageService = inject(LocalStorageService);
  private readonly STORAGE_KEY = 'taskgo_tasks';
  private readonly FILENAME_PREFIX = 'taskflow_backup_';
  private readonly FILE_EXTENSION = '.json';
  private readonly VERSION = '1.0.0';

  async exportTasks(): Promise<TaskExportResult> {
    try {
      // 1. Retrieve tasks from localStorage
      const tasksJson = this.localStorageService.getItem(this.STORAGE_KEY);

      if (!tasksJson) {
        return {
          success: false,
          error: {
            name: 'NoDataError',
            message: 'No tasks found to export',
          },
        };
      }

      // 2. Parse and validate tasks
      const tasks: Task[] = JSON.parse(tasksJson);
      this.validateTasks(tasks);

      // 3. Generate metadata
      const metadata = this.generateMetadata(tasks);

      // 4. Create export data
      const filename = this.generateFilename();
      const jsonString = this.generateJsonString(tasks, metadata);

      return {
        success: true,
        data: {
          tasks,
          metadata,
          filename,
          jsonString,
        },
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  private validateTasks(tasks: unknown[]): void {
    if (!Array.isArray(tasks)) {
      throw new Error('Tasks data is not an array');
    }

    for (const task of tasks) {
      if (!this.isValidTask(task)) {
        throw new Error('Invalid task structure detected');
      }
    }
  }

  private isValidTask(task: any): task is Task {
    return (
      task &&
      typeof task.id === 'string' &&
      typeof task.title === 'string' &&
      typeof task.priority === 'string' &&
      typeof task.status === 'string' &&
      typeof task.project === 'string' &&
      task.createdAt &&
      task.updatedAt
    );
  }

  private generateMetadata(tasks: Task[]): TaskExportMetadata {
    const projectBreakdown: Record<string, number> = {};
    const statusBreakdown: Record<string, number> = {};
    const priorityBreakdown: Record<string, number> = {};

    tasks.forEach((task) => {
      projectBreakdown[task.project] = (projectBreakdown[task.project] || 0) + 1;
      statusBreakdown[task.status] = (statusBreakdown[task.status] || 0) + 1;
      priorityBreakdown[task.priority] = (priorityBreakdown[task.priority] || 0) + 1;
    });

    return {
      version: this.VERSION,
      exportedAt: Date.now(),
      taskCount: tasks.length,
      projectBreakdown,
      statusBreakdown,
      priorityBreakdown,
      dataSize: 0, // Calculated after JSON string generation
    };
  }

  private generateFilename(): string {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    return `${this.FILENAME_PREFIX}${date}${this.FILE_EXTENSION}`;
  }

  private generateJsonString(tasks: Task[], metadata: TaskExportMetadata): string {
    const exportData = {
      tasks,
      metadata: {
        ...metadata,
        dataSize: 0,
      },
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    metadata.dataSize = new Blob([jsonString]).size;

    return jsonString;
  }

  private handleError(error: unknown): TaskExportResult {
    if (error instanceof DOMException) {
      if (error.name === 'QuotaExceededError') {
        return {
          success: false,
          error: {
            name: 'QuotaExceededError',
            message: 'Storage quota exceeded',
            isQuotaExceeded: true,
          },
        };
      }

      if (error.name === 'SecurityError') {
        return {
          success: false,
          error: {
            name: 'SecurityError',
            message: 'Storage access denied',
            isSecurityError: true,
          },
        };
      }
    }

    if (error instanceof SyntaxError) {
      return {
        success: false,
        error: {
          name: 'ParseError',
          message: 'Failed to parse tasks data',
        },
      };
    }

    return {
      success: false,
      error: {
        name: 'UnknownError',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
    };
  }
}
```

#### Step 3: Implement File Download Helper

```typescript
// Add to TaskExportService
downloadExport(data: TaskExportData): void {
  try {
    // Create blob
    const blob = new Blob([data.jsonString], { type: 'application/json' });

    // Create object URL
    const url = URL.createObjectURL(blob);

    // Create anchor element
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = data.filename;

    // Append to DOM and click
    document.body.appendChild(anchor);
    anchor.click();

    // Cleanup
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to trigger download:', error);
    throw error;
  }
}
```

### Phase 2: Component Implementation (GREEN Phase)

```typescript
// src/app/components/task-export/task-export.component.ts
import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskExportService, TaskExportResult } from '../../shared/services/task-export.service';

@Component({
  selector: 'app-task-export',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './task-export.component.html',
  styleUrl: './task-export.component.scss',
  host: {
    class: 'task-export',
  },
})
export class TaskExportComponent {
  private readonly taskExportService = inject(TaskExportService);

  // Signals for reactive state
  readonly isExporting = signal(false);
  readonly exportResult = signal<TaskExportResult | null>(null);
  readonly errorMessage = signal<string | null>(null);

  // Computed properties
  readonly hasExportResult = computed(() => this.exportResult() !== null);
  readonly hasError = computed(() => this.errorMessage() !== null);
  readonly isLoading = computed(() => this.isExporting());

  /**
   * Handle export button click
   */
  async handleExport(): Promise<void> {
    // Prevent duplicate exports
    if (this.isExporting()) {
      return;
    }

    this.isExporting.set(true);
    this.errorMessage.set(null);
    this.exportResult.set(null);

    try {
      const result = await this.taskExportService.exportTasks();

      if (result.success && result.data) {
        this.exportResult.set(result);
        this.taskExportService.downloadExport(result.data);
      } else {
        this.errorMessage.set(result.error?.message || 'Export failed');
      }
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'An unexpected error occurred'
      );
    } finally {
      this.isExporting.set(false);
    }
  }

  /**
   * Get ARIA live region text for screen readers
   */
  getAnnouncementText(): string {
    if (this.isExporting()) {
      return 'Exporting tasks, please wait.';
    }

    if (this.errorMessage()) {
      return `Export failed: ${this.errorMessage()}`;
    }

    if (this.exportResult()?.success) {
      return `Successfully exported ${this.exportResult()?.data?.metadata.taskCount} tasks.`;
    }

    return '';
  }
}
```

#### Template Implementation

```html
<!-- src/app/components/task-export/task-export.component.html -->
<div class="task-export">
  <!-- ARIA Live Region for Screen Readers -->
  <div
    role="status"
    aria-live="polite"
    aria-atomic="true"
    class="task-export__announcement"
  >
    {{ getAnnouncementText() }}
  </div>

  <!-- Export Button -->
  <button
    class="task-export__button"
    aria-label="Export tasks"
    [attr.aria-busy]="isLoading()"
    [disabled]="isLoading()"
    (click)="handleExport()"
  >
    @if (isLoading()) {
      <span class="task-export__button-text">Exporting...</span>
    } @else {
      <span class="task-export__button-text">Export tasks</span>
    }
  </button>

  <!-- Error Message -->
  @if (hasError()) {
    <div class="task-export__error" role="alert">
      <strong>Export failed:</strong> {{ errorMessage() }}
    </div>
  }

  <!-- Success Message -->
  @if (hasExportResult() && exportResult()?.success) {
    <div class="task-export__success">
      <strong>Export successful!</strong>
      {{ exportResult()?.data?.metadata.taskCount }} tasks exported.
    </div>
  }
</div>
```

#### Styles

```scss
// src/app/components/task-export/task-export.component.scss
.task-export {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: flex-start;

  &__button {
    padding: 0.75rem 1.5rem;
    background-color: #3b82f6;
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s, opacity 0.2s;

    &:hover:not(:disabled) {
      background-color: #2563eb;
    }

    &:focus-visible {
      outline: 2px solid #3b82f6;
      outline-offset: 2px;
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  &__error {
    padding: 1rem;
    background-color: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 0.5rem;
    color: #991b1b;
  }

  &__success {
    padding: 1rem;
    background-color: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 0.5rem;
    color: #166534;
  }

  &__announcement {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
}
```

## Key Implementation Considerations

### 1. Timezone Handling
- Use `toISOString()` for consistent date serialization
- Store dates as ISO 8601 strings in JSON
- Parse back to Date objects when importing

### 2. Error Boundary
- Wrap all localStorage operations in try-catch
- Provide clear error messages to users
- Log errors for debugging
- Allow retry after errors

### 3. Accessibility
- Use ARIA live regions for announcements
- Set `aria-busy` during export
- Ensure keyboard navigation works
- Provide clear focus indicators

### 4. Security
- Sanitize data before export (prevent XSS)
- Validate task structure
- Handle DOM manipulation safely
- Use `URL.createObjectURL` and revoke properly

### 5. Performance
- Process large datasets efficiently
- Use streaming for very large exports (future)
- Cleanup DOM elements and object URLs
- Avoid memory leaks

### 6. Data Integrity
- Validate all task fields
- Preserve date objects correctly
- Handle special characters
- Support unicode characters

## Testing Strategy

### Running Tests

```bash
# Run all unit tests
npm test

# Run specific test file
npm test task-export.service.spec.ts

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

### Test Organization

1. **Unit Tests**: Test individual methods in isolation
2. **Component Tests**: Test UI behavior and user interactions
3. **Integration Tests**: Test complete user flows

### Test Naming Convention

```
describe('Feature', () => {
  describe('Scenario', () => {
    it('should [do something] when [condition]', () => {});
  });
});
```

### Mocking Strategy

- **Services**: Use jasmine.createSpyObj for service mocks
- **DOM**: Use spyOn for document methods
- **LocalStorage**: Mock LocalStorageService.getItem
- **Time**: Use vi.spyOn for Date manipulation

## Next Steps

### Immediate Actions
1. ✅ Create test files (DONE)
2. ⏭️ Run tests to see failures (RED phase)
3. ⏭️ Implement TaskExportService
4. ⏭️ Implement TaskExportComponent
5. ⏭️ Run tests to see successes (GREEN phase)

### Future Enhancements
- Add import functionality
- Support export filtering
- Add export format options (CSV, XML)
- Implement export scheduling
- Add export history
- Support partial exports

## Troubleshooting

### Common Issues

1. **Tests not finding modules**: Ensure service/component files exist
2. **Mock not working**: Check spy setup and callThrough
3. **Async test timing**: Use fixture.whenStable()
4. **Date mocking issues**: Use vi.spyOn(Date.prototype, 'toISOString')
5. **DOM spy failures**: Reset mocks between tests

### Debug Tips

```typescript
// Add console logs for debugging
console.log('Current state:', component.isExporting());

// Check spy calls
expect(localStorageServiceSpy.getItem).toHaveBeenCalledWith('taskgo_tasks');

// Inspect DOM
fixture.detectChanges();
const button = fixture.debugElement.query(By.css('button'));
```

## References

- [Angular Testing Guide](https://angular.dev/guide/testing)
- [Vitest Documentation](https://vitest.dev/)
- [Jasmine Documentation](https://jasmine.github.io/)
- [Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
