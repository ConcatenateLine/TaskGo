import { Component, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StorageHealthService } from '../../services/storage-health.service';

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
}
