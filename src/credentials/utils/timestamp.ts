/**
 * Timestamp validation and conversion utilities
 */

/**
 * Validates and converts a timestamp to a Date object
 * Handles null, undefined, invalid numbers, and Invalid Date scenarios
 *
 * @param timestamp - Unix timestamp (milliseconds or seconds) or ISO string
 * @returns Valid Date object or null if invalid
 */
export function safeTimestampToDate(timestamp: any): Date | null {
  if (timestamp === null || timestamp === undefined) {
    return null;
  }

  // Handle numeric timestamps
  if (typeof timestamp === 'number') {
    // Check for invalid numbers
    if (!Number.isFinite(timestamp) || timestamp < 0) {
      return null;
    }

    // Convert seconds to milliseconds if needed (timestamp < year 3000 in seconds)
    const ms = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
    const date = new Date(ms);

    // Validate the created date
    return isNaN(date.getTime()) ? null : date;
  }

  // Handle string timestamps (ISO format)
  if (typeof timestamp === 'string') {
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? null : date;
  }

  // Unknown type
  return null;
}

/**
 * Validates and converts a timestamp to a Date object, with a fallback
 *
 * @param timestamp - Unix timestamp (milliseconds or seconds) or ISO string
 * @param fallback - Default date to return if invalid (default: current time)
 * @returns Valid Date object or fallback
 */
export function timestampToDate(timestamp: any, fallback?: Date): Date {
  const date = safeTimestampToDate(timestamp);
  return date !== null ? date : (fallback || new Date());
}

/**
 * Validates if a timestamp is a valid date
 *
 * @param timestamp - Unix timestamp (milliseconds or seconds) or ISO string
 * @returns true if valid, false otherwise
 */
export function isValidTimestamp(timestamp: any): boolean {
  return safeTimestampToDate(timestamp) !== null;
}
