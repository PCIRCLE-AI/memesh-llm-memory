import VoiceAgent from '../voice/index.js';
import { RAGAgent } from '../rag/index.js';
import Anthropic from '@anthropic-ai/sdk';
export class VoiceRAGAgent {
    voiceAgent;
    ragAgent;
    claude;
    isInitialized = false;
    constructor(anthropicApiKey, openAIApiKey) {
        this.voiceAgent = new VoiceAgent(openAIApiKey);
        this.ragAgent = new RAGAgent();
        this.claude = new Anthropic({
            apiKey: anthropicApiKey || process.env.ANTHROPIC_API_KEY,
        });
        console.log('[VoiceRAGAgent] Created');
    }
    async initialize() {
        if (this.isInitialized) {
            console.log('[VoiceRAGAgent] Already initialized');
            return;
        }
        console.log('[VoiceRAGAgent] Initializing...');
        await this.ragAgent.initialize();
        this.isInitialized = true;
        console.log('[VoiceRAGAgent] Initialized successfully');
    }
    async processVoiceQuery(audioPath, options = {}) {
        this.ensureInitialized();
        const startTime = Date.now();
        console.log('[VoiceRAGAgent] Starting voice query processing...');
        console.log('[VoiceRAGAgent] Step 1: Transcribing audio...');
        const transcriptionStart = Date.now();
        const transcription = await this.voiceAgent.transcribe(audioPath, options.transcriptionOptions);
        const userQuestion = transcription.text;
        console.log(`[VoiceRAGAgent] User asked: "${userQuestion}"`);
        console.log('[VoiceRAGAgent] Step 2: Retrieving relevant documents...');
        const ragStart = Date.now();
        const searchResults = await this.ragAgent.searchWithRerank(userQuestion, options.searchOptions || { topK: options.maxContextDocs || 3 });
        const ragTime = Date.now() - ragStart;
        console.log(`[VoiceRAGAgent] Retrieved ${searchResults.length} documents`);
        const retrievedDocs = searchResults.map((result) => ({
            content: result.content,
            source: result.metadata.source || 'Unknown',
            score: result.score,
        }));
        console.log('[VoiceRAGAgent] Step 3: Generating response with Claude...');
        const claudeStart = Date.now();
        const contextText = retrievedDocs
            .map((doc, i) => `[Document ${i + 1}] ${doc.source}:\n${doc.content}`)
            .join('\n\n---\n\n');
        const prompt = `Based on the following documents, please answer the user's question.

Documents:
${contextText}

User Question: ${userQuestion}

Please provide a clear, concise answer based on the information in the documents. If the documents don't contain relevant information, say so.`;
        const claudeResponse = await this.claude.messages.create({
            model: options.model || 'claude-sonnet-4-5-20250929',
            max_tokens: options.maxTokens || 1024,
            messages: [
                {
                    role: 'user',
                    content: prompt,
                },
            ],
        });
        const responseText = claudeResponse.content[0].type === 'text'
            ? claudeResponse.content[0].text
            : '';
        const claudeTime = Date.now() - claudeStart;
        console.log(`[VoiceRAGAgent] Claude response: "${responseText.substring(0, 100)}..."`);
        console.log('[VoiceRAGAgent] Step 4: Synthesizing audio response...');
        let audioBuffer;
        if (options.outputPath) {
            await this.voiceAgent.synthesizeToFile(responseText, options.outputPath, options.ttsOptions);
            console.log(`[VoiceRAGAgent] Audio saved to: ${options.outputPath}`);
        }
        else {
            const ttsResult = await this.voiceAgent.synthesize(responseText, options.ttsOptions);
            audioBuffer = ttsResult.audio;
        }
        const totalTime = Date.now() - startTime;
        const voiceMetrics = this.voiceAgent.getDetailedMetrics();
        console.log('[VoiceRAGAgent] Voice query processing complete');
        console.log(`[VoiceRAGAgent] Total time: ${(totalTime / 1000).toFixed(2)}s`);
        return {
            userQuestion,
            retrievedDocs,
            claudeResponse: responseText,
            audioBuffer,
            metrics: {
                transcriptionCost: voiceMetrics.transcriber.totalCost,
                ttsCost: voiceMetrics.synthesizer.totalCost,
                ragRetrievalTime: ragTime,
                claudeResponseTime: claudeTime,
                totalTime,
            },
        };
    }
    async processVoiceQueryBuffer(audioBuffer, filename, options = {}) {
        this.ensureInitialized();
        const startTime = Date.now();
        console.log('[VoiceRAGAgent] Starting voice query processing from buffer...');
        console.log('[VoiceRAGAgent] Step 1: Transcribing audio buffer...');
        const transcription = await this.voiceAgent.transcribeBuffer(audioBuffer, filename, options.transcriptionOptions);
        const userQuestion = transcription.text;
        console.log(`[VoiceRAGAgent] User asked: "${userQuestion}"`);
        console.log('[VoiceRAGAgent] Step 2: Retrieving relevant documents...');
        const ragStart = Date.now();
        const searchResults = await this.ragAgent.searchWithRerank(userQuestion, options.searchOptions || { topK: options.maxContextDocs || 3 });
        const ragTime = Date.now() - ragStart;
        const retrievedDocs = searchResults.map((result) => ({
            content: result.content,
            source: result.metadata.source || 'Unknown',
            score: result.score,
        }));
        console.log('[VoiceRAGAgent] Step 3: Generating response with Claude...');
        const claudeStart = Date.now();
        const contextText = retrievedDocs
            .map((doc, i) => `[Document ${i + 1}] ${doc.source}:\n${doc.content}`)
            .join('\n\n---\n\n');
        const prompt = `Based on the following documents, please answer the user's question.

Documents:
${contextText}

User Question: ${userQuestion}

Please provide a clear, concise answer based on the information in the documents. If the documents don't contain relevant information, say so.`;
        const claudeResponse = await this.claude.messages.create({
            model: options.model || 'claude-sonnet-4-5-20250929',
            max_tokens: options.maxTokens || 1024,
            messages: [{ role: 'user', content: prompt }],
        });
        const responseText = claudeResponse.content[0].type === 'text'
            ? claudeResponse.content[0].text
            : '';
        const claudeTime = Date.now() - claudeStart;
        console.log('[VoiceRAGAgent] Step 4: Synthesizing audio response...');
        const ttsResult = await this.voiceAgent.synthesize(responseText, options.ttsOptions);
        const totalTime = Date.now() - startTime;
        const voiceMetrics = this.voiceAgent.getDetailedMetrics();
        console.log('[VoiceRAGAgent] Voice query processing complete');
        return {
            userQuestion,
            retrievedDocs,
            claudeResponse: responseText,
            audioBuffer: ttsResult.audioBuffer,
            metrics: {
                transcriptionCost: voiceMetrics.transcriber.totalCost,
                ttsCost: voiceMetrics.synthesizer.totalCost,
                ragRetrievalTime: ragTime,
                claudeResponseTime: claudeTime,
                totalTime,
            },
        };
    }
    getRAGAgent() {
        return this.ragAgent;
    }
    getVoiceAgent() {
        return this.voiceAgent;
    }
    ensureInitialized() {
        if (!this.isInitialized) {
            throw new Error('VoiceRAGAgent not initialized. Call initialize() first.');
        }
    }
}
export default VoiceRAGAgent;
//# sourceMappingURL=index.js.map