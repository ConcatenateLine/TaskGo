import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ValidationService {
  private readonly DANGEROUS_PATTERNS = [
    /<script[^>]*>/gi,
    /javascript:/gi,
    /data:/gi,
    /vbscript:/gi,
    /onload\s*=/gi,
    /onerror\s*=/gi,
    /onclick\s*=/gi,
    /onmouseover\s*=/gi,
    /@import/gi,
    /<iframe[^>]*>/gi,
    /<object[^>]*>/gi,
    /<embed[^>]*>/gi,
    /<link[^>]*>/gi,
    /<style[^>]*>.*?<\/style>/gi,
    /url\s*\([^)]*javascript:/gi,
    /data:.*?;base64,/gi, // Matches base64 data URLs
    /data:text\/html/gi, // Matches HTML data URLs
    /data:text\/javascript/gi, // Matches JavaScript data URLs
  ];

  /**
   * Patterns specifically for event handlers
   */
  private readonly EVENT_HANDLER_PATTERNS = [
    /on\w+\s*=\s*["'][^"']*["']/gi,
    /on\w+\s*=\s*[^"\s>]+/gi,
  ];

  private readonly CONTROL_CHARACTERS = /[\x00-\x1F\x7F-\x9F]/g;
  private readonly MAX_TITLE_LENGTH = 100;
  private readonly MAX_DESCRIPTION_LENGTH = 500;

  /**
   * Validate task title for security and content rules
   */
  validateTaskTitle(
    title: string,
    sanitize = false
  ): { isValid: boolean; sanitized?: string; error?: string } {
    if (!title || typeof title !== 'string') {
      return { isValid: false, error: 'Title is required and must be a string' };
    }
    // Check length
    if (title.length > this.MAX_TITLE_LENGTH) {
      return {
        isValid: false,
        error: `Title too long: maximum ${this.MAX_TITLE_LENGTH} characters allowed`,
      };
    }
    // Decode HTML entities first
    const decodedTitle = this.decodeHTMLEntities(title);
    // Check for control characters
    const controlCharCheck = this.rejectIfControlCharacters(decodedTitle);
    if (!controlCharCheck.isValid) {
      return controlCharCheck;
    }
    // Check for XSS in the decoded content
    if (!sanitize && this.containsXSS(decodedTitle)) {
      return {
        isValid: false,
        error: 'Invalid input: potentially dangerous content detected',
      };
    }

    // Sanitize the decoded title
    const sanitized = this.sanitizeString(decodedTitle);

    return {
      isValid: true,
      sanitized,
      error: undefined,
    };
  }

  /**
   * Validate task description for security and content rules
   */
  validateTaskDescription(description?: string): {
    isValid: boolean;
    sanitized?: string;
    error?: string;
  } {
    if (!description) {
      return { isValid: true };
    }

    if (typeof description !== 'string') {
      return { isValid: false, error: 'Description must be a string' };
    }

    // Check for data URLs
    if (/(^|\s)data:.*?;base64,|data:text\/(html|javascript)/i.test(description)) {
      return {
        isValid: false,
        error: 'Invalid input: potentially dangerous content detected',
      };
    }

    // Check length
    if (description.length > this.MAX_DESCRIPTION_LENGTH) {
      return {
        isValid: false,
        error: `Description too long: maximum ${this.MAX_DESCRIPTION_LENGTH} characters allowed`,
      };
    }

    // Check for control characters
    const controlCharCheck = this.rejectIfControlCharacters(description);
    if (!controlCharCheck.isValid) {
      return controlCharCheck;
    }

    // Remove control characters for further processing
    const cleanDescription = description.replace(this.CONTROL_CHARACTERS, '');

    // Check for dangerous patterns
    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(cleanDescription)) {
        return {
          isValid: false,
          error: 'Invalid input: potentially dangerous content detected',
        };
      }
    }

    // Additional XSS prevention
    if (this.containsXSS(cleanDescription)) {
      return {
        isValid: false,
        error: 'Invalid input: potentially dangerous content detected',
      };
    }

    // Sanitize description
    const sanitized = this.sanitizeString(cleanDescription);

    return { isValid: true, sanitized };
  }

  /**
   * Validate content against Content Security Policy rules
   */
  validateCSP(content: string): { isValid: boolean; violations: string[] } {
    const violations: string[] = [];

    if (!content) {
      return { isValid: true, violations: [] };
    }

    // Check for HTML tags first
    if (/<[^>]*>/.test(content)) {
      violations.push('HTML content not allowed');
    }

    // Check for inline styles
    if (/style\s*=\s*["'][^"']*["']/.test(content)) {
      violations.push('Inline styles detected');
    }

    // Check for external resources (including protocol-relative)
    if (/https?:\/\/[^\s"'<>]+/.test(content)) {
      violations.push('External resources not allowed');
    }

    // Check for data URLs
    if (/data:/i.test(content)) {
      violations.push('Data URLs not allowed');
    }

    // Check for JavaScript protocols
    if (/javascript:/gi.test(content)) {
      violations.push('JavaScript protocol detected');
    }

    return {
      isValid: violations.length === 0,
      violations,
    };
  }

  /**
   * Sanitize string for safe display by removing dangerous patterns and malicious content
   */
  sanitizeForDisplay(content: string): string {
    if (!content) {
      return '';
    }

    let sanitized = content;

    // Remove control characters first
    sanitized = sanitized.replace(this.CONTROL_CHARACTERS, '');

    // Remove script and style tags with their contents
    sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, '');
    sanitized = sanitized.replace(/<style[^>]*>.*?<\/style>/gi, '');

    // For display contexts, keep protocols visible but neutralized
    // Remove dangerous protocols completely from display
    // Users shouldn't see dangerous protocols even in text
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/data:/gi, '');
    sanitized = sanitized.replace(/vbscript:/gi, '');

    // Remove event handlers
    sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');

    // Remove malicious URLs first (before general URL removal)
    sanitized = sanitized.replace(/https:\/\/(?:evil|malicious)\.com/gi, '');

    // Remove HTML attributes that can be dangerous
    sanitized = sanitized.replace(/(?:style|src)\s*=\s*["'][^"']*["']/gi, '');

    // Remove url() CSS patterns
    sanitized = sanitized.replace(/url\s*\([^)]*\)/gi, '');

    // Remove all HTML tags
    sanitized = sanitized.replace(/<[^>]*>/g, '');

    // Remove remaining external URLs
    sanitized = sanitized.replace(/https?:\/\/[^\s"'<>]+/gi, '');

    return sanitized.trim();
  }

  /**
   * Sanitize string by removing or escaping dangerous characters
   */
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

  private hasUnicodeXSS(content: string): boolean {
    // First decode HTML entities to handle cases like &lt;script&gt;
    const decodedContent = this.decodeHTMLEntities(content);

    // Normalize the string to handle different Unicode representations
    const normalized = decodedContent
      .normalize('NFKD') // Decompose characters into base + diacritics
      .replace(/[\u0300-\u036F]/g, ''); // Remove diacritics

    // Check for common Unicode-based XSS patterns
    const unicodeXssPatterns = [
      // Unicode-escaped HTML tags (only match complete tags)
      /<script[^>]*>/gi,
      /<\/script\s*>/gi,
      /<img[^>]*>/gi,
      /<iframe[^>]*>/gi,
      /<svg[^>]*>/gi,
      /<object[^>]*>/gi,
      /<body[^>]*>/gi,
      /<form[^>]*>/gi,
      /<link[^>]*>/gi,
      /<style[^>]*>.*?<\/style\s*>/gi,
      // Event handlers
      /on\w+\s*=/gi,
      // Dangerous protocols
      /javascript:/gi,
      /data:/gi,
      /vbscript:/gi,
      /about:/gi,
    ];

    // Check for any matches in the normalized content
    const hasMatch = unicodeXssPatterns.some((pattern) => {
      pattern.lastIndex = 0; // Reset regex state
      return pattern.test(normalized) || pattern.test(decodedContent);
    });

    return hasMatch;
  }

  private containsXSS(content: string): boolean {
    if (!content) return false;

    // First decode HTML entities to handle cases like &lt;script&gt;
    const decodedContent = this.decodeHTMLEntities(content);

    // Check if the content contains any HTML tags
    const hasHtmlTags = /<[a-z][\s\S]*>/i.test(decodedContent);

    if (!hasHtmlTags) {
      // If no HTML tags, just check for dangerous patterns
      return this.checkForDirectXSS(decodedContent);
    }

    // If there are HTML tags, check for XSS patterns
    return this.checkForDirectXSS(decodedContent) || this.hasUnicodeXSS(decodedContent);
  }

  private checkForDirectXSS(content: string): boolean {
    const xssPatterns = [
      // Match script tags and other dangerous elements
      /<script[^>]*>/gi,
      /<iframe[^>]*>/gi,
      /<object[^>]*>/gi,
      /<embed[^>]*>/gi,
      /<link[^>]*>/gi,
      /<style[^>]*>.*?<\/style\s*>/gi,
      // Dangerous protocols
      /javascript:/gi,
      /data:/gi,
      /vbscript:/gi,
      /about:/gi,
      // Event handlers
      /on\w+\s*=/gi,
      // Dangerous functions
      /eval\s*\(/gi,
      /exec\s*\(/gi,
      /expression\s*\(/gi,
      // Null-byte injection
      /<\u0000?script/gi,
    ];
    return xssPatterns.some((pattern) => {
      pattern.lastIndex = 0; // Reset regex state
      return pattern.test(content);
    });
  }
  private decodeHTMLEntities(encodedString: string): string {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = encodedString;
    return textarea.value;
  }

  /**
   * Reject content with control characters
   */
  private rejectIfControlCharacters(content: string): { isValid: boolean; error?: string } {
    if (this.CONTROL_CHARACTERS.test(content)) {
      return {
        isValid: false,
        error: 'Invalid input: control characters not allowed',
      };
    }
    return { isValid: true };
  }

  /**
   * Sanitize HTML for safe display using Angular's DomSanitizer approach
   */
  sanitizeHtml(content: string): string {
    if (!content) {
      return '';
    }

    // First remove dangerous elements and attributes
    let sanitized = content;

    // Remove script tags and their content
    sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, '');

    // Remove dangerous attributes and their values more thoroughly
    sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');

    // Remove dangerous protocols completely from display
    // Users shouldn't see dangerous protocols even in text
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/data:/gi, '');
    sanitized = sanitized.replace(/vbscript:/gi, '');

    // Remove all HTML tags for maximum security
    sanitized = sanitized.replace(/<[^>]*>/g, '');

    // Additional cleanup - remove any remaining protocol references
    sanitized = sanitized.replace(/:\s*javascript\s*:/gi, '');
    sanitized = sanitized.replace(/:\s*data\s*:/gi, '');
    sanitized = sanitized.replace(/:\s*vbscript\s*:/gi, '');

    // Encode special characters
    return sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Check if input contains suspicious patterns
   */
  isSuspiciousInput(input: string): boolean {
    if (!input || typeof input !== 'string') {
      return false;
    }

    const suspiciousPatterns = [
      /<script[^>]*>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe[^>]*>/gi,
      /eval\s*\(/gi,
      /exec\s*\(/gi,
      /expression\s*\(/gi,
    ];

    return suspiciousPatterns.some((pattern) => pattern.test(input));
  }

  /**
   * Validate email format
   */
  validateEmail(email: string): { isValid: boolean; error?: string } {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { isValid: false, error: 'Invalid email format' };
    }
    return { isValid: true };
  }

  /**
   * Validate password strength
   */
  validatePassword(password: string): { isValid: boolean; error?: string } {
    if (!password || password.length < 8) {
      return { isValid: false, error: 'Password must be at least 8 characters long' };
    }

    if (!/[A-Z]/.test(password)) {
      return { isValid: false, error: 'Password must contain at least one uppercase letter' };
    }

    if (!/[a-z]/.test(password)) {
      return { isValid: false, error: 'Password must contain at least one lowercase letter' };
    }

    if (!/\d/.test(password)) {
      return { isValid: false, error: 'Password must contain at least one number' };
    }

    return { isValid: true };
  }

  /**
   * Check for SQL injection patterns
   */
  detectSQLInjection(input: string): { isSQLi: boolean; patterns: string[] } {
    const sqlPatterns = [
      /(?:union\s+select|select\s+[\w\s,]+?\s+from\s+[\w\s,]+?)/gi, // UNION SELECT or SELECT ... FROM
      /(?:drop\s+table\s+[\w\s,]+?|table\s+[\w\s]+\s+drop)/gi, // DROP TABLE
      /(?:insert\s+into\s+[\w\s]+\s*\([^)]*\)\s*values\s*\([^)]*\))/gi, // INSERT INTO ... VALUES
      /(?:delete\s+from\s+[\w\s]+|from\s+[\w\s]+\s+delete)/gi, // DELETE FROM
      /(?:update\s+[\w\s]+\s+set\s+[\w\s,=]+)/gi, // UPDATE ... SET
      /(?:exec\s*\(|execute\s+[\w\s]+\(|xp_cmdshell\s*\()/gi, // EXEC, EXECUTE, xp_cmdshell
      /(?:--|#|\/\*|\*\/)/, // SQL comments
      /(?:or\s+['"]?\d+['"]?\s*=\s*['"]?\d+)/gi, // OR 1=1
      /(?:;\s*--|;\s*#|;\s*\/\*)/, // Statement terminators
      /(?:select\s+[\w\s,]+?from\s+[\w\s,]+?where\s+[\w\s=<>!]+)/gi, // SELECT ... FROM ... WHERE
      /(?:union\s+all\s+select)/gi, // UNION ALL SELECT
      /(?:waitfor\s+delay\s+['"]\d+:\d+:\d+['"])/gi, // WAITFOR DELAY
      /(?:shutdown\s+with\s+nowait)/gi, // SHUTDOWN WITH NOWAIT
      /(?:having\s+1=1|\b1\s*=\s*1\b)/gi, // HAVING 1=1 or 1=1
      /(?:select\s+user|select\s+database|select\s+version)/gi, // Information gathering
      /(?:select\s+password\s+from\s+users)/gi, // Password extraction
      /(?:load_file\s*\(|into\s+outfile\s+['"])/gi, // File operations
      /(?:benchmark\s*\(|sleep\s*\()/gi, // Time-based attacks
      /(?:@@version|@@hostname|@@datadir)/gi, // System variables
      /(?:char\s*\(|concat\s*\()/gi, // String manipulation
    ];

    const matchedPatterns = sqlPatterns
      .filter((pattern) => {
        // Reset the lastIndex for the regex to ensure it works with multiple tests
        pattern.lastIndex = 0;
        return pattern.test(input);
      })
      .map((p) => {
        // Reset the lastIndex for the regex to ensure it works with multiple tests
        p.lastIndex = 0;
        return p.toString();
      });

    return {
      isSQLi: matchedPatterns.length > 0,
      patterns: matchedPatterns,
    };
  }
}
