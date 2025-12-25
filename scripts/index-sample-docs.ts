#!/usr/bin/env tsx
/**
 * Quick script to index sample documents into RAG
 */

import { ChromaClient } from 'chromadb';
import OpenAI from 'openai';
import { appConfig } from '../src/config/index.js';

// Use ChromaClient with explicit configuration for API v1 compatibility
const client = new ChromaClient({
  path: 'http://localhost:8000',
});
const openai = new OpenAI({ apiKey: appConfig.openai.apiKey });

async function indexSampleDocuments() {
  console.log('📚 Indexing sample documents...\n');

  try {
    // Get or create collection
    const collection = await client.getOrCreateCollection({
      name: 'smart_agents_kb',
      metadata: { description: 'Smart Agents Knowledge Base' },
    });

    // Sample documents about the project
    const documents = [
      {
        id: '1',
        content: 'The Smart Agents project is an intelligent AI agent ecosystem optimized for MacBook Pro M2. It features voice-enabled RAG (Retrieval-Augmented Generation) capabilities, multi-agent collaboration, and advanced orchestration.',
        metadata: { source: 'project-overview.md', category: 'project', tags: 'overview,architecture' },
      },
      {
        id: '2',
        content: 'Voice RAG Agent combines OpenAI Whisper for speech-to-text, Claude for natural language processing, ChromaDB for vector search, and OpenAI TTS for text-to-speech. It enables voice-based question answering with document retrieval.',
        metadata: { source: 'voice-rag.md', category: 'features', tags: 'voice,rag,whisper,tts' },
      },
      {
        id: '3',
        content: 'The Collaboration System enables multiple AI agents to work together on complex tasks. It uses SQLite for persistence, supports load balancing, task decomposition, and tracks team performance metrics.',
        metadata: { source: 'collaboration.md', category: 'features', tags: 'collaboration,multi-agent,sqlite' },
      },
      {
        id: '4',
        content: 'RAG (Retrieval-Augmented Generation) uses ChromaDB vector database, OpenAI text-embedding-3-small model for embeddings, and supports hybrid search combining semantic similarity and keyword matching.',
        metadata: { source: 'rag-system.md', category: 'features', tags: 'rag,chromadb,embeddings,search' },
      },
      {
        id: '5',
        content: 'The system includes comprehensive API security: rate limiting (100 req/15min for API, 10 req/min for voice, 5 req/min for auth), file upload validation (10MB limit), MIME type checking, and input sanitization.',
        metadata: { source: 'security.md', category: 'security', tags: 'rate-limiting,validation,security' },
      },
      {
        id: '6',
        content: 'API retry mechanisms use exponential backoff with jitter. Default configuration: 3 retries, base delay 1000ms, doubling on each retry, with 25% randomization to prevent thundering herd.',
        metadata: { source: 'api-retry.md', category: 'reliability', tags: 'retry,backoff,api' },
      },
      {
        id: '7',
        content: 'E2E test suite covers Voice RAG pipeline (audio upload, transcription, retrieval, TTS), Collaboration system (team creation, task execution, persistence), and API security (rate limits, file validation).',
        metadata: { source: 'testing.md', category: 'testing', tags: 'e2e,tests,vitest' },
      },
      {
        id: '8',
        content: 'The orchestrator intelligently routes tasks between cloud (Claude), hybrid (Claude + local), and local modes based on task complexity, memory requirements, and cost constraints.',
        metadata: { source: 'orchestrator.md', category: 'features', tags: 'orchestrator,routing,optimization' },
      },
    ];

    console.log(`Generating embeddings for ${documents.length} documents...\n`);

    // Generate embeddings
    const contents = documents.map(d => d.content);
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: contents,
    });

    const embeddings = embeddingResponse.data.map(item => item.embedding);

    // Add to ChromaDB
    await collection.add({
      ids: documents.map(d => d.id),
      documents: contents,
      embeddings: embeddings,
      metadatas: documents.map(d => d.metadata) as any,
    });

    console.log('✅ Successfully indexed documents!\n');

    // Show collection stats
    const count = await collection.count();
    console.log(`📊 Collection Stats:`);
    console.log(`   Total documents: ${count}`);
    console.log(`   Embedding model: text-embedding-3-small`);
    console.log(`   Dimension: 1536`);
    console.log(`   Collection: smart_agents_kb\n`);

    // Test a search
    console.log('🔍 Testing search: "How does voice RAG work?"\n');

    const queryEmbedding = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: 'How does voice RAG work?',
    });

    const results = await collection.query({
      queryEmbeddings: [queryEmbedding.data[0].embedding],
      nResults: 3,
    });

    console.log('Top 3 results:');
    results.documents[0].forEach((doc, i) => {
      const score = results.distances?.[0][i];
      const metadata = results.metadatas?.[0][i] as any;
      console.log(`\n${i + 1}. Score: ${score?.toFixed(4)}`);
      console.log(`   Source: ${metadata?.source}`);
      console.log(`   Content: ${doc?.substring(0, 100)}...`);
    });

    console.log('\n\n🎉 RAG system ready to use!\n');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

indexSampleDocuments();
