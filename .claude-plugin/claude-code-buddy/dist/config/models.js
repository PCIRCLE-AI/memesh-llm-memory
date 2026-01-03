export const CLAUDE_MODELS = {
    SONNET: 'claude-3-sonnet-20240229',
    SONNET_4_5: 'claude-sonnet-4-5-20250929',
    OPUS: 'claude-3-opus-20240229',
    OPUS_4_5: 'claude-opus-4-5-20251101',
    HAIKU: 'claude-3-haiku-20240307',
    HAIKU_3_5: 'claude-3-5-haiku-20241022',
    HAIKU_4: 'claude-haiku-4-20250514',
};
export const OPENAI_MODELS = {
    WHISPER: 'whisper-1',
    TTS: 'tts-1',
    TTS_HD: 'tts-1-hd',
    EMBEDDING_SMALL: 'text-embedding-3-small',
    EMBEDDING_LARGE: 'text-embedding-3-large',
    GPT4: 'gpt-4-turbo-preview',
    GPT4_VISION: 'gpt-4-vision-preview',
};
export const TTS_VOICES = {
    ALLOY: 'alloy',
    ECHO: 'echo',
    FABLE: 'fable',
    ONYX: 'onyx',
    NOVA: 'nova',
    SHIMMER: 'shimmer',
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
    [OPENAI_MODELS.WHISPER]: {
        perMinute: 0.006,
    },
    [OPENAI_MODELS.TTS]: {
        per1KChars: 0.015,
    },
    [OPENAI_MODELS.EMBEDDING_SMALL]: {
        input: 0.02,
    },
};
export function selectClaudeModel(complexity) {
    switch (complexity) {
        case 'simple':
            return CLAUDE_MODELS.HAIKU;
        case 'medium':
            return CLAUDE_MODELS.SONNET;
        case 'complex':
            return CLAUDE_MODELS.OPUS;
        default:
            return CLAUDE_MODELS.SONNET;
    }
}
//# sourceMappingURL=models.js.map