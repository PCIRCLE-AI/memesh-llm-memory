#!/usr/bin/env tsx
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs';
import VoiceRAGAgent from './index.js';
import { logger } from '../../utils/logger.js';
import { rateLimitPresets } from '../../middleware/rateLimiter.js';
const app = express();
const MAX_FILE_SIZE = 10 * 1024 * 1024;
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
        if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error(`Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`));
        }
    },
});
app.use(cors());
app.use(express.static('.'));
app.use(express.json());
app.use('/api', rateLimitPresets.api());
let voiceRAGAgent;
let isInitialized = false;
async function initializeAgent() {
    if (isInitialized)
        return;
    console.log('Initializing Voice RAG Agent...');
    voiceRAGAgent = new VoiceRAGAgent();
    await voiceRAGAgent.initialize();
    isInitialized = true;
    console.log('Voice RAG Agent initialized');
}
app.post('/api/voice-rag/chat', rateLimitPresets.voice(), upload.single('audio'), async (req, res) => {
    try {
        if (!isInitialized) {
            await initializeAgent();
        }
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file uploaded' });
        }
        console.log(`\n📥 Received audio: ${req.file.originalname} (${(req.file.size / 1024).toFixed(1)}KB)`);
        const tempPath = req.file.path;
        const webmPath = tempPath + '.webm';
        fs.renameSync(tempPath, webmPath);
        const result = await voiceRAGAgent.processVoiceQuery(webmPath, {
            maxContextDocs: 3,
            ttsOptions: {
                voice: 'nova',
                speed: 1.1,
            },
        });
        const audioBase64 = result.audioBuffer
            ? result.audioBuffer.toString('base64')
            : '';
        fs.unlinkSync(webmPath);
        console.log('✅ Voice RAG processing complete\n');
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
    }
    catch (error) {
        logger.error('Error processing voice RAG query', { error: error.message, stack: error.stack });
        const isDev = process.env.NODE_ENV === 'development';
        res.status(500).json({
            error: isDev ? error.message : 'Failed to process voice query. Please try again.',
        });
    }
});
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
    }
    catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            error: error.message,
        });
    }
});
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
    }
    catch (error) {
        logger.error('Error indexing documents', { error: error.message, stack: error.stack });
        const isDev = process.env.NODE_ENV === 'development';
        res.status(500).json({
            error: isDev ? error.message : 'Failed to index documents. Please try again.',
        });
    }
});
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
                error: 'File too large. Maximum size is 10MB.',
            });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                error: 'Too many files. Only 1 file allowed.',
            });
        }
        return res.status(400).json({
            error: `Upload error: ${error.message}`,
        });
    }
    if (error.message && error.message.includes('Invalid file type')) {
        return res.status(400).json({
            error: error.message,
        });
    }
    logger.error('Unexpected error', { error: error.message, stack: error.stack });
    const isDev = process.env.NODE_ENV === 'development';
    res.status(500).json({
        error: isDev ? error.message : 'Internal server error',
    });
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
//# sourceMappingURL=server.js.map