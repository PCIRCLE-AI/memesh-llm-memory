import { Transcriber } from './transcriber';
import { Synthesizer } from './synthesizer';
import { appConfig } from '../../config';
export class VoiceAgent {
    transcriber;
    synthesizer;
    startTime;
    constructor(openAIKey, defaultVoice) {
        this.transcriber = new Transcriber(openAIKey);
        this.synthesizer = new Synthesizer(openAIKey, defaultVoice);
        this.startTime = new Date();
        console.log('[VoiceAgent] Initialized');
        console.log(`[VoiceAgent] Default voice: ${defaultVoice || appConfig.openai.tts.voice}`);
    }
    async transcribe(audioPath, options) {
        return this.transcriber.transcribe(audioPath, options);
    }
    async transcribeBuffer(audioBuffer, filename, options) {
        return this.transcriber.transcribeBuffer(audioBuffer, filename, options);
    }
    async synthesize(text, options) {
        return this.synthesizer.synthesize(text, options);
    }
    async synthesizeToFile(text, outputPath, options) {
        return this.synthesizer.synthesizeToFile(text, outputPath, options);
    }
    synthesizeStream(text, options) {
        return this.synthesizer.synthesizeStream(text, options);
    }
    async processVoiceInput(audioPath, processor, options = {}) {
        try {
            console.log('[VoiceAgent] Starting voice processing pipeline...');
            console.log('[VoiceAgent] Step 1: Transcribing audio...');
            const transcription = await this.transcribe(audioPath, options.transcriptionOptions);
            console.log(`[VoiceAgent] Transcribed: "${transcription.text}"`);
            console.log('[VoiceAgent] Step 2: Processing text...');
            const processedText = await processor(transcription.text);
            console.log(`[VoiceAgent] Processed: "${processedText}"`);
            console.log('[VoiceAgent] Step 3: Synthesizing response...');
            let audioResult;
            if (options.outputPath) {
                await this.synthesizeToFile(processedText, options.outputPath, options.ttsOptions);
                console.log(`[VoiceAgent] Audio saved to: ${options.outputPath}`);
            }
            else {
                audioResult = await this.synthesize(processedText, options.ttsOptions);
            }
            console.log('[VoiceAgent] Voice processing completed');
            return {
                inputText: transcription.text,
                outputText: processedText,
                audioResult,
            };
        }
        catch (error) {
            console.error('[VoiceAgent] Voice processing failed:', error);
            throw error;
        }
    }
    getMetrics() {
        const transcriberMetrics = this.transcriber.getMetrics();
        const synthesizerMetrics = this.synthesizer.getMetrics();
        return {
            transcriptionCount: 0,
            ttsCount: 0,
            totalAudioDuration: transcriberMetrics.totalDuration,
            totalCharacters: synthesizerMetrics.totalCharacters,
            totalCost: transcriberMetrics.totalCost + synthesizerMetrics.totalCost,
            lastUpdated: new Date(),
        };
    }
    getDetailedMetrics() {
        return {
            transcriber: this.transcriber.getMetrics(),
            synthesizer: this.synthesizer.getMetrics(),
            uptime: Date.now() - this.startTime.getTime(),
        };
    }
    resetMetrics() {
        this.transcriber.resetMetrics();
        this.synthesizer.resetMetrics();
        this.startTime = new Date();
        console.log('[VoiceAgent] Metrics reset');
    }
    static getAvailableVoices() {
        return Synthesizer.getAvailableVoices();
    }
    async testVoices(sampleText) {
        return this.synthesizer.testVoices(sampleText);
    }
}
export { Transcriber } from './transcriber';
export { Synthesizer } from './synthesizer';
export * from './types';
export default VoiceAgent;
async function main() {
    console.log('='.repeat(60));
    console.log('Voice AI Agent Demo');
    console.log('='.repeat(60));
    try {
        const agent = new VoiceAgent();
        console.log('\n📢 Available TTS Voices:');
        const voices = VoiceAgent.getAvailableVoices();
        voices.forEach((voice, i) => {
            console.log(`  ${i + 1}. ${voice}`);
        });
        console.log('\n🎤 Testing Voice Synthesis...');
        const testText = 'Hello! This is a test of the voice AI agent.';
        const result = await agent.synthesize(testText, { voice: 'nova' });
        console.log(`Generated audio: ${(result.audio.length / 1024).toFixed(2)}KB`);
        console.log('\n💾 Saving to file...');
        await agent.synthesizeToFile('Welcome to the Smart Agents project.', '/tmp/voice_test.mp3', { voice: 'shimmer', quality: 'hd' });
        console.log('\n📊 Metrics:');
        const metrics = agent.getDetailedMetrics();
        console.log('Synthesizer:');
        console.log(`  Total characters: ${metrics.synthesizer.totalCharacters}`);
        console.log(`  Total cost: $${metrics.synthesizer.totalCost.toFixed(6)}`);
        console.log(`  Cost per 1K chars: $${metrics.synthesizer.costPer1KChars}`);
        console.log('\n✅ Demo completed successfully!');
    }
    catch (error) {
        console.error('❌ Demo failed:', error);
        process.exit(1);
    }
}
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
//# sourceMappingURL=index.js.map