import type { TranscriptionOptions, TranscriptionResult } from './types';
export declare class Transcriber {
    private client;
    private model;
    private totalDuration;
    private totalCost;
    constructor(apiKey?: string);
    transcribe(audioPath: string, options?: TranscriptionOptions): Promise<TranscriptionResult>;
    transcribeBuffer(audioBuffer: Buffer, filename: string, options?: TranscriptionOptions): Promise<TranscriptionResult>;
    private parseResponse;
    private updateMetrics;
    private getLastCost;
    private getContentType;
    private createError;
    getMetrics(): {
        totalDuration: number;
        totalCost: number;
        costPerMinute: 0.006;
    };
    resetMetrics(): void;
}
export default Transcriber;
//# sourceMappingURL=transcriber.d.ts.map