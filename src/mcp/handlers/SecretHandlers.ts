/**
 * Secret Management Handlers
 *
 * MCP tool handlers for secure secret storage operations.
 * Part of Phase 0.7.0 MeMesh Memory System Upgrade.
 *
 * Features:
 * - Store secrets with AES-256-GCM encryption
 * - Retrieve secrets by name
 * - List all secret names (without values)
 * - Delete secrets
 * - i18n support for all messages
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { SecretManager } from '../../memory/SecretManager.js';
import type { SecretType } from '../../memory/types/secret-types.js';
import { t } from '../../i18n/index.js';
import { logger } from '../../utils/logger.js';

/**
 * Input types for secret handlers
 */
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
  // No required inputs
}

export interface BuddySecretDeleteInput {
  name: string;
}

/**
 * Parse expiry string to seconds
 *
 * Supports formats:
 * - "30d" - 30 days
 * - "24h" - 24 hours
 * - "60m" - 60 minutes
 *
 * @param expiresIn - Expiry string (e.g., "30d", "1h", "60m")
 * @returns Seconds or undefined if invalid format
 */
export function parseExpiry(expiresIn: string): number | undefined {
  if (!expiresIn || expiresIn.length < 2) {
    return undefined;
  }

  const match = expiresIn.match(/^(\d+)([dhm])$/);
  if (!match) {
    return undefined;
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 'd':
      return value * 24 * 60 * 60; // days to seconds
    case 'h':
      return value * 60 * 60; // hours to seconds
    case 'm':
      return value * 60; // minutes to seconds
    default:
      return undefined;
  }
}

/**
 * Map input type to SecretType
 */
function mapSecretType(type: string): SecretType {
  switch (type) {
    case 'api_key':
      return 'api_key';
    case 'token':
      return 'bearer_token';
    case 'password':
      return 'password';
    case 'other':
    default:
      return 'generic';
  }
}

/**
 * Handle buddy-secret-store tool
 *
 * Store a secret securely with MeMesh. The secret is encrypted with AES-256-GCM
 * and stored locally. It is NEVER transmitted over the network.
 *
 * @param input - Store input parameters
 * @param secretManager - SecretManager instance
 * @returns MCP CallToolResult
 */
export async function handleBuddySecretStore(
  input: BuddySecretStoreInput,
  secretManager: SecretManager
): Promise<CallToolResult> {
  // Validate required fields
  if (!input.name) {
    return {
      content: [
        {
          type: 'text' as const,
          text: t('ccb.status.error', { message: 'Missing required field: name' }),
        },
      ],
      isError: true,
    };
  }

  if (!input.value) {
    return {
      content: [
        {
          type: 'text' as const,
          text: t('ccb.status.error', { message: 'Missing required field: value' }),
        },
      ],
      isError: true,
    };
  }

  if (!input.type) {
    return {
      content: [
        {
          type: 'text' as const,
          text: t('ccb.status.error', { message: 'Missing required field: type' }),
        },
      ],
      isError: true,
    };
  }

  try {
    // Parse expiry if provided
    const expiresInSeconds = input.expiresIn
      ? parseExpiry(input.expiresIn)
      : undefined;

    // Build metadata
    const metadata: Record<string, unknown> = {};
    if (input.description) {
      metadata.description = input.description;
    }

    // Store the secret
    const id = await secretManager.store(input.value, {
      name: input.name,
      secretType: mapSecretType(input.type),
      expiresInSeconds,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    });

    // Format expiry for display
    const expiresIn = expiresInSeconds
      ? formatExpiryDisplay(expiresInSeconds)
      : '30 days'; // Default expiry

    logger.info(`[SecretHandlers] Stored secret: ${input.name} (id: ${id})`);

    return {
      content: [
        {
          type: 'text' as const,
          text: t('ccb.secret.stored', { secretName: input.name, expiresIn }),
        },
      ],
      isError: false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`[SecretHandlers] Failed to store secret: ${message}`);

    return {
      content: [
        {
          type: 'text' as const,
          text: t('ccb.status.error', { message }),
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handle buddy-secret-get tool
 *
 * Retrieve a stored secret by name.
 *
 * @param input - Get input parameters
 * @param secretManager - SecretManager instance
 * @returns MCP CallToolResult with the secret value
 */
export async function handleBuddySecretGet(
  input: BuddySecretGetInput,
  secretManager: SecretManager
): Promise<CallToolResult> {
  // Validate required fields
  if (!input.name) {
    return {
      content: [
        {
          type: 'text' as const,
          text: t('ccb.status.error', { message: 'Missing required field: name' }),
        },
      ],
      isError: true,
    };
  }

  try {
    const value = await secretManager.getByName(input.name);

    if (value === null) {
      return {
        content: [
          {
            type: 'text' as const,
            text: t('ccb.secret.notFound', { secretName: input.name }),
          },
        ],
        isError: true,
      };
    }

    logger.info(`[SecretHandlers] Retrieved secret: ${input.name}`);

    return {
      content: [
        {
          type: 'text' as const,
          text: value,
        },
      ],
      isError: false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`[SecretHandlers] Failed to get secret: ${message}`);

    return {
      content: [
        {
          type: 'text' as const,
          text: t('ccb.status.error', { message }),
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handle buddy-secret-list tool
 *
 * List all stored secrets (names only, not values).
 *
 * @param input - List input parameters (empty)
 * @param secretManager - SecretManager instance
 * @returns MCP CallToolResult with list of secret names
 */
export async function handleBuddySecretList(
  _input: BuddySecretListInput,
  secretManager: SecretManager
): Promise<CallToolResult> {
  try {
    const secrets = await secretManager.list();

    if (secrets.length === 0) {
      return {
        content: [
          {
            type: 'text' as const,
            text: '**MeMesh Secret Storage** - No secrets stored.',
          },
        ],
        isError: false,
      };
    }

    // Format secret list
    let output = '**MeMesh Secret Storage** - Stored Secrets:\n\n';

    for (const secret of secrets) {
      output += `- **${secret.name}**\n`;
      output += `  Type: ${secret.secretType}\n`;
      output += `  Created: ${secret.createdAt.toISOString().split('T')[0]}\n`;
      if (secret.expiresAt) {
        output += `  Expires: ${secret.expiresAt.toISOString().split('T')[0]}\n`;
      }
      output += '\n';
    }

    logger.info(`[SecretHandlers] Listed ${secrets.length} secrets`);

    return {
      content: [
        {
          type: 'text' as const,
          text: output.trim(),
        },
      ],
      isError: false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`[SecretHandlers] Failed to list secrets: ${message}`);

    return {
      content: [
        {
          type: 'text' as const,
          text: t('ccb.status.error', { message }),
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handle buddy-secret-delete tool
 *
 * Delete a stored secret by name.
 *
 * @param input - Delete input parameters
 * @param secretManager - SecretManager instance
 * @returns MCP CallToolResult
 */
export async function handleBuddySecretDelete(
  input: BuddySecretDeleteInput,
  secretManager: SecretManager
): Promise<CallToolResult> {
  // Validate required fields
  if (!input.name) {
    return {
      content: [
        {
          type: 'text' as const,
          text: t('ccb.status.error', { message: 'Missing required field: name' }),
        },
      ],
      isError: true,
    };
  }

  try {
    const deleted = await secretManager.deleteByName(input.name);

    if (!deleted) {
      return {
        content: [
          {
            type: 'text' as const,
            text: t('ccb.secret.notFound', { secretName: input.name }),
          },
        ],
        isError: true,
      };
    }

    logger.info(`[SecretHandlers] Deleted secret: ${input.name}`);

    return {
      content: [
        {
          type: 'text' as const,
          text: t('ccb.secret.deleted', { secretName: input.name }),
        },
      ],
      isError: false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`[SecretHandlers] Failed to delete secret: ${message}`);

    return {
      content: [
        {
          type: 'text' as const,
          text: t('ccb.status.error', { message }),
        },
      ],
      isError: true,
    };
  }
}

/**
 * Format seconds to human-readable expiry display
 */
function formatExpiryDisplay(seconds: number): string {
  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);

  if (days > 0) {
    return days === 1 ? '1 day' : `${days} days`;
  }
  if (hours > 0) {
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }
  if (minutes > 0) {
    return minutes === 1 ? '1 minute' : `${minutes} minutes`;
  }

  return `${seconds} seconds`;
}
