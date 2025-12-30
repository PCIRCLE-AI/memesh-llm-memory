/**
 * Safe JSON Parsing Utilities
 *
 * Provides type-safe JSON parsing with proper error handling
 * to prevent crashes from malformed JSON data.
 */

export interface JsonParseResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Safely parse JSON string with error handling
 *
 * @param jsonString - String to parse
 * @param fallback - Fallback value if parsing fails
 * @returns Parsed data or fallback value
 */
export function safeJsonParse<T>(jsonString: string | null, fallback: T): T {
  if (!jsonString) {
    return fallback;
  }

  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.warn('JSON parse error:', {
      error: error instanceof Error ? error.message : String(error),
      input: jsonString.substring(0, 100), // Log first 100 chars for debugging
    });
    return fallback;
  }
}

/**
 * Parse JSON string and return result object with success/error info
 *
 * @param jsonString - String to parse
 * @returns Result object with success flag, data, and optional error
 */
export function tryParseJson<T>(jsonString: string | null): JsonParseResult<T> {
  if (!jsonString) {
    return {
      success: false,
      error: 'Input is null or empty',
    };
  }

  try {
    const data = JSON.parse(jsonString) as T;
    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Parse JSON with validation function
 *
 * @param jsonString - String to parse
 * @param validator - Function to validate parsed data
 * @param fallback - Fallback value if parsing or validation fails
 * @returns Validated data or fallback value
 */
export function parseAndValidate<T>(
  jsonString: string | null,
  validator: (data: unknown) => data is T,
  fallback: T
): T {
  if (!jsonString) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(jsonString);
    if (validator(parsed)) {
      return parsed;
    } else {
      console.warn('JSON validation failed:', {
        input: jsonString.substring(0, 100),
      });
      return fallback;
    }
  } catch (error) {
    console.warn('JSON parse error:', {
      error: error instanceof Error ? error.message : String(error),
      input: jsonString.substring(0, 100),
    });
    return fallback;
  }
}

/**
 * Type guard for checking if value is a non-null object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Type guard for checking if value is an array
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Type guard for checking if value is a string array
 */
export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}
