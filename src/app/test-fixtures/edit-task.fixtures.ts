import { Task, TaskPriority, TaskProject } from '../shared/models/task.model';

/**
 * Test fixtures for US-003: Edit Task functionality
 * Provides mock data and helper functions for comprehensive testing
 */

export const mockTasks: Task[] = [
  {
    id: 'task-001',
    title: 'Complete project documentation',
    description: 'Write comprehensive documentation for the new feature including API references and user guides',
    priority: 'high',
    status: 'TODO',
    project: 'Work',
    createdAt: new Date('2024-01-15T10:30:00'),
    updatedAt: new Date('2024-01-15T10:30:00')
  },
  {
    id: 'task-002',
    title: 'Review pull requests',
    description: 'Review and approve pending pull requests from the team',
    priority: 'medium',
    status: 'IN_PROGRESS',
    project: 'Work',
    createdAt: new Date('2024-01-14T14:20:00'),
    updatedAt: new Date('2024-01-16T09:15:00')
  },
  {
    id: 'task-003',
    title: 'Buy groceries',
    priority: 'low',
    status: 'TODO',
    project: 'Personal',
    createdAt: new Date('2024-01-13T18:45:00'),
    updatedAt: new Date('2024-01-13T18:45:00')
  },
  {
    id: 'task-004',
    title: 'Study Angular signals',
    description: 'Learn the new signals API for reactive state management in Angular',
    priority: 'medium',
    status: 'DONE',
    project: 'Study',
    createdAt: new Date('2024-01-12T20:00:00'),
    updatedAt: new Date('2024-01-17T16:30:00')
  }
];

export const taskForEdit: Task = {
  id: 'edit-task-001',
  title: 'Task to be Edited',
  description: 'This task will be used for testing edit functionality',
  priority: 'medium',
  status: 'TODO',
  project: 'General',
  createdAt: new Date('2024-01-15T12:00:00'),
  updatedAt: new Date('2024-01-15T12:00:00')
};

export const updatedTaskData = {
  title: 'Edited Task Title',
  description: 'This task has been updated through the edit form',
  priority: 'high' as TaskPriority,
  project: 'Work' as TaskProject
};

export const expectedUpdatedTask: Task = {
  ...taskForEdit,
  ...updatedTaskData,
  updatedAt: new Date('2024-01-20T15:30:00')
};

/**
 * Malicious input fixtures for security testing
 */
export const maliciousTaskInputs = {
  xssInTitle: '<script>alert("XSS in title")</script>Malicious Task',
  xssInDescription: '<img src="x" onerror="alert(\'XSS in description\')">Malicious Description',
  javascriptProtocol: 'javascript:alert("JS Protocol")',
  longTitle: 'a'.repeat(150), // Exceeds max length
  shortTitle: 'ab', // Below min length
  controlCharacters: 'Task\u0000with\u0001control\u0002characters',
  sqlInjection: "'; DROP TABLE tasks; --",
  cssInjection: '<style>body{display:none}</style>',
  iframeInjection: '<iframe src="javascript:alert(\'XSS\')"></iframe>',
  dataUrlInjection: '<img src="data:text/html,<script>alert(\'XSS\')</script>">'
};

/**
 * Valid input fixtures for positive testing
 */
export const validTaskInputs = {
  minimalTitle: 'Task', // Exactly 3 chars
  maximalTitle: 'a'.repeat(100), // Exactly 100 chars
  normalTitle: 'Normal Task Title',
  emptyDescription: '',
  longDescription: 'a'.repeat(500), // Exactly 500 chars
  unicodeContent: 'Task with unicode: 🚀 📚 ✨',
  specialChars: 'Task with special chars: @#$%^&*()_+-=[]{}|;:,.<>?',
  multilineDescription: 'Line 1\nLine 2\nLine 3'
};

/**
 * Validation error messages
 */
export const validationErrors = {
  titleRequired: 'Title is required',
  titleTooShort: 'Title must be at least 3 characters',
  titleTooLong: 'Title must be no more than 100 characters',
  titleShort: 'ab', // Below min length
  titleLong: 'a'.repeat(150), // Exceeds max length
  titleInvalid: 'Invalid title format',
  descriptionInvalid: 'Invalid description format',
  htmlNotAllowed: 'HTML content not allowed',
  externalResourcesNotAllowed: 'External resources not allowed',
  dataUrlsNotAllowed: 'Data URLs not allowed',
  securityThreat: 'Invalid input: potentially dangerous content detected',
  rateLimitExceeded: 'Rate limit exceeded. Please try again later.',
  notAuthenticated: 'Authentication required'
};

/**
 * Service response fixtures
 */
export const serviceResponses = {
  successfulUpdate: expectedUpdatedTask,
  failedUpdate: null,
  rateLimitResponse: { allowed: false, retryAfter: 60 },
  securityValidationFailure: { valid: false, threats: ['XSS detected', 'SQL injection detected'] },
  validationServiceFailure: { isValid: false, error: 'Invalid input detected' },
  validationServiceSuccess: { isValid: true, sanitized: 'Sanitized content' }
};

/**
 * Form state fixtures
 */
export const formStates = {
  pristine: { dirty: false, touched: false, valid: false },
  dirtyValid: { dirty: true, touched: true, valid: true },
  dirtyInvalid: { dirty: true, touched: true, valid: false },
  submitting: true,
  notSubmitting: false
};

/**
 * Component state fixtures
 */
export const componentStates = {
  editMode: true,
  viewMode: false,
  loading: true,
  error: 'Error occurred during update',
  noError: null
};

/**
 * Helper functions for test data manipulation
 */
export const createTask = (overrides: Partial<Task> = {}): Task => {
  const baseTask: Task = {
    id: `task-${Math.random().toString(36).substring(2, 11)}`,
    title: 'Default Task Title',
    description: 'Default task description',
    priority: 'medium',
    status: 'TODO',
    project: 'General',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  return { ...baseTask, ...overrides };
};

export const createUpdatedTask = (originalTask: Task, updates: Partial<Task>): Task => {
  return {
    ...originalTask,
    ...updates,
    updatedAt: new Date()
  };
};

export const simulateMaliciousInput = (type: keyof typeof maliciousTaskInputs): string => {
  return maliciousTaskInputs[type];
};

export const simulateValidInput = (type: keyof typeof validTaskInputs): string => {
  return validTaskInputs[type];
};

/**
 * Mock data generators for different scenarios
 */
export const generateTasksForEditTesting = (count: number = 5): Task[] => {
  return Array.from({ length: count }, (_, index) => 
    createTask({
      id: `edit-test-task-${index + 1}`,
      title: `Edit Test Task ${index + 1}`,
      description: `Description for edit test task ${index + 1}`,
      priority: ['low', 'medium', 'high'][index % 3] as TaskPriority,
      status: ['TODO', 'IN_PROGRESS', 'DONE'][index % 3] as Task['status'],
      project: ['Personal', 'Work', 'Study', 'General'][index % 4] as TaskProject,
      createdAt: new Date(Date.now() - (index * 24 * 60 * 60 * 1000)), // Each task 1 day apart
      updatedAt: new Date(Date.now() - (index * 24 * 60 * 60 * 1000))
    })
  );
};

/**
 * Test scenarios for comprehensive coverage
 */
export const editTestScenarios = [
  {
    name: 'Valid Edit',
    description: 'Edit task with valid data',
    input: validTaskInputs.normalTitle,
    expected: 'success'
  },
  {
    name: 'Invalid Title - Too Short',
    description: 'Attempt to edit with title shorter than 3 characters',
    input: validationErrors.titleShort,
    expected: 'validation-error'
  },
  {
    name: 'Invalid Title - Too Long',
    description: 'Attempt to edit with title longer than 100 characters',
    input: validationErrors.titleLong,
    expected: 'validation-error'
  },
  {
    name: 'XSS Attempt in Title',
    description: 'Attempt to inject script in task title',
    input: maliciousTaskInputs.xssInTitle,
    expected: 'security-error'
  },
  {
    name: 'XSS Attempt in Description',
    description: 'Attempt to inject script in task description',
    input: maliciousTaskInputs.xssInDescription,
    expected: 'security-error'
  }
];

/**
 * Accessibility test fixtures
 */
export const accessibilityFixtures = {
  ariaLabels: {
    editButton: 'Edit task: {title}',
    saveButton: 'Save task changes',
    cancelButton: 'Cancel editing',
    titleField: 'Task title',
    descriptionField: 'Task description',
    priorityField: 'Select task priority',
    projectField: 'Select project'
  },
  liveRegionMessages: {
    saving: 'Saving task...',
    saved: 'Task saved successfully',
    error: 'Error: {error}',
    formValid: 'Form is valid. You can save task.'
  }
};