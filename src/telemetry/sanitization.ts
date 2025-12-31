/**
 * Privacy Sanitization for Telemetry
 */
import crypto from 'crypto';

/**
 * Fields that must NEVER be included in telemetry
 */
export const BANNED_FIELDS = [
  // User identification
  'email',
  'username',
  'user_id',
  'ip_address',
  'mac_address',

  // Sensitive credentials
  'api_key',
  'password',
  'token',
  'secret',
  'auth_token',
  'bearer',
  'authorization',

  // Code and file contents
  'file_content',
  'code_content',
  'file_path',
  'directory_path',
  'absolute_path',

  // Specific project data
  'git_commit',
  'git_branch',
  'repository_url',
  'repo_url',

  // Detailed error info
  'error_message',  // Only error_type, not message
  'stack_trace',    // Only hash, not actual trace

  // Any custom user data
  'input_data',
  'output_data',
  'prompt_content',
  'llm_response',
  'user_input',
  'user_data',
];

/**
 * Patterns that indicate sensitive data
 * Enhanced with more credential types and PII patterns
 */
const SENSITIVE_PATTERNS = [
  // API Keys and Tokens
  /sk-[a-zA-Z0-9-_]+/,           // OpenAI API keys
  /Bearer\s+[a-zA-Z0-9-_\.]+/,   // Bearer tokens
  /ghp_[a-zA-Z0-9]{36}/,         // GitHub Personal Access Tokens
  /gho_[a-zA-Z0-9]{36}/,         // GitHub OAuth tokens
  /ghu_[a-zA-Z0-9]{36}/,         // GitHub User tokens
  /ghs_[a-zA-Z0-9]{36}/,         // GitHub Server tokens
  /ghr_[a-zA-Z0-9]{36}/,         // GitHub Refresh tokens
  /AKIA[0-9A-Z]{16}/,            // AWS Access Key IDs
  /[a-zA-Z0-9\/\+]{40}/,         // AWS Secret Access Keys (base64-ish 40 chars)
  /AIza[0-9A-Za-z_-]{35}/,       // Google API keys
  /ya29\.[0-9A-Za-z_-]+/,        // Google OAuth tokens

  // JWT Tokens
  /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/,  // JWT pattern

  // Database Connection Strings
  /postgres:\/\/[^:]+:[^@]+@[^\/]+/,     // PostgreSQL
  /mysql:\/\/[^:]+:[^@]+@[^\/]+/,        // MySQL
  /mongodb(\+srv)?:\/\/[^:]+:[^@]+@[^\/]+/,  // MongoDB
  /redis:\/\/[^:]+:[^@]+@[^\/]+/,        // Redis

  // File Paths (expanded)
  /\/Users\/[^\/]+\//,            // macOS user paths
  /\/home\/[^\/]+\//,             // Linux user paths
  /C:\\Users\\[^\\]+\\/,          // Windows user paths
  /\/private\/[^\/]+\//,          // macOS private paths

  // PII Patterns
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // Email addresses
  /\d{3}-\d{2}-\d{4}/,           // SSN-like patterns
  /\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/,  // Credit card numbers
  /\+?1?\d{10,14}/,              // Phone numbers

  // Cryptographic Material
  /-----BEGIN (RSA |DSA |EC |OPENSSH )?PRIVATE KEY-----/,  // Private keys
  /-----BEGIN CERTIFICATE-----/,                             // Certificates
];

/**
 * Check if a string looks like sensitive data
 */
export function looksLikeSensitive(value: string): boolean {
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(value));
}

/**
 * Hash a sensitive value (SHA-256, first 16 chars)
 * Handles errors gracefully and returns a fallback hash
 */
export function hashValue(value: string): string {
  try {
    return crypto
      .createHash('sha256')
      .update(value)
      .digest('hex')
      .substring(0, 16);
  } catch (error) {
    // Fallback: return a consistent placeholder if hashing fails
    return '[hash_failed]'.padEnd(16, '0');
  }
}

/**
 * Sanitize a telemetry event
 * - Removes banned fields
 * - Hashes sensitive-looking strings
 * - Truncates long strings
 * - Handles circular references, null/undefined, and errors gracefully
 */
export function sanitizeEvent(event: unknown, visited = new WeakSet(), depth = 0): unknown {
  try {
    // Prevent stack overflow from deeply nested objects
    const MAX_DEPTH = 50;
    if (depth > MAX_DEPTH) {
      return '[Max Depth Exceeded]';
    }

    // Handle null, undefined, primitives
    if (event == null) {
      return event;
    }

    if (typeof event !== 'object') {
      return event;
    }

    // Handle circular references
    if (visited.has(event)) {
      return '[Circular Reference]';
    }
    visited.add(event);

    // Handle arrays
    if (Array.isArray(event)) {
      return event.map(item => sanitizeEvent(item, visited, depth + 1));
    }

    // Handle Date objects
    if (event instanceof Date) {
      return event.toISOString();
    }

    // Handle Error objects
    if (event instanceof Error) {
      return {
        name: event.name,
        message: '[Error Message Redacted]',
        // Don't include stack trace (privacy)
      };
    }

    // Create sanitized copy
    const sanitized: Record<string, unknown> = {};

    // Process all enumerable properties
    for (const key in event) {
      try {
        // Skip banned fields
        if (BANNED_FIELDS.includes(key)) {
          continue;
        }

        // Skip non-own properties (prototype chain)
        if (!Object.prototype.hasOwnProperty.call(event, key)) {
          continue;
        }

        // Get value safely (might be a getter that throws)
        let value;
        try {
          value = event[key];
        } catch (error) {
          // Getter threw error - skip this field
          continue;
        }

        // Sanitize based on type
        if (typeof value === 'string') {
          // Hash if looks sensitive
          if (looksLikeSensitive(value)) {
            sanitized[key] = hashValue(value);
          }
          // Truncate very long strings
          else if (value.length > 1000) {
            sanitized[key] = value.substring(0, 1000) + '...[truncated]';
          }
          else {
            sanitized[key] = value;
          }
        }
        // Recursively sanitize objects
        else if (value && typeof value === 'object') {
          sanitized[key] = sanitizeEvent(value, visited, depth + 1);
        }
        // Copy primitives
        else {
          sanitized[key] = value;
        }
      } catch (error) {
        // Field-level error - skip this field but continue processing
        continue;
      }
    }

    return sanitized;
  } catch (error) {
    // Catastrophic error - return minimal safe object
    return {
      event: (event as Record<string, unknown> | null | undefined)?.event || 'sanitization_failed',
      error: 'Failed to sanitize event',
    };
  }
}

/**
 * Hash a stack trace for grouping errors
 * Handles errors gracefully and returns a fallback hash
 */
export function hashStackTrace(stackTrace: string): string {
  try {
    // Handle empty or invalid input
    if (!stackTrace || typeof stackTrace !== 'string') {
      return '[invalid_stack]'.padEnd(16, '0');
    }

    // Remove line numbers and file paths, keep only function names and structure
    const normalized = stackTrace
      .split('\n')
      .map(line => {
        try {
          return line
            .replace(/:\d+:\d+/g, '')  // Remove line:col
            .replace(/\/[^\s]+\//g, '');  // Remove paths
        } catch {
          return line;
        }
      })
      .join('\n');

    return crypto
      .createHash('sha256')
      .update(normalized)
      .digest('hex')
      .substring(0, 16);
  } catch (error) {
    // Fallback: return a consistent placeholder if hashing fails
    return '[hash_failed]'.padEnd(16, '0');
  }
}
