// tests/integration/mcp-dynamic-resources.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ClaudeCodeBuddyMCPServer } from '../../src/mcp/server';

describe('MCP Dynamic Resources Integration', () => {
  let server: ClaudeCodeBuddyMCPServer;

  beforeAll(async () => {
    server = new ClaudeCodeBuddyMCPServer();
    // Server auto-initializes in constructor
  });

  afterAll(async () => {
    // Server cleanup happens in global teardown
    // No public close() method needed for tests
  });

  it('should handle agent status resource request', async () => {
    const handler = (server as any).server._requestHandlers.get('resources/read');
    const result = await handler({
      method: 'resources/read',
      params: { uri: 'ccb://agent/code-reviewer/status' },
    });

    expect(result.contents).toHaveLength(1);
    expect(result.contents[0].mimeType).toBe('application/json');

    const data = JSON.parse(result.contents[0].text);
    expect(data.agentType).toBe('code-reviewer');
    expect(data.status).toBeDefined();
  });

  it('should handle task logs resource request', async () => {
    const handler = (server as any).server._requestHandlers.get('resources/read');
    const result = await handler({
      method: 'resources/read',
      params: { uri: 'ccb://task/task-123/logs' },
    });

    expect(result.contents).toHaveLength(1);
    expect(result.contents[0].mimeType).toBe('text/plain');
    // Feature not yet implemented - verify placeholder message
    expect(result.contents[0].text).toContain('Task Logs - Feature Not Yet Available');
    expect(result.contents[0].text).toContain('task-123');
  });
});
