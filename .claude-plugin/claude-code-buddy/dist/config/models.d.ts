export declare const CLAUDE_MODELS: {
    readonly SONNET: "claude-3-sonnet-20240229";
    readonly SONNET_4_5: "claude-sonnet-4-5-20250929";
    readonly OPUS: "claude-3-opus-20240229";
    readonly OPUS_4_5: "claude-opus-4-5-20251101";
    readonly HAIKU: "claude-3-haiku-20240307";
    readonly HAIKU_3_5: "claude-3-5-haiku-20241022";
    readonly HAIKU_4: "claude-haiku-4-20250514";
};
export declare const OPENAI_MODELS: {
    readonly WHISPER: "whisper-1";
    readonly TTS: "tts-1";
    readonly TTS_HD: "tts-1-hd";
    readonly EMBEDDING_SMALL: "text-embedding-3-small";
    readonly EMBEDDING_LARGE: "text-embedding-3-large";
    readonly GPT4: "gpt-4-turbo-preview";
    readonly GPT4_VISION: "gpt-4-vision-preview";
};
export declare const TTS_VOICES: {
    readonly ALLOY: "alloy";
    readonly ECHO: "echo";
    readonly FABLE: "fable";
    readonly ONYX: "onyx";
    readonly NOVA: "nova";
    readonly SHIMMER: "shimmer";
};
export declare const MODEL_COSTS: {
    readonly "claude-3-sonnet-20240229": {
        readonly input: 3;
        readonly output: 15;
    };
    readonly "claude-sonnet-4-5-20250929": {
        readonly input: 3;
        readonly output: 15;
    };
    readonly "claude-3-opus-20240229": {
        readonly input: 15;
        readonly output: 75;
    };
    readonly "claude-opus-4-5-20251101": {
        readonly input: 15;
        readonly output: 75;
    };
    readonly "claude-3-haiku-20240307": {
        readonly input: 0.25;
        readonly output: 1.25;
    };
    readonly "claude-3-5-haiku-20241022": {
        readonly input: 0.8;
        readonly output: 4;
    };
    readonly "claude-haiku-4-20250514": {
        readonly input: 0.8;
        readonly output: 4;
    };
    readonly "whisper-1": {
        readonly perMinute: 0.006;
    };
    readonly "tts-1": {
        readonly per1KChars: 0.015;
    };
    readonly "text-embedding-3-small": {
        readonly input: 0.02;
    };
};
export declare function selectClaudeModel(complexity: 'simple' | 'medium' | 'complex'): string;
export type ClaudeModel = typeof CLAUDE_MODELS[keyof typeof CLAUDE_MODELS];
export type OpenAIModel = typeof OPENAI_MODELS[keyof typeof OPENAI_MODELS];
export type TTSVoice = typeof TTS_VOICES[keyof typeof TTS_VOICES];
//# sourceMappingURL=models.d.ts.map