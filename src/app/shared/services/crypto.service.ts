import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CryptoService {
  private readonly STORAGE_KEY = 'taskgo_tasks';
  private readonly ENCRYPTION_VERSION = 'v1';
  private encryptionKey: string = '';

  constructor() {
    this.generateSessionKey();
  }

  /**
   * Generate a new session key (for testing session uniqueness)
   */
  regenerateSessionKey(): void {
    this.generateSessionKey();
  }

  /**
   * Generate a session-specific encryption key
   */
  private generateSessionKey(): void {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2);
    this.encryptionKey = btoa(`${timestamp}_${random}_${this.ENCRYPTION_VERSION}`);
  }

  /**
   * Simple XOR encryption with base64 encoding for JSON safety
   */
  private xorEncrypt(text: string, key: string): string {
    // Convert text to UTF-8 bytes first
    const textBytes = new TextEncoder().encode(text);
    const keyBytes = new TextEncoder().encode(key);
    
    // Perform XOR on each byte
    const encryptedBytes = textBytes.map((byte, i) => 
      byte ^ keyBytes[i % keyBytes.length]
    );
    
    // Convert to base64 string to ensure JSON-safe characters
    return btoa(String.fromCharCode(...encryptedBytes));
  }

  /**
   * Simple XOR decryption with base64 decoding
   */
  private xorDecrypt(encrypted: string, key: string): string {
    try {
      // Decode base64 to get encrypted bytes
      const encryptedBytes = new Uint8Array(
        atob(encrypted).split('').map(char => char.charCodeAt(0))
      );
      
      const keyBytes = new TextEncoder().encode(key);
      
      // Perform XOR to decrypt
      const decryptedBytes = encryptedBytes.map((byte, i) => 
        byte ^ keyBytes[i % keyBytes.length]
      );
      
      // Convert bytes back to UTF-8 string
      return new TextDecoder().decode(decryptedBytes);
    } catch (error) {
      // Handle decryption errors
      return '';
    }
  }

  /**
    * Encrypt data before localStorage storage
    */
  encrypt(data: any): string {
    try {
      const jsonString = JSON.stringify(data);
      const encrypted = this.xorEncrypt(jsonString, this.encryptionKey);
      // Store as JSON object with encrypted payload for JSON.parse compatibility
      const encryptedContainer = {
        version: this.ENCRYPTION_VERSION,
        data: encrypted
      };
      return JSON.stringify(encryptedContainer);
    } catch (error) {
      // If encryption fails, return original data (fallback)
      console.warn('Encryption failed, falling back to plain text:', error);
      return JSON.stringify(data);
    }
  }

  /**
    * Decrypt data from localStorage
    */
  decrypt<T = any>(encryptedData: string): T | null {
    try {
      // Try to parse as JSON first (new format)
      let parsed: any;
      try {
        parsed = JSON.parse(encryptedData);
      } catch {
        // Not JSON, try legacy format
        if (!encryptedData.includes(':')) {
          return JSON.parse(encryptedData) as T;
        }

        const [version, encrypted] = encryptedData.split(':', 2);
        if (version !== this.ENCRYPTION_VERSION) {
          return JSON.parse(encryptedData) as T;
        }

        const decrypted = this.xorDecrypt(encrypted, this.encryptionKey);
        return JSON.parse(decrypted) as T;
      }

      // Handle new JSON container format
      if (parsed && typeof parsed === 'object' && parsed.version === this.ENCRYPTION_VERSION && parsed.data) {
        const decrypted = this.xorDecrypt(parsed.data, this.encryptionKey);
        return JSON.parse(decrypted) as T;
      }

      // Legacy format with colon separator
      if (typeof parsed === 'string' && parsed.includes(':')) {
        const [version, encrypted] = parsed.split(':', 2);
        if (version === this.ENCRYPTION_VERSION) {
          const decrypted = this.xorDecrypt(encrypted, this.encryptionKey);
          if (decrypted) {
            return JSON.parse(decrypted) as T;
          }
        }
      }

      // Handle direct legacy format (non-JSON but has colon)
      if (typeof encryptedData === 'string' && encryptedData.includes(':')) {
        const [version, encrypted] = encryptedData.split(':', 2);
        if (version === this.ENCRYPTION_VERSION) {
          const decrypted = this.xorDecrypt(encrypted, this.encryptionKey);
          if (decrypted) {
            return JSON.parse(decrypted) as T;
          }
        }
      }

      // Fallback: treat as plain JSON
      return parsed as T;
    } catch (error) {
      console.warn('Decryption failed, data may be corrupted:', error);
      return null;
    }
  }

  /**
   * Store encrypted data in localStorage
   */
  setItem(key: string, data: any): void {
    try {
      const encrypted = this.encrypt(data);
      localStorage.setItem(key, encrypted);
    } catch (error) {
      console.error('Failed to store encrypted data:', error);
      localStorage.setItem(key, JSON.stringify(data));
    }
  }

  /**
   * Retrieve and decrypt data from localStorage
   */
  getItem<T = any>(key: string): T | null {
    try {
      const encryptedData = localStorage.getItem(key);
      if (!encryptedData) {
        return null;
      }
      return this.decrypt<T>(encryptedData);
    } catch (error) {
      console.error('Failed to retrieve and decrypt data:', error);
      return null;
    }
  }

  /**
   * Remove item from localStorage
   */
  removeItem(key: string): void {
    localStorage.removeItem(key);
  }

  /**
   * Get storage key (public method for TaskService)
   */
  getStorageKey(): string {
    return this.STORAGE_KEY;
  }

  /**
   * Clear all localStorage
   */
  clear(): void {
    localStorage.clear();
  }

  /**
   * Clear task-related storage (useful for tests)
   */
  clearTaskStorage(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}