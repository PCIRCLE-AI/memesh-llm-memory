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
 */
const SENSITIVE_PATTERNS = [
  /sk-[a-zA-Z0-9-_]+/,           // API keys (OpenAI, etc.)
  /Bearer\s+[a-zA-Z0-9-_\.]+/,   // Bearer tokens
  /\/Users\/[^\/]+\//,            // macOS user paths
  /\/home\/[^\/]+\//,             // Linux user paths
  /C:\\Users\\[^\\]+\\/,          // Windows user paths
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // Email addresses
  /\d{3}-\d{2}-\d{4}/,           // SSN-like patterns
];

/**
 * Check if a string looks like sensitive data
 */
export function looksLikeSensitive(value: string): boolean {
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(value));
}

/**
 * Hash a sensitive value (SHA-256, first 16 chars)
 */
export function hashValue(value: string): string {
  return crypto
    .createHash('sha256')
    .update(value)
    .digest('hex')
    .substring(0, 16);
}

/**
 * Sanitize a telemetry event
 * - Removes banned fields
 * - Hashes sensitive-looking strings
 * - Truncates long strings
 */
export function sanitizeEvent(event: any): any {
  const sanitized = { ...event };

  // Remove banned fields
  for (const field of BANNED_FIELDS) {
    if (field in sanitized) {
      delete sanitized[field];
    }
  }

  // Hash sensitive-looking strings
  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === 'string') {
      // Hash if looks sensitive
      if (looksLikeSensitive(value)) {
        sanitized[key] = hashValue(value);
      }
      // Truncate very long strings
      else if (value.length > 1000) {
        sanitized[key] = value.substring(0, 1000) + '...[truncated]';
      }
    }
  }

  // Recursively sanitize nested objects
  for (const [key, value] of Object.entries(sanitized)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeEvent(value);
    }
  }

  return sanitized;
}

/**
 * Hash a stack trace for grouping errors
 */
export function hashStackTrace(stackTrace: string): string {
  // Remove line numbers and file paths, keep only function names and structure
  const normalized = stackTrace
    .split('\n')
    .map(line => line.replace(/:\d+:\d+/g, ''))  // Remove line:col
    .map(line => line.replace(/\/[^\s]+\//g, ''))  // Remove paths
    .join('\n');

  return crypto
    .createHash('sha256')
    .update(normalized)
    .digest('hex')
    .substring(0, 16);
}
