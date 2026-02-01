// tests/unit/SamplingClient.test.ts
import { describe, it, expect, vi } from 'vitest';
import { SamplingClient } from '../../src/mcp/SamplingClient';

describe('SamplingClient', () => {
  it('should create sampling request', async () => {
    const mockSample = vi.fn().mockResolvedValue({
      role: 'assistant',
      content: { type: 'text', text: 'Generated content' }
    });

    const client = new SamplingClient(mockSample);
    const result = await client.generate('Test prompt', { maxTokens: 100 });

    expect(result).toBe('Generated content');
    expect(mockSample).toHaveBeenCalledWith({
      messages: [{ role: 'user', content: 'Test prompt' }],
      maxTokens: 100,
    });
  });

  it('should generate with conversation history', async () => {
    const mockSample = vi.fn().mockResolvedValue({
      role: 'assistant',
      content: { type: 'text', text: 'Response to conversation' }
    });

    const client = new SamplingClient(mockSample);
    const messages = [
      { role: 'user' as const, content: 'Hello' },
      { role: 'assistant' as const, content: 'Hi there' },
      { role: 'user' as const, content: 'How are you?' },
    ];
    const result = await client.generateWithHistory(messages, { maxTokens: 100 });

    expect(result).toBe('Response to conversation');
    expect(mockSample).toHaveBeenCalledWith({
      messages,
      maxTokens: 100,
    });
  });

  it('should throw error for empty prompt', async () => {
    const mockSample = vi.fn();
    const client = new SamplingClient(mockSample);

    await expect(
      client.generate('', { maxTokens: 100 })
    ).rejects.toThrow('Prompt cannot be empty');

    expect(mockSample).not.toHaveBeenCalled();
  });

  it('should throw error for invalid maxTokens', async () => {
    const mockSample = vi.fn();
    const client = new SamplingClient(mockSample);

    await expect(
      client.generate('Test', { maxTokens: 0 })
    ).rejects.toThrow('maxTokens must be positive');
  });

  it('should throw error for malformed response', async () => {
    const mockSample = vi.fn().mockResolvedValue({
      role: 'assistant',
      content: null  // Malformed
    });

    const client = new SamplingClient(mockSample);

    await expect(
      client.generate('Test', { maxTokens: 100 })
    ).rejects.toThrow('Invalid response from sampling function');
  });

  it('should propagate sampling function errors', async () => {
    const mockSample = vi.fn().mockRejectedValue(new Error('Network error'));

    const client = new SamplingClient(mockSample);

    await expect(
      client.generate('Test', { maxTokens: 100 })
    ).rejects.toThrow('Sampling failed: Network error');
  });
});
