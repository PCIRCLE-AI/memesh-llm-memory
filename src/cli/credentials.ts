/**
 * MeMesh Credentials Storage
 *
 * Manages persistent API key credentials for MeMesh Cloud.
 * Stored at ~/.config/memesh/credentials.json with 0o600 permissions.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface MeMeshCredentials {
  apiKey: string;
  email?: string;
  userId?: string;
  baseUrl?: string;
  createdAt: string;
}

/**
 * Get XDG-compliant credentials file path
 * ~/.config/memesh/credentials.json
 */
export function getCredentialsPath(): string {
  const configDir = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  return path.join(configDir, 'memesh', 'credentials.json');
}

/**
 * Load credentials from disk
 * Returns null if file doesn't exist or is invalid
 */
export function loadCredentials(): MeMeshCredentials | null {
  const credPath = getCredentialsPath();
  try {
    if (!fs.existsSync(credPath)) return null;
    const content = fs.readFileSync(credPath, 'utf-8');
    const creds = JSON.parse(content);
    if (!creds || typeof creds.apiKey !== 'string' || !creds.apiKey) {
      return null;
    }
    return creds as MeMeshCredentials;
  } catch {
    return null;
  }
}

/**
 * Save credentials to disk with secure permissions (0o600)
 */
export function saveCredentials(creds: MeMeshCredentials): void {
  const credPath = getCredentialsPath();
  const dir = path.dirname(credPath);

  // Create directory (idempotent with recursive: true, avoids TOCTOU race)
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });

  // Write with owner-only permissions
  fs.writeFileSync(credPath, JSON.stringify(creds, null, 2), { mode: 0o600 });
  // Enforce permissions even on pre-existing files (writeFileSync mode only applies to new files)
  fs.chmodSync(credPath, 0o600);
}

/**
 * Delete credentials file
 */
export function deleteCredentials(): boolean {
  const credPath = getCredentialsPath();
  try {
    if (fs.existsSync(credPath)) {
      fs.unlinkSync(credPath);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
