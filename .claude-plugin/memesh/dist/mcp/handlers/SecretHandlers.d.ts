import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { SecretManager } from '../../memory/SecretManager.js';
export interface BuddySecretStoreInput {
    name: string;
    value: string;
    type: 'api_key' | 'token' | 'password' | 'other';
    description?: string;
    expiresIn?: string;
}
export interface BuddySecretGetInput {
    name: string;
}
export interface BuddySecretListInput {
}
export interface BuddySecretDeleteInput {
    name: string;
}
export declare function parseExpiry(expiresIn: string): number | undefined;
export declare function handleBuddySecretStore(input: BuddySecretStoreInput, secretManager: SecretManager): Promise<CallToolResult>;
export declare function handleBuddySecretGet(input: BuddySecretGetInput, secretManager: SecretManager): Promise<CallToolResult>;
export declare function handleBuddySecretList(_input: BuddySecretListInput, secretManager: SecretManager): Promise<CallToolResult>;
export declare function handleBuddySecretDelete(input: BuddySecretDeleteInput, secretManager: SecretManager): Promise<CallToolResult>;
//# sourceMappingURL=SecretHandlers.d.ts.map