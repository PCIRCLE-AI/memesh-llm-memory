// tests/unit/mcp/resources/AgentStatusHandler.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { AgentStatusHandler } from '../../../../src/mcp/resources/handlers/AgentStatusHandler';

describe('AgentStatusHandler', () => {
  let handler: AgentStatusHandler;

  beforeEach(() => {
    handler = new AgentStatusHandler();
  });

  it('should return agent status for valid agent type', async () => {
    const result = await handler.handle({ agentType: 'code-reviewer' });

    expect(result.uri).toBe('ccb://agent/code-reviewer/status');
    expect(result.mimeType).toBe('application/json');

    const data = JSON.parse(result.text);
    expect(data).toHaveProperty('agentType', 'code-reviewer');
    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('capabilities');
  });

  it('should throw error for unknown agent type', async () => {
    await expect(
      handler.handle({ agentType: 'unknown-agent' })
    ).rejects.toThrow('Unknown agent type');
  });
});
