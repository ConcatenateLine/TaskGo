import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SecurityService {
  private operationCounts = new Map<string, number[]>();
  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
  private readonly RATE_LIMIT_MAX = 100; // Max operations per minute

  /**
   * Check if operation is allowed based on rate limiting
   */
  checkRateLimit(operation: string): { allowed: boolean; remainingAttempts: number } {
    const now = Date.now();
    const windowStart = now - this.RATE_LIMIT_WINDOW;

    // Get current counts
    const operationTimestamps = this.operationCounts.get(operation) || [];

    // Filter timestamps within window
    const recentTimestamps = operationTimestamps.filter((timestamp: number) => timestamp > windowStart);

    // Block when we reach limit (on 100th attempt)
    if (recentTimestamps.length >= this.RATE_LIMIT_MAX) {
      return {
        allowed: false,
        remainingAttempts: 0
      };
    }

    // Add current timestamp and update the map
    recentTimestamps.push(now);
    this.operationCounts.set(operation, recentTimestamps);

    const remainingAttempts = this.RATE_LIMIT_MAX - recentTimestamps.length;

    return {
      allowed: true,
      remainingAttempts
    };
  }

  /**
   * Reset rate limit counter for operation
   */
  resetRateLimit(operation: string): void {
    this.operationCounts.delete(operation);
  }

  /**
   * Get current rate limit status
   */
  getRateLimitStatus(operation: string): { currentCount: number; maxAllowed: number; resetTime: number } {
    const now = Date.now();
    const windowStart = now - this.RATE_LIMIT_WINDOW;

    const operationTimestamps = this.operationCounts.get(operation) || [];
    const recentTimestamps = operationTimestamps.filter((timestamp: number) => timestamp > windowStart);

    const oldestTimestamp = recentTimestamps.length > 0 ? Math.min(...recentTimestamps) : now;
    const resetTime = oldestTimestamp + this.RATE_LIMIT_WINDOW;

    return {
      currentCount: recentTimestamps.length,
      maxAllowed: this.RATE_LIMIT_MAX,
      resetTime
    };
  }

  /**
   * Validate request for suspicious patterns
   */
  validateRequest(requestData: any): { valid: boolean; threats: string[] } {
    const threats: string[] = [];

    if (!requestData || typeof requestData !== 'object') {
      return { valid: false, threats: ['Invalid request data'] };
    }

    // Check for common attack patterns
    const suspiciousPatterns = [
      /<script[^>]*>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /union\s+select/gi,
      /drop\s+table/gi,
      /insert\s+into/gi,
      /delete\s+from/gi,
      /exec\s*\(/gi,
      /eval\s*\(/gi
    ];

    const checkString = (str: string, field: string) => {
      suspiciousPatterns.forEach(pattern => {
        if (pattern.test(str)) {
          threats.push(`Suspicious pattern detected in ${field}`);
        }
      });
    };

    // Recursive check of all string values
    const checkObject = (obj: any, path = '') => {
      if (typeof obj === 'string') {
        checkString(obj, path || 'root');
      } else if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          checkObject(item, `${path}[${index}]`);
        });
      } else if (obj && typeof obj === 'object') {
        Object.entries(obj).forEach(([key, value]) => {
          checkObject(value, path ? `${path}.${key}` : key);
        });
      }
    };

    checkObject(requestData);

    // Check for excessive data size
    const dataSize = JSON.stringify(requestData).length;
    if (dataSize > 100000) { // 100KB
      threats.push('Request data too large');
    }

    return {
      valid: threats.length === 0,
      threats
    };
  }

  /**
   * Generate secure random string
   */
  generateSecureRandom(length: number = 32): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Create CSRF token
   */
  generateCSRFToken(): string {
    return this.generateSecureRandom(64);
  }

  /**
   * Validate CSRF token
   */
  validateCSRFToken(token: string, expectedToken: string): boolean {
    return Boolean(token && expectedToken && token === expectedToken);
  }

  /**
   * Sanitize URL
   */
  sanitizeUrl(url: string): string {
    if (!url || typeof url !== 'string') {
      return '';
    }

    // Block dangerous protocols
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
    const lowerUrl = url.toLowerCase();

    for (const protocol of dangerousProtocols) {
      if (lowerUrl.startsWith(protocol)) {
        return '';
      }
    }

    // Ensure URL starts with http or https or is relative
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/') && !url.startsWith('./')) {
      return '';
    }

    return url;
  }

  /**
   * Check if IP is whitelisted (mock implementation)
   */
  isWhitelistedIP(ip: string): boolean {
    // In a real implementation, this would check against a whitelist
    return ip === '127.0.0.1' || ip === '::1' || ip === 'localhost';
  }

  /**
   * Detect common attack signatures
   */
  detectAttackSignature(input: string): { isAttack: boolean; attackType: string } {
    const attackPatterns = [
      { pattern: /<script[^>]*>.*?<\/script>/gi, type: 'XSS' },
      { pattern: /javascript:/gi, type: 'XSS' },
      { pattern: /union\s+select/gi, type: 'SQL Injection' },
      { pattern: /drop\s+table/gi, type: 'SQL Injection' },
      { pattern: /<iframe[^>]*>/gi, type: 'XSS' },
      { pattern: /on\w+\s*=/gi, type: 'XSS' },
      { pattern: /eval\s*\(/gi, type: 'Code Injection' },
      { pattern: /exec\s*\(/gi, type: 'Code Injection' }
    ];

    for (const { pattern, type } of attackPatterns) {
      if (pattern.test(input)) {
        return { isAttack: true, attackType: type };
      }
    }

    return { isAttack: false, attackType: '' };
  }
}
