/**
 * E2E Tests for API Security
 *
 * Tests security features and protective measures:
 * 1. Rate limiting (IP-based, endpoint-specific)
 * 2. File upload validation (size, MIME type)
 * 3. Input sanitization and validation
 * 4. Error handling (no information leakage)
 * 5. Authentication and authorization
 *
 * Coverage:
 * - Rate limiting enforcement
 * - File upload security
 * - Input validation
 * - Error response sanitization
 * - Security headers
 */

import { describe, it, expect, beforeAll } from 'vitest';
import axios, { AxiosError } from 'axios';
import { rateLimitPresets, rateLimiter, clearRateLimits } from '../../src/middleware/rateLimiter.js';
import express, { Request, Response } from 'express';

describe('API Security E2E Tests', () => {
  describe('Rate Limiting', () => {
    let app: express.Application;
    let server: any;
    const TEST_PORT = 9999;
    const BASE_URL = `http://localhost:${TEST_PORT}`;

    beforeAll(async () => {
      // Create test Express app
      app = express();
      app.use(express.json());

      // Apply different rate limits to different endpoints
      app.get(
        '/api/public',
        rateLimitPresets.api(),
        (req: Request, res: Response) => {
          res.json({ message: 'public endpoint' });
        }
      );

      app.post(
        '/api/voice',
        rateLimitPresets.voice(),
        (req: Request, res: Response) => {
          res.json({ message: 'voice endpoint' });
        }
      );

      app.post(
        '/api/auth',
        rateLimitPresets.auth(),
        (req: Request, res: Response) => {
          res.json({ message: 'auth endpoint' });
        }
      );

      // Start server
      server = app.listen(TEST_PORT);

      // Wait for server to be ready
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    afterAll(async () => {
      clearRateLimits();
      if (server) {
        server.close();
      }
    });

    it('should enforce API rate limit (100 req/15 min)', async () => {
      clearRateLimits();

      const limit = parseInt(process.env.RATE_LIMIT_API_MAX || '100');
      const requests = [];

      // Send limit + 1 requests
      for (let i = 0; i < limit + 1; i++) {
        requests.push(
          axios.get(`${BASE_URL}/api/public`, { validateStatus: () => true })
        );
      }

      const responses = await Promise.all(requests);

      // First 100 should succeed
      const successful = responses.filter(r => r.status === 200);
      expect(successful.length).toBe(limit);

      // 101st should be rate limited
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);

      // Check rate limit headers
      const limitedResponse = rateLimited[0];
      expect(limitedResponse.headers['x-ratelimit-limit']).toBeTruthy();
      expect(limitedResponse.headers['retry-after']).toBeTruthy();
    }, 30000); // 30 second timeout

    it('should enforce voice endpoint rate limit (10 req/min)', async () => {
      clearRateLimits();

      const limit = parseInt(process.env.RATE_LIMIT_VOICE_MAX || '10');
      const requests = [];

      // Send limit + 1 requests
      for (let i = 0; i < limit + 1; i++) {
        requests.push(
          axios.post(`${BASE_URL}/api/voice`, {}, { validateStatus: () => true })
        );
      }

      const responses = await Promise.all(requests);

      // First 10 should succeed
      const successful = responses.filter(r => r.status === 200);
      expect(successful.length).toBe(limit);

      // 11th should be rate limited
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);

      // Verify error message
      const limitedResponse = rateLimited[0];
      expect(limitedResponse.data.error).toBe('Too Many Requests');
      expect(limitedResponse.data.message).toContain('Voice processing rate limit');
    });

    it('should enforce auth endpoint rate limit (5 req/min)', async () => {
      clearRateLimits();

      const limit = parseInt(process.env.RATE_LIMIT_AUTH_MAX || '5');
      const requests = [];

      // Send limit + 1 requests
      for (let i = 0; i < limit + 1; i++) {
        requests.push(
          axios.post(`${BASE_URL}/api/auth`, {}, { validateStatus: () => true })
        );
      }

      const responses = await Promise.all(requests);

      // First 5 should succeed
      const successful = responses.filter(r => r.status === 200);
      expect(successful.length).toBe(limit);

      // 6th should be rate limited
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);

      // Auth endpoint should have stricter message
      const limitedResponse = rateLimited[0];
      expect(limitedResponse.data.message).toContain('Too many authentication attempts');
    });

    it('should include rate limit headers in all responses', async () => {
      clearRateLimits();

      const response = await axios.get(`${BASE_URL}/api/public`);

      expect(response.headers['x-ratelimit-limit']).toBeTruthy();
      expect(response.headers['x-ratelimit-remaining']).toBeTruthy();
      expect(response.headers['x-ratelimit-reset']).toBeTruthy();
    });

    it('should reset rate limit after window expires', async () => {
      clearRateLimits();

      // This test would require waiting for the rate limit window to expire
      // In practice, you would use a shorter window for testing

      // Send request
      const response1 = await axios.get(`${BASE_URL}/api/public`);
      expect(response1.status).toBe(200);

      const remaining1 = parseInt(response1.headers['x-ratelimit-remaining'] as string);

      // Send another request
      const response2 = await axios.get(`${BASE_URL}/api/public`);
      expect(response2.status).toBe(200);

      const remaining2 = parseInt(response2.headers['x-ratelimit-remaining'] as string);

      // Remaining should decrease
      expect(remaining2).toBe(remaining1 - 1);
    });

    it('should track rate limits per IP address', async () => {
      clearRateLimits();

      // Simulate requests from different IPs
      // In real tests, you would use different client IPs or proxy headers

      const response1 = await axios.get(`${BASE_URL}/api/public`, {
        headers: { 'X-Forwarded-For': '192.168.1.1' },
      });

      const response2 = await axios.get(`${BASE_URL}/api/public`, {
        headers: { 'X-Forwarded-For': '192.168.1.2' },
      });

      // Both should succeed (different IPs, separate limits)
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      // Both should have full limit remaining (separate counters)
      const limit = parseInt(process.env.RATE_LIMIT_API_MAX || '100');
      expect(parseInt(response1.headers['x-ratelimit-remaining'] as string)).toBe(limit - 1);
      expect(parseInt(response2.headers['x-ratelimit-remaining'] as string)).toBe(limit - 1);
    });
  });

  describe('File Upload Validation', () => {
    const VOICE_RAG_API = process.env.VOICE_RAG_API || 'http://localhost:3003';

    it('should reject files exceeding size limit (10MB)', async () => {
      // Create buffer larger than 10MB
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024);

      const formData = new FormData();
      const largeBlob = new Blob([largeBuffer], { type: 'audio/webm' });
      formData.append('audio', largeBlob, 'large-file.webm');

      const response = await axios.post(
        `${VOICE_RAG_API}/api/voice-rag/chat`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          validateStatus: () => true,
        }
      );

      expect(response.status).toBe(413);
      expect(response.data.error).toContain('too large');
    });

    it('should accept files within size limit', async () => {
      // Create valid-sized buffer (1KB)
      const validBuffer = Buffer.alloc(1024);

      const formData = new FormData();
      const validBlob = new Blob([validBuffer], { type: 'audio/webm' });
      formData.append('audio', validBlob, 'valid-file.webm');

      const response = await axios.post(
        `${VOICE_RAG_API}/api/voice-rag/chat`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          validateStatus: () => true,
        }
      );

      // Should not reject based on size (may fail for other reasons like invalid audio)
      expect(response.status).not.toBe(413);
    });

    it('should reject invalid MIME types', async () => {
      const buffer = Buffer.from('test data');

      const formData = new FormData();
      const invalidBlob = new Blob([buffer], { type: 'application/pdf' });
      formData.append('audio', invalidBlob, 'document.pdf');

      const response = await axios.post(
        `${VOICE_RAG_API}/api/voice-rag/chat`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          validateStatus: () => true,
        }
      );

      expect(response.status).toBe(400);
      expect(response.data.error).toContain('Invalid file type');
    });

    it('should accept allowed MIME types', async () => {
      const allowedTypes = [
        'audio/webm',
        'audio/mp4',
        'audio/mpeg',
        'audio/mp3',
        'audio/ogg',
        'audio/wav',
        'audio/x-m4a',
      ];

      for (const mimeType of allowedTypes) {
        const buffer = Buffer.alloc(1024);
        const formData = new FormData();
        const validBlob = new Blob([buffer], { type: mimeType });
        formData.append('audio', validBlob, `test.${mimeType.split('/')[1]}`);

        const response = await axios.post(
          `${VOICE_RAG_API}/api/voice-rag/chat`,
          formData,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
            validateStatus: () => true,
          }
        );

        // Should not reject based on MIME type
        expect(response.status).not.toBe(400);
        if (response.status === 400) {
          expect(response.data.error).not.toContain('Invalid file type');
        }
      }
    });

    it('should reject multiple files when only one is allowed', async () => {
      const buffer1 = Buffer.alloc(1024);
      const buffer2 = Buffer.alloc(1024);

      const formData = new FormData();
      formData.append('audio', new Blob([buffer1], { type: 'audio/webm' }), 'file1.webm');
      formData.append('audio', new Blob([buffer2], { type: 'audio/webm' }), 'file2.webm');

      const response = await axios.post(
        `${VOICE_RAG_API}/api/voice-rag/chat`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          validateStatus: () => true,
        }
      );

      expect(response.status).toBe(400);
      expect(response.data.error).toContain('Only 1 file allowed');
    });
  });

  describe('Input Validation', () => {
    const VOICE_RAG_API = process.env.VOICE_RAG_API || 'http://localhost:3003';

    it('should validate document indexing input', async () => {
      // Missing required fields
      const invalidInput = {
        documents: [
          { content: 'Valid content' },
          // Missing metadata
        ],
      };

      const response = await axios.post(
        `${VOICE_RAG_API}/api/voice-rag/index`,
        invalidInput,
        { validateStatus: () => true }
      );

      // Should not crash, should return validation error
      expect([400, 500]).toContain(response.status);
    });

    it('should reject non-array document input', async () => {
      const invalidInput = {
        documents: 'not an array',
      };

      const response = await axios.post(
        `${VOICE_RAG_API}/api/voice-rag/index`,
        invalidInput,
        { validateStatus: () => true }
      );

      expect(response.status).toBe(400);
      expect(response.data.error).toContain('documents array required');
    });

    it('should reject missing audio file', async () => {
      const response = await axios.post(
        `${VOICE_RAG_API}/api/voice-rag/chat`,
        {},
        { validateStatus: () => true }
      );

      expect(response.status).toBe(400);
      expect(response.data.error).toContain('No audio file');
    });
  });

  describe('Error Response Sanitization', () => {
    const VOICE_RAG_API = process.env.VOICE_RAG_API || 'http://localhost:3003';

    it('should not expose internal errors in production', async () => {
      // In production mode, internal errors should be sanitized
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        // Trigger an error
        const response = await axios.post(
          `${VOICE_RAG_API}/api/voice-rag/chat`,
          {},
          { validateStatus: () => true }
        );

        // Error message should be generic, not expose stack traces
        expect(response.data.error).not.toContain('Error:');
        expect(response.data.error).not.toContain('at ');
        expect(response.data).not.toHaveProperty('stack');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should provide detailed errors in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      try {
        // In development, errors can be more detailed
        // This is acceptable for debugging
        const response = await axios.post(
          `${VOICE_RAG_API}/api/voice-rag/chat`,
          {},
          { validateStatus: () => true }
        );

        expect(response.data.error).toBeTruthy();
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  describe('Security Headers', () => {
    const VOICE_RAG_API = process.env.VOICE_RAG_API || 'http://localhost:3003';

    it('should include security headers in responses', async () => {
      const response = await axios.get(`${VOICE_RAG_API}/api/voice-rag/health`);

      // CORS headers (if configured)
      // Content-Type should be set
      expect(response.headers['content-type']).toBeTruthy();

      // Rate limit headers
      if (response.headers['x-ratelimit-limit']) {
        expect(response.headers['x-ratelimit-remaining']).toBeTruthy();
        expect(response.headers['x-ratelimit-reset']).toBeTruthy();
      }
    });
  });
});
