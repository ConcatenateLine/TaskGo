import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'storage',
    loadComponent: () => import('./components/storage-management/storage-management.component').then(c => c.StorageManagementComponent)
  },
  {
    path: '',
    loadComponent: () => import('./components/tasks/tasks.component').then(c => c.TasksComponent)
  }
];
