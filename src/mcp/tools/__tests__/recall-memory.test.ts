/**
 * Tests for recall-memory MCP tool
 */

import { describe, it, expect, vi } from 'vitest';
import { recallMemoryTool } from '../recall-memory';

describe('recallMemoryTool', () => {
  it('should define recall-memory tool metadata', () => {
    expect(recallMemoryTool.name).toBe('recall-memory');
    expect(recallMemoryTool.description).toContain('project memory');
  });

  it('should recall recent work when invoked', async () => {
    const mockManager = {
      recallRecentWork: vi.fn().mockResolvedValue([
        {
          type: 'code_change',
          observations: ['Files: src/test.ts'],
          metadata: { timestamp: '2025-01-01T00:00:00Z' }
        }
      ])
    };

    const result = await recallMemoryTool.handler(
      { limit: 5 },
      mockManager as any
    );

    expect(result.memories).toHaveLength(1);
    expect(mockManager.recallRecentWork).toHaveBeenCalledWith({ limit: 5 });
  });
});
