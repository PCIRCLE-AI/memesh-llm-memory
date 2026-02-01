/**
 * Secret Manager Types
 *
 * Type definitions for the SecretManager - secure storage for
 * API tokens, passwords, and other sensitive data.
 *
 * Part of Phase 0.7.0 memory system upgrade.
 */

/**
 * Types of secrets that can be detected
 */
export type SecretType =
  | 'api_key'
  | 'bearer_token'
  | 'jwt'
  | 'password'
  | 'oauth_token'
  | 'generic';

/**
 * Detected secret with type and position
 */
export interface DetectedSecret {
  /** Type of secret detected */
  type: SecretType;
  /** The actual secret value */
  value: string;
  /** Start position in the original content */
  startIndex: number;
  /** End position in the original content */
  endIndex: number;
  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * Stored secret entry
 */
export interface StoredSecret {
  /** Unique identifier */
  id: string;
  /** User-defined name for the secret */
  name: string;
  /** Type of secret */
  secretType: SecretType;
  /** Encrypted value (AES-256-GCM) */
  encryptedValue: string;
  /** Initialization vector for decryption */
  iv: string;
  /** Authentication tag for GCM */
  authTag: string;
  /** When the secret was stored */
  createdAt: Date;
  /** When the secret was last updated */
  updatedAt: Date;
  /** Optional expiration date */
  expiresAt?: Date;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Secret storage options
 */
export interface SecretStoreOptions {
  /** User-defined name for the secret */
  name: string;
  /** Type of secret */
  secretType?: SecretType;
  /** Expiration time in seconds (default: 30 days) */
  expiresInSeconds?: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * User confirmation request for storing a secret
 */
export interface SecretConfirmationRequest {
  /** i18n message key for the confirmation prompt */
  messageKey: string;
  /** Parameters for the message template */
  params: {
    /** Name of the secret */
    secretName: string;
    /** Masked value (first4****last4) */
    maskedValue: string;
    /** Human-readable expiration (e.g., "30 days") */
    expiresIn: string;
  };
  /** Privacy notice i18n key */
  privacyNoticeKey: string;
}

/**
 * Secret patterns for auto-detection
 */
export interface SecretPattern {
  /** Name of the pattern */
  name: string;
  /** Secret type */
  type: SecretType;
  /** Regular expression pattern */
  pattern: RegExp;
  /** Confidence score for this pattern (0-1) */
  confidence: number;
}

/**
 * Default secret patterns for auto-detection
 */
export const DEFAULT_SECRET_PATTERNS: SecretPattern[] = [
  // OpenAI/Anthropic API keys
  {
    name: 'OpenAI API Key',
    type: 'api_key',
    pattern: /sk-[a-zA-Z0-9]{20,}/g,
    confidence: 0.95,
  },
  // GitHub Personal Access Tokens
  {
    name: 'GitHub PAT',
    type: 'api_key',
    pattern: /ghp_[a-zA-Z0-9]{36,}/g,
    confidence: 0.95,
  },
  // GitHub OAuth tokens
  {
    name: 'GitHub OAuth',
    type: 'oauth_token',
    pattern: /gho_[a-zA-Z0-9]{36,}/g,
    confidence: 0.95,
  },
  // AWS Access Key IDs
  {
    name: 'AWS Access Key',
    type: 'api_key',
    pattern: /AKIA[0-9A-Z]{16}/g,
    confidence: 0.95,
  },
  // Bearer tokens
  {
    name: 'Bearer Token',
    type: 'bearer_token',
    pattern: /Bearer\s+[a-zA-Z0-9\-._~+/]+=*/gi,
    confidence: 0.85,
  },
  // JWT tokens
  {
    name: 'JWT',
    type: 'jwt',
    pattern: /eyJ[a-zA-Z0-9\-_]+\.eyJ[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+/g,
    confidence: 0.9,
  },
  // Generic password patterns (in config files)
  {
    name: 'Password Assignment',
    type: 'password',
    pattern: /(?:password|passwd|pwd|secret|token)\s*[:=]\s*["']?([^"'\s]{8,})["']?/gi,
    confidence: 0.7,
  },
  // Anthropic API keys
  {
    name: 'Anthropic API Key',
    type: 'api_key',
    pattern: /sk-ant-[a-zA-Z0-9\-]{20,}/g,
    confidence: 0.95,
  },
];
