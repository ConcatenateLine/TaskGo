# Test-Driven Development: RED Phase - Task Filtering (US-006)

## User Story: Filter Tasks

**As a user, I want to filter tasks by state for specific focus**

### Acceptance Criteria
- Tabs: "All", "To Do", "In Progress", "Completed"
- Immediate filter
- Keep filter when create/edit
- Show count in each tab
- Default: "All" on load

---

## Test Suite Overview

This test suite implements the **RED phase** of TDD for US-006. All tests are designed to **fail** and provide clear error messages that guide implementation.

### Test Files Generated

#### 1. Component Unit Tests
**File:** `src/app/components/task-filter-tabs/task-filter-tabs.component.spec.ts`

**Purpose:** Test the TaskFilterTabsComponent UI and behavior

**Test Coverage:**
- ✅ Filter tab rendering (4 tabs with correct labels)
- ✅ Task count display in each tab
- ✅ Default filter state ("All" on load)
- ✅ Tab selection and active state management
- ✅ Filter change events
- ✅ ARIA attributes and accessibility
- ✅ Security (XSS prevention, enum validation)
- ✅ Performance (efficient re-renders)

**Key Assertions:**
```typescript
expect(tabs).toHaveLength(4);
expect(component.currentFilter()).toBe('all');
expect(filterChange.emit).toHaveBeenCalledWith('TODO');
```

---

#### 2. Service Unit Tests
**File:** `src/app/shared/services/task.service.filter.spec.ts`

**Purpose:** Test filtering logic in TaskService

**Test Coverage:**
- ✅ Filter tasks by status (TODO, IN_PROGRESS, DONE)
- ✅ Filter tasks by status and project
- ✅ Task count calculations
- ✅ Filter updates on task operations (create, update, delete)
- ✅ Edge cases (empty arrays, same status, mixed distribution)
- ✅ Filter persistence across operations

**Key Assertions:**
```typescript
expect(todoTasks).toHaveLength(2);
expect(todoTasks.every(task => task.status === 'TODO')).toBe(true);
expect(counts).toEqual({ todo: 2, inProgress: 1, done: 3, total: 6 });
```

---

#### 3. Integration Tests
**File:** `src/app/features/task-filter/task-filter.integration.spec.ts`

**Purpose:** Test end-to-end flow of filter functionality

**Test Coverage:**
- ✅ Filter tabs and task list integration
- ✅ Filter persistence during task status changes
- ✅ Task count updates on create/update/delete
- ✅ Data flow between components
- ✅ Default filter state
- ✅ Accessibility integration
- ✅ Security integration

**Key Assertions:**
```typescript
expect(component.lastFilter).toBe('TODO');
expect(component.currentFilter()).toBe('IN_PROGRESS');
expect(newTodoText).not.toBe(initialTodoText);
```

---

#### 4. E2E Tests
**File:** `e2e/task-filter.spec.ts`

**Purpose:** Test real user interactions in browser

**Test Coverage:**
- ✅ Filter tabs rendering
- ✅ Correct task counts display
- ✅ Default "All" filter on load
- ✅ Tab clicking and filter application
- ✅ Filter persistence during status changes
- ✅ Filter persistence during task creation
- ✅ Count updates on task operations
- ✅ Rapid filter switching
- ✅ Zero count handling
- ✅ Keyboard navigation
- ✅ ARIA attributes
- ✅ Screen reader announcements

**Key Assertions:**
```typescript
await expect(tabs).toHaveCount(4);
await expect(tabs.nth(0)).toContainText('6');
await expect(activeTab).toContainText('To Do');
await expect(activeTab).toHaveAttribute('aria-selected', 'true');
```

---

## Test Failure Messages (RED Phase)

All tests are designed to fail with **clear, actionable error messages**:

### Expected Failures

1. **Component Tests - Missing Template**
   ```
   Error: Template does not contain element '.task-filter-tabs__tab'
   ```

2. **Component Tests - Missing CSS Classes**
   ```
   Error: Cannot find element with class 'task-filter-tabs__tab--active'
   ```

3. **Component Tests - Missing Outputs**
   ```
   Error: component.filterChange is undefined
   ```

4. **Integration Tests - Missing Component Integration**
   ```
   Error: TaskFilterTabsComponent or TaskListComponent not rendering properly
   ```

5. **E2E Tests - Missing UI Elements**
   ```
   Error: Timed out waiting for selector '.task-filter-tabs__tab'
   ```

---

## Implementation Guide (GREEN Phase)

### Step 1: Create TaskFilterTabsComponent

```typescript
@Component({
  selector: 'app-task-filter-tabs',
  standalone: true,
  template: `
    <div class="task-filter-tabs" role="tablist">
      @for (filter of filters; track filter) {
        <button
          class="task-filter-tabs__tab"
          [class.task-filter-tabs__tab--active]="currentFilter() === filter.value"
          role="tab"
          [attr.aria-selected]="currentFilter() === filter.value"
          [attr.aria-label]="filter.label + ': ' + getCount(filter.value)"
          (click)="selectFilter(filter.value)"
        >
          {{ filter.label }}
          <span class="task-filter-tabs__count">
            {{ getCount(filter.value) }}
          </span>
        </button>
      }
    </div>
  `
})
export class TaskFilterTabsComponent {
  currentFilter = signal<'all' | 'TODO' | 'IN_PROGRESS' | 'DONE'>('all');
  filterChange = output<'all' | 'TODO' | 'IN_PROGRESS' | 'DONE'>();

  private taskService = inject(TaskService);
  private counts = computed(() => this.taskService.getTaskCounts());

  private filters = [
    { label: 'All', value: 'all' },
    { label: 'To Do', value: 'TODO' },
    { label: 'In Progress', value: 'IN_PROGRESS' },
    { label: 'Completed', value: 'DONE' }
  ];

  getCount(filter: string): number {
    if (filter === 'all') return this.counts().total;
    if (filter === 'TODO') return this.counts().todo;
    if (filter === 'IN_PROGRESS') return this.counts().inProgress;
    if (filter === 'DONE') return this.counts().done;
    return 0;
  }

  selectFilter(filter: 'all' | 'TODO' | 'IN_PROGRESS' | 'DONE'): void {
    this.currentFilter.set(filter);
    this.filterChange.emit(filter);
  }
}
```

### Step 2: Update TaskListComponent

```typescript
// Add to TaskListComponent template
<app-task-filter-tabs
  [currentFilter]="statusFilter()"
  (filterChange)="onFilterChange($event)"
></app-task-filter-tabs>

// Add method
onFilterChange(filter: 'all' | 'TODO' | 'IN_PROGRESS' | 'DONE'): void {
  // Filter is already handled by statusFilter input
  this.forceRefresh();
}
```

### Step 3: Update App Component

```typescript
// Add filter state
protected currentFilter = signal<'all' | 'TODO' | 'IN_PROGRESS' | 'DONE'>('all');

// Update template to pass filter to TaskListComponent
<app-task-list [statusFilter]="currentFilter()"></app-task-list>
```

### Step 4: Add Styling

```scss
.task-filter-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  border-bottom: 2px solid #e5e7eb;

  &__tab {
    padding: 0.75rem 1.5rem;
    background: none;
    border: none;
    border-bottom: 3px solid transparent;
    cursor: pointer;
    font-weight: 500;
    color: #6b7280;
    transition: all 0.2s ease;

    &:hover {
      color: #374151;
      background-color: #f3f4f6;
    }

    &--active {
      color: #2563eb;
      border-bottom-color: #2563eb;
      font-weight: 600;
    }
  }

  &__count {
    background-color: #e5e7eb;
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    margin-left: 0.5rem;
  }
}
```

---

## Test Execution

### Run All Tests
```bash
npm test
```

### Run Specific Test Suite
```bash
# Component tests
npm test -- task-filter-tabs.component.spec.ts

# Service tests
npm test -- task.service.filter.spec.ts

# Integration tests
npm test -- task-filter.integration.spec.ts

# E2E tests
npm run test:e2e -- task-filter.spec.ts
```

### Run Tests in Watch Mode
```bash
npm test -- --watch
```

---

## Success Criteria (GREEN Phase)

### Component Tests Pass
- ✅ All 4 tabs render with correct labels
- ✅ Task counts display correctly
- ✅ Default filter is "All"
- ✅ Tabs are clickable and emit events
- ✅ Active tab styling applies correctly
- ✅ ARIA attributes are present

### Service Tests Pass
- ✅ Filtering by status works correctly
- ✅ Combined status/project filtering works
- ✅ Task counts are accurate
- ✅ Counts update on CRUD operations

### Integration Tests Pass
- ✅ Filter tabs integrate with task list
- ✅ Filter state persists across interactions
- ✅ Counts update dynamically
- ✅ Data flows correctly between components

### E2E Tests Pass
- ✅ User can click tabs and see filtered tasks
- ✅ Filter persists during status changes
- ✅ Counts update in real-time
- ✅ Keyboard navigation works
- ✅ Screen reader announcements occur

---

## Next Steps

1. **Implement GREEN Phase:** Write code to make tests pass
2. **Run Tests Continuously:** Keep tests running while developing
3. **Refactor (Optional):** Improve code quality after GREEN phase
4. **Integration:** Merge feature branch after all tests pass

---

## Notes

- Tests use Vitest for unit/integration tests
- E2E tests use Playwright
- All tests follow Angular best practices
- Security tests cover XSS prevention
- Accessibility tests ensure WCAG AA compliance
- Performance tests verify efficient rendering
