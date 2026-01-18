/**
 * Path utilities for user-specific storage locations.
 *
 * Centralizes home directory resolution and "~" expansion to keep
 * filesystem paths consistent across platforms.
 */

import os from 'os';
import path from 'path';

/**
 * Resolve the current user's home directory with safe fallbacks.
 */
export function getHomeDir(): string {
  const home = os.homedir();
  if (home && home.trim() !== '') {
    return home;
  }

  const envHome = process.env.HOME || process.env.USERPROFILE;
  if (envHome && envHome.trim() !== '') {
    return envHome;
  }

  return process.cwd();
}

/**
 * Expand a leading "~" in a path to the user's home directory.
 */
export function expandHome(inputPath: string): string {
  if (!inputPath) return inputPath;
  if (inputPath === '~') {
    return getHomeDir();
  }
  if (inputPath.startsWith('~/') || inputPath.startsWith('~\\')) {
    return path.join(getHomeDir(), inputPath.slice(2));
  }
  return inputPath;
}

/**
 * Resolve a user-provided path to an absolute path with "~" expansion.
 */
export function resolveUserPath(inputPath: string): string {
  return path.resolve(expandHome(inputPath));
}
