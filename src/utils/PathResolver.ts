/**
 * Path Resolver - Backward Compatibility Layer
 *
 * Provides backward compatibility for data directory paths during the
 * migration from "Claude Code Buddy" to "MeMesh".
 *
 * Migration Strategy:
 * 1. Check if new directory (~/.memesh) exists → use it
 * 2. Check if old directory (~/.claude-code-buddy) exists → use it with warning
 * 3. Create new directory if neither exists
 *
 * This ensures zero data loss for existing users while providing a smooth
 * upgrade path.
 */

import path from 'path';
import os from 'os';
import fs from 'fs';
import { logger } from './logger.js';

// Directory names
const NEW_DIR_NAME = '.memesh';
const LEGACY_DIR_NAME = '.claude-code-buddy';

// Cache the resolved directory to avoid repeated filesystem checks
let cachedDataDir: string | null = null;
let migrationWarningShown = false;

/**
 * Get the data directory with automatic fallback to legacy location
 *
 * Priority order:
 * 1. New directory (~/.memesh) if it exists
 * 2. Legacy directory (~/.claude-code-buddy) if it exists
 * 3. Create and use new directory
 *
 * @returns Absolute path to data directory
 */
export function getDataDirectory(): string {
  // Return cached value if available (performance optimization)
  if (cachedDataDir) {
    return cachedDataDir;
  }

  const homeDir = os.homedir();
  const newDir = path.join(homeDir, NEW_DIR_NAME);
  const legacyDir = path.join(homeDir, LEGACY_DIR_NAME);

  // Case 1: New directory exists → use it
  if (fs.existsSync(newDir)) {
    cachedDataDir = newDir;
    return newDir;
  }

  // Case 2: Legacy directory exists but new doesn't → use legacy with warning
  if (fs.existsSync(legacyDir)) {
    if (!migrationWarningShown) {
      logger.warn('═══════════════════════════════════════════════════');
      logger.warn('⚠️  MIGRATION NOTICE');
      logger.warn('═══════════════════════════════════════════════════');
      logger.warn(`Found legacy data directory: ${legacyDir}`);
      logger.warn(`New directory should be: ${newDir}`);
      logger.warn('');
      logger.warn('MeMesh is using your existing data for backward compatibility.');
      logger.warn('To complete the migration, run:');
      logger.warn('  ./scripts/migrate-from-ccb.sh');
      logger.warn('');
      logger.warn('This warning appears once per session.');
      logger.warn('═══════════════════════════════════════════════════');
      migrationWarningShown = true;
    }

    cachedDataDir = legacyDir;
    return legacyDir;
  }

  // Case 3: Neither exists → create new directory
  try {
    fs.mkdirSync(newDir, { recursive: true });
    logger.info(`Created data directory: ${newDir}`);
    cachedDataDir = newDir;
    return newDir;
  } catch (error) {
    logger.error(`Failed to create data directory: ${newDir}`, error);
    throw new Error(`Failed to create data directory: ${error}`);
  }
}

/**
 * Get the full path to a file in the data directory
 *
 * @param filename - Name of the file
 * @returns Absolute path to the file
 */
export function getDataPath(filename: string): string {
  return path.join(getDataDirectory(), filename);
}

/**
 * Check if migration is needed
 *
 * @returns True if legacy directory exists but new directory doesn't
 */
export function isMigrationNeeded(): boolean {
  const homeDir = os.homedir();
  const newDir = path.join(homeDir, NEW_DIR_NAME);
  const legacyDir = path.join(homeDir, LEGACY_DIR_NAME);

  return fs.existsSync(legacyDir) && !fs.existsSync(newDir);
}

/**
 * Get migration info for diagnostic purposes
 *
 * @returns Object with migration status information
 */
export function getMigrationInfo(): {
  newDir: string;
  legacyDir: string;
  newDirExists: boolean;
  legacyDirExists: boolean;
  migrationNeeded: boolean;
  currentlyUsing: string;
} {
  const homeDir = os.homedir();
  const newDir = path.join(homeDir, NEW_DIR_NAME);
  const legacyDir = path.join(homeDir, LEGACY_DIR_NAME);

  return {
    newDir,
    legacyDir,
    newDirExists: fs.existsSync(newDir),
    legacyDirExists: fs.existsSync(legacyDir),
    migrationNeeded: isMigrationNeeded(),
    currentlyUsing: getDataDirectory(),
  };
}

/**
 * Clear the cached data directory (for testing purposes)
 * @internal
 */
export function _clearCache(): void {
  cachedDataDir = null;
  migrationWarningShown = false;
}
