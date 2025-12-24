/**
 * Text-to-Speech using OpenAI TTS
 */

import OpenAI from 'openai';
import { writeFile } from 'fs/promises';
import { appConfig } from '../../config';
import { MODEL_COSTS, OPENAI_MODELS, TTS_VOICES } from '../../config/models';
import type { TTSOptions, TTSResult, AudioFormat, VoiceProcessingError } from './types';
import type { TTSVoice } from '../../config/models';

/**
 * Synthesizer class for text-to-speech
 */
export class Synthesizer {
  private client: OpenAI;
  private defaultVoice: TTSVoice;
  private totalCharacters: number = 0;
  private totalCost: number = 0;

  constructor(apiKey?: string, defaultVoice?: TTSVoice) {
    this.client = new OpenAI({
      apiKey: apiKey || appConfig.openai.apiKey,
    });
    this.defaultVoice = defaultVoice || (appConfig.openai.tts.voice as TTSVoice);
  }

  /**
   * Synthesize text to speech
   */
  async synthesize(
    text: string,
    options: TTSOptions = {}
  ): Promise<TTSResult> {
    try {
      if (!text || text.trim().length === 0) {
        throw this.createError(
          'EMPTY_TEXT',
          'Text cannot be empty',
          { text }
        );
      }

      const charCount = text.length;
      console.log(`[Synthesizer] Synthesizing ${charCount} characters`);
      console.log(`[Synthesizer] Voice: ${options.voice || this.defaultVoice}`);
      console.log(`[Synthesizer] Quality: ${options.quality || 'standard'}`);

      // Select model based on quality
      const model = options.quality === 'hd'
        ? OPENAI_MODELS.TTS_HD
        : OPENAI_MODELS.TTS;

      // Call TTS API
      const startTime = Date.now();
      const response = await this.client.audio.speech.create({
        model,
        voice: options.voice || this.defaultVoice,
        input: text,
        speed: options.speed,
        response_format: 'mp3',
      });

      const processingTime = Date.now() - startTime;

      // Convert response to buffer
      const buffer = Buffer.from(await response.arrayBuffer());

      // Track metrics
      this.updateMetrics(charCount);

      console.log(`[Synthesizer] Completed in ${processingTime}ms`);
      console.log(`[Synthesizer] Audio size: ${(buffer.length / 1024).toFixed(2)}KB`);
      console.log(`[Synthesizer] Cost: $${this.getLastCost(charCount).toFixed(6)}`);

      return {
        audio: buffer,
        format: 'mp3',
      };
    } catch (error) {
      if (error instanceof Error && 'name' in error && error.name === 'VoiceProcessingError') {
        throw error;
      }
      throw this.createError(
        'SYNTHESIS_FAILED',
        `Failed to synthesize speech: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  /**
   * Synthesize text to speech and save to file
   */
  async synthesizeToFile(
    text: string,
    outputPath: string,
    options: TTSOptions = {}
  ): Promise<void> {
    try {
      const result = await this.synthesize(text, options);

      console.log(`[Synthesizer] Saving audio to: ${outputPath}`);
      await writeFile(outputPath, result.audio);
      console.log(`[Synthesizer] File saved successfully`);
    } catch (error) {
      if (error instanceof Error && 'name' in error && error.name === 'VoiceProcessingError') {
        throw error;
      }
      throw this.createError(
        'FILE_WRITE_FAILED',
        `Failed to write audio file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  /**
   * Synthesize with streaming (for real-time processing)
   */
  async *synthesizeStream(
    text: string,
    options: TTSOptions = {}
  ): AsyncGenerator<Buffer> {
    try {
      if (!text || text.trim().length === 0) {
        throw this.createError('EMPTY_TEXT', 'Text cannot be empty', { text });
      }

      console.log(`[Synthesizer] Starting streaming synthesis`);
      console.log(`[Synthesizer] Text length: ${text.length} characters`);

      const model = options.quality === 'hd'
        ? OPENAI_MODELS.TTS_HD
        : OPENAI_MODELS.TTS;

      const response = await this.client.audio.speech.create({
        model,
        voice: options.voice || this.defaultVoice,
        input: text,
        speed: options.speed,
        response_format: 'mp3',
      });

      // Track metrics
      this.updateMetrics(text.length);

      // Stream the response
      const stream = response.body;
      if (!stream) {
        throw this.createError('STREAM_ERROR', 'No stream in response');
      }

      const reader = stream.getReader();
      let totalBytes = 0;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          totalBytes += value.length;
          yield Buffer.from(value);
        }
      } finally {
        reader.releaseLock();
      }

      console.log(`[Synthesizer] Streaming completed: ${totalBytes} bytes`);
    } catch (error) {
      if (error instanceof Error && 'name' in error && error.name === 'VoiceProcessingError') {
        throw error;
      }
      throw this.createError(
        'STREAM_FAILED',
        `Failed to stream synthesis: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  /**
   * Get available voices
   */
  static getAvailableVoices(): TTSVoice[] {
    return Object.values(TTS_VOICES);
  }

  /**
   * Test all voices with sample text
   */
  async testVoices(sampleText: string = 'Hello, this is a voice test.'): Promise<void> {
    const voices = Synthesizer.getAvailableVoices();

    console.log(`[Synthesizer] Testing ${voices.length} voices...`);

    for (const voice of voices) {
      try {
        const result = await this.synthesize(sampleText, { voice });
        console.log(`✅ ${voice}: ${(result.audio.length / 1024).toFixed(2)}KB`);
      } catch (error) {
        console.error(`❌ ${voice}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * Update metrics and calculate cost
   */
  private updateMetrics(characters: number): void {
    this.totalCharacters += characters;
    const cost = (characters / 1000) * MODEL_COSTS[OPENAI_MODELS.TTS].per1KChars;
    this.totalCost += cost;
  }

  /**
   * Get cost of last synthesis
   */
  private getLastCost(characters: number): number {
    return (characters / 1000) * MODEL_COSTS[OPENAI_MODELS.TTS].per1KChars;
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
      totalCharacters: this.totalCharacters,
      totalCost: this.totalCost,
      costPer1KChars: MODEL_COSTS[OPENAI_MODELS.TTS].per1KChars,
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.totalCharacters = 0;
    this.totalCost = 0;
  }
}

export default Synthesizer;
