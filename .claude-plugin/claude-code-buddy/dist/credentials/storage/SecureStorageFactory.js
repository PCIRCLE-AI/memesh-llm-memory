import { getPlatform } from '../types.js';
import { MacOSKeychain } from './MacOSKeychain.js';
import { WindowsCredentialManager } from './WindowsCredentialManager.js';
import { LinuxSecretService } from './LinuxSecretService.js';
import { EncryptedFileStorage } from './EncryptedFileStorage.js';
export async function createSecureStorage() {
    const platform = getPlatform();
    let storage;
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
    const isAvailable = await storage.isAvailable();
    if (!isAvailable) {
        console.warn(`Platform-specific secure storage (${storage.getType()}) is not available. ` +
            `Falling back to encrypted file storage.`);
        storage = new EncryptedFileStorage();
    }
    return storage;
}
//# sourceMappingURL=SecureStorageFactory.js.map