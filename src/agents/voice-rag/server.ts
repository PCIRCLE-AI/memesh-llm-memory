#!/usr/bin/env tsx
/**
 * Voice RAG Server
 *
 * Express server that exposes Voice RAG Agent functionality via HTTP API.
 *
 * Endpoints:
 * - POST /api/voice-rag/chat - Process voice input and return voice + text response
 * - GET /api/voice-rag/health - Health check
 * - POST /api/voice-rag/index - Index documents for RAG
 */

import express from 'express';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import VoiceRAGAgent from './index.js';
import { logger } from '../../utils/logger.js';

const app = express();

// 🔒 Security: File upload limits and validation
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
  'audio/mp3',
  'audio/ogg',
  'audio/wav',
  'audio/x-m4a',
];

const upload = multer({
  dest: '/tmp/',
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    // Validate MIME type
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`));
    }
  },
});

app.use(cors());
app.use(express.static('.'));
app.use(express.json());

// Initialize Voice RAG Agent
let voiceRAGAgent: VoiceRAGAgent;
let isInitialized = false;

async function initializeAgent() {
  if (isInitialized) return;

  console.log('Initializing Voice RAG Agent...');
  voiceRAGAgent = new VoiceRAGAgent();
  await voiceRAGAgent.initialize();
  isInitialized = true;
  console.log('Voice RAG Agent initialized');
}

/**
 * POST /api/voice-rag/chat
 *
 * Process voice input and return voice + text response.
 *
 * Request:
 * - multipart/form-data with 'audio' file
 *
 * Response:
 * {
 *   userQuestion: string,
 *   retrievedDocs: Array<{ content, source, score }>,
 *   claudeResponse: string,
 *   audioBase64: string,
 *   metrics: { ... }
 * }
 */
app.post('/api/voice-rag/chat', upload.single('audio'), async (req, res) => {
  try {
    if (!isInitialized) {
      await initializeAgent();
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    console.log(`\n📥 Received audio: ${req.file.originalname} (${(req.file.size / 1024).toFixed(1)}KB)`);

    // Rename temp file to add .webm extension (OpenAI requires file extension)
    const tempPath = req.file.path;
    const webmPath = tempPath + '.webm';
    fs.renameSync(tempPath, webmPath);

    // Process voice query with renamed file
    const result = await voiceRAGAgent.processVoiceQuery(webmPath, {
      maxContextDocs: 3,
      ttsOptions: {
        voice: 'nova',
        speed: 1.1,
      },
    });

    // Convert audio buffer to base64
    const audioBase64 = result.audioBuffer
      ? result.audioBuffer.toString('base64')
      : '';

    // Clean up uploaded file
    fs.unlinkSync(webmPath);

    console.log('✅ Voice RAG processing complete\n');

    // Return result
    res.json({
      userQuestion: result.userQuestion,
      retrievedDocs: result.retrievedDocs,
      claudeResponse: result.claudeResponse,
      audioBase64,
      metrics: {
        transcriptionCost: result.metrics.transcriptionCost,
        ttsCost: result.metrics.ttsCost,
        ragRetrievalTime: result.metrics.ragRetrievalTime,
        claudeResponseTime: result.metrics.claudeResponseTime,
        totalTime: result.metrics.totalTime,
      },
    });
  } catch (error: any) {
    logger.error('Error processing voice RAG query', { error: error.message, stack: error.stack });

    // 🔒 Security: Don't expose internal errors in production
    const isDev = process.env.NODE_ENV === 'development';
    res.status(500).json({
      error: isDev ? error.message : 'Failed to process voice query. Please try again.',
    });
  }
});

/**
 * GET /api/voice-rag/health
 *
 * Health check endpoint.
 */
app.get('/api/voice-rag/health', async (req, res) => {
  try {
    if (!isInitialized) {
      await initializeAgent();
    }

    res.json({
      status: 'healthy',
      initialized: isInitialized,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});

/**
 * POST /api/voice-rag/index
 *
 * Index documents for RAG.
 *
 * Request body:
 * {
 *   documents: Array<{
 *     content: string,
 *     metadata: { source: string, [key: string]: any }
 *   }>
 * }
 */
app.post('/api/voice-rag/index', async (req, res) => {
  try {
    if (!isInitialized) {
      await initializeAgent();
    }

    const { documents } = req.body;

    if (!documents || !Array.isArray(documents)) {
      return res.status(400).json({
        error: 'Invalid request: documents array required',
      });
    }

    console.log(`\n📚 Indexing ${documents.length} documents...`);

    const ragAgent = voiceRAGAgent.getRAGAgent();
    const stats = await ragAgent.indexDocuments(documents);

    console.log('✅ Indexing complete\n');

    res.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    logger.error('Error indexing documents', { error: error.message, stack: error.stack });

    // 🔒 Security: Don't expose internal errors in production
    const isDev = process.env.NODE_ENV === 'development';
    res.status(500).json({
      error: isDev ? error.message : 'Failed to index documents. Please try again.',
    });
  }
});

const PORT = process.env.VOICE_RAG_PORT || 3003;

app.listen(PORT, () => {
  console.log('\n╔═══════════════════════════════════════════════╗');
  console.log('║   🎙️  Voice RAG Agent Server                ║');
  console.log('╚═══════════════════════════════════════════════╝\n');
  console.log(`🌐 Server: http://localhost:${PORT}`);
  console.log(`📝 API Docs:`);
  console.log(`   POST /api/voice-rag/chat - Voice query`);
  console.log(`   GET  /api/voice-rag/health - Health check`);
  console.log(`   POST /api/voice-rag/index - Index documents`);
  console.log('');
  console.log('💡 Open voice-rag-widget.html in your browser to start\n');
});
