import OpenAI from 'openai';
import { writeFile } from 'fs/promises';
import { appConfig } from '../../config';
import { MODEL_COSTS, OPENAI_MODELS, TTS_VOICES } from '../../config/models';
import { VoiceProcessingError } from './types';
import { retryWithBackoff } from '../../utils/retry.js';
export class Synthesizer {
    client;
    defaultVoice;
    totalCharacters = 0;
    totalCost = 0;
    constructor(apiKey, defaultVoice) {
        this.client = new OpenAI({
            apiKey: apiKey || appConfig.openai.apiKey,
        });
        this.defaultVoice = defaultVoice || appConfig.openai.tts.voice;
    }
    async synthesize(text, options = {}) {
        try {
            if (!text || text.trim().length === 0) {
                throw this.createError('EMPTY_TEXT', 'Text cannot be empty', { text });
            }
            const charCount = text.length;
            console.log(`[Synthesizer] Synthesizing ${charCount} characters`);
            console.log(`[Synthesizer] Voice: ${options.voice || this.defaultVoice}`);
            console.log(`[Synthesizer] Quality: ${options.quality || 'standard'}`);
            const model = options.quality === 'hd'
                ? OPENAI_MODELS.TTS_HD
                : OPENAI_MODELS.TTS;
            const startTime = Date.now();
            const response = await retryWithBackoff(() => this.client.audio.speech.create({
                model,
                voice: options.voice || this.defaultVoice,
                input: text,
                speed: options.speed,
                response_format: 'mp3',
            }), {
                maxRetries: 3,
                baseDelay: 1000,
                enableJitter: true,
                operationName: 'TTS Synthesis',
            });
            const processingTime = Date.now() - startTime;
            const buffer = Buffer.from(await response.arrayBuffer());
            this.updateMetrics(charCount);
            console.log(`[Synthesizer] Completed in ${processingTime}ms`);
            console.log(`[Synthesizer] Audio size: ${(buffer.length / 1024).toFixed(2)}KB`);
            console.log(`[Synthesizer] Cost: $${this.getLastCost(charCount).toFixed(6)}`);
            return {
                audio: buffer,
                format: 'mp3',
            };
        }
        catch (error) {
            if (error instanceof Error && 'name' in error && error.name === 'VoiceProcessingError') {
                throw error;
            }
            throw this.createError('SYNTHESIS_FAILED', `Failed to synthesize speech: ${error instanceof Error ? error.message : 'Unknown error'}`, error);
        }
    }
    async synthesizeToFile(text, outputPath, options = {}) {
        try {
            const result = await this.synthesize(text, options);
            console.log(`[Synthesizer] Saving audio to: ${outputPath}`);
            await writeFile(outputPath, result.audio);
            console.log(`[Synthesizer] File saved successfully`);
        }
        catch (error) {
            if (error instanceof Error && 'name' in error && error.name === 'VoiceProcessingError') {
                throw error;
            }
            throw this.createError('FILE_WRITE_FAILED', `Failed to write audio file: ${error instanceof Error ? error.message : 'Unknown error'}`, error);
        }
    }
    async *synthesizeStream(text, options = {}) {
        try {
            if (!text || text.trim().length === 0) {
                throw this.createError('EMPTY_TEXT', 'Text cannot be empty', { text });
            }
            console.log(`[Synthesizer] Starting streaming synthesis`);
            console.log(`[Synthesizer] Text length: ${text.length} characters`);
            const model = options.quality === 'hd'
                ? OPENAI_MODELS.TTS_HD
                : OPENAI_MODELS.TTS;
            const response = await retryWithBackoff(() => this.client.audio.speech.create({
                model,
                voice: options.voice || this.defaultVoice,
                input: text,
                speed: options.speed,
                response_format: 'mp3',
            }), {
                maxRetries: 3,
                baseDelay: 1000,
                enableJitter: true,
                operationName: 'TTS Synthesis (Stream)',
            });
            this.updateMetrics(text.length);
            const stream = response.body;
            if (!stream) {
                throw this.createError('STREAM_ERROR', 'No stream in response');
            }
            const reader = stream.getReader();
            let totalBytes = 0;
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done)
                        break;
                    totalBytes += value.length;
                    yield Buffer.from(value);
                }
            }
            finally {
                reader.releaseLock();
            }
            console.log(`[Synthesizer] Streaming completed: ${totalBytes} bytes`);
        }
        catch (error) {
            if (error instanceof Error && 'name' in error && error.name === 'VoiceProcessingError') {
                throw error;
            }
            throw this.createError('STREAM_FAILED', `Failed to stream synthesis: ${error instanceof Error ? error.message : 'Unknown error'}`, error);
        }
    }
    static getAvailableVoices() {
        return Object.values(TTS_VOICES);
    }
    async testVoices(sampleText = 'Hello, this is a voice test.') {
        const voices = Synthesizer.getAvailableVoices();
        console.log(`[Synthesizer] Testing ${voices.length} voices...`);
        for (const voice of voices) {
            try {
                const result = await this.synthesize(sampleText, { voice });
                console.log(`✅ ${voice}: ${(result.audio.length / 1024).toFixed(2)}KB`);
            }
            catch (error) {
                console.error(`❌ ${voice}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
    }
    updateMetrics(characters) {
        this.totalCharacters += characters;
        const cost = (characters / 1000) * MODEL_COSTS[OPENAI_MODELS.TTS].per1KChars;
        this.totalCost += cost;
    }
    getLastCost(characters) {
        return (characters / 1000) * MODEL_COSTS[OPENAI_MODELS.TTS].per1KChars;
    }
    createError(code, message, details) {
        return new VoiceProcessingError(message, code, details);
    }
    getMetrics() {
        return {
            totalCharacters: this.totalCharacters,
            totalCost: this.totalCost,
            costPer1KChars: MODEL_COSTS[OPENAI_MODELS.TTS].per1KChars,
        };
    }
    resetMetrics() {
        this.totalCharacters = 0;
        this.totalCost = 0;
    }
}
export default Synthesizer;
//# sourceMappingURL=synthesizer.js.map