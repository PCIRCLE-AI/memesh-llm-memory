import type { TTSVoice } from '../../config/models';
export type Language = 'zh' | 'en' | 'ja' | 'ko' | 'es' | 'fr' | 'de';
export type AudioFormat = 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm';
export type TTSQuality = 'standard' | 'hd';
export interface TranscriptionOptions {
    language?: Language;
    prompt?: string;
    temperature?: number;
    responseFormat?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
}
export interface TranscriptionResult {
    text: string;
    language?: string;
    duration?: number;
    segments?: Array<{
        id: number;
        start: number;
        end: number;
        text: string;
    }>;
}
export interface TTSOptions {
    voice?: TTSVoice;
    quality?: TTSQuality;
    speed?: number;
}
export interface TTSResult {
    audio: Buffer;
    format: AudioFormat;
    duration?: number;
}
export interface VoiceMetrics {
    transcriptionCount: number;
    ttsCount: number;
    totalAudioDuration: number;
    totalCharacters: number;
    totalCost: number;
    lastUpdated: Date;
}
export declare class VoiceProcessingError extends Error {
    readonly code: string;
    readonly details?: unknown;
    constructor(message: string, code: string, details?: unknown);
}
//# sourceMappingURL=types.d.ts.map