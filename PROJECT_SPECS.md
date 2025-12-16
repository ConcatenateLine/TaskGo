# TaskGo - Project Specifications

## Project Description
TaskGo is a personal task manager that allows organizing work with projects, priorities, and statuses. Everything is stored in localStorage.

## User Stories

### Epic 1: Basic Task Management

#### US-001: View task list
As a user, I want to see a list of tasks to know my pending work

**Acceptance Criteria:**
- Show empty list with "No tasks" message initially
- Each task displays: title, priority (color badge), status
- Tasks sorted by creation date (newest first)
**Technical Notes:** Use mocked data initially

#### US-002: Create new task
As a user, I want to create a new task to add pending work

**Acceptance Criteria:**
- Form with fields: title (required, 3-100 chars), description (optional), priority (select: low/medium/high)
- "Create" button disabled if title invalid
- Task appears immediately in list after creation
- Clear form after successful creation
**Validations:** Title between 3-100 characters

#### US-003: Edit existing task
As a user, I want to edit an existing task to correct information

**Acceptance Criteria:**
-"Edit" button opens form with current data
-Same validations as create
-"Save" button updates task
-"Cancel" button closes without saving
**Notes:** Inline editing in the list

#### US-004: Delete existing task
As a user, I want to delete a task to remove completed work

**Acceptance Criteria:**
-"Delete" button on each task
-Confirmation: "Are you sure?"
-Task is removed immediately
-UX: Confirmation modal
**Epic 2:** States and Workflow

#### US-005: Change task status
As a user, I want to change task status for progress tracking

**Acceptance Criteria:**
-States: TODO → IN_PROGRESS → DONE
-Button/Select to change state
-Visual differentiated by state
-Task counter per state
**Rules:** Only next or previous state

#### US-006: Filter tasks
As a user, I want to filter tasks by state for specific focus

-Acceptance Criteria:
-Tabs: "All", "To Do", "In Progress", "Completed"
-Immediate filter
-Keep filter when create/edit
-Show count in each tab
**Default:** "All" on load
**Epic 3:** Projects

#### US-007: Organize tasks by project 
As a user, I want to organize tasks in projects for better organization

-Acceptance Criteria:
-Project field when create/edit
-Projects: "Personal", "Work", "Study", "General"
-Distinctive color per project
**Visual:** Badge with color

#### US-008: Filter tasks by project
As a user, I want to filter tasks by project

**Acceptance Criteria:**
-Dropdown with projects
-"All projects" option
-Combine with state filter
**UX:** Cumulative filters
**Epic 4:** Persistence

#### US-009: Save tasks
As a user, I want my tasks to save automatically

**Acceptance Criteria:**
-Save to localStorage after each operation
-Load tasks on start
-"Saved" message (2 seconds)
**Key:** taskgo_tasks

#### US-010: Export tasks
As a user, I want to export my tasks for backup

**Acceptance Criteria:**
-"Export" button downloads JSON
-Name: taskflow_backup_YYYY-MM-DD.json
-Include metadata
**Format:** Indented JSON

## Data Structure
Interface Task {
  id: string;        // UUID
  title: string;     // 3-100 chars
  description?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  project: 'Personal' | 'Work' | 'Study' | 'General';
  createdAt: Date;
  updatedAt: Date;
}

## Business Rules
- Status transitions: TODO → IN_PROGRESS → DONE (and back)
- Default project is "General"
- Priority colors: low=green, medium=yellow, high=red
- All data persisted to localStorage key: taskgo_tasks
