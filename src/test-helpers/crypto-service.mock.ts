import { vi } from 'vitest';

/**
 * PROPER CryptoService Mock Factory
 * 
 * This is how a real professional handles service mocking - 
 * complete, consistent, and reusable across all test files.
 * 
 * No more LAZY MOCKING SYNDROME!
 */
export function createCryptoServiceSpy(overrides: Partial<CryptoServiceSpy> = {}): CryptoServiceSpy {
  const defaultSpy: CryptoServiceSpy = {
    encrypt: vi.fn().mockImplementation((data: any) => {
      // Return realistic encrypted format that matches actual service
      const encryptedContainer = {
        version: 'v1',
        data: btoa(JSON.stringify(data)) // Simple base64 encoding for test
      };
      return JSON.stringify(encryptedContainer);
    }),
    
    decrypt: vi.fn().mockImplementation((encryptedData: string) => {
      try {
        // Handle the encrypted container format
        const parsed = JSON.parse(encryptedData);
        if (parsed && parsed.version === 'v1' && parsed.data) {
          return JSON.parse(atob(parsed.data));
        }
        // Fallback to plain JSON for legacy tests
        return parsed;
      } catch {
        // If parsing fails, return null (matches real service behavior)
        return null;
      }
    }),
    
    getItem: vi.fn().mockImplementation((key: string) => {
      // Return null by default (no data stored)
      return null;
    }),
    
    setItem: vi.fn().mockImplementation((key: string, data: any) => {
      // Mock successful storage (void return)
    }),
    
    getStorageKey: vi.fn().mockReturnValue('taskgo_tasks'),
    
    clear: vi.fn().mockImplementation(() => {
      // Mock clearing all storage
      return;
    }),
    
    clearTaskStorage: vi.fn().mockImplementation(() => {
      // Mock clearing task storage
      return;
    }),
    
    regenerateSessionKey: vi.fn().mockImplementation(() => {
      // Mock session key regeneration
      return;
    })
  };

  // Apply any overrides (useful for specific test scenarios)
  return { ...defaultSpy, ...overrides };
}

/**
 * Type definition for the CryptoService spy
 * This ensures ALL methods are properly mocked
 */
export interface CryptoServiceSpy {
  encrypt: ReturnType<typeof vi.fn>;
  decrypt: ReturnType<typeof vi.fn>;
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
  getStorageKey: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
  clearTaskStorage: ReturnType<typeof vi.fn>;
  regenerateSessionKey: ReturnType<typeof vi.fn>;
}

/**
 * Test data factory for encrypted storage scenarios
 */
export function createEncryptedStorageData(data: any): string {
  const encryptedContainer = {
    version: 'v1',
    data: btoa(JSON.stringify(data))
  };
  return JSON.stringify(encryptedContainer);
}

/**
 * Mock localStorage encrypted data setup
 */
export function setupEncryptedLocalStorage(key: string, data: any): void {
  const encryptedData = createEncryptedStorageData(data);
  localStorage.setItem(key, encryptedData);
}

/**
 * Common test scenarios for CryptoService
 */
export const CryptoServiceTestScenarios = {
  /**
   * Mock successful encryption/decryption cycle
   */
  successfulEncryption: (data: any) => ({
    encrypt: vi.fn().mockReturnValue(createEncryptedStorageData(data)),
    decrypt: vi.fn().mockReturnValue(data)
  }),
  
  /**
   * Mock decryption failure (corrupted data)
   */
  decryptionFailure: () => ({
    decrypt: vi.fn().mockReturnValue(null)
  }),
  
  /**
   * Mock encryption failure (falls back to plain text)
   */
  encryptionFailure: () => ({
    encrypt: vi.fn().mockImplementation(() => {
      throw new Error('Encryption failed');
    })
  }),
  
  /**
   * Mock storage operations with specific data
   */
  withStoredData: (key: string, data: any) => ({
    getItem: vi.fn().mockReturnValue(data),
    setItem: vi.fn().mockImplementation((k: string, d: any) => {
      if (k === key) {
        // Mock storing the data
        return;
      }
    })
  })
};