/**
 * Voice RAG Agent
 *
 * Integrates VoiceAgent (STT/TTS) with RAGAgent (semantic search)
 * to provide voice-based question answering with knowledge retrieval.
 *
 * Flow:
 * 1. User speaks (audio input)
 * 2. Whisper transcribes to text
 * 3. RAG retrieves relevant documents
 * 4. Claude generates response with RAG context
 * 5. TTS synthesizes response to audio
 * 6. User hears the answer
 */

import VoiceAgent from '../voice/index.js';
import { RAGAgent } from '../rag/index.js';
import Anthropic from '@anthropic-ai/sdk';
import type { TranscriptionOptions, TTSOptions } from '../voice/types.js';
import type { SearchOptions } from '../rag/types.js';

export interface VoiceRAGOptions {
  /**
   * Options for speech transcription
   */
  transcriptionOptions?: TranscriptionOptions;

  /**
   * Options for text-to-speech synthesis
   */
  ttsOptions?: TTSOptions;

  /**
   * Options for RAG search
   */
  searchOptions?: Partial<SearchOptions>;

  /**
   * Path to save output audio (optional)
   */
  outputPath?: string;

  /**
   * Maximum number of documents to retrieve for context
   */
  maxContextDocs?: number;

  /**
   * Claude model to use for generation
   */
  model?: string;

  /**
   * Maximum tokens for Claude response
   */
  maxTokens?: number;
}

export interface VoiceRAGResult {
  /**
   * Transcribed user question
   */
  userQuestion: string;

  /**
   * Retrieved documents used as context
   */
  retrievedDocs: Array<{
    content: string;
    source: string;
    score: number;
  }>;

  /**
   * Claude's generated response
   */
  claudeResponse: string;

  /**
   * Audio result (if outputPath not specified)
   */
  audioBuffer?: Buffer;

  /**
   * Metrics
   */
  metrics: {
    transcriptionCost: number;
    ttsCost: number;
    ragRetrievalTime: number;
    claudeResponseTime: number;
    totalTime: number;
  };
}

export class VoiceRAGAgent {
  private voiceAgent: VoiceAgent;
  private ragAgent: RAGAgent;
  private claude: Anthropic;
  private isInitialized = false;

  constructor(
    anthropicApiKey?: string,
    openAIApiKey?: string
  ) {
    this.voiceAgent = new VoiceAgent(openAIApiKey);
    this.ragAgent = new RAGAgent();
    this.claude = new Anthropic({
      apiKey: anthropicApiKey || process.env.ANTHROPIC_API_KEY!,
    });

    console.log('[VoiceRAGAgent] Created');
  }

  /**
   * Initialize the Voice RAG Agent
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('[VoiceRAGAgent] Already initialized');
      return;
    }

    console.log('[VoiceRAGAgent] Initializing...');

    // Initialize RAG Agent (Voice Agent doesn't need initialization)
    await this.ragAgent.initialize();

    this.isInitialized = true;
    console.log('[VoiceRAGAgent] Initialized successfully');
  }

  /**
   * Process voice input: audio → transcription → RAG → Claude → TTS → audio
   */
  async processVoiceQuery(
    audioPath: string,
    options: VoiceRAGOptions = {}
  ): Promise<VoiceRAGResult> {
    this.ensureInitialized();

    const startTime = Date.now();
    console.log('[VoiceRAGAgent] Starting voice query processing...');

    // Step 1: Transcribe audio to text
    console.log('[VoiceRAGAgent] Step 1: Transcribing audio...');
    const transcriptionStart = Date.now();
    const transcription = await this.voiceAgent.transcribe(
      audioPath,
      options.transcriptionOptions
    );
    const userQuestion = transcription.text;
    console.log(`[VoiceRAGAgent] User asked: "${userQuestion}"`);

    // Step 2: Retrieve relevant documents from RAG
    console.log('[VoiceRAGAgent] Step 2: Retrieving relevant documents...');
    const ragStart = Date.now();
    const searchResults = await this.ragAgent.searchWithRerank(
      userQuestion,
      options.searchOptions || { topK: options.maxContextDocs || 3 }
    );
    const ragTime = Date.now() - ragStart;

    console.log(`[VoiceRAGAgent] Retrieved ${searchResults.length} documents`);

    const retrievedDocs = searchResults.map((result) => ({
      content: result.content,
      source: result.metadata.source || 'Unknown',
      score: result.score,
    }));

    // Step 3: Build context and query Claude
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

    // Step 4: Synthesize response to audio
    console.log('[VoiceRAGAgent] Step 4: Synthesizing audio response...');
    let audioBuffer: Buffer | undefined;

    if (options.outputPath) {
      await this.voiceAgent.synthesizeToFile(
        responseText,
        options.outputPath,
        options.ttsOptions
      );
      console.log(`[VoiceRAGAgent] Audio saved to: ${options.outputPath}`);
    } else {
      const ttsResult = await this.voiceAgent.synthesize(
        responseText,
        options.ttsOptions
      );
      audioBuffer = ttsResult.audio;  // Fixed: use 'audio' not 'audioBuffer'
    }

    const totalTime = Date.now() - startTime;

    // Get metrics
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

  /**
   * Process voice query from audio buffer
   */
  async processVoiceQueryBuffer(
    audioBuffer: Buffer,
    filename: string,
    options: VoiceRAGOptions = {}
  ): Promise<VoiceRAGResult> {
    this.ensureInitialized();

    const startTime = Date.now();
    console.log('[VoiceRAGAgent] Starting voice query processing from buffer...');

    // Step 1: Transcribe audio buffer to text
    console.log('[VoiceRAGAgent] Step 1: Transcribing audio buffer...');
    const transcription = await this.voiceAgent.transcribeBuffer(
      audioBuffer,
      filename,
      options.transcriptionOptions
    );
    const userQuestion = transcription.text;
    console.log(`[VoiceRAGAgent] User asked: "${userQuestion}"`);

    // Step 2: Retrieve relevant documents
    console.log('[VoiceRAGAgent] Step 2: Retrieving relevant documents...');
    const ragStart = Date.now();
    const searchResults = await this.ragAgent.searchWithRerank(
      userQuestion,
      options.searchOptions || { topK: options.maxContextDocs || 3 }
    );
    const ragTime = Date.now() - ragStart;

    const retrievedDocs = searchResults.map((result) => ({
      content: result.content,
      source: result.metadata.source || 'Unknown',
      score: result.score,
    }));

    // Step 3: Generate Claude response
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

    // Step 4: Synthesize response
    console.log('[VoiceRAGAgent] Step 4: Synthesizing audio response...');
    const ttsResult = await this.voiceAgent.synthesize(
      responseText,
      options.ttsOptions
    );

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

  /**
   * Get the underlying RAG agent (for indexing documents)
   */
  getRAGAgent(): RAGAgent {
    return this.ragAgent;
  }

  /**
   * Get the underlying Voice agent
   */
  getVoiceAgent(): VoiceAgent {
    return this.voiceAgent;
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('VoiceRAGAgent not initialized. Call initialize() first.');
    }
  }
}

export default VoiceRAGAgent;
