import { logger } from './logger.js';
import { SimpleConfig } from '../config/simple-config.js';
export function validateOpenAIKey(apiKey) {
    if (!apiKey || apiKey.trim() === '') {
        return {
            isValid: false,
            status: 'missing',
            message: 'OPENAI_API_KEY not set',
            guidance: 'RAG features will be unavailable without an OpenAI API key.\n' +
                '   Get your API key at: https://platform.openai.com/api-keys\n' +
                '   Cost: $0.02 / 1M tokens (~62,500 pages of text)\n' +
                '   Set via: export OPENAI_API_KEY=sk-xxxxx',
        };
    }
    if (!apiKey.startsWith('sk-')) {
        return {
            isValid: false,
            status: 'invalid',
            message: 'OPENAI_API_KEY has invalid format (should start with "sk-")',
            guidance: 'OpenAI API keys should start with "sk-".\n' +
                '   Verify your key at: https://platform.openai.com/api-keys',
        };
    }
    if (apiKey.length < 40) {
        return {
            isValid: false,
            status: 'invalid',
            message: 'OPENAI_API_KEY appears to be truncated or incomplete',
            guidance: 'OpenAI API keys are typically 48-51 characters long.\n' +
                '   Verify your key at: https://platform.openai.com/api-keys',
        };
    }
    return {
        isValid: true,
        status: 'valid',
        message: 'OPENAI_API_KEY is properly formatted',
    };
}
export function validateAllApiKeys() {
    logger.info('🔑 Validating API keys...');
    let allProvidedKeysValid = true;
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
            break;
        case 'invalid':
            logger.error(`   ❌ ${openaiResult.message}`);
            if (openaiResult.guidance) {
                logger.error(`   ${openaiResult.guidance}`);
            }
            allProvidedKeysValid = false;
            break;
    }
    if (allProvidedKeysValid) {
        logger.info('✅ API key validation complete');
    }
    else {
        logger.error('❌ Some API keys are invalid - please fix before using those features');
    }
    return allProvidedKeysValid;
}
export function isRagAvailable() {
    const openaiKey = SimpleConfig.OPENAI_API_KEY;
    const result = validateOpenAIKey(openaiKey);
    return result.isValid;
}
//# sourceMappingURL=apiKeyValidator.js.map