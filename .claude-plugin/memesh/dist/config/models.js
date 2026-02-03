export const CLAUDE_MODELS = {
    SONNET: 'claude-3-sonnet-20240229',
    SONNET_4_5: 'claude-sonnet-4-5-20250929',
    OPUS: 'claude-3-opus-20240229',
    OPUS_4_5: 'claude-opus-4-5-20251101',
    HAIKU: 'claude-3-haiku-20240307',
    HAIKU_3_5: 'claude-3-5-haiku-20241022',
    HAIKU_4: 'claude-haiku-4-20250514',
    HAIKU_4_5: 'claude-haiku-4-5-20251015',
};
export const MODEL_COSTS = {
    [CLAUDE_MODELS.SONNET]: {
        input: 3.0,
        output: 15.0,
    },
    [CLAUDE_MODELS.SONNET_4_5]: {
        input: 3.0,
        output: 15.0,
    },
    [CLAUDE_MODELS.OPUS]: {
        input: 15.0,
        output: 75.0,
    },
    [CLAUDE_MODELS.OPUS_4_5]: {
        input: 15.0,
        output: 75.0,
    },
    [CLAUDE_MODELS.HAIKU]: {
        input: 0.25,
        output: 1.25,
    },
    [CLAUDE_MODELS.HAIKU_3_5]: {
        input: 0.80,
        output: 4.0,
    },
    [CLAUDE_MODELS.HAIKU_4]: {
        input: 0.80,
        output: 4.0,
    },
    [CLAUDE_MODELS.HAIKU_4_5]: {
        input: 1.00,
        output: 5.00,
    },
};
export function selectClaudeModel(complexity) {
    switch (complexity) {
        case 'simple':
            return CLAUDE_MODELS.HAIKU_4_5;
        case 'medium':
            return CLAUDE_MODELS.SONNET_4_5;
        case 'complex':
            return CLAUDE_MODELS.OPUS_4_5;
        default:
            return CLAUDE_MODELS.SONNET_4_5;
    }
}
//# sourceMappingURL=models.js.map