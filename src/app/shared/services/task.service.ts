import { Injectable, signal } from '@angular/core';
import { Task, TaskStatus, TaskProject } from '../models/task.model';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private tasks = signal<Task[]>([]);

  /**
   * Get all tasks
   */
  getTasks(): Task[] {
    return this.tasks();
  }

  /**
   * Get tasks sorted by creation date (newest first)
   */
  getTasksSorted(): Task[] {
    return [...this.tasks()].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Get tasks filtered by status
   */
  getTasksByStatus(status: TaskStatus): Task[] {
    return this.tasks().filter(task => task.status === status);
  }

  /**
   * Get tasks filtered by project
   */
  getTasksByProject(project: TaskProject): Task[] {
    return this.tasks().filter(task => task.project === project);
  }

  /**
   * Get tasks filtered by status and project
   */
  getTasksByStatusAndProject(status: TaskStatus | 'all', project: TaskProject | 'all'): Task[] {
    return this.tasks().filter(task => {
      const statusMatch = status === 'all' || task.status === status;
      const projectMatch = project === 'all' || task.project === project;
      return statusMatch && projectMatch;
    });
  }

  /**
   * Get task counts by status
   */
  getTaskCounts(): { todo: number; inProgress: number; done: number; total: number } {
    const tasks = this.tasks();
    return {
      todo: tasks.filter(t => t.status === 'TODO').length,
      inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
      done: tasks.filter(t => t.status === 'DONE').length,
      total: tasks.length
    };
  }

  /**
   * Create a new task
   */
  createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Task {
    const newTask: Task = {
      ...task,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.tasks.update(tasks => [...tasks, newTask]);
    return newTask;
  }

  /**
   * Update an existing task
   */
  updateTask(id: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>): Task | null {
    const tasks = this.tasks();
    const taskIndex = tasks.findIndex(task => task.id === id);
    
    if (taskIndex === -1) {
      return null;
    }

    const updatedTask: Task = {
      ...tasks[taskIndex],
      ...updates,
      updatedAt: new Date()
    };

    this.tasks.update(currentTasks => 
      currentTasks.map(task => task.id === id ? updatedTask : task)
    );

    return updatedTask;
  }

  /**
   * Delete a task
   */
  deleteTask(id: string): boolean {
    const tasks = this.tasks();
    const taskIndex = tasks.findIndex(task => task.id === id);
    
    if (taskIndex === -1) {
      return false;
    }

    this.tasks.update(currentTasks => currentTasks.filter(task => task.id !== id));
    return true;
  }

  /**
   * Initialize with mock data for development
   */
  initializeMockData(): void {
    const mockTasks: Task[] = [
      {
        id: '1',
        title: 'Review project requirements',
        description: 'Go through the project specifications and create a task breakdown',
        priority: 'high',
        status: 'TODO',
        project: 'Work',
        createdAt: new Date('2024-01-15T10:00:00'),
        updatedAt: new Date('2024-01-15T10:00:00')
      },
      {
        id: '2',
        title: 'Setup development environment',
        description: 'Install Angular CLI and configure the workspace',
        priority: 'medium',
        status: 'DONE',
        project: 'Work',
        createdAt: new Date('2024-01-14T09:00:00'),
        updatedAt: new Date('2024-01-16T14:30:00')
      },
      {
        id: '3',
        title: 'Learn Angular signals',
        description: 'Study the new signals API for reactive state management',
        priority: 'low',
        status: 'IN_PROGRESS',
        project: 'Study',
        createdAt: new Date('2024-01-13T16:00:00'),
        updatedAt: new Date('2024-01-17T11:00:00')
      },
      {
        id: '4',
        title: 'Grocery shopping',
        description: 'Buy groceries for the week',
        priority: 'medium',
        status: 'TODO',
        project: 'Personal',
        createdAt: new Date('2024-01-12T20:00:00'),
        updatedAt: new Date('2024-01-12T20:00:00')
      }
    ];

    this.tasks.set(mockTasks);
  }

  /**
   * Clear all tasks
   */
  clearTasks(): void {
    this.tasks.set([]);
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
  }
}