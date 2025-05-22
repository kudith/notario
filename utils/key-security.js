import crypto from "crypto";
import { promisify } from "util";
import fs from "fs";
import path from "path";

// Convert callback-based crypto functions to Promise-based
const scryptAsync = promisify(crypto.scrypt);
const randomBytesAsync = promisify(crypto.randomBytes);

/**
 * Enhanced key security utilities for secure storage and handling
 */
export class KeySecurity {
  /**
   * Encrypt a private key with a strong passphrase
   * @param {string} privateKey - PEM format private key 
   * @param {string} passphrase - User's passphrase
   * @returns {Promise<{encryptedKey: string, iv: string, salt: string, algorithm: string}>}
   */
  static async encryptPrivateKey(privateKey, passphrase) {
    if (!privateKey || !passphrase) {
      throw new Error("Private key and passphrase are required");
    }
    
    try {
      // Generate cryptographically strong random values
      const salt = await randomBytesAsync(32); // 256 bits
      const iv = await randomBytesAsync(16);   // 128 bits for AES
      
      // Derive a strong encryption key from the passphrase using key stretching
      const derivedKey = await scryptAsync(passphrase, salt, 32); // 256-bit key
      
      // Encrypt the private key with AES-256-GCM (authenticated encryption)
      const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);
      
      let encryptedKey = cipher.update(privateKey, 'utf8', 'hex');
      encryptedKey += cipher.final('hex');
      
      // Get authentication tag to verify integrity during decryption
      const authTag = cipher.getAuthTag();
      
      return {
        encryptedKey,
        iv: iv.toString('hex'),
        salt: salt.toString('hex'),
        authTag: authTag.toString('hex'),
        algorithm: 'aes-256-gcm'
      };
    } catch (error) {
      console.error("Error encrypting private key:", error);
      throw new Error("Private key encryption failed");
    }
  }
  
  /**
   * Decrypt an encrypted private key
   * @param {Object} encryptedData - The encrypted key data
   * @param {string} passphrase - User's passphrase
   * @returns {Promise<string>} - The decrypted private key
   */
  static async decryptPrivateKey(encryptedData, passphrase) {
    try {
      const { encryptedKey, iv, salt, authTag, algorithm } = encryptedData;
      
      // Derive the same key from passphrase
      const derivedKey = await scryptAsync(
        passphrase,
        Buffer.from(salt, 'hex'),
        32
      );
      
      // Setup decipher with authentication
      const decipher = crypto.createDecipheriv(
        algorithm,
        derivedKey,
        Buffer.from(iv, 'hex')
      );
      
      // Set auth tag for verification
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      
      // Decrypt
      let decrypted = decipher.update(encryptedKey, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      if (error.message.includes('auth')) {
        throw new Error("Authentication failed. The key may have been tampered with or the passphrase is incorrect.");
      }
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }
  
  /**
   * Export encrypted key to file with proper permissions
   * @param {Object} encryptedData - The encrypted key data
   * @param {string} filepath - Path to save the key
   */
  static async saveEncryptedKey(encryptedData, filepath) {
    try {
      // Create directory if it doesn't exist
      const dir = path.dirname(filepath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Save encrypted key data
      await fs.promises.writeFile(
        filepath,
        JSON.stringify(encryptedData, null, 2),
        { 
          encoding: 'utf8',
          mode: 0o600 // Read/write for owner only
        }
      );
      
      console.log(`Encrypted key saved to ${filepath}`);
      return true;
    } catch (error) {
      console.error("Error saving encrypted key:", error);
      throw error;
    }
  }
  
  /**
   * Generate a fingerprint from a public or private key
   * @param {string} key - PEM format key
   * @returns {string} - Fingerprint string
   */
  static generateKeyFingerprint(key) {
    return crypto
      .createHash("sha256")
      .update(key)
      .digest("hex");
  }
  
  /**
   * Check if a key needs rotation based on age
   * @param {Date} keyCreationDate - When the key was created
   * @param {number} maxAgeInDays - Maximum key age in days
   * @returns {boolean} - True if key rotation is needed
   */
  static isKeyRotationNeeded(keyCreationDate, maxAgeInDays = 90) {
    const now = new Date();
    const ageInMs = now - keyCreationDate;
    const ageInDays = ageInMs / (1000 * 60 * 60 * 24);
    return ageInDays > maxAgeInDays;
  }
}