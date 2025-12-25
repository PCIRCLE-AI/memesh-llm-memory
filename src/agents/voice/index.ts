/**
 * Voice AI Agent
 * Handles speech-to-text (Whisper) and text-to-speech (TTS)
 */

import { Transcriber } from './transcriber';
import { Synthesizer } from './synthesizer';
import { appConfig } from '../../config';
import type {
  TranscriptionOptions,
  TranscriptionResult,
  TTSOptions,
  TTSResult,
  VoiceMetrics,
} from './types';
import type { TTSVoice } from '../../config/models';

/**
 * Voice AI Agent class
 */
export class VoiceAgent {
  private transcriber: Transcriber;
  private synthesizer: Synthesizer;
  private startTime: Date;

  constructor(
    openAIKey?: string,
    defaultVoice?: TTSVoice
  ) {
    this.transcriber = new Transcriber(openAIKey);
    this.synthesizer = new Synthesizer(openAIKey, defaultVoice);
    this.startTime = new Date();

    console.log('[VoiceAgent] Initialized');
    console.log(`[VoiceAgent] Default voice: ${defaultVoice || appConfig.openai.tts.voice}`);
  }

  /**
   * Transcribe audio file to text
   */
  async transcribe(
    audioPath: string,
    options?: TranscriptionOptions
  ): Promise<TranscriptionResult> {
    return this.transcriber.transcribe(audioPath, options);
  }

  /**
   * Transcribe audio buffer to text
   */
  async transcribeBuffer(
    audioBuffer: Buffer,
    filename: string,
    options?: TranscriptionOptions
  ): Promise<TranscriptionResult> {
    return this.transcriber.transcribeBuffer(audioBuffer, filename, options);
  }

  /**
   * Synthesize text to speech
   */
  async synthesize(
    text: string,
    options?: TTSOptions
  ): Promise<TTSResult> {
    return this.synthesizer.synthesize(text, options);
  }

  /**
   * Synthesize text to speech and save to file
   */
  async synthesizeToFile(
    text: string,
    outputPath: string,
    options?: TTSOptions
  ): Promise<void> {
    return this.synthesizer.synthesizeToFile(text, outputPath, options);
  }

  /**
   * Synthesize with streaming
   */
  synthesizeStream(
    text: string,
    options?: TTSOptions
  ): AsyncGenerator<Buffer> {
    return this.synthesizer.synthesizeStream(text, options);
  }

  /**
   * Full voice conversation: audio in -> text -> process -> audio out
   */
  async processVoiceInput(
    audioPath: string,
    processor: (text: string) => Promise<string>,
    options: {
      transcriptionOptions?: TranscriptionOptions;
      ttsOptions?: TTSOptions;
      outputPath?: string;
    } = {}
  ): Promise<{
    inputText: string;
    outputText: string;
    audioResult?: TTSResult;
  }> {
    try {
      console.log('[VoiceAgent] Starting voice processing pipeline...');

      // Step 1: Transcribe input audio
      console.log('[VoiceAgent] Step 1: Transcribing audio...');
      const transcription = await this.transcribe(
        audioPath,
        options.transcriptionOptions
      );

      console.log(`[VoiceAgent] Transcribed: "${transcription.text}"`);

      // Step 2: Process text
      console.log('[VoiceAgent] Step 2: Processing text...');
      const processedText = await processor(transcription.text);

      console.log(`[VoiceAgent] Processed: "${processedText}"`);

      // Step 3: Synthesize response
      console.log('[VoiceAgent] Step 3: Synthesizing response...');
      let audioResult: TTSResult | undefined;

      if (options.outputPath) {
        await this.synthesizeToFile(
          processedText,
          options.outputPath,
          options.ttsOptions
        );
        console.log(`[VoiceAgent] Audio saved to: ${options.outputPath}`);
      } else {
        audioResult = await this.synthesize(processedText, options.ttsOptions);
      }

      console.log('[VoiceAgent] Voice processing completed');

      return {
        inputText: transcription.text,
        outputText: processedText,
        audioResult,
      };
    } catch (error) {
      console.error('[VoiceAgent] Voice processing failed:', error);
      throw error;
    }
  }

  /**
   * Get combined metrics from both transcriber and synthesizer
   */
  getMetrics(): VoiceMetrics {
    const transcriberMetrics = this.transcriber.getMetrics();
    const synthesizerMetrics = this.synthesizer.getMetrics();

    return {
      transcriptionCount: 0, // Could track this separately if needed
      ttsCount: 0, // Could track this separately if needed
      totalAudioDuration: transcriberMetrics.totalDuration,
      totalCharacters: synthesizerMetrics.totalCharacters,
      totalCost: transcriberMetrics.totalCost + synthesizerMetrics.totalCost,
      lastUpdated: new Date(),
    };
  }

  /**
   * Get detailed metrics breakdown
   */
  getDetailedMetrics() {
    return {
      transcriber: this.transcriber.getMetrics(),
      synthesizer: this.synthesizer.getMetrics(),
      uptime: Date.now() - this.startTime.getTime(),
    };
  }

  /**
   * Reset all metrics
   */
  resetMetrics(): void {
    this.transcriber.resetMetrics();
    this.synthesizer.resetMetrics();
    this.startTime = new Date();
    console.log('[VoiceAgent] Metrics reset');
  }

  /**
   * Get available voices
   */
  static getAvailableVoices(): TTSVoice[] {
    return Synthesizer.getAvailableVoices();
  }

  /**
   * Test all voices
   */
  async testVoices(sampleText?: string): Promise<void> {
    return this.synthesizer.testVoices(sampleText);
  }
}

// Export all types and classes
export { Transcriber } from './transcriber';
export { Synthesizer } from './synthesizer';
export * from './types';

export default VoiceAgent;

/**
 * CLI demo function
 */
async function main() {
  console.log('='.repeat(60));
  console.log('Voice AI Agent Demo');
  console.log('='.repeat(60));

  try {
    // Initialize agent
    const agent = new VoiceAgent();

    // Example 1: List available voices
    console.log('\n📢 Available TTS Voices:');
    const voices = VoiceAgent.getAvailableVoices();
    voices.forEach((voice, i) => {
      console.log(`  ${i + 1}. ${voice}`);
    });

    // Example 2: Test voice synthesis
    console.log('\n🎤 Testing Voice Synthesis...');
    const testText = 'Hello! This is a test of the voice AI agent.';
    const result = await agent.synthesize(testText, { voice: 'nova' });
    console.log(`Generated audio: ${(result.audio.length / 1024).toFixed(2)}KB`);

    // Example 3: Save to file
    console.log('\n💾 Saving to file...');
    await agent.synthesizeToFile(
      'Welcome to the Smart Agents project.',
      '/tmp/voice_test.mp3',
      { voice: 'shimmer', quality: 'hd' }
    );

    // Example 4: Show metrics
    console.log('\n📊 Metrics:');
    const metrics = agent.getDetailedMetrics();
    console.log('Synthesizer:');
    console.log(`  Total characters: ${metrics.synthesizer.totalCharacters}`);
    console.log(`  Total cost: $${metrics.synthesizer.totalCost.toFixed(6)}`);
    console.log(`  Cost per 1K chars: $${metrics.synthesizer.costPer1KChars}`);

    console.log('\n✅ Demo completed successfully!');
  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

// Run demo if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
