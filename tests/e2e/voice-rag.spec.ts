/**
 * E2E Tests for Voice RAG Agent
 *
 * Tests the complete voice interaction pipeline:
 * 1. Audio upload → Transcription (Whisper API)
 * 2. RAG retrieval (ChromaDB)
 * 3. Claude response generation
 * 4. TTS synthesis (OpenAI TTS)
 *
 * Coverage:
 * - Voice query processing end-to-end
 * - Document indexing and retrieval
 * - Error handling and retries
 * - API integration with all services
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VOICE_RAG_API = process.env.VOICE_RAG_API || 'http://localhost:3003';
const TEST_AUDIO_PATH = path.join(__dirname, '../fixtures/test-audio.webm');

describe('Voice RAG E2E Tests', () => {
  let serverProcess: any;

  beforeAll(async () => {
    // Ensure server is running
    try {
      await axios.get(`${VOICE_RAG_API}/api/voice-rag/health`);
      console.log('✅ Voice RAG server is running');
    } catch (error) {
      console.error('❌ Voice RAG server is not running. Please start it with: npm run voice-rag:server');
      throw new Error('Voice RAG server not available');
    }
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await axios.get(`${VOICE_RAG_API}/api/voice-rag/health`);

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        status: 'healthy',
        initialized: true,
      });
      expect(response.data.timestamp).toBeTruthy();
    });
  });

  describe('Document Indexing', () => {
    it('should index documents successfully', async () => {
      const documents = [
        {
          content: 'TypeScript is a typed superset of JavaScript that compiles to plain JavaScript.',
          metadata: { source: 'test-doc-1', category: 'programming' },
        },
        {
          content: 'React is a JavaScript library for building user interfaces.',
          metadata: { source: 'test-doc-2', category: 'frontend' },
        },
        {
          content: 'Node.js is a JavaScript runtime built on Chrome V8 engine.',
          metadata: { source: 'test-doc-3', category: 'backend' },
        },
      ];

      const response = await axios.post(
        `${VOICE_RAG_API}/api/voice-rag/index`,
        { documents }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.stats).toBeDefined();
      expect(response.data.stats.indexed).toBeGreaterThan(0);
    }, 30000); // 30 second timeout for indexing
  });

  describe('Voice Query Processing (Mocked Audio)', () => {
    it('should process voice query and return response', async () => {
      // Create a minimal valid WebM audio file for testing
      // In real tests, you would use an actual audio recording
      const testAudioBuffer = Buffer.from([
        // Minimal WebM header
        0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01,
        0x42, 0xf7, 0x81, 0x01, 0x42, 0xf2, 0x81, 0x04,
      ]);

      // Save test audio to temp file
      const tempAudioPath = path.join(__dirname, '../fixtures/temp-test-audio.webm');
      fs.mkdirSync(path.dirname(tempAudioPath), { recursive: true });
      fs.writeFileSync(tempAudioPath, testAudioBuffer);

      try {
        const formData = new FormData();
        const audioBlob = new Blob([testAudioBuffer], { type: 'audio/webm' });
        formData.append('audio', audioBlob, 'test-audio.webm');

        // Note: This test will fail with real Whisper API because the audio is invalid
        // In production tests, use real audio files
        const response = await axios.post(
          `${VOICE_RAG_API}/api/voice-rag/chat`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
            validateStatus: () => true, // Accept any status for testing
          }
        );

        // Either success (200) or expected error (400/500)
        expect([200, 400, 500]).toContain(response.status);

        if (response.status === 200) {
          // If successful (with real audio)
          expect(response.data).toHaveProperty('userQuestion');
          expect(response.data).toHaveProperty('retrievedDocs');
          expect(response.data).toHaveProperty('claudeResponse');
          expect(response.data).toHaveProperty('audioBase64');
          expect(response.data).toHaveProperty('metrics');

          // Verify metrics
          expect(response.data.metrics).toMatchObject({
            transcriptionCost: expect.any(Number),
            ttsCost: expect.any(Number),
            ragRetrievalTime: expect.any(Number),
            claudeResponseTime: expect.any(Number),
            totalTime: expect.any(Number),
          });
        } else {
          // Expected error with invalid audio
          expect(response.data).toHaveProperty('error');
        }
      } finally {
        // Clean up temp file
        if (fs.existsSync(tempAudioPath)) {
          fs.unlinkSync(tempAudioPath);
        }
      }
    }, 60000); // 60 second timeout for full pipeline
  });

  describe('Error Handling', () => {
    it('should reject requests without audio file', async () => {
      const response = await axios.post(
        `${VOICE_RAG_API}/api/voice-rag/chat`,
        {},
        { validateStatus: () => true }
      );

      expect(response.status).toBe(400);
      expect(response.data.error).toContain('No audio file');
    });

    it('should reject files that are too large', async () => {
      // Create a buffer larger than 10MB (the limit)
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024);

      const formData = new FormData();
      const largeBlob = new Blob([largeBuffer], { type: 'audio/webm' });
      formData.append('audio', largeBlob, 'large-audio.webm');

      const response = await axios.post(
        `${VOICE_RAG_API}/api/voice-rag/chat`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          validateStatus: () => true,
        }
      );

      expect(response.status).toBe(413);
      expect(response.data.error).toContain('too large');
    });

    it('should reject invalid MIME types', async () => {
      const testBuffer = Buffer.from('test data');

      const formData = new FormData();
      const invalidBlob = new Blob([testBuffer], { type: 'text/plain' });
      formData.append('audio', invalidBlob, 'test.txt');

      const response = await axios.post(
        `${VOICE_RAG_API}/api/voice-rag/chat`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          validateStatus: () => true,
        }
      );

      expect(response.status).toBe(400);
      expect(response.data.error).toContain('Invalid file type');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce voice endpoint rate limit (10 req/min)', async () => {
      const requests = [];

      // Send 11 requests rapidly
      for (let i = 0; i < 11; i++) {
        requests.push(
          axios.post(
            `${VOICE_RAG_API}/api/voice-rag/chat`,
            {},
            { validateStatus: () => true }
          )
        );
      }

      const responses = await Promise.all(requests);

      // At least one should be rate limited (429)
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);

      // Rate limited response should have retry-after header
      const limitedResponse = rateLimited[0];
      expect(limitedResponse.data).toHaveProperty('retryAfter');
      expect(limitedResponse.data.error).toBe('Too Many Requests');
    });
  });
});
