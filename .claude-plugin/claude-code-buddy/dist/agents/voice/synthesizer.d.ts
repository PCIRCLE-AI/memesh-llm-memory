import type { TTSOptions, TTSResult } from './types';
import type { TTSVoice } from '../../config/models';
export declare class Synthesizer {
    private client;
    private defaultVoice;
    private totalCharacters;
    private totalCost;
    constructor(apiKey?: string, defaultVoice?: TTSVoice);
    synthesize(text: string, options?: TTSOptions): Promise<TTSResult>;
    synthesizeToFile(text: string, outputPath: string, options?: TTSOptions): Promise<void>;
    synthesizeStream(text: string, options?: TTSOptions): AsyncGenerator<Buffer>;
    static getAvailableVoices(): TTSVoice[];
    testVoices(sampleText?: string): Promise<void>;
    private updateMetrics;
    private getLastCost;
    private createError;
    getMetrics(): {
        totalCharacters: number;
        totalCost: number;
        costPer1KChars: 0.015;
    };
    resetMetrics(): void;
}
export default Synthesizer;
//# sourceMappingURL=synthesizer.d.ts.map