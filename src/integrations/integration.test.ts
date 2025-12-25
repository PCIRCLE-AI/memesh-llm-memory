// src/integrations/integration.test.ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GrokClient } from './grok/client.js';
import { ChatGPTClient } from './chatgpt/client.js';
import { QuotaManager } from '../quota/manager.js';
import { SmartRouter } from './router.js';
import type { Task } from './router.js';

// Mock API keys for testing (actual keys should be in .env)
const MOCK_GROK_API_KEY = process.env.GROK_API_KEY || 'test-grok-key';
const MOCK_CHATGPT_API_KEY = process.env.OPENAI_API_KEY || 'test-openai-key';

describe('Integration Tests: Multi-Model System', () => {
  describe('1. Grok API 連接測試', () => {
    let grokClient: GrokClient;

    beforeEach(() => {
      grokClient = new GrokClient({
        apiKey: MOCK_GROK_API_KEY,
        model: 'grok-beta',
        baseURL: 'https://api.x.ai/v1',
        timeout: 10000
      });
    });

    it('should initialize GrokClient correctly', () => {
      expect(grokClient).toBeDefined();
      const modelInfo = grokClient.getModelInfo();
      expect(modelInfo.provider).toBe('grok');
      expect(modelInfo.model).toBe('grok-beta');
    });

    it('should have correct API endpoint configuration', () => {
      // Verify client configuration through modelInfo
      const modelInfo = grokClient.getModelInfo();
      expect(modelInfo.provider).toBe('grok');
    });

    // Note: Actual API call test requires valid API key
    it.skip('should successfully call Grok API (requires valid key)', async () => {
      const response = await grokClient.generateText('What is 2+2?', {
        temperature: 0.3,
        maxTokens: 100
      });
      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
    });

    it('should handle reasoning tasks correctly', async () => {
      // Mock test - verify method signature and structure
      expect(grokClient.reason).toBeDefined();
      expect(typeof grokClient.reason).toBe('function');
    });
  });

  describe('2. ChatGPT API 連接測試', () => {
    let chatgptClient: ChatGPTClient;

    beforeEach(() => {
      chatgptClient = new ChatGPTClient({
        apiKey: MOCK_CHATGPT_API_KEY,
        model: 'gpt-4-turbo-preview',
        timeout: 10000
      });
    });

    it('should initialize ChatGPTClient correctly', () => {
      expect(chatgptClient).toBeDefined();
      const modelInfo = chatgptClient.getModelInfo();
      expect(modelInfo.provider).toBe('chatgpt');
      expect(modelInfo.model).toBe('gpt-4-turbo-preview');
    });

    it('should have generateCode method', () => {
      expect(chatgptClient.generateCode).toBeDefined();
      expect(typeof chatgptClient.generateCode).toBe('function');
    });

    it('should have generateText method', () => {
      expect(chatgptClient.generateText).toBeDefined();
      expect(typeof chatgptClient.generateText).toBe('function');
    });

    it('should have chat method', () => {
      expect(chatgptClient.chat).toBeDefined();
      expect(typeof chatgptClient.chat).toBe('function');
    });

    // Note: Actual API call test requires valid API key
    it.skip('should successfully call ChatGPT API (requires valid key)', async () => {
      const response = await chatgptClient.generateText('Hello, world!', {
        temperature: 0.7,
        maxTokens: 50
      });
      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
    });
  });

  describe('3. QuotaManager 追蹤測試', () => {
    let quotaManager: QuotaManager;
    let mockProviders: Map<string, any>;

    beforeEach(() => {
      // Mock localStorage
      const localStorageMock = (() => {
        let store: Record<string, string> = {};
        return {
          getItem: (key: string) => store[key] || null,
          setItem: (key: string, value: string) => { store[key] = value; },
          clear: () => { store = {}; }
        };
      })();
      global.localStorage = localStorageMock as any;

      // Initialize all 5 providers
      mockProviders = new Map([
        ['ollama', { daily: 999999, monthly: 999999 }],
        ['gemini', { daily: 10000, monthly: 300000 }],
        ['claude', { daily: 150, monthly: 4500 }],
        ['grok', { daily: 100, monthly: 3000 }],
        ['chatgpt', { daily: 200, monthly: 6000 }]
      ]);

      quotaManager = new QuotaManager(mockProviders);
    });

    afterEach(() => {
      global.localStorage.clear();
    });

    it('should track usage for all 5 providers', () => {
      // Record usage for each provider
      quotaManager.recordUsage('ollama', 100);
      quotaManager.recordUsage('gemini', 200);
      quotaManager.recordUsage('claude', 300);
      quotaManager.recordUsage('grok', 400);
      quotaManager.recordUsage('chatgpt', 500);

      const stats = quotaManager.getUsageStats();

      expect(stats['ollama'].usage.daily).toBe(1);
      expect(stats['ollama'].usage.tokens).toBe(100);
      expect(stats['gemini'].usage.daily).toBe(1);
      expect(stats['gemini'].usage.tokens).toBe(200);
      expect(stats['claude'].usage.daily).toBe(1);
      expect(stats['claude'].usage.tokens).toBe(300);
      expect(stats['grok'].usage.daily).toBe(1);
      expect(stats['grok'].usage.tokens).toBe(400);
      expect(stats['chatgpt'].usage.daily).toBe(1);
      expect(stats['chatgpt'].usage.tokens).toBe(500);
    });

    it('should correctly identify available providers', () => {
      const available = quotaManager.getAvailableProviders();

      expect(available).toHaveLength(5);
      expect(available).toContain('ollama');
      expect(available).toContain('gemini');
      expect(available).toContain('claude');
      expect(available).toContain('grok');
      expect(available).toContain('chatgpt');
    });

    it('should exclude providers when quota exhausted', () => {
      // Exhaust grok daily limit (100 requests)
      for (let i = 0; i < 100; i++) {
        quotaManager.recordUsage('grok');
      }

      const available = quotaManager.getAvailableProviders();

      expect(available).not.toContain('grok');
      expect(available).toContain('claude');
      expect(available).toContain('chatgpt');
      expect(available).toContain('gemini');
      expect(available).toContain('ollama');
    });

    it('should provide correct quota limits for each provider', () => {
      const stats = quotaManager.getUsageStats();

      expect(stats['ollama'].limits.daily).toBe(999999);
      expect(stats['ollama'].limits.monthly).toBe(999999);
      expect(stats['gemini'].limits.daily).toBe(10000);
      expect(stats['gemini'].limits.monthly).toBe(300000);
      expect(stats['claude'].limits.daily).toBe(150);
      expect(stats['claude'].limits.monthly).toBe(4500);
      expect(stats['grok'].limits.daily).toBe(100);
      expect(stats['grok'].limits.monthly).toBe(3000);
      expect(stats['chatgpt'].limits.daily).toBe(200);
      expect(stats['chatgpt'].limits.monthly).toBe(6000);
    });
  });

  describe('4. SmartRouter 路由決策測試', () => {
    let quotaManager: QuotaManager;
    let smartRouter: SmartRouter;
    let mockProviders: Map<string, any>;

    beforeEach(() => {
      const localStorageMock = (() => {
        let store: Record<string, string> = {};
        return {
          getItem: (key: string) => store[key] || null,
          setItem: (key: string, value: string) => { store[key] = value; },
          clear: () => { store = {}; }
        };
      })();
      global.localStorage = localStorageMock as any;

      mockProviders = new Map([
        ['ollama', { daily: 999999, monthly: 999999 }],
        ['gemini', { daily: 10000, monthly: 300000 }],
        ['claude', { daily: 150, monthly: 4500 }],
        ['grok', { daily: 100, monthly: 3000 }],
        ['chatgpt', { daily: 200, monthly: 6000 }]
      ]);

      quotaManager = new QuotaManager(mockProviders);
      smartRouter = new SmartRouter(quotaManager);
    });

    afterEach(() => {
      global.localStorage.clear();
    });

    it('should route simple code tasks to Ollama', () => {
      const task: Task = {
        type: 'code',
        complexity: 3,
        content: 'Write a simple function'
      };

      const selection = smartRouter.selectModel(task);

      expect(selection.provider).toBe('ollama');
      expect(selection.model).toBe('qwen2.5-coder:14b');
      expect(selection.reason).toContain('Optimal match');
    });

    it('should route moderate code tasks to ChatGPT', () => {
      const task: Task = {
        type: 'code',
        complexity: 6,
        content: 'Implement authentication system'
      };

      const selection = smartRouter.selectModel(task);

      expect(selection.provider).toBe('chatgpt');
      expect(selection.model).toBe('gpt-4-turbo-preview');
    });

    it('should route complex code tasks to Claude', () => {
      const task: Task = {
        type: 'code',
        complexity: 9,
        content: 'Design distributed system architecture'
      };

      const selection = smartRouter.selectModel(task);

      expect(selection.provider).toBe('claude');
      expect(selection.model).toBe('claude-opus-4-5-20251101');
    });

    it('should route reasoning tasks to Grok (moderate complexity)', () => {
      const task: Task = {
        type: 'reasoning',
        complexity: 7,
        content: 'Analyze business logic'
      };

      const selection = smartRouter.selectModel(task);

      expect(selection.provider).toBe('grok');
      expect(selection.model).toBe('grok-beta');
    });

    it('should route complex reasoning tasks to Claude', () => {
      const task: Task = {
        type: 'reasoning',
        complexity: 9,
        content: 'Deep philosophical analysis'
      };

      const selection = smartRouter.selectModel(task);

      expect(selection.provider).toBe('claude');
    });

    it('should route multimodal tasks to Gemini', () => {
      const imageTask: Task = {
        type: 'image',
        complexity: 5,
        content: 'Analyze image content'
      };

      const audioTask: Task = {
        type: 'audio',
        complexity: 5,
        content: 'Transcribe audio'
      };

      const videoTask: Task = {
        type: 'video',
        complexity: 5,
        content: 'Extract video chapters'
      };

      expect(smartRouter.selectModel(imageTask).provider).toBe('gemini');
      expect(smartRouter.selectModel(audioTask).provider).toBe('gemini');
      expect(smartRouter.selectModel(videoTask).provider).toBe('gemini');
    });

    it('should respect user preferred provider', () => {
      const task: Task = {
        type: 'code',
        complexity: 5,
        content: 'Write function',
        preferredProvider: 'claude'
      };

      const selection = smartRouter.selectModel(task);

      expect(selection.provider).toBe('claude');
    });
  });

  describe('5. Failover 邏輯測試', () => {
    let quotaManager: QuotaManager;
    let smartRouter: SmartRouter;
    let mockProviders: Map<string, any>;

    beforeEach(() => {
      const localStorageMock = (() => {
        let store: Record<string, string> = {};
        return {
          getItem: (key: string) => store[key] || null,
          setItem: (key: string, value: string) => { store[key] = value; },
          clear: () => { store = {}; }
        };
      })();
      global.localStorage = localStorageMock as any;

      mockProviders = new Map([
        ['ollama', { daily: 999999, monthly: 999999 }],
        ['gemini', { daily: 10000, monthly: 300000 }],
        ['claude', { daily: 150, monthly: 4500 }],
        ['grok', { daily: 100, monthly: 3000 }],
        ['chatgpt', { daily: 200, monthly: 6000 }]
      ]);

      quotaManager = new QuotaManager(mockProviders);
      smartRouter = new SmartRouter(quotaManager);
    });

    afterEach(() => {
      global.localStorage.clear();
    });

    it('should fallback when preferred provider quota exhausted', () => {
      const task: Task = {
        type: 'code',
        complexity: 6,
        content: 'Implement feature'
      };

      // Exhaust ChatGPT quota (preferred for complexity 6 code)
      for (let i = 0; i < 200; i++) {
        quotaManager.recordUsage('chatgpt');
      }

      const selection = smartRouter.selectModel(task);

      // Should fallback to alternative (Claude for complex code)
      expect(selection.provider).not.toBe('chatgpt');
      expect(selection.reason).toContain('Fallback');
    });

    it('should use Ollama as last resort when all cloud providers unavailable', () => {
      const task: Task = {
        type: 'code',
        complexity: 9,
        content: 'Complex task'
      };

      // Exhaust all cloud providers
      for (let i = 0; i < 150; i++) quotaManager.recordUsage('claude');
      for (let i = 0; i < 100; i++) quotaManager.recordUsage('grok');
      for (let i = 0; i < 200; i++) quotaManager.recordUsage('chatgpt');
      for (let i = 0; i < 10000; i++) quotaManager.recordUsage('gemini');

      const selection = smartRouter.selectModel(task);

      expect(selection.provider).toBe('ollama');
      expect(selection.reason).toContain('All cloud providers unavailable');
    });

    it('should provide suggested alternatives in quota check result', () => {
      // Exhaust Grok quota
      for (let i = 0; i < 100; i++) {
        quotaManager.recordUsage('grok');
      }

      const quotaCheck = quotaManager.checkQuota('grok');

      expect(quotaCheck.canUse).toBe(false);
      expect(quotaCheck.suggestedAlternatives).toBeDefined();
      expect(quotaCheck.suggestedAlternatives?.length).toBeGreaterThan(0);
      expect(quotaCheck.suggestedAlternatives).not.toContain('grok');
    });

    it('should only suggest providers with available quota', () => {
      // Exhaust Grok and Claude
      for (let i = 0; i < 100; i++) quotaManager.recordUsage('grok');
      for (let i = 0; i < 150; i++) quotaManager.recordUsage('claude');

      const quotaCheck = quotaManager.checkQuota('grok');

      expect(quotaCheck.suggestedAlternatives).not.toContain('grok');
      expect(quotaCheck.suggestedAlternatives).not.toContain('claude');
      expect(quotaCheck.suggestedAlternatives).toContain('chatgpt');
      expect(quotaCheck.suggestedAlternatives).toContain('ollama');
    });

    it('should handle provider unavailability (marked unavailable)', () => {
      const task: Task = {
        type: 'code',
        complexity: 6,
        content: 'Implement feature'
      };

      // Mark ChatGPT as unavailable (e.g., network error)
      quotaManager.markUnavailable('chatgpt', 1000);

      const selection = smartRouter.selectModel(task);

      expect(selection.provider).not.toBe('chatgpt');
    });

    it('should restore provider after unavailability duration', async () => {
      quotaManager.markUnavailable('claude', 100); // 100ms unavailability

      const checkBefore = quotaManager.checkQuota('claude');
      expect(checkBefore.canUse).toBe(false);

      // Wait for auto-restore
      await new Promise(resolve => setTimeout(resolve, 150));

      const checkAfter = quotaManager.checkQuota('claude');
      expect(checkAfter.canUse).toBe(true);
    });

    it('should provide complete three-tier failover chain', () => {
      const task: Task = {
        type: 'code',
        complexity: 9,
        content: 'Very complex task'
      };

      // Test tier 1: Preferred provider (Claude for complexity 9)
      const tier1 = smartRouter.selectModel(task);
      expect(tier1.provider).toBe('claude');

      // Exhaust tier 1
      for (let i = 0; i < 150; i++) quotaManager.recordUsage('claude');

      // Test tier 2: Alternative provider
      const tier2 = smartRouter.selectModel(task);
      expect(tier2.provider).not.toBe('claude');
      expect(tier2.reason).toContain('Fallback');

      // Exhaust all cloud providers
      for (let i = 0; i < 100; i++) quotaManager.recordUsage('grok');
      for (let i = 0; i < 200; i++) quotaManager.recordUsage('chatgpt');
      for (let i = 0; i < 10000; i++) quotaManager.recordUsage('gemini');

      // Test tier 3: Last resort (Ollama)
      const tier3 = smartRouter.selectModel(task);
      expect(tier3.provider).toBe('ollama');
      expect(tier3.reason).toContain('All cloud providers unavailable');
    });
  });

  describe('6. End-to-End Integration Test', () => {
    it('should integrate all components correctly', () => {
      const localStorageMock = (() => {
        let store: Record<string, string> = {};
        return {
          getItem: (key: string) => store[key] || null,
          setItem: (key: string, value: string) => { store[key] = value; },
          clear: () => { store = {}; }
        };
      })();
      global.localStorage = localStorageMock as any;

      const mockProviders = new Map([
        ['ollama', { daily: 999999, monthly: 999999 }],
        ['gemini', { daily: 10000, monthly: 300000 }],
        ['claude', { daily: 150, monthly: 4500 }],
        ['grok', { daily: 100, monthly: 3000 }],
        ['chatgpt', { daily: 200, monthly: 6000 }]
      ]);

      const quotaManager = new QuotaManager(mockProviders);
      const smartRouter = new SmartRouter(quotaManager);

      const grokClient = new GrokClient({
        apiKey: MOCK_GROK_API_KEY,
        model: 'grok-beta'
      });

      const chatgptClient = new ChatGPTClient({
        apiKey: MOCK_CHATGPT_API_KEY,
        model: 'gpt-4-turbo-preview'
      });

      // Verify all components initialized
      expect(quotaManager).toBeDefined();
      expect(smartRouter).toBeDefined();
      expect(grokClient).toBeDefined();
      expect(chatgptClient).toBeDefined();

      // Verify routing works
      const codeTask: Task = {
        type: 'code',
        complexity: 6,
        content: 'Test task'
      };
      const selection = smartRouter.selectModel(codeTask);
      expect(selection.provider).toBe('chatgpt');

      // Record usage
      quotaManager.recordUsage(selection.provider, 500);

      // Verify quota tracking
      const stats = quotaManager.getUsageStats();
      expect(stats[selection.provider].usage.daily).toBe(1);
      expect(stats[selection.provider].usage.tokens).toBe(500);

      global.localStorage.clear();
    });
  });
});
