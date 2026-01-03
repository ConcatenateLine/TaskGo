# TDD RED Phase: US-008 - Filter Tasks by Project

## Overview
This document summarizes the failing tests created for US-008 (Filter tasks by project) following TDD RED phase principles.

## User Story Requirements

**US-008: Filter tasks by project**
As a user, I want to filter tasks by project

**Acceptance Criteria:**
- Dropdown with projects
- "All projects" option
- Combine with state filter
- UX: Cumulative filters

## Test Files Created

### 1. Service Unit Tests
**File:** `src/app/shared/services/task.service.project-filter.spec.ts`

**Coverage:**
- Filter tasks by individual projects (Work, Personal, Study, General)
- Filter tasks by status AND project cumulatively
- Handle "all" filters for both status and project
- Edge cases (empty arrays, all tasks same project, mixed distribution)
- Filter persistence through service operations (create, update, delete)
- Security validation (XSS prevention, enum validation)

**Test Count:** 40+ tests

### 2. Component Unit Tests
**File:** `src/app/components/task-project-filter/task-project-filter.component.spec.ts`

**Coverage:**
- Dropdown rendering with all project options
- "All projects" option rendering
- Task count display for each project
- Default filter state ("All projects")
- Filter selection event emission
- Filter state management
- Accessibility (ARIA labels, keyboard navigation)
- Security (XSS prevention, enum validation)
- Performance metrics

**Test Count:** 50+ tests

**Note:** Component file does not exist yet - tests reference non-existent component, which is expected in RED phase.

### 3. Integration Tests
**File:** `src/app/features/task-project-filter/task-project-filter.integration.spec.ts`

**Coverage:**
- Cumulative filter rendering (status + project)
- Cumulative filter behavior (both filters applied simultaneously)
- Maintaining filters when switching between them
- Filter state persistence across task operations
- Filter count updates (create, delete, update tasks)
- Accessibility integration (ARIA attributes maintained)
- Security integration (filter value sanitization)

**Test Count:** 25+ tests

**Note:** Component imports will fail until component is created.

### 4. E2E Tests
**File:** `e2e/task-project-filter.spec.ts`

**Coverage:**
- Project filter dropdown rendering
- All project options availability
- Default selection ("All projects")
- Task count display in dropdown
- Individual project filtering
- Cumulative filtering with status tabs
- Filter persistence across interactions
- Empty state handling
- Keyboard navigation
- Accessibility (ARIA labels)
- Rapid filter changes
- Filter persistence during task creation/editing

**Test Count:** 20+ tests

## Test Organization

### Layer Breakdown
1. **Service Layer:** Pure business logic for filtering
2. **Component Layer:** UI component behavior and rendering
3. **Integration Layer:** Interaction between filters and task list
4. **E2E Layer:** Complete user workflows

### Testing Tools
- **Unit/Integration:** Vitest (via Angular CLI)
- **E2E:** Playwright

## Expected Failures (RED Phase)

### Component Test Failures
```
Cannot find module './task-project-filter.component' or its corresponding type declarations.
```
**Reason:** Component does not exist yet.

### Integration Test Failures
```
Cannot find module '../../components/task-project-filter/task-project-filter.component'
```
**Reason:** Component does not exist yet.

### E2E Test Failures
Once component exists but implementation is missing:
- Selector `.task-project-filter__select` not found
- Options not rendering correctly
- Filter events not firing
- Cumulative filtering not working

## Test Structure

### Service Test Structure
```typescript
describe('TaskService - Project Filter Tests (US-008)', () => {
  describe('Filter by Project', () => {
    // Tests for individual project filtering
  });
  describe('Filter by Status and Project (Cumulative)', () => {
    // Tests for combined status + project filtering
  });
  describe('Project Filter Edge Cases', () => {
    // Edge case handling
  });
  describe('Security: Project Filter Validation', () => {
    // Security tests
  });
});
```

### Component Test Structure
```typescript
describe('TaskProjectFilterComponent - US-008', () => {
  describe('Project Options Rendering', () => {
    // UI rendering tests
  });
  describe('Default Filter State', () => {
    // Default behavior tests
  });
  describe('Filter Selection', () => {
    // User interaction tests
  });
  describe('Accessibility', () => {
    // A11y tests
  });
  describe('Security', () => {
    // Security tests
  });
});
```

### E2E Test Structure
```typescript
test.describe('Project Filter Feature - US-008', () => {
  test('should render project filter dropdown', ...);
  test('should filter tasks cumulatively with status filter', ...);
  test('should maintain filters when creating new task', ...);
  // ... more workflow tests
});
```

## Acceptance Criteria Coverage

| Acceptance Criteria | Test Coverage |
|---------------------|----------------|
| Dropdown with projects | ✅ Component tests, E2E tests |
| "All projects" option | ✅ Component tests, Service tests, E2E tests |
| Combine with state filter | ✅ Integration tests, Service tests, E2E tests |
| Cumulative filters UX | ✅ Integration tests, E2E tests |

## Next Steps (GREEN Phase)

1. **Implement TaskService Methods** (if missing)
   - `getTaskCountsByProject()`
   - Ensure `getTasksByStatusAndProject()` works correctly

2. **Create TaskProjectFilterComponent**
   - Dropdown UI with project options
   - Event emission for filter changes
   - Count display integration
   - ARIA labels and keyboard support

3. **Update TaskListComponent**
   - Accept project filter input
   - Apply cumulative filtering

4. **Update App/Parent Component**
   - Wire up project filter with status filter
   - Pass both filters to task list

5. **Create Component Templates/Styles**
   - HTML template for dropdown
   - SCSS for styling

## Running the Tests

### Unit Tests
```bash
npm test -- src/app/shared/services/task.service.project-filter.spec.ts
npm test -- src/app/components/task-project-filter/task-project-filter.component.spec.ts
```

### Integration Tests
```bash
npm test -- src/app/features/task-project-filter/task-project-filter.integration.spec.ts
```

### E2E Tests
```bash
npm run test:e2e task-project-filter.spec.ts
```

## Notes

- Tests follow existing project patterns (Vitest, Angular CLI)
- Mocking strategy follows established conventions
- Security tests included for OWASP compliance
- Accessibility tests included for WCAG AA compliance
- Tests are designed to fail initially (RED phase)
- All placeholder assertions clearly indicate what needs implementation
