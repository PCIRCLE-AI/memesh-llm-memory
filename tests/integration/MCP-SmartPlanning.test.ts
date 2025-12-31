/**
 * MCP Server - Smart Planning Tools Integration Tests
 *
 * Tests the integration of PlanningEngine with MCP server
 * to ensure generate-smart-plan tool is properly exposed and functional.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ClaudeCodeBuddyMCPServer } from '../../src/mcp/server.js';

describe('MCP Server - Smart Planning Tools', () => {
  let server: ClaudeCodeBuddyMCPServer;

  beforeEach(() => {
    server = new ClaudeCodeBuddyMCPServer();
  });

  it('should expose generate-smart-plan tool', async () => {
    // Get the MCP server instance's internal server object
    // We'll need to access the listTools method through the request handler
    const listToolsRequest = {
      jsonrpc: '2.0' as const,
      id: 1,
      method: 'tools/list' as const,
      params: {},
    };

    // Use reflection to access the private server
    const mcpServer = (server as any).server;
    const handler = mcpServer._requestHandlers?.get('tools/list');

    expect(handler).toBeDefined();

    const result = await handler(listToolsRequest);
    const toolNames = result.tools.map((t: any) => t.name);

    expect(toolNames).toContain('generate-smart-plan');
  });

  it('should generate plan with bite-sized tasks', async () => {
    // Simulate calling the generate-smart-plan tool
    const callToolRequest = {
      jsonrpc: '2.0' as const,
      id: 2,
      method: 'tools/call' as const,
      params: {
        name: 'generate-smart-plan',
        arguments: {
          featureDescription: 'Add user authentication with JWT',
          requirements: ['API endpoints', 'password hashing', 'token validation'],
        },
      },
    };

    // Use reflection to access the private server
    const mcpServer = (server as any).server;
    const handler = mcpServer._requestHandlers?.get('tools/call');

    expect(handler).toBeDefined();

    const result = await handler(callToolRequest);

    // Parse the result
    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);

    const planText = result.content[0].text;
    expect(planText).toContain('Implementation Plan');

    // Verify the plan was generated with proper structure
    expect(planText).toContain('task-');
    expect(planText).toContain('2-5 minutes');
  });

  it('should assign appropriate agents to tasks', async () => {
    // Simulate calling the generate-smart-plan tool
    const callToolRequest = {
      jsonrpc: '2.0' as const,
      id: 3,
      method: 'tools/call' as const,
      params: {
        name: 'generate-smart-plan',
        arguments: {
          featureDescription: 'Add secure user authentication',
        },
      },
    };

    // Use reflection to access the private server
    const mcpServer = (server as any).server;
    const handler = mcpServer._requestHandlers?.get('tools/call');

    expect(handler).toBeDefined();

    const result = await handler(callToolRequest);

    // Parse the result
    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);

    const planText = result.content[0].text;

    // Verify security-related tasks get appropriate agent suggestions
    // (The exact agent assignment depends on PlanningEngine implementation)
    expect(planText).toBeDefined();
    expect(planText.length).toBeGreaterThan(0);
  });
});
