/**
 * API Key Validation Utilities
 *
 * Validates API keys on server startup for:
 * - Format validation (proper key format)
 * - Warning for missing optional keys
 * - Clear guidance on obtaining keys
 */

import { logger } from './logger.js';
import { SimpleConfig } from '../config/simple-config.js';

/**
 * API Key validation result
 */
export interface ApiKeyValidationResult {
  /** Whether the key is valid */
  isValid: boolean;
  /** Validation status: 'valid', 'missing', 'invalid' */
  status: 'valid' | 'missing' | 'invalid';
  /** Warning or error message (if any) */
  message?: string;
  /** Guidance for obtaining the key */
  guidance?: string;
}

/**
 * Validate OpenAI API Key format
 *
 * OpenAI API keys should start with 'sk-' and be sufficiently long
 *
 * @param apiKey - API key to validate
 * @returns Validation result
 */
export function validateOpenAIKey(apiKey: string | undefined): ApiKeyValidationResult {
  // Missing key
  if (!apiKey || apiKey.trim() === '') {
    return {
      isValid: false,
      status: 'missing',
      message: 'OPENAI_API_KEY not set',
      guidance:
        'RAG features will be unavailable without an OpenAI API key.\n' +
        '   Get your API key at: https://platform.openai.com/api-keys\n' +
        '   Cost: $0.02 / 1M tokens (~62,500 pages of text)\n' +
        '   Set via: export OPENAI_API_KEY=sk-xxxxx',
    };
  }

  // Invalid format
  if (!apiKey.startsWith('sk-')) {
    return {
      isValid: false,
      status: 'invalid',
      message: 'OPENAI_API_KEY has invalid format (should start with "sk-")',
      guidance:
        'OpenAI API keys should start with "sk-".\n' +
        '   Verify your key at: https://platform.openai.com/api-keys',
    };
  }

  // Too short (OpenAI keys are typically 48-51 characters)
  if (apiKey.length < 40) {
    return {
      isValid: false,
      status: 'invalid',
      message: 'OPENAI_API_KEY appears to be truncated or incomplete',
      guidance:
        'OpenAI API keys are typically 48-51 characters long.\n' +
        '   Verify your key at: https://platform.openai.com/api-keys',
    };
  }

  // Valid
  return {
    isValid: true,
    status: 'valid',
    message: 'OPENAI_API_KEY is properly formatted',
  };
}

/**
 * Validate all API keys on server startup
 *
 * Logs warnings for missing optional keys but does NOT block startup.
 * Logs errors for invalid key formats.
 *
 * @returns Whether all provided keys are valid (missing optional keys OK)
 */
export function validateAllApiKeys(): boolean {
  logger.info('🔑 Validating API keys...');

  let allProvidedKeysValid = true;

  // Validate OpenAI API Key (optional)
  const openaiKey = SimpleConfig.OPENAI_API_KEY;
  const openaiResult = validateOpenAIKey(openaiKey);

  switch (openaiResult.status) {
    case 'valid':
      logger.info(`   ✅ ${openaiResult.message}`);
      break;

    case 'missing':
      logger.warn(`   ⚠️  ${openaiResult.message}`);
      if (openaiResult.guidance) {
        logger.warn(`   ${openaiResult.guidance}`);
      }
      // Missing optional key is OK
      break;

    case 'invalid':
      logger.error(`   ❌ ${openaiResult.message}`);
      if (openaiResult.guidance) {
        logger.error(`   ${openaiResult.guidance}`);
      }
      allProvidedKeysValid = false;
      break;
  }

  // Summary
  if (allProvidedKeysValid) {
    logger.info('✅ API key validation complete');
  } else {
    logger.error('❌ Some API keys are invalid - please fix before using those features');
  }

  return allProvidedKeysValid;
}

/**
 * Check if RAG features are available
 *
 * @returns Whether RAG features can be used
 */
export function isRagAvailable(): boolean {
  const openaiKey = SimpleConfig.OPENAI_API_KEY;
  const result = validateOpenAIKey(openaiKey);
  return result.isValid;
}
