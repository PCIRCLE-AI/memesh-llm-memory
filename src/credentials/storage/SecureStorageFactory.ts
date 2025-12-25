/**
 * Secure Storage Factory
 *
 * Creates the appropriate secure storage implementation based on platform
 */

import { SecureStorage, getPlatform } from '../types.js';
import { MacOSKeychain } from './MacOSKeychain.js';
import { WindowsCredentialManager } from './WindowsCredentialManager.js';
import { LinuxSecretService } from './LinuxSecretService.js';
import { EncryptedFileStorage } from './EncryptedFileStorage.js';

/**
 * Create a secure storage instance for the current platform
 */
export async function createSecureStorage(): Promise<SecureStorage> {
  const platform = getPlatform();

  let storage: SecureStorage;

  switch (platform) {
    case 'darwin':
      storage = new MacOSKeychain();
      break;

    case 'win32':
      storage = new WindowsCredentialManager();
      break;

    case 'linux':
      storage = new LinuxSecretService();
      break;

    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }

  // Check if platform-specific storage is available
  const isAvailable = await storage.isAvailable();

  if (!isAvailable) {
    console.warn(
      `Platform-specific secure storage (${storage.getType()}) is not available. ` +
        `Falling back to encrypted file storage.`
    );

    // Fallback to encrypted file storage
    storage = new EncryptedFileStorage();
  }

  return storage;
}
