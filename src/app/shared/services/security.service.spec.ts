import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

// Vitest globals import
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { SecurityService } from './security.service';
import { ValidationService } from './validation.service';
import { AuthService } from './auth.service';
import { CryptoService } from './crypto.service';

describe('SecurityService - Comprehensive Security Tests', () => {
  let securityService: SecurityService;
  let validationService: ValidationService;
  let authService: AuthService;
  let cryptoService: CryptoService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SecurityService, ValidationService, AuthService, CryptoService],
    });

    securityService = TestBed.inject(SecurityService);
    validationService = TestBed.inject(ValidationService);
    authService = TestBed.inject(AuthService);
    cryptoService = TestBed.inject(CryptoService);
  });

  afterEach(() => {
    // Clear rate limits after each test
    (securityService as any).operationCounts.clear();
  });

  describe('Input Validation & XSS Prevention (A03, A04)', () => {
    describe('Task Title Security Validation', () => {
      it('should reject script tags in task titles', () => {
        const maliciousTitles = [
          '<script>alert("XSS")</script>Task Title',
          '<SCRIPT>alert("XSS")</SCRIPT>Task Title',
          '<script src="evil.js"></script>Task',
          'Task<script>alert("XSS")</script>Title',
        ];

        maliciousTitles.forEach((title) => {
          const result = validationService.validateTaskTitle(title);
          expect(result.isValid).toBe(false);
          expect(result.error).toContain('dangerous content');
        });
      });

      it('should reject JavaScript protocols in task titles', () => {
        const maliciousTitles = [
          'javascript:alert("XSS")',
          'JAVASCRIPT:alert("XSS")',
          'Javascript:alert("XSS")',
          'javascript:void(0)',
          'javascript:document.cookie',
        ];

        maliciousTitles.forEach((title) => {
          const result = validationService.validateTaskTitle(title);
          expect(result.isValid).toBe(false);
          expect(result.error).toContain('dangerous content');
        });
      });

      it('should reject event handlers in task titles', () => {
        const maliciousTitles = [
          'Click onclick="alert(\'XSS\')" here',
          'Title onload="alert(\'XSS\')"',
          'Test onmouseover="alert(\'XSS\')"',
          'Task onerror="alert(\'XSS\')"',
          'DIV onclick="alert(\'XSS\')"Title',
        ];

        maliciousTitles.forEach((title) => {
          const result = validationService.validateTaskTitle(title);
          expect(result.isValid).toBe(false);
          expect(result.error).toContain('Invalid input: potentially dangerous content detected');
        });
      });

      it('should reject dangerous HTML patterns in task titles', () => {
        const maliciousTitles = [
          // Existing cases
          '<img src="x" onerror="alert(\'XSS\')">',
          '<iframe src="javascript:alert(\'XSS\')"></iframe>',
          '<body onload="alert(\'XSS\')">',
          '<svg onload="alert(\'XSS\')">',
          '<object data="javascript:alert(\'XSS\')"></object>',
          // Additional cases
          '<a href="javascript:alert(\'XSS\')">Click me</a>',
          '<div style="background: url(javascript:alert(\'XSS\'))">',
          '<img src="x" onmouseover="alert(\'XSS\')">',
          '<form action="javascript:alert(\'XSS\')"><input type="submit"></form>',
        ];

        maliciousTitles.forEach((title) => {
          const result = validationService.validateTaskTitle(title);
          expect(result.isValid).toBe(false);
          expect(result.error).toContain('Invalid input: potentially dangerous content detected');
        });
      });

      it('should reject Unicode XSS evasion techniques', () => {
        const maliciousTitles = [
          '\u003cscript\u003ealert("XSS")\u003c/script\u003e',
          '\u003cimg src=x onerror=alert("XSS")\u003e',
          '&lt;script&gt;alert("XSS")&lt;/script&gt;',
          'jav\u0001ascript:alert("XSS")',
        ];

        maliciousTitles.forEach((title) => {
          const result = validationService.validateTaskTitle(title);
          expect(result.isValid).toBe(false);
        });
      });

      it('should safely sanitize legitimate content with special characters', () => {
        const validTitles = [
          'Task with <em>emphasis</em>',
          'Task with &lt;script&gt; text',
          'HTML & CSS Task',
          'Task with "quotes" and \'apostrophes\'',
          'Task with slashes / and \\ backslashes',
        ];

        validTitles.forEach((title) => {
          const result = validationService.validateTaskTitle(title, true);
          expect(result.sanitized).toBeDefined();
          expect(result.sanitized).not.toContain('<em>');
          expect(result.sanitized).not.toContain('</em>');
        });
      });
    });

    describe('Task Description Security Validation', () => {
      it('should reject script tags in task descriptions', () => {
        const maliciousDescriptions = [
          '<script>alert("XSS in description")</script>',
          'Description<script>alert("XSS")</script>content',
          '<script>document.location="evil.com"</script>',
        ];

        maliciousDescriptions.forEach((description) => {
          const result = validationService.validateTaskDescription(description);
          expect(result.isValid).toBe(false);
          expect(result.error).toContain('dangerous content');
        });
      });

      it('should reject iframes and objects in task descriptions', () => {
        const maliciousDescriptions = [
          '<iframe src="javascript:alert(\'XSS\')"></iframe>',
          '<object data="evil.swf"></object>',
          '<embed src="javascript:alert(\'XSS\')">',
          '<link rel="stylesheet" href="javascript:alert(\'XSS\')">',
        ];

        maliciousDescriptions.forEach((description) => {
          const result = validationService.validateTaskDescription(description);
          expect(result.isValid).toBe(false);
          expect(result.error).toContain('dangerous content');
        });
      });

      it('should reject CSS injection in task descriptions', () => {
        const maliciousDescriptions = [
          '<style>body { background: url("javascript:alert(\'XSS\')") }</style>',
          '<link rel="stylesheet" href="evil.css">',
          '<style>@import url("javascript:alert(\'XSS\')")</style>',
        ];

        maliciousDescriptions.forEach((description) => {
          const result = validationService.validateTaskDescription(description);
          expect(result.isValid).toBe(false);
          expect(result.error).toContain('dangerous content');
        });
      });

      it('should reject data URLs in task descriptions', () => {
        const maliciousDescriptions = [
          '<img src="data:text/html,<script>alert(\'XSS\')</script>">',
          '<iframe src="data:text/html,<h1>Evil</h1>"></iframe>',
          'data:text/javascript,alert("XSS")',
        ];

        maliciousDescriptions.forEach((description) => {
          const result = validationService.validateTaskDescription(description);
          expect(result.isValid).toBe(false);
          expect(result.error).toContain('dangerous content');
        });
      });

      it('should safely sanitize HTML entities in descriptions', () => {
        const validDescriptions = [
          'Task with &lt; 5 &amp;&amp; &gt; 3',
          'Description with "quotes" and \'apostrophes\'',
          'HTML entities: &amp; &lt; &gt; &quot;',
          'URL: https://example.com/page?param=value&amp;other=test',
        ];

        validDescriptions.forEach((description) => {
          const result = validationService.validateTaskDescription(description);
          expect(result.isValid).toBe(true);
          expect(result.sanitized).toBeDefined();
        });
      });
    });

    describe('Content Security Policy (CSP) Validation', () => {
      it('should detect HTML content violations', () => {
        const contentWithHTML = '<div>Content with HTML</div>';
        const result = validationService.validateCSP(contentWithHTML);

        expect(result.isValid).toBe(false);
        expect(result.violations).toContain('HTML content not allowed');
      });

      it('should detect inline style violations', () => {
        const contentWithStyles = '<div style="color: red">Styled content</div>';
        const result = validationService.validateCSP(contentWithStyles);

        expect(result.isValid).toBe(false);
        expect(result.violations).toContain('Inline styles detected');
      });

      it('should detect external resource violations', () => {
        const contentWithExternal = '<img src="https://example.com/image.jpg">';
        const result = validationService.validateCSP(contentWithExternal);

        expect(result.isValid).toBe(false);
        expect(result.violations).toContain('External resources not allowed');
      });

      it('should detect data URL violations', () => {
        const contentWithDataURL = 'data:text/html,<script>alert("XSS")</script>';
        const result = validationService.validateCSP(contentWithDataURL);

        expect(result.isValid).toBe(false);
        expect(result.violations).toContain('Data URLs not allowed');
      });

      it('should detect JavaScript protocol violations', () => {
        const contentWithJS = 'javascript:alert("XSS")';
        const result = validationService.validateCSP(contentWithJS);

        expect(result.isValid).toBe(false);
        expect(result.violations).toContain('JavaScript protocol detected');
      });

      it('should allow plain text content', () => {
        const plainText = 'This is plain text content without any HTML or scripts';
        const result = validationService.validateCSP(plainText);

        expect(result.isValid).toBe(true);
        expect(result.violations).toHaveLength(0);
      });
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should detect common SQL injection patterns', () => {
      const maliciousInputs = [
        "'; DROP TABLE tasks; --",
        "' OR '1'='1",
        "' UNION SELECT * FROM users --",
        "'; INSERT INTO users VALUES ('hacker', 'pass'); --",
        "' OR 1=1 --",
        "admin'--",
        "' EXEC xp_cmdshell('format c:') --",
      ];

      maliciousInputs.forEach((input) => {
        const result = validationService.detectSQLInjection(input);
        expect(result.isSQLi).toBe(true);
        expect(result.patterns.length).toBeGreaterThan(0);
      });
    });

    it('should allow legitimate content with SQL-like words', () => {
      const legitimateInputs = [
        'Update task status to complete',
        'Select the best option',
        'Insert new row in table view',
        'Delete old files from project',
        'Create task with description',
      ];

      legitimateInputs.forEach((input) => {
        const result = validationService.detectSQLInjection(input);
        expect(result.isSQLi).toBe(false);
        expect(result.patterns).toHaveLength(0);
      });
    });
  });

  describe('Rate Limiting Security', () => {
    it('should enforce rate limits for operations', () => {
      const operation = 'testOperation';

      // Should allow requests up to the limit
      for (let i = 0; i < 100; i++) {
        const result = securityService.checkRateLimit(operation);
        expect(result.allowed).toBe(true);
        expect(result.remainingAttempts).toBe(99 - i);
      }

      // Should block the 101st request
      const blockedResult = securityService.checkRateLimit(operation);
      expect(blockedResult.allowed).toBe(false);
      expect(blockedResult.remainingAttempts).toBe(0);
    });

    it('should provide accurate rate limit status', () => {
      const operation = 'statusTest';

      // Make some requests
      for (let i = 0; i < 10; i++) {
        securityService.checkRateLimit(operation);
      }

      const status = securityService.getRateLimitStatus(operation);
      expect(status.currentCount).toBe(10);
      expect(status.maxAllowed).toBe(100);
      expect(status.resetTime).toBeGreaterThan(Date.now());
    });

    it('should reset rate limits correctly', () => {
      const operation = 'resetTest';

      // Make some requests
      securityService.checkRateLimit(operation);
      securityService.checkRateLimit(operation);

      // Reset
      securityService.resetRateLimit(operation);

      // Should allow fresh requests
      const result = securityService.checkRateLimit(operation);
      expect(result.allowed).toBe(true);
      expect(result.remainingAttempts).toBe(99);
    });
  });

  describe('URL Sanitization Security', () => {
    it('should reject dangerous protocols', () => {
      const dangerousUrls = [
        'javascript:alert("XSS")',
        'data:text/html,<script>alert("XSS")</script>',
        'vbscript:msgbox("XSS")',
        'file:///etc/passwd',
        'ftp://evil.com/file.exe',
      ];

      dangerousUrls.forEach((url) => {
        const sanitized = securityService.sanitizeUrl(url);
        expect(sanitized).toBe('');
      });
    });

    it('should allow safe protocols', () => {
      const safeUrls = [
        'https://example.com',
        'http://example.com',
        '/relative/path',
        './relative/path',
        '//protocol-relative.com',
      ];

      safeUrls.forEach((url) => {
        const sanitized = securityService.sanitizeUrl(url);
        expect(sanitized).toBe(url);
      });
    });
  });

  describe('Attack Detection and Prevention', () => {
    it('should detect XSS attack signatures', () => {
      const xssAttacks = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        '<iframe src="javascript:alert(\'XSS\')"></iframe>',
        'eval(String.fromCharCode(88,83,83))',
        'onclick="alert(\'XSS\')"',
      ];

      xssAttacks.forEach((attack) => {
        const detection = securityService.detectAttackSignature(attack);
        expect(detection.isAttack).toBe(true);
        expect(detection.attackType).toBe('XSS');
      });
    });

    it('should detect SQL injection attack signatures', () => {
      const sqliAttacks = [
        "' UNION SELECT * FROM users --",
        "'; DROP TABLE tasks; --",
        "' OR '1'='1",
        "admin'--",
      ];

      sqliAttacks.forEach((attack) => {
        const detection = securityService.detectAttackSignature(attack);
        expect(detection.isAttack).toBe(true);
        expect(detection.attackType).toBe('SQL Injection');
      });
    });

    it('should detect code injection attack signatures', () => {
      const codeInjectionAttacks = [
        'eval("alert(\'XSS\')")',
        'exec("malicious command")',
        'expression(alert("XSS"))',
      ];

      codeInjectionAttacks.forEach((attack) => {
        const detection = securityService.detectAttackSignature(attack);
        expect(detection.isAttack).toBe(true);
        expect(['Code Injection', 'XSS']).toContain(detection.attackType);
      });
    });

    it('should not flag legitimate content as attacks', () => {
      const legitimateContent = [
        'Create task for project',
        'Update user preferences',
        'Select items from list',
        'Delete old records',
        'javascript is a programming language',
        'this < script > is not dangerous',
      ];

      legitimateContent.forEach((content) => {
        const detection = securityService.detectAttackSignature(content);
        expect(detection.isAttack).toBe(false);
        expect(detection.attackType).toBe('');
      });
    });
  });

  describe('CSRF Protection', () => {
    it('should generate secure CSRF tokens', () => {
      const token1 = securityService.generateCSRFToken();
      const token2 = securityService.generateCSRFToken();

      expect(token1).toBeDefined();
      expect(token2).toBeDefined();
      expect(token1).not.toBe(token2);
      expect(token1.length).toBe(64); // Should be 64 characters
      expect(token2.length).toBe(64);
    });

    it('should validate CSRF tokens correctly', () => {
      const token = securityService.generateCSRFToken();

      expect(securityService.validateCSRFToken(token, token)).toBe(true);
      expect(securityService.validateCSRFToken(token, 'wrong')).toBe(false);
      expect(securityService.validateCSRFToken('', token)).toBe(false);
      expect(securityService.validateCSRFToken(token, '')).toBe(false);
    });
  });

  describe('Secure Random Generation', () => {
    it('should generate cryptographically secure random strings', () => {
      const random1 = securityService.generateSecureRandom();
      const random2 = securityService.generateSecureRandom();

      expect(random1).toBeDefined();
      expect(random2).toBeDefined();
      expect(random1).not.toBe(random2);
      expect(random1.length).toBe(32); // Default length
      expect(random2.length).toBe(32);

      // Should be hexadecimal
      expect(/^[0-9a-f]+$/.test(random1)).toBe(true);
      expect(/^[0-9a-f]+$/.test(random2)).toBe(true);
    });

    it('should generate random strings of specified length', () => {
      const lengths = [8, 16, 24, 64];

      lengths.forEach((length) => {
        const random = securityService.generateSecureRandom(length);
        expect(random.length).toBe(length);
        expect(/^[0-9a-f]+$/.test(random)).toBe(true);
      });
    });
  });

  describe('IP Whitelisting', () => {
    it('should whitelist localhost IPs', () => {
      const localhostIPs = ['127.0.0.1', '::1', 'localhost'];

      localhostIPs.forEach((ip) => {
        expect(securityService.isWhitelistedIP(ip)).toBe(true);
      });
    });

    it('should not whitelist external IPs', () => {
      const externalIPs = ['192.168.1.100', '10.0.0.1', '8.8.8.8', 'evil.com'];

      externalIPs.forEach((ip) => {
        expect(securityService.isWhitelistedIP(ip)).toBe(false);
      });
    });
  });
});
