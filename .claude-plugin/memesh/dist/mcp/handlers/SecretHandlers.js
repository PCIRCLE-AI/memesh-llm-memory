import { t } from '../../i18n/index.js';
import { logger } from '../../utils/logger.js';
export function parseExpiry(expiresIn) {
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
            return value * 24 * 60 * 60;
        case 'h':
            return value * 60 * 60;
        case 'm':
            return value * 60;
        default:
            return undefined;
    }
}
function mapSecretType(type) {
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
export async function handleBuddySecretStore(input, secretManager) {
    if (!input.name) {
        return {
            content: [
                {
                    type: 'text',
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
                    type: 'text',
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
                    type: 'text',
                    text: t('ccb.status.error', { message: 'Missing required field: type' }),
                },
            ],
            isError: true,
        };
    }
    try {
        const expiresInSeconds = input.expiresIn
            ? parseExpiry(input.expiresIn)
            : undefined;
        const metadata = {};
        if (input.description) {
            metadata.description = input.description;
        }
        const id = await secretManager.store(input.value, {
            name: input.name,
            secretType: mapSecretType(input.type),
            expiresInSeconds,
            metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        });
        const expiresIn = expiresInSeconds
            ? formatExpiryDisplay(expiresInSeconds)
            : '30 days';
        logger.info(`[SecretHandlers] Stored secret: ${input.name} (id: ${id})`);
        return {
            content: [
                {
                    type: 'text',
                    text: t('ccb.secret.stored', { secretName: input.name, expiresIn }),
                },
            ],
            isError: false,
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`[SecretHandlers] Failed to store secret: ${message}`);
        return {
            content: [
                {
                    type: 'text',
                    text: t('ccb.status.error', { message }),
                },
            ],
            isError: true,
        };
    }
}
export async function handleBuddySecretGet(input, secretManager) {
    if (!input.name) {
        return {
            content: [
                {
                    type: 'text',
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
                        type: 'text',
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
                    type: 'text',
                    text: value,
                },
            ],
            isError: false,
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`[SecretHandlers] Failed to get secret: ${message}`);
        return {
            content: [
                {
                    type: 'text',
                    text: t('ccb.status.error', { message }),
                },
            ],
            isError: true,
        };
    }
}
export async function handleBuddySecretList(_input, secretManager) {
    try {
        const secrets = await secretManager.list();
        if (secrets.length === 0) {
            return {
                content: [
                    {
                        type: 'text',
                        text: '**MeMesh Secret Storage** - No secrets stored.',
                    },
                ],
                isError: false,
            };
        }
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
                    type: 'text',
                    text: output.trim(),
                },
            ],
            isError: false,
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`[SecretHandlers] Failed to list secrets: ${message}`);
        return {
            content: [
                {
                    type: 'text',
                    text: t('ccb.status.error', { message }),
                },
            ],
            isError: true,
        };
    }
}
export async function handleBuddySecretDelete(input, secretManager) {
    if (!input.name) {
        return {
            content: [
                {
                    type: 'text',
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
                        type: 'text',
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
                    type: 'text',
                    text: t('ccb.secret.deleted', { secretName: input.name }),
                },
            ],
            isError: false,
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`[SecretHandlers] Failed to delete secret: ${message}`);
        return {
            content: [
                {
                    type: 'text',
                    text: t('ccb.status.error', { message }),
                },
            ],
            isError: true,
        };
    }
}
function formatExpiryDisplay(seconds) {
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
//# sourceMappingURL=SecretHandlers.js.map