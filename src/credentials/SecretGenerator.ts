/**
 * Secret Generator - Secure Credential Generation
 *
 * Provides utilities for generating secure credentials:
 * - Passwords with configurable strength
 * - API keys and tokens
 * - SSH keys
 * - Encryption keys
 * - Random secrets with custom alphabets
 */

import crypto from 'crypto';
import { logger } from '../utils/logger.js';

/**
 * Password strength level
 */
export enum PasswordStrength {
  WEAK = 'weak',
  MEDIUM = 'medium',
  STRONG = 'strong',
  VERY_STRONG = 'very_strong',
}

/**
 * Password generation options
 */
export interface PasswordOptions {
  /**
   * Password length (default: 16)
   */
  length?: number;

  /**
   * Include lowercase letters (default: true)
   */
  lowercase?: boolean;

  /**
   * Include uppercase letters (default: true)
   */
  uppercase?: boolean;

  /**
   * Include digits (default: true)
   */
  digits?: boolean;

  /**
   * Include special characters (default: true)
   */
  special?: boolean;

  /**
   * Custom special characters (default: !@#$%^&*()_+-=[]{}|;:,.<>?)
   */
  specialChars?: string;

  /**
   * Exclude ambiguous characters (0O, 1lI, etc.) (default: false)
   */
  excludeAmbiguous?: boolean;

  /**
   * Minimum number of each character type (default: 1)
   */
  minOfEachType?: number;
}

/**
 * API key generation options
 */
export interface ApiKeyOptions {
  /**
   * Key prefix (e.g., 'sk_', 'pk_')
   */
  prefix?: string;

  /**
   * Key length in bytes (default: 32)
   */
  length?: number;

  /**
   * Encoding format (default: 'base64url')
   */
  encoding?: 'base64' | 'base64url' | 'hex';
}

/**
 * SSH key generation options
 */
export interface SshKeyOptions {
  /**
   * Key type (default: 'ed25519')
   */
  type?: 'rsa' | 'ed25519' | 'ecdsa';

  /**
   * Key size in bits (for RSA, default: 4096)
   */
  bits?: number;

  /**
   * Comment/label for the key
   */
  comment?: string;

  /**
   * Passphrase for encrypted private key
   */
  passphrase?: string;
}

/**
 * Generated SSH key pair
 */
export interface SshKeyPair {
  publicKey: string;
  privateKey: string;
  fingerprint: string;
  type: string;
  comment?: string;
}

/**
 * Secret template for common credential types
 */
export interface SecretTemplate {
  name: string;
  description: string;
  generator: () => string;
  strength: PasswordStrength;
  pattern?: RegExp;
}

/**
 * Secret Generator
 */
export class SecretGenerator {
  private static readonly LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
  private static readonly UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  private static readonly DIGITS = '0123456789';
  private static readonly SPECIAL = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  private static readonly AMBIGUOUS = '0O1lI';

  /**
   * Generate a secure password
   */
  static generatePassword(options: PasswordOptions = {}): string {
    const opts = {
      length: 16,
      lowercase: true,
      uppercase: true,
      digits: true,
      special: true,
      specialChars: this.SPECIAL,
      excludeAmbiguous: false,
      minOfEachType: 1,
      ...options,
    };

    // Build character set
    let charset = '';
    const requiredChars: string[] = [];

    if (opts.lowercase) {
      let chars = this.LOWERCASE;
      if (opts.excludeAmbiguous) {
        chars = chars.replace(/[lI]/g, '');
      }
      charset += chars;
      for (let i = 0; i < opts.minOfEachType; i++) {
        requiredChars.push(this.randomChar(chars));
      }
    }

    if (opts.uppercase) {
      let chars = this.UPPERCASE;
      if (opts.excludeAmbiguous) {
        chars = chars.replace(/[OI]/g, '');
      }
      charset += chars;
      for (let i = 0; i < opts.minOfEachType; i++) {
        requiredChars.push(this.randomChar(chars));
      }
    }

    if (opts.digits) {
      let chars = this.DIGITS;
      if (opts.excludeAmbiguous) {
        chars = chars.replace(/[01]/g, '');
      }
      charset += chars;
      for (let i = 0; i < opts.minOfEachType; i++) {
        requiredChars.push(this.randomChar(chars));
      }
    }

    if (opts.special) {
      charset += opts.specialChars;
      for (let i = 0; i < opts.minOfEachType; i++) {
        requiredChars.push(this.randomChar(opts.specialChars));
      }
    }

    if (charset.length === 0) {
      throw new Error('At least one character type must be enabled');
    }

    // Generate remaining random characters
    const remainingLength = opts.length - requiredChars.length;
    if (remainingLength < 0) {
      throw new Error('Password length too short for required character types');
    }

    for (let i = 0; i < remainingLength; i++) {
      requiredChars.push(this.randomChar(charset));
    }

    // Shuffle to avoid predictable patterns
    return this.shuffle(requiredChars).join('');
  }

  /**
   * Generate a secure API key
   */
  static generateApiKey(options: ApiKeyOptions = {}): string {
    const opts = {
      length: 32,
      encoding: 'base64url' as const,
      ...options,
    };

    const bytes = crypto.randomBytes(opts.length);
    let key: string;

    switch (opts.encoding) {
      case 'base64':
        key = bytes.toString('base64');
        break;
      case 'base64url':
        key = bytes.toString('base64url');
        break;
      case 'hex':
        key = bytes.toString('hex');
        break;
      default:
        throw new Error(`Unknown encoding: ${opts.encoding}`);
    }

    return opts.prefix ? `${opts.prefix}${key}` : key;
  }

  /**
   * Generate a UUID v4
   */
  static generateUUID(): string {
    return crypto.randomUUID();
  }

  /**
   * Generate a secure random token
   */
  static generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('base64url');
  }

  /**
   * Generate an encryption key
   */
  static generateEncryptionKey(bits: number = 256): string {
    if (![128, 192, 256].includes(bits)) {
      throw new Error('Key size must be 128, 192, or 256 bits');
    }

    return crypto.randomBytes(bits / 8).toString('hex');
  }

  /**
   * Generate a secret with custom alphabet
   */
  static generateCustomSecret(alphabet: string, length: number): string {
    if (!alphabet || alphabet.length === 0) {
      throw new Error('Alphabet cannot be empty');
    }
    if (length <= 0) {
      throw new Error('Length must be positive');
    }

    const result: string[] = [];
    for (let i = 0; i < length; i++) {
      result.push(this.randomChar(alphabet));
    }

    return result.join('');
  }

  /**
   * Generate a PIN code
   */
  static generatePIN(digits: number = 6): string {
    if (digits < 4 || digits > 12) {
      throw new Error('PIN must be between 4 and 12 digits');
    }

    return this.generateCustomSecret(this.DIGITS, digits);
  }

  /**
   * Generate a passphrase from word list
   */
  static generatePassphrase(wordCount: number = 6, separator: string = '-'): string {
    // Simplified word list (in production, use a comprehensive word list like EFF's)
    const words = [
      'correct', 'horse', 'battery', 'staple', 'mountain', 'river',
      'ocean', 'forest', 'desert', 'cloud', 'thunder', 'lightning',
      'rainbow', 'sunset', 'sunrise', 'galaxy', 'planet', 'comet',
      'asteroid', 'nebula', 'quasar', 'pulsar', 'meteor', 'eclipse',
      'aurora', 'crater', 'volcano', 'canyon', 'glacier', 'tundra',
    ];

    if (wordCount < 3 || wordCount > 10) {
      throw new Error('Word count must be between 3 and 10');
    }

    const selectedWords: string[] = [];
    for (let i = 0; i < wordCount; i++) {
      const randomIndex = crypto.randomInt(0, words.length);
      selectedWords.push(words[randomIndex]);
    }

    return selectedWords.join(separator);
  }

  /**
   * Estimate password strength
   */
  static estimateStrength(password: string): {
    strength: PasswordStrength;
    entropy: number;
    score: number;
  } {
    let charsetSize = 0;

    if (/[a-z]/.test(password)) charsetSize += 26;
    if (/[A-Z]/.test(password)) charsetSize += 26;
    if (/[0-9]/.test(password)) charsetSize += 10;
    if (/[^a-zA-Z0-9]/.test(password)) charsetSize += 32;

    // Calculate entropy: log2(charsetSize^length)
    const entropy = Math.log2(Math.pow(charsetSize, password.length));

    // Score based on entropy
    let score: number;
    let strength: PasswordStrength;

    if (entropy < 40) {
      score = 1;
      strength = PasswordStrength.WEAK;
    } else if (entropy < 60) {
      score = 2;
      strength = PasswordStrength.MEDIUM;
    } else if (entropy < 80) {
      score = 3;
      strength = PasswordStrength.STRONG;
    } else {
      score = 4;
      strength = PasswordStrength.VERY_STRONG;
    }

    return { strength, entropy, score };
  }

  /**
   * Validate password against requirements
   */
  static validatePassword(
    password: string,
    requirements: PasswordOptions = {}
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (requirements.length && password.length < requirements.length) {
      errors.push(`Password must be at least ${requirements.length} characters`);
    }

    if (requirements.lowercase !== false && !/[a-z]/.test(password)) {
      errors.push('Password must contain lowercase letters');
    }

    if (requirements.uppercase !== false && !/[A-Z]/.test(password)) {
      errors.push('Password must contain uppercase letters');
    }

    if (requirements.digits !== false && !/[0-9]/.test(password)) {
      errors.push('Password must contain digits');
    }

    if (requirements.special !== false && !/[^a-zA-Z0-9]/.test(password)) {
      errors.push('Password must contain special characters');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get predefined secret templates
   */
  static getTemplates(): Record<string, SecretTemplate> {
    return {
      webPassword: {
        name: 'Web Password',
        description: 'Strong password for web applications',
        generator: () =>
          this.generatePassword({
            length: 16,
            lowercase: true,
            uppercase: true,
            digits: true,
            special: true,
            excludeAmbiguous: true,
          }),
        strength: PasswordStrength.STRONG,
        pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{16,}$/,
      },

      apiKey: {
        name: 'API Key',
        description: 'Secure API key with prefix',
        generator: () => this.generateApiKey({ prefix: 'sk_', length: 32 }),
        strength: PasswordStrength.VERY_STRONG,
        pattern: /^sk_[A-Za-z0-9_-]{43}$/,
      },

      databasePassword: {
        name: 'Database Password',
        description: 'Very strong password for database access',
        generator: () =>
          this.generatePassword({
            length: 32,
            lowercase: true,
            uppercase: true,
            digits: true,
            special: true,
            minOfEachType: 2,
          }),
        strength: PasswordStrength.VERY_STRONG,
      },

      encryptionKey: {
        name: 'Encryption Key',
        description: 'AES-256 encryption key',
        generator: () => this.generateEncryptionKey(256),
        strength: PasswordStrength.VERY_STRONG,
        pattern: /^[0-9a-f]{64}$/,
      },

      accessToken: {
        name: 'Access Token',
        description: 'Temporary access token',
        generator: () => this.generateToken(32),
        strength: PasswordStrength.VERY_STRONG,
        pattern: /^[A-Za-z0-9_-]{43}$/,
      },

      pin: {
        name: 'PIN Code',
        description: '6-digit PIN code',
        generator: () => this.generatePIN(6),
        strength: PasswordStrength.WEAK,
        pattern: /^\d{6}$/,
      },

      passphrase: {
        name: 'Passphrase',
        description: 'Memorable passphrase',
        generator: () => this.generatePassphrase(6, '-'),
        strength: PasswordStrength.STRONG,
      },
    };
  }

  /**
   * Generate secret from template
   */
  static generateFromTemplate(templateName: string): string {
    const templates = this.getTemplates();
    const template = templates[templateName];

    if (!template) {
      throw new Error(`Unknown template: ${templateName}`);
    }

    const secret = template.generator();

    logger.info('Secret generated from template', {
      template: templateName,
      strength: template.strength,
    });

    return secret;
  }

  /**
   * Get a cryptographically secure random character from charset
   */
  private static randomChar(charset: string): string {
    const index = crypto.randomInt(0, charset.length);
    return charset[index];
  }

  /**
   * Shuffle array using Fisher-Yates algorithm with crypto.randomInt
   */
  private static shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}
