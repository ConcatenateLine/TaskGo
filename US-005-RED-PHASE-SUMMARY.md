# US-005: Change Task Status - RED Phase Summary

## Overview
This document summarizes the RED phase of Test-Driven Development for US-005: Change Task Status functionality.

## User Story
**As a user, I want to change task status for progress tracking**

## Acceptance Criteria
- [ ] States: TODO → IN_PROGRESS → DONE
- [ ] Button/Select to change state
- [ ] Visual differentiated by state
- [ ] Task counter per state
- [ ] Rules: Only next or previous state

## Test Files Created

### 1. Service Layer Tests
**File:** `src/app/shared/services/task.service.status.spec.ts`

**Purpose:** Test the business logic for status changes in the TaskService

**Test Coverage (Expected to FAIL - Implementation Missing):**

#### Status Transition Validation (11 tests)
- ✅ Allow TODO → IN_PROGRESS transition
- ✅ Allow IN_PROGRESS → DONE transition
- ✅ Allow DONE → IN_PROGRESS transition (backwards)
- ✅ Allow IN_PROGRESS → TODO transition (backwards)
- ❌ Reject TODO → DONE transition (skipping IN_PROGRESS)
- ❌ Reject DONE → TODO transition (skipping IN_PROGRESS)
- ✅ Return null for non-existent task
- ❌ Throw error for invalid status
- ✅ Maintain same priority/other fields when changing status
- ✅ Update task counts when status changes

#### getTask Method (2 tests)
- ✅ Return task by ID
- ✅ Return null for non-existent ID

#### getStatusTransitions Method (4 tests)
- ✅ Return valid next status from TODO
- ✅ Return valid transitions from IN_PROGRESS
- ✅ Return valid previous status from DONE
- ✅ Return empty array for invalid status

#### Task Counter Updates (3 tests)
- ✅ Increment IN_PROGRESS when moving TODO → IN_PROGRESS
- ✅ Increment DONE when moving IN_PROGRESS → DONE
- ✅ Maintain total count across changes

#### Security & Rate Limiting (5 tests)
- ✅ Check rate limit before changing status
- ❌ Throw error when rate limit exceeded
- ✅ Require authentication
- ✅ Log security events
- ❌ Validate status input (prevent injection)

#### Edge Cases & Error Handling (5 tests)
- ✅ Handle rapid status changes
- ✅ Preserve task integrity after multiple changes
- ✅ Handle corrupted data (no updatedAt field)
- ✅ Encrypt updated status in storage

#### Concurrent Status Changes (1 test)
- ✅ Handle multiple tasks changing simultaneously

**Total Tests:** 31 tests

**Methods Needed:**
- `changeStatus(taskId: string, newStatus: TaskStatus): Task | null`
- `getTask(id: string): Task | null`
- `getStatusTransitions(currentStatus: TaskStatus): TaskStatus[]`

---

### 2. Component Tests
**File:** `src/app/components/task-status/task-status.component.spec.ts`

**Purpose:** Test the UI component for status change controls

**Test Coverage (Expected to FAIL - Implementation Missing):**

#### Component Inputs & Signals (4 tests)
- ✅ Receive task as input
- ✅ Have current status signal
- ✅ Have available transitions signal
- ✅ Update current status when task input changes

#### Status Display - Visual Differentiation (4 tests)
- ✅ Display TODO with correct visual style
- ✅ Display IN_PROGRESS with correct visual style
- ✅ Display DONE with correct visual style
- ✅ Have different colors for each status

#### Status Change Controls (7 tests)
- ✅ Render status change dropdown/select
- ✅ Display available transitions in dropdown
- ✅ Show only valid transitions in dropdown
- ✅ Emit status change event when selected
- ✅ Call service to change status
- ✅ Disable select when no transitions available

#### Alternative Controls - Next/Previous Buttons (6 tests)
- ✅ Render next status button when available
- ✅ Render previous status button when available
- ✅ Change to next status when button clicked
- ✅ Change to previous status when button clicked
- ✅ Hide next button when at DONE status
- ✅ Hide previous button when at TODO status

#### Task Counters (2 tests)
- ✅ Display task counts for each status
- ✅ Update counts after status change

#### Accessibility (4 tests)
- ✅ Have proper ARIA labels
- ✅ Have proper role attributes
- ✅ Have descriptive labels for buttons
- ✅ Be keyboard navigable

#### Error Handling (2 tests)
- ✅ Display error message when status change fails
- ✅ Clear error message on successful operation

#### Loading States (2 tests)
- ✅ Show loading indicator while changing status
- ✅ Disable controls while loading

#### Security (2 tests)
- ✅ Sanitize status display
- ✅ Prevent XSS through select options

#### Responsive Design (2 tests)
- ✅ Adapt to mobile view
- ✅ Adapt to desktop view

**Total Tests:** 41 tests

**Component Inputs Needed:**
- `task: input<Task>`
- `currentStatus: signal<TaskStatus>`
- `availableTransitions: signal<TaskStatus[]>`

**Component Outputs Needed:**
- `statusChange: output<{taskId: string, newStatus: TaskStatus}>`

**Component Methods Needed:**
- `setLoading(loading: boolean): void`
- `onStatusChange(event: Event): void`
- `onNextStatus(): void`
- `onPreviousStatus(): void`

---

### 3. Integration Tests
**File:** `src/app/features/task-status/task-status.integration.spec.ts`

**Purpose:** Test the complete status change workflow

**Test Coverage (Expected to FAIL - Implementation Missing):**

#### AC1: Status Change UI Components (4 tests)
- ✅ Display status change controls for each task
- ✅ Show current status with visual differentiation
- ✅ Render status change dropdown/select for each task
- ✅ Render next/previous buttons for each task

#### AC2: Valid Status Transitions (4 tests)
- ✅ Allow transition TODO → IN_PROGRESS
- ✅ Allow transition IN_PROGRESS → DONE
- ✅ Allow transition DONE → IN_PROGRESS (backwards)
- ✅ Allow transition IN_PROGRESS → TODO (backwards)

#### AC3: Invalid Status Transitions Prevention (3 tests)
- ✅ Prevent direct TODO → DONE transition
- ✅ Prevent direct DONE → TODO transition
- ✅ Not show invalid transitions in dropdown

#### AC4: Visual Differentiation by State (3 tests)
- ✅ Apply different colors for each status
- ✅ Display different labels for each status
- ✅ Show icons or visual indicators for each status

#### AC5: Task Counters per State (3 tests)
- ✅ Display task counters in UI
- ✅ Update counters when status changes
- ✅ Show total task count

#### End-to-End Status Change Workflow (2 tests)
- ✅ Complete full status cycle TODO → IN_PROGRESS → DONE
- ✅ Complete reverse status cycle DONE → IN_PROGRESS → TODO

#### Multiple Tasks Status Management (2 tests)
- ✅ Allow independent status changes for multiple tasks
- ✅ Update task list after status changes

#### Accessibility & Keyboard Navigation (3 tests)
- ✅ Be fully keyboard navigable
- ✅ Have proper ARIA labels for screen readers
- ✅ Announce status changes to screen readers

#### Security & Error Handling (3 tests)
- ✅ Display error when status change fails
- ✅ Sanitize status values to prevent XSS
- ✅ Log security events when status changes

#### Performance & Optimization (2 tests)
- ✅ Debounce rapid status changes
- ✅ Not re-render entire task list on status change

**Total Tests:** 32 tests

---

## Test Summary

| Layer | File | Total Tests | Status |
|-------|------|-------------|--------|
| Service | `task.service.status.spec.ts` | 31 | ❌ FAIL (Implementation Missing) |
| Component | `task-status.component.spec.ts` | 41 | ❌ FAIL (Implementation Missing) |
| Integration | `task-status.integration.spec.ts` | 32 | ❌ FAIL (Implementation Missing) |
| **TOTAL** | | **104** | **❌ ALL FAILING (RED Phase)** |

## Implementation Required (GREEN Phase)

### Service Layer Methods
```typescript
class TaskService {
  /**
   * Change the status of a task
   * @param taskId - ID of the task to update
   * @param newStatus - New status to set
   * @returns Updated task or null if not found
   * @throws Error if invalid transition
   */
  changeStatus(taskId: string, newStatus: TaskStatus): Task | null;

  /**
   * Get a single task by ID
   * @param id - Task ID
   * @returns Task or null if not found
   */
  getTask(id: string): Task | null;

  /**
   * Get valid status transitions for current status
   * @param currentStatus - Current task status
   * @returns Array of valid next/previous statuses
   */
  getStatusTransitions(currentStatus: TaskStatus): TaskStatus[];
}
```

### Component Structure
```typescript
@Component({
  selector: 'app-task-status',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: '...', // To be implemented
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaskStatusComponent {
  // Inputs
  task = input.required<Task>();
  currentStatus = signal<TaskStatus>(this.task().status);
  availableTransitions = signal<TaskStatus[]>([]);

  // Outputs
  statusChange = output<{taskId: string, newStatus: TaskStatus}>();

  // Methods
  setLoading(loading: boolean): void;
  onStatusChange(event: Event): void;
  onNextStatus(): void;
  onPreviousStatus(): void;
}
```

### Template Structure Needed
```html
<div class="task-status" role="group" aria-label="Task status controls">
  <!-- Status Badge -->
  <span class="task-status__badge" [class]="getStatusBadgeClass()">
    {{ getStatusLabel() }}
  </span>

  <!-- Status Controls -->
  <div class="task-status__controls">
    <button class="task-status__btn--prev" *ngIf="canGoBack()"
            (click)="onPreviousStatus()"
            aria-label="Move to previous status">
      ← Back
    </button>

    <select class="task-status__select"
            (change)="onStatusChange($event)"
            aria-label="Change task status">
      @for (status of availableTransitions(); track status) {
        <option [value]="status">
          {{ getStatusLabel(status) }}
        </option>
      }
    </select>

    <button class="task-status__btn--next" *ngIf="canGoForward()"
            (click)="onNextStatus()"
            aria-label="Move to next status">
      Next →
    </button>
  </div>

  <!-- Task Counters -->
  <div class="task-status__counters">
    <span class="task-status__count--todo">TODO: {{ counts.todo }}</span>
    <span class="task-status__count--in-progress">In Progress: {{ counts.inProgress }}</span>
    <span class="task-status__count--done">Done: {{ counts.done }}</span>
  </div>
</div>
```

## Expected Errors (Valid for RED Phase)

All tests are expected to fail with the following errors:

1. **Service Layer:**
   - `Property 'changeStatus' does not exist on type 'TaskService'`
   - `Property 'getTask' does not exist on type 'TaskService'`
   - `Property 'getStatusTransitions' does not exist on type 'TaskService'`

2. **Component Layer:**
   - `Cannot find module './task-status.component'`
   - Component methods not found

3. **Integration Layer:**
   - `Cannot find module '../../components/task-status/task-status.component'`
   - Integration tests depend on missing component

## Next Steps (GREEN Phase)

1. **Implement Service Layer:**
   - Add `changeStatus` method to TaskService
   - Add `getTask` method to TaskService
   - Add `getStatusTransitions` method to TaskService
   - Implement validation logic for status transitions
   - Add rate limiting checks
   - Add authentication checks
   - Add security event logging

2. **Implement Component:**
   - Create `task-status.component.ts`
   - Create `task-status.component.html`
   - Create `task-status.component.scss`
   - Implement status change controls
   - Add visual differentiation for each status
   - Add task counters
   - Add accessibility features (ARIA labels, keyboard navigation)
   - Add error handling
   - Add loading states

3. **Update Existing Components:**
   - Integrate TaskStatusComponent into TaskListComponent
   - Add status change controls to task cards
   - Update task display to show current status

4. **Run Tests:**
   - All 104 tests should pass (GREEN phase)

## Success Criteria (GREEN Phase)

✅ All 104 tests pass
✅ Service methods correctly implement business logic
✅ Component renders correctly with all controls
✅ Status transitions follow business rules
✅ Visual differentiation is clear for each status
✅ Task counters update correctly
✅ Accessibility standards met (WCAG AA)
✅ Security requirements met (XSS prevention, input validation)
✅ Error handling works correctly
✅ Integration tests pass end-to-end workflows

---

## Notes

- Tests are written following AAA (Arrange-Act-Assert) pattern
- All tests use descriptive names that explain business requirements
- Mocks are used appropriately for isolation
- Edge cases and error scenarios are covered
- Security tests ensure OWASP compliance
- Accessibility tests ensure WCAG AA compliance
- All errors shown are expected in RED phase
