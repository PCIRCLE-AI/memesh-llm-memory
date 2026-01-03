import VoiceAgent from '../voice/index.js';
import { RAGAgent } from '../rag/index.js';
import type { TranscriptionOptions, TTSOptions } from '../voice/types.js';
import type { SearchOptions } from '../rag/types.js';
export interface VoiceRAGOptions {
    transcriptionOptions?: TranscriptionOptions;
    ttsOptions?: TTSOptions;
    searchOptions?: Partial<SearchOptions>;
    outputPath?: string;
    maxContextDocs?: number;
    model?: string;
    maxTokens?: number;
}
export interface VoiceRAGResult {
    userQuestion: string;
    retrievedDocs: Array<{
        content: string;
        source: string;
        score: number;
    }>;
    claudeResponse: string;
    audioBuffer?: Buffer;
    metrics: {
        transcriptionCost: number;
        ttsCost: number;
        ragRetrievalTime: number;
        claudeResponseTime: number;
        totalTime: number;
    };
}
export declare class VoiceRAGAgent {
    private voiceAgent;
    private ragAgent;
    private claude;
    private isInitialized;
    constructor(anthropicApiKey?: string, openAIApiKey?: string);
    initialize(): Promise<void>;
    processVoiceQuery(audioPath: string, options?: VoiceRAGOptions): Promise<VoiceRAGResult>;
    processVoiceQueryBuffer(audioBuffer: Buffer, filename: string, options?: VoiceRAGOptions): Promise<VoiceRAGResult>;
    getRAGAgent(): RAGAgent;
    getVoiceAgent(): VoiceAgent;
    private ensureInitialized;
}
export default VoiceRAGAgent;
//# sourceMappingURL=index.d.ts.map