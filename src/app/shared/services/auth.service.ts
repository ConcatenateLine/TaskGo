import { Injectable, signal } from '@angular/core';

export interface User {
  id: string;
  email: string;
  name: string;
  isAuthenticated: boolean;
  sessionToken?: string;
}

export interface SecurityEvent {
  id: string;
  type: 'XSS_ATTEMPT' | 'RATE_LIMIT_EXCEEDED' | 'AUTHENTICATION_FAILURE' | 'VALIDATION_FAILURE' | 'DATA_ACCESS' | 'DATA_RECOVERY';
  message: string;
  timestamp: Date;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  event?: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH';
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUser = signal<User | null>(null);
  private readonly SESSION_KEY = 'taskgo_session';
  private securityEvents = signal<SecurityEvent[]>([]);

  constructor() {
    this.initializeAuth();
  }

  /**
   * Initialize authentication state
   */
  private initializeAuth(): void {
    try {
      const sessionData = localStorage.getItem(this.SESSION_KEY);
      if (sessionData) {
        const user = JSON.parse(sessionData);
        this.currentUser.set(user);
      }
    } catch (error) {
      console.warn('Failed to restore authentication session:', error);
      this.logout();
    }
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.currentUser();
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const user = this.currentUser();
    return user !== null && user.isAuthenticated;
  }

  /**
   * Check if user has permission for operation
   */
  hasPermission(_operation: 'read' | 'write' | 'delete'): boolean {
    return this.isAuthenticated();
  }

  /**
   * Login user (mock implementation)
   */
  async login(email: string, password: string): Promise<User> {
    // Mock authentication - in real app, this would call an API
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    // Simple validation
    if (!email.includes('@') || password.length < 6) {
      throw new Error('Invalid credentials');
    }

    const user: User = {
      id: this.generateId(),
      email,
      name: email.split('@')[0],
      isAuthenticated: true,
      sessionToken: this.generateSessionToken()
    };

    this.currentUser.set(user);
    this.persistSession(user);

    // Log security event
    this.logSecurityEvent({
      type: 'DATA_ACCESS',
      message: `User ${user.email} logged in`,
      timestamp: new Date(),
      userId: user.id
    });

    return user;
  }

  /**
   * Logout user
   */
  logout(): void {
    const user = this.currentUser();
    if (user) {
      this.logSecurityEvent({
        type: 'DATA_ACCESS',
        message: `User ${user.email} logged out`,
        timestamp: new Date(),
        userId: user.id
      });
    }

    this.currentUser.set(null);
    localStorage.removeItem(this.SESSION_KEY);
  }

  /**
   * Create anonymous user for development/testing
   */
  createAnonymousUser(): User {
    const user: User = {
      id: this.generateId(),
      email: 'anonymous@taskgo.local',
      name: 'Anonymous User',
      isAuthenticated: true,
      sessionToken: this.generateSessionToken()
    };

    this.currentUser.set(user);
    this.persistSession(user);

    return user;
  }

  /**
   * Check authentication and throw error if not authenticated
   */
  requireAuthentication(): void {
    if (!this.isAuthenticated()) {
      this.logSecurityEvent({
        type: 'AUTHENTICATION_FAILURE',
        message: 'Unauthenticated access attempt detected',
        timestamp: new Date()
      });

      throw new Error('Authentication required to perform this operation');
    }
  }

  /**
   * Get user context for data segregation
   */
  getUserContext(): { userId: string } | null {
    const user = this.currentUser();
    if (!user || !user.isAuthenticated) {
      return null;
    }
    return { userId: user.id };
  }

  /**
   * Log security event
   */
  logSecurityEvent(event: Omit<SecurityEvent, 'id'>): void {
    const securityEvent: SecurityEvent = {
      ...event,
      id: this.generateId(),
      userAgent: navigator.userAgent,
      ipAddress: 'client-side' // In real app, this would be captured server-side
    };

    this.securityEvents.update(events => [...events.slice(-99), securityEvent]); // Keep last 100 events

    // Log to console for debugging
    console.warn(`SECURITY: ${event.type} - ${event.message}`, {
      timestamp: event.timestamp,
      userId: event.userId,
      type: event.type,
      severity: event.severity,
      event: event.event
    });
  }

  /**
   * Get security events
   */
  getSecurityEvents(): SecurityEvent[] {
    return this.securityEvents();
  }

  /**
   * Clear security events
   */
  clearSecurityEvents(): void {
    this.securityEvents.set([]);
  }

  /**
   * Persist session to localStorage
   */
  private persistSession(user: User): void {
    try {
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Failed to persist session:', error);
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
  }

  /**
   * Generate session token
   */
  private generateSessionToken(): string {
    return btoa(`${Date.now()}_${Math.random().toString(36)}_${this.generateId()}`);
  }
}