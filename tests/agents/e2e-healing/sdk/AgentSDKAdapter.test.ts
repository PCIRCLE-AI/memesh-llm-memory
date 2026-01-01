import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentSDKAdapter } from '../../../../src/agents/e2e-healing/sdk/AgentSDKAdapter.js';
import Anthropic from '@anthropic-ai/sdk';

vi.mock('@anthropic-ai/sdk');

describe('AgentSDKAdapter', () => {
  let adapter: AgentSDKAdapter;
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      messages: {
        create: vi.fn(),
      },
    };
    adapter = new AgentSDKAdapter(mockClient);
  });

  describe('analyzeFailure', () => {
    it('should call Claude API with correct parameters', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: 'Root cause: Missing CSS class',
          },
        ],
        usage: {
          input_tokens: 100,
          output_tokens: 50,
        },
      };

      mockClient.messages.create.mockResolvedValue(mockResponse);

      const result = await adapter.analyzeFailure({
        error: new Error('Element not found'),
        screenshot: 'base64...',
        codeContext: 'const Button = () => {...}',
      });

      expect(mockClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: expect.any(Number),
        })
      );

      expect(result.rootCause).toContain('Missing CSS class');
      expect(result.tokensUsed).toBe(150);
    });

    it('should include thinking budget for complex analysis', async () => {
      mockClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Analysis result' }],
        usage: { input_tokens: 100, output_tokens: 50 },
      });

      await adapter.analyzeFailure({
        error: new Error('Complex error'),
        screenshot: 'base64...',
        codeContext: 'complex code...',
        useExtendedThinking: true,
      });

      expect(mockClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          thinking: {
            type: 'enabled',
            budget_tokens: 10000,
          },
        })
      );
    });
  });

  describe('generateFix', () => {
    it('should generate code fix with context caching', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: '```typescript\nconst fix = "fixed code";\n```',
          },
        ],
        usage: {
          input_tokens: 200,
          output_tokens: 100,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 2000,
        },
      };

      mockClient.messages.create.mockResolvedValue(mockResponse);

      const result = await adapter.generateFix({
        rootCause: 'Missing CSS class',
        codeContext: 'const Button = () => {...}',
        testFile: 'Button.test.tsx',
      });

      expect(result.code).toContain('fixed code');
      expect(result.tokensUsed).toBe(300);
      expect(result.cacheHit).toBe(true);
    });
  });
});
