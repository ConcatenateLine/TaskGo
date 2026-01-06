import { Component, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StorageHealthService } from '../../services/storage-health.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navigation.component.html',
  styleUrl: './navigation.component.scss'
})
export class NavigationComponent implements OnInit {
  protected router = inject(Router);
  private storageHealthService = inject(StorageHealthService);
  private notificationService = inject(NotificationService);

  readonly storageHealth = this.storageHealthService.health;

  ngOnInit(): void {
    // Check storage health on initialization
    this.storageHealthService.checkStorageHealth();
  }

  navigateToStorage(): void {
    this.router.navigate(['/storage']);
  }

  navigateToTasks(): void {
    this.router.navigate(['/']);
  }

  getHealthStatusIcon(): string {
    return this.storageHealthService.getStatusIcon();
  }

  getHealthStatusColor(): string {
    return this.storageHealthService.getStatusColor();
  }

  // Test methods for notifications
  testSuccessNotification(): void {
    this.notificationService.showSuccess('Test success notification!', 'manual');
  }

  testWarningNotification(): void {
    this.notificationService.showWarning('Test warning notification!');
  }

  testInfoNotification(): void {
    this.notificationService.showInfo('Test info notification!');
  }

  testErrorNotification(): void {
    this.notificationService.showError('Test error notification!');
  }

  testAutoSaveSuccess(): void {
    this.notificationService.showSuccess('This should be filtered out', 'auto');
  }
}
