import { AIErrorType } from '../../evolution/types.js';
import { t } from '../../i18n/index.js';
import { logger } from '../../utils/logger.js';
function calculateImportance(errorType, context) {
    const errorTypeImportance = {
        [AIErrorType.PROCEDURE_VIOLATION]: 0.8,
        [AIErrorType.WORKFLOW_SKIP]: 0.7,
        [AIErrorType.ASSUMPTION_ERROR]: 0.75,
        [AIErrorType.VALIDATION_SKIP]: 0.8,
        [AIErrorType.RESPONSIBILITY_LACK]: 0.6,
        [AIErrorType.FIREFIGHTING]: 0.5,
        [AIErrorType.DEPENDENCY_MISS]: 0.65,
        [AIErrorType.INTEGRATION_ERROR]: 0.7,
        [AIErrorType.DEPLOYMENT_ERROR]: 0.9,
    };
    let importance = errorTypeImportance[errorType] || 0.6;
    if (context?.severity) {
        switch (context.severity) {
            case 'critical':
                importance = Math.max(importance, 0.95);
                break;
            case 'high':
                importance = Math.max(importance, 0.8);
                break;
            case 'medium':
                importance = Math.max(importance, 0.6);
                break;
            case 'low':
                importance = Math.max(importance, 0.4);
                break;
        }
    }
    return Math.min(importance, 1);
}
function buildMistakeContent(input) {
    const parts = [
        `Action: ${input.action}`,
        `Correction: ${input.userCorrection}`,
        `Correct Method: ${input.correctMethod}`,
        `Impact: ${input.impact}`,
        `Prevention: ${input.preventionMethod}`,
    ];
    if (input.relatedRule) {
        parts.push(`Related Rule: ${input.relatedRule}`);
    }
    return parts.join(' | ');
}
export async function handleBuddyRecordMistake(input, unifiedStore, _patternEngine, _preferenceEngine) {
    try {
        const requiredFields = {
            action: input.action,
            errorType: input.errorType,
            userCorrection: input.userCorrection,
            correctMethod: input.correctMethod,
            impact: input.impact,
            preventionMethod: input.preventionMethod,
        };
        const missingFields = Object.entries(requiredFields)
            .filter(([_, value]) => !value)
            .map(([key]) => key);
        if (missingFields.length > 0) {
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }
        logger.info('[BuddyRecordMistake] Recording AI mistake', {
            action: input.action,
            errorType: input.errorType,
        });
        const memory = {
            type: 'mistake',
            content: buildMistakeContent(input),
            context: `Error Type: ${input.errorType}`,
            tags: [
                'mistake',
                input.errorType,
                ...(input.context?.category ? [String(input.context.category)] : []),
            ],
            importance: calculateImportance(input.errorType, input.context),
            timestamp: new Date(),
            metadata: {
                action: input.action,
                errorType: input.errorType,
                userCorrection: input.userCorrection,
                correctMethod: input.correctMethod,
                impact: input.impact,
                preventionMethod: input.preventionMethod,
                relatedRule: input.relatedRule,
                context: input.context,
            },
        };
        const projectPath = process.cwd();
        const memoryId = await unifiedStore.store(memory, { projectPath });
        logger.info('[BuddyRecordMistake] Mistake stored to UnifiedMemoryStore', {
            memoryId,
            errorType: input.errorType,
        });
        const detailedResponse = formatDetailedResponse(memoryId, input);
        logger.info('[BuddyRecordMistake] AI mistake recorded successfully', {
            memoryId,
        });
        return {
            content: [
                {
                    type: 'text',
                    text: detailedResponse,
                },
            ],
            isError: false,
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        logger.error('[BuddyRecordMistake] Failed to record AI mistake', {
            error: errorMessage,
            input,
        });
        return {
            content: [
                {
                    type: 'text',
                    text: t('ccb.mistake.error', { message: errorMessage }),
                },
            ],
            isError: true,
        };
    }
}
function formatDetailedResponse(memoryId, input) {
    const lines = [
        '**MeMesh Mistake Recorded**',
        '',
        `Memory ID: \`${memoryId}\``,
        `Error Type: ${input.errorType}`,
        '',
        '**What was recorded:**',
        `- Action: ${input.action}`,
        `- Correction: ${input.userCorrection}`,
        `- Prevention: ${input.preventionMethod}`,
        '',
        '**Next Steps:**',
        '- This mistake is now searchable via `buddy-remember`',
        '- Analyze patterns across multiple mistakes to identify trends',
        '- Create prevention rules or preferences as needed based on patterns',
        '- Use stored mistakes to inform future behavior',
    ];
    return lines.join('\n');
}
//# sourceMappingURL=BuddyRecordMistake.js.map