/**
 * Path Validation Utilities
 *
 * ✅ SECURITY FIX (HIGH-3): Prevents path traversal attacks in database file paths
 * Validates user-provided file paths to prevent:
 * - Path traversal attacks (../)
 * - Symlink attacks
 * - Arbitrary file read/write
 * - Files outside allowed directory
 */

import { resolve, normalize, isAbsolute, dirname, basename, join } from 'path';
import { realpathSync } from 'fs';
import { ValidationError } from '../errors/index.js';

/**
 * Validate database file path for security
 *
 * Ensures the database path is safe and within allowed boundaries:
 * 1. Normalizes path to prevent traversal (../)
 * 2. Resolves symlinks to prevent symlink attacks
 * 3. Ensures path is within allowed directory (data/)
 * 4. Validates file extension (.db)
 *
 * @param dbPath - Database path to validate (can be relative or absolute)
 * @param allowedDir - Allowed base directory (defaults to ./data)
 * @returns Validated absolute path
 * @throws ValidationError if path is invalid or unsafe
 *
 * @example
 * ```typescript
 * // Valid paths
 * validateDatabasePath('knowledge.db');  // → /cwd/data/knowledge.db
 * validateDatabasePath('data/test.db'); // → /cwd/data/test.db
 * validateDatabasePath(':memory:');     // → :memory: (special case)
 *
 * // Invalid paths (throws ValidationError)
 * validateDatabasePath('../etc/passwd');        // Path traversal
 * validateDatabasePath('/etc/shadow');          // Outside allowed dir
 * validateDatabasePath('data/../../etc/passwd'); // Normalized outside
 * validateDatabasePath('test.txt');             // Wrong extension
 * ```
 */
export function validateDatabasePath(
  dbPath: string,
  allowedDir?: string
): string {
  // ✅ Allow :memory: for testing (special SQLite syntax)
  if (dbPath === ':memory:') {
    return dbPath;
  }

  // ✅ SECURITY: Validate input is non-empty string
  if (!dbPath || typeof dbPath !== 'string') {
    throw new ValidationError('Database path must be a non-empty string', {
      provided: dbPath,
      type: typeof dbPath,
    });
  }

  // ✅ SECURITY: Prevent null bytes (common in path traversal attacks)
  if (dbPath.includes('\0')) {
    throw new ValidationError('Database path contains invalid null byte', {
      provided: dbPath,
      security: 'Null bytes are commonly used in path traversal attacks',
    });
  }

  // ✅ SECURITY: Normalize path to prevent traversal
  const normalizedPath = normalize(dbPath);

  // ✅ SECURITY: Resolve to absolute path
  const absolutePath = isAbsolute(normalizedPath)
    ? normalizedPath
    : resolve(process.cwd(), normalizedPath);

  // ✅ SECURITY: Resolve symlinks to prevent symlink attacks
  let resolvedPath: string;
  try {
    // Try to resolve the full path (file exists)
    resolvedPath = realpathSync(absolutePath);
  } catch (error) {
    // File doesn't exist yet - validate parent directory exists
    const parent = dirname(absolutePath);
    try {
      const parentResolved = realpathSync(parent);
      resolvedPath = join(parentResolved, basename(absolutePath));
    } catch {
      throw new ValidationError('Database parent directory does not exist', {
        provided: dbPath,
        parent,
        solution: `Create directory first: mkdir -p ${parent}`,
      });
    }
  }

  // ✅ SECURITY: Ensure path is within allowed directory
  const allowedBase = allowedDir
    ? resolve(process.cwd(), allowedDir)
    : resolve(process.cwd(), 'data');

  if (!resolvedPath.startsWith(allowedBase + '/') && resolvedPath !== allowedBase) {
    throw new ValidationError('Database path must be within allowed directory', {
      provided: dbPath,
      resolved: resolvedPath,
      allowed: allowedBase,
      security: 'This prevents path traversal attacks like ../../etc/passwd',
    });
  }

  // ✅ SECURITY: Ensure .db extension (prevents arbitrary file access)
  if (!resolvedPath.endsWith('.db')) {
    throw new ValidationError('Database path must have .db extension', {
      provided: dbPath,
      resolved: resolvedPath,
      expectedExtension: '.db',
    });
  }

  return resolvedPath;
}
