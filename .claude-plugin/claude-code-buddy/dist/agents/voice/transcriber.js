import OpenAI from 'openai';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import { appConfig } from '../../config';
import { MODEL_COSTS, OPENAI_MODELS } from '../../config/models';
import { VoiceProcessingError } from './types';
import { retryWithBackoff } from '../../utils/retry.js';
export class Transcriber {
    client;
    model;
    totalDuration = 0;
    totalCost = 0;
    constructor(apiKey) {
        this.client = new OpenAI({
            apiKey: apiKey || appConfig.openai.apiKey,
        });
        this.model = appConfig.openai.whisper.model;
    }
    async transcribe(audioPath, options = {}) {
        try {
            const stats = await stat(audioPath);
            const fileSizeMB = stats.size / (1024 * 1024);
            if (fileSizeMB > 25) {
                throw this.createError('FILE_TOO_LARGE', `Audio file is ${fileSizeMB.toFixed(2)}MB, exceeds 25MB limit`, { fileSizeMB });
            }
            console.log(`[Transcriber] Processing audio file: ${audioPath} (${fileSizeMB.toFixed(2)}MB)`);
            const fileStream = createReadStream(audioPath);
            const startTime = Date.now();
            const response = await retryWithBackoff(() => this.client.audio.transcriptions.create({
                file: fileStream,
                model: this.model,
                language: options.language,
                prompt: options.prompt,
                temperature: options.temperature,
                response_format: options.responseFormat || 'verbose_json',
            }), {
                maxRetries: 3,
                baseDelay: 1000,
                enableJitter: true,
                operationName: 'Whisper Transcription',
            });
            const processingTime = Date.now() - startTime;
            const result = this.parseResponse(response);
            this.updateMetrics(result.duration || 0);
            console.log(`[Transcriber] Completed in ${processingTime}ms`);
            console.log(`[Transcriber] Text length: ${result.text.length} characters`);
            console.log(`[Transcriber] Duration: ${result.duration?.toFixed(2)}s`);
            console.log(`[Transcriber] Cost: $${this.getLastCost().toFixed(6)}`);
            return result;
        }
        catch (error) {
            if (error instanceof Error && 'name' in error && error.name === 'VoiceProcessingError') {
                throw error;
            }
            throw this.createError('TRANSCRIPTION_FAILED', `Failed to transcribe audio: ${error instanceof Error ? error.message : 'Unknown error'}`, error);
        }
    }
    async transcribeBuffer(audioBuffer, filename, options = {}) {
        try {
            const fileSizeMB = audioBuffer.length / (1024 * 1024);
            if (fileSizeMB > 25) {
                throw this.createError('FILE_TOO_LARGE', `Audio buffer is ${fileSizeMB.toFixed(2)}MB, exceeds 25MB limit`, { fileSizeMB });
            }
            console.log(`[Transcriber] Processing audio buffer: ${filename} (${fileSizeMB.toFixed(2)}MB)`);
            const file = new File([audioBuffer], filename, {
                type: this.getContentType(filename),
            });
            const startTime = Date.now();
            const response = await retryWithBackoff(() => this.client.audio.transcriptions.create({
                file,
                model: this.model,
                language: options.language,
                prompt: options.prompt,
                temperature: options.temperature,
                response_format: options.responseFormat || 'verbose_json',
            }), {
                maxRetries: 3,
                baseDelay: 1000,
                enableJitter: true,
                operationName: 'Whisper Transcription (Buffer)',
            });
            const processingTime = Date.now() - startTime;
            const result = this.parseResponse(response);
            this.updateMetrics(result.duration || 0);
            console.log(`[Transcriber] Completed in ${processingTime}ms`);
            console.log(`[Transcriber] Cost: $${this.getLastCost().toFixed(6)}`);
            return result;
        }
        catch (error) {
            if (error instanceof Error && 'name' in error && error.name === 'VoiceProcessingError') {
                throw error;
            }
            throw this.createError('TRANSCRIPTION_FAILED', `Failed to transcribe buffer: ${error instanceof Error ? error.message : 'Unknown error'}`, error);
        }
    }
    parseResponse(response) {
        if (typeof response === 'string') {
            return { text: response };
        }
        return {
            text: response.text || '',
            language: response.language,
            duration: response.duration,
            segments: response.segments?.map((seg) => ({
                id: seg.id,
                start: seg.start,
                end: seg.end,
                text: seg.text,
            })),
        };
    }
    updateMetrics(duration) {
        this.totalDuration += duration;
        const durationMinutes = duration / 60;
        const cost = durationMinutes * MODEL_COSTS[OPENAI_MODELS.WHISPER].perMinute;
        this.totalCost += cost;
    }
    getLastCost() {
        const durationMinutes = this.totalDuration / 60;
        return durationMinutes * MODEL_COSTS[OPENAI_MODELS.WHISPER].perMinute;
    }
    getContentType(filename) {
        const ext = filename.split('.').pop()?.toLowerCase();
        const types = {
            mp3: 'audio/mpeg',
            wav: 'audio/wav',
            m4a: 'audio/mp4',
            flac: 'audio/flac',
            ogg: 'audio/ogg',
            webm: 'audio/webm',
        };
        return types[ext || ''] || 'audio/mpeg';
    }
    createError(code, message, details) {
        return new VoiceProcessingError(message, code, details);
    }
    getMetrics() {
        return {
            totalDuration: this.totalDuration,
            totalCost: this.totalCost,
            costPerMinute: MODEL_COSTS[OPENAI_MODELS.WHISPER].perMinute,
        };
    }
    resetMetrics() {
        this.totalDuration = 0;
        this.totalCost = 0;
    }
}
export default Transcriber;
//# sourceMappingURL=transcriber.js.map