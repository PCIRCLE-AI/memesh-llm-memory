import type { TranscriptionOptions, TranscriptionResult, TTSOptions, TTSResult, VoiceMetrics } from './types';
import type { TTSVoice } from '../../config/models';
export declare class VoiceAgent {
    private transcriber;
    private synthesizer;
    private startTime;
    constructor(openAIKey?: string, defaultVoice?: TTSVoice);
    transcribe(audioPath: string, options?: TranscriptionOptions): Promise<TranscriptionResult>;
    transcribeBuffer(audioBuffer: Buffer, filename: string, options?: TranscriptionOptions): Promise<TranscriptionResult>;
    synthesize(text: string, options?: TTSOptions): Promise<TTSResult>;
    synthesizeToFile(text: string, outputPath: string, options?: TTSOptions): Promise<void>;
    synthesizeStream(text: string, options?: TTSOptions): AsyncGenerator<Buffer>;
    processVoiceInput(audioPath: string, processor: (text: string) => Promise<string>, options?: {
        transcriptionOptions?: TranscriptionOptions;
        ttsOptions?: TTSOptions;
        outputPath?: string;
    }): Promise<{
        inputText: string;
        outputText: string;
        audioResult?: TTSResult;
    }>;
    getMetrics(): VoiceMetrics;
    getDetailedMetrics(): {
        transcriber: {
            totalDuration: number;
            totalCost: number;
            costPerMinute: 0.006;
        };
        synthesizer: {
            totalCharacters: number;
            totalCost: number;
            costPer1KChars: 0.015;
        };
        uptime: number;
    };
    resetMetrics(): void;
    static getAvailableVoices(): TTSVoice[];
    testVoices(sampleText?: string): Promise<void>;
}
export { Transcriber } from './transcriber';
export { Synthesizer } from './synthesizer';
export * from './types';
export default VoiceAgent;
//# sourceMappingURL=index.d.ts.map