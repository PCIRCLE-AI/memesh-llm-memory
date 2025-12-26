/**
 * Secure Storage Implementations
 *
 * Platform-specific, cloud provider, and fallback storage providers
 */

// Platform-specific backends
export { MacOSKeychain } from './MacOSKeychain.js';
export { WindowsCredentialManager } from './WindowsCredentialManager.js';
export { LinuxSecretService } from './LinuxSecretService.js';
export { EncryptedFileStorage } from './EncryptedFileStorage.js';

// Cloud provider backends (optional - see docs/examples/enterprise/)
// AWS Secrets Manager and Azure Key Vault moved to optional enterprise examples
// HashiCorp Vault is open-source and self-hosted (recommended for advanced users)
export { HashiCorpVault, type HashiCorpVaultConfig } from './HashiCorpVault.js';

// Advanced features
export { StoragePool, LoadBalancingStrategy, type StorageBackendConfig, type StoragePoolStats } from './StoragePool.js';

// Factory
export { createSecureStorage } from './SecureStorageFactory.js';

// Types
export type { SecureStorage } from '../types.js';
