import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
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
    const recentTimestamps = operationTimestamps.filter(
      (timestamp: number) => timestamp > windowStart
    );

    // Block when we reach limit (on 100th attempt)
    if (recentTimestamps.length >= this.RATE_LIMIT_MAX) {
      return {
        allowed: false,
        remainingAttempts: 0,
      };
    }

    // Add current timestamp and update the map
    recentTimestamps.push(now);
    this.operationCounts.set(operation, recentTimestamps);

    const remainingAttempts = this.RATE_LIMIT_MAX - recentTimestamps.length;

    return {
      allowed: true,
      remainingAttempts,
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
  getRateLimitStatus(operation: string): {
    currentCount: number;
    maxAllowed: number;
    resetTime: number;
  } {
    const now = Date.now();
    const windowStart = now - this.RATE_LIMIT_WINDOW;

    const operationTimestamps = this.operationCounts.get(operation) || [];
    const recentTimestamps = operationTimestamps.filter(
      (timestamp: number) => timestamp > windowStart
    );

    const oldestTimestamp = recentTimestamps.length > 0 ? Math.min(...recentTimestamps) : now;
    const resetTime = oldestTimestamp + this.RATE_LIMIT_WINDOW;

    return {
      currentCount: recentTimestamps.length,
      maxAllowed: this.RATE_LIMIT_MAX,
      resetTime,
    };
  }

  /**
   * Validate request for suspicious patterns
   */
  validateRequest(data: any): { valid: boolean; threats: string[] } {
    const threats: string[] = [];

    if (!data || typeof data !== 'object') {
      return { valid: true, threats };
    }

    const checkValue = (value: any, path: string) => {
      if (typeof value === 'string') {
        // Decode HTML entities first
        const decodedValue = this.decodeHTMLEntities(value);
        // Check for event handlers
        if (/(^|\s)on\w+\s*=/i.test(decodedValue)) {
          threats.push(`Dangerous content in ${path}: event handlers not allowed`);
          return;
        }

        // Check for script tags and other dangerous patterns
        if (/<script\b[^>]*>|<\/script\s*>|javascript:|data:|vbscript:/i.test(decodedValue)) {
          threats.push(`Dangerous content in ${path}: potentially dangerous content detected`);
        }
      } else if (value && typeof value === 'object') {
        // Recursively check nested objects
        Object.entries(value).forEach(([key, val]) => {
          checkValue(val, path ? `${path}.${key}` : key);
        });
      }
    };

    // Check all properties
    Object.entries(data).forEach(([key, value]) => {
      checkValue(value, key);
    });

    return {
      valid: threats.length === 0,
      threats,
    };
  }

  validateSanitize(data: any): { valid: boolean; threats: string[] } {
    const threats: string[] = [];

    if (!data || typeof data !== 'object') {
      return { valid: true, threats };
    }

    const checkValue = (value: any, path: string) => {
      if (typeof value === 'string') {
        // Decode HTML entities first
        const decodedValue = this.decodeHTMLEntities(value);
        // Check for event handlers
        if (/(^|\s)on\w+\s*=/i.test(decodedValue)) {
          threats.push(`Dangerous content in ${path}: event handlers not allowed`);
          return;
        }

        // Check for script tags and other dangerous patterns
        if (/<script\b[^>]*>|<\/script\s*>|javascript:|data:|vbscript:/i.test(decodedValue)) {
          threats.push(`Dangerous content in ${path}: potentially dangerous content detected`);
        }
      } else if (value && typeof value === 'object') {
        // Recursively check nested objects
        Object.entries(value).forEach(([key, val]) => {
          checkValue(val, path ? `${path}.${key}` : key);
        });
      }
    };

    // Check all properties
    Object.entries(data).forEach(([key, value]) => {
      const sanitizedValue =
        value instanceof String ? this.sanitizeString(value.toString()) : value;
      checkValue(sanitizedValue, key);
    });

    return {
      valid: threats.length === 0,
      threats,
    };
  }

  private sanitizeString(content: string): string {
    // First decode any HTML entities
    let sanitized = this.decodeHTMLEntities(content);

    // Remove HTML tags
    sanitized = sanitized.replace(/<[^>]*>/g, '');

    // Remove dangerous patterns
    const dangerousPatterns = [
      /javascript:/gi,
      /data:/gi,
      /vbscript:/gi,
      /on\w+\s*=/gi,
      /expression\s*\(/gi,
      /url\s*\(/gi,
    ];

    dangerousPatterns.forEach((pattern) => {
      sanitized = sanitized.replace(pattern, '');
    });

    // Encode special characters
    return sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  private decodeHTMLEntities(encodedString: string): string {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = encodedString;
    return textarea.value;
  }

  /**
   * Generate secure random string
   */
  generateSecureRandom(length: number = 32): string {
    const byteLength = Math.ceil(length / 2); // Each byte becomes 2 hex chars
    const array = new Uint8Array(byteLength);
    crypto.getRandomValues(array);
    const hexString = Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
    return hexString.substring(0, length);
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
    if (
      !url.startsWith('http://') &&
      !url.startsWith('https://') &&
      !url.startsWith('/') &&
      !url.startsWith('./')
    ) {
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
      { pattern: /<iframe[^>]*>/gi, type: 'XSS' },
      { pattern: /on\w+\s*=/gi, type: 'XSS' },
      { pattern: /eval\s*\(/gi, type: 'XSS' }, // eval should be detected as XSS
      { pattern: /expression\s*\(/gi, type: 'Code Injection' },
      { pattern: /exec\s*\(/gi, type: 'Code Injection' },
      { pattern: /union\s+select/gi, type: 'SQL Injection' },
      { pattern: /drop\s+table/gi, type: 'SQL Injection' },
      { pattern: /'[^']*\s*or\s*'[^']*'\s*=\s*'[^']*/gi, type: 'SQL Injection' },
      { pattern: /admin\s*'?\s*--/gi, type: 'SQL Injection' },
    ];

    for (const { pattern, type } of attackPatterns) {
      if (pattern.test(input)) {
        return { isAttack: true, attackType: type };
      }
    }

    return { isAttack: false, attackType: '' };
  }

  /**
   * Detect SQL injection patterns
   */
  detectSQLInjection(input: string): { isSQLi: boolean; patterns: string[] } {
    const sqlPatterns = [
      /union\s+select/gi,
      /drop\s+table/gi,
      /insert\s+into/gi,
      /delete\s+from/gi,
      /update\s+set/gi,
      /exec\s*\(/gi,
      /--/,
      /\/\*/,
      /\*\//,
      /'[^']*\s*or\s*'[^']*'/gi,
      /'[^']*\s*=\s*'[^']*/gi,
      /admin'--/gi,
    ];

    const matchedPatterns = sqlPatterns.filter((pattern) => pattern.test(input));

    return {
      isSQLi: matchedPatterns.length > 0,
      patterns: matchedPatterns.map((p) => p.toString()),
    };
  }
}
