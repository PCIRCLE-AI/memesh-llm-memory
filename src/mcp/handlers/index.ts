/**
 * MCP Handlers
 *
 * Centralized exports for all MCP handler modules
 */

export { ToolHandlers } from './ToolHandlers.js';
export { BuddyHandlers } from './BuddyHandlers.js';
export { A2AToolHandlers } from './A2AToolHandlers.js';
export { setupResourceHandlers } from './ResourceHandlers.js';

// Secret Management Handlers (Phase 0.7.0)
export {
  handleBuddySecretStore,
  handleBuddySecretGet,
  handleBuddySecretList,
  handleBuddySecretDelete,
  parseExpiry,
  type BuddySecretStoreInput,
  type BuddySecretGetInput,
  type BuddySecretListInput,
  type BuddySecretDeleteInput,
} from './SecretHandlers.js';
