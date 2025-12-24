/**
 * Speech-to-Text using OpenAI Whisper
 */

import OpenAI from 'openai';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import { appConfig } from '../../config';
import { MODEL_COSTS, OPENAI_MODELS } from '../../config/models';
import type {
  TranscriptionOptions,
  TranscriptionResult,
  VoiceProcessingError,
} from './types';

/**
 * Transcriber class for speech-to-text
 */
export class Transcriber {
  private client: OpenAI;
  private model: string;
  private totalDuration: number = 0;
  private totalCost: number = 0;

  constructor(apiKey?: string) {
    this.client = new OpenAI({
      apiKey: apiKey || appConfig.openai.apiKey,
    });
    this.model = appConfig.openai.whisper.model;
  }

  /**
   * Transcribe audio file to text
   */
  async transcribe(
    audioPath: string,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult> {
    try {
      // Check file exists and get size
      const stats = await stat(audioPath);
      const fileSizeMB = stats.size / (1024 * 1024);

      // OpenAI has 25MB limit
      if (fileSizeMB > 25) {
        throw this.createError(
          'FILE_TOO_LARGE',
          `Audio file is ${fileSizeMB.toFixed(2)}MB, exceeds 25MB limit`,
          { fileSizeMB }
        );
      }

      console.log(`[Transcriber] Processing audio file: ${audioPath} (${fileSizeMB.toFixed(2)}MB)`);

      // Create file stream
      const fileStream = createReadStream(audioPath);

      // Call Whisper API
      const startTime = Date.now();
      const response = await this.client.audio.transcriptions.create({
        file: fileStream,
        model: this.model,
        language: options.language,
        prompt: options.prompt,
        temperature: options.temperature,
        response_format: options.responseFormat || 'verbose_json',
      });

      const processingTime = Date.now() - startTime;

      // Parse response
      const result = this.parseResponse(response);

      // Track metrics
      this.updateMetrics(result.duration || 0);

      console.log(`[Transcriber] Completed in ${processingTime}ms`);
      console.log(`[Transcriber] Text length: ${result.text.length} characters`);
      console.log(`[Transcriber] Duration: ${result.duration?.toFixed(2)}s`);
      console.log(`[Transcriber] Cost: $${this.getLastCost().toFixed(6)}`);

      return result;
    } catch (error) {
      if (error instanceof Error && 'name' in error && error.name === 'VoiceProcessingError') {
        throw error;
      }
      throw this.createError(
        'TRANSCRIPTION_FAILED',
        `Failed to transcribe audio: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  /**
   * Transcribe audio buffer
   */
  async transcribeBuffer(
    audioBuffer: Buffer,
    filename: string,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult> {
    try {
      const fileSizeMB = audioBuffer.length / (1024 * 1024);

      if (fileSizeMB > 25) {
        throw this.createError(
          'FILE_TOO_LARGE',
          `Audio buffer is ${fileSizeMB.toFixed(2)}MB, exceeds 25MB limit`,
          { fileSizeMB }
        );
      }

      console.log(`[Transcriber] Processing audio buffer: ${filename} (${fileSizeMB.toFixed(2)}MB)`);

      // Create File object from buffer
      const file = new File([audioBuffer], filename, {
        type: this.getContentType(filename),
      });

      const startTime = Date.now();
      const response = await this.client.audio.transcriptions.create({
        file,
        model: this.model,
        language: options.language,
        prompt: options.prompt,
        temperature: options.temperature,
        response_format: options.responseFormat || 'verbose_json',
      });

      const processingTime = Date.now() - startTime;
      const result = this.parseResponse(response);
      this.updateMetrics(result.duration || 0);

      console.log(`[Transcriber] Completed in ${processingTime}ms`);
      console.log(`[Transcriber] Cost: $${this.getLastCost().toFixed(6)}`);

      return result;
    } catch (error) {
      if (error instanceof Error && 'name' in error && error.name === 'VoiceProcessingError') {
        throw error;
      }
      throw this.createError(
        'TRANSCRIPTION_FAILED',
        `Failed to transcribe buffer: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  /**
   * Parse Whisper API response
   */
  private parseResponse(response: any): TranscriptionResult {
    if (typeof response === 'string') {
      return { text: response };
    }

    return {
      text: response.text || '',
      language: response.language,
      duration: response.duration,
      segments: response.segments?.map((seg: any) => ({
        id: seg.id,
        start: seg.start,
        end: seg.end,
        text: seg.text,
      })),
    };
  }

  /**
   * Update metrics and calculate cost
   */
  private updateMetrics(duration: number): void {
    this.totalDuration += duration;
    const durationMinutes = duration / 60;
    const cost = durationMinutes * MODEL_COSTS[OPENAI_MODELS.WHISPER].perMinute;
    this.totalCost += cost;
  }

  /**
   * Get cost of last transcription
   */
  private getLastCost(): number {
    const durationMinutes = this.totalDuration / 60;
    return durationMinutes * MODEL_COSTS[OPENAI_MODELS.WHISPER].perMinute;
  }

  /**
   * Get content type from filename
   */
  private getContentType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const types: Record<string, string> = {
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      m4a: 'audio/mp4',
      flac: 'audio/flac',
      ogg: 'audio/ogg',
      webm: 'audio/webm',
    };
    return types[ext || ''] || 'audio/mpeg';
  }

  /**
   * Create typed error
   */
  private createError(code: string, message: string, details?: unknown): VoiceProcessingError {
    const error = new Error(message) as VoiceProcessingError;
    error.name = 'VoiceProcessingError';
    error.code = code;
    error.details = details;
    return error;
  }

  /**
   * Get total metrics
   */
  getMetrics() {
    return {
      totalDuration: this.totalDuration,
      totalCost: this.totalCost,
      costPerMinute: MODEL_COSTS[OPENAI_MODELS.WHISPER].perMinute,
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.totalDuration = 0;
    this.totalCost = 0;
  }
}

export default Transcriber;
