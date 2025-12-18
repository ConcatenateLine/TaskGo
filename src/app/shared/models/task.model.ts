export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  project: 'Personal' | 'Work' | 'Study' | 'General';
  createdAt: Date;
  updatedAt: Date;
}

export type TaskPriority = Task['priority'];
export type TaskStatus = Task['status'];
export type TaskProject = Task['project'];

export const PRIORITY_COLORS = {
  low: '#10b981', // green
  medium: '#eab308', // yellow  
  high: '#ef4444', // red
} as const;

export const TASK_STATUS_ORDER = {
  TODO: 0,
  IN_PROGRESS: 1,
  DONE: 2,
} as const;

export const PROJECT_COLORS = {
  Personal: '#3b82f6', // blue
  Work: '#8b5cf6', // purple
  Study: '#f59e0b', // amber
  General: '#6b7280', // gray
} as const;