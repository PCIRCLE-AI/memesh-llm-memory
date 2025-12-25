/**
 * Voice AI Agent Types
 */

import type { TTSVoice } from '../../config/models';

/**
 * Supported languages
 */
export type Language = 'zh' | 'en' | 'ja' | 'ko' | 'es' | 'fr' | 'de';

/**
 * Audio formats
 */
export type AudioFormat = 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm';

/**
 * TTS quality
 */
export type TTSQuality = 'standard' | 'hd';

/**
 * Transcription options
 */
export interface TranscriptionOptions {
  language?: Language;
  prompt?: string;
  temperature?: number;
  responseFormat?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
}

/**
 * Transcription result
 */
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

/**
 * TTS options
 */
export interface TTSOptions {
  voice?: TTSVoice;
  quality?: TTSQuality;
  speed?: number;
}

/**
 * TTS result
 */
export interface TTSResult {
  audio: Buffer;
  format: AudioFormat;
  duration?: number;
}

/**
 * Voice processing metrics
 */
export interface VoiceMetrics {
  transcriptionCount: number;
  ttsCount: number;
  totalAudioDuration: number;
  totalCharacters: number;
  totalCost: number;
  lastUpdated: Date;
}

/**
 * Voice processing error
 */
export class VoiceProcessingError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(
    message: string,
    code: string,
    details?: unknown
  ) {
    super(message);
    this.name = 'VoiceProcessingError';
    this.code = code;
    this.details = details;
  }
}
