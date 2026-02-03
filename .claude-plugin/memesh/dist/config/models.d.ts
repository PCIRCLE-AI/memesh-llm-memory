export declare const CLAUDE_MODELS: {
    readonly SONNET: "claude-3-sonnet-20240229";
    readonly SONNET_4_5: "claude-sonnet-4-5-20250929";
    readonly OPUS: "claude-3-opus-20240229";
    readonly OPUS_4_5: "claude-opus-4-5-20251101";
    readonly HAIKU: "claude-3-haiku-20240307";
    readonly HAIKU_3_5: "claude-3-5-haiku-20241022";
    readonly HAIKU_4: "claude-haiku-4-20250514";
    readonly HAIKU_4_5: "claude-haiku-4-5-20251015";
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
    readonly "claude-haiku-4-5-20251015": {
        readonly input: 1;
        readonly output: 5;
    };
};
export declare function selectClaudeModel(complexity: 'simple' | 'medium' | 'complex'): string;
export type ClaudeModel = typeof CLAUDE_MODELS[keyof typeof CLAUDE_MODELS];
//# sourceMappingURL=models.d.ts.map