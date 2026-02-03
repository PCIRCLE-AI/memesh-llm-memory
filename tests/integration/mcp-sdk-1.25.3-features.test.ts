/**
 * MCP SDK 1.25.3 Features Integration Test
 *
 * Comprehensive integration tests for new capabilities:
 * - URI Templates (Dynamic Resources)
 * - Progress Reporting
 * - Sampling (Content Generation)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ClaudeCodeBuddyMCPServer } from '../../src/mcp/server';
import { URITemplateHandler } from '../../src/mcp/resources/URITemplateHandler';
import { ResourceRegistry } from '../../src/mcp/resources/ResourceRegistry';
import { AgentStatusHandler } from '../../src/mcp/resources/handlers/AgentStatusHandler';
import { TaskLogsHandler } from '../../src/mcp/resources/handlers/TaskLogsHandler';
import { ProgressReporter } from '../../src/mcp/ProgressReporter';
import { SamplingClient } from '../../src/mcp/SamplingClient';
import { TestGenerator } from '../../src/tools/TestGenerator';

describe('MCP SDK 1.25.3 - URI Templates & Dynamic Resources', () => {
  let server: ClaudeCodeBuddyMCPServer;

  beforeAll(async () => {
    server = await ClaudeCodeBuddyMCPServer.create();
  });

  afterAll(async () => {
    // Server cleanup happens in global teardown
  });

  describe('URI Template Parsing', () => {
    let handler: URITemplateHandler;

    beforeAll(() => {
      handler = new URITemplateHandler();
    });

    it('should parse agent status URI template correctly', () => {
      const template = 'ccb://agent/{agentType}/status';
      const uri = 'ccb://agent/code-reviewer/status';

      const params = handler.parseTemplate(template, uri);

      expect(params).not.toBeNull();
      expect(params?.agentType).toBe('code-reviewer');
    });

    it('should parse task logs URI template correctly', () => {
      const template = 'ccb://task/{taskId}/logs';
      const uri = 'ccb://task/task-123/logs';

      const params = handler.parseTemplate(template, uri);

      expect(params).not.toBeNull();
      expect(params?.taskId).toBe('task-123');
    });

    it('should return null for non-matching URIs', () => {
      const template = 'ccb://agent/{agentType}/status';
      const uri = 'ccb://task/task-123/logs';

      const params = handler.parseTemplate(template, uri);

      expect(params).toBeNull();
    });

    it('should handle static URIs (no parameters)', () => {
      const template = 'ccb://system/health';
      const uri = 'ccb://system/health';

      const params = handler.parseTemplate(template, uri);

      expect(params).not.toBeNull();
      expect(Object.keys(params!)).toHaveLength(0);
    });

    it('should validate input parameters', () => {
      const handler = new URITemplateHandler();

      // Empty strings should return null
      expect(handler.parseTemplate('', 'uri')).toBeNull();
      expect(handler.parseTemplate('template', '')).toBeNull();

      // Non-string inputs should return null
      expect(handler.parseTemplate(null as any, 'uri')).toBeNull();
      expect(handler.parseTemplate('template', undefined as any)).toBeNull();
    });

    it('should handle special characters in URIs', () => {
      const template = 'ccb://agent/{agentType}/status';
      const uri = 'ccb://agent/test-writer/status';

      const params = handler.parseTemplate(template, uri);

      expect(params).not.toBeNull();
      expect(params?.agentType).toBe('test-writer');
    });
  });

  describe('Resource Registry', () => {
    let registry: ResourceRegistry;

    beforeAll(() => {
      registry = new ResourceRegistry();
    });

    it('should register and retrieve resource handlers', async () => {
      const template = 'ccb://test/{id}';
      const handler = async (params: any) => ({
        uri: `ccb://test/${params.id}`,
        mimeType: 'text/plain',
        text: `Test resource: ${params.id}`,
      });

      registry.register(template, handler);
      const result = await registry.handle('ccb://test/123');

      expect(result.uri).toBe('ccb://test/123');
      expect(result.mimeType).toBe('text/plain');
      expect(result.text).toContain('Test resource: 123');
    });

    it('should register and retrieve templates', () => {
      const template = {
        uriTemplate: 'ccb://test/{id}',
        name: 'Test Resource',
        description: 'A test resource',
        mimeType: 'text/plain',
      };

      registry.registerTemplate(template);
      const templates = registry.getTemplates();

      expect(templates).toContainEqual(template);
    });

    it('should throw NotFoundError for unregistered URIs', async () => {
      const registry = new ResourceRegistry();

      await expect(
        registry.handle('ccb://unknown/resource')
      ).rejects.toThrow('No handler found for URI');
    });
  });

  describe('Agent Status Handler', () => {
    let handler: AgentStatusHandler;

    beforeAll(() => {
      handler = new AgentStatusHandler();
    });

    it('should return agent status for valid agent types', async () => {
      const result = await handler.handle({ agentType: 'code-reviewer' });

      expect(result.uri).toBe('ccb://agent/code-reviewer/status');
      expect(result.mimeType).toBe('application/json');

      const status = JSON.parse(result.text);
      expect(status.agentType).toBe('code-reviewer');
      expect(status.status).toBe('active');
      expect(status.capabilities).toContain('review');
      expect(status.lastActive).toBeDefined();
    });

    it('should return capabilities for all agent types', async () => {
      const agentTypes = [
        'code-reviewer',
        'test-writer',
        'development-butler',
        'e2e-healing',
        'knowledge-graph',
      ];

      for (const agentType of agentTypes) {
        const result = await handler.handle({ agentType });
        const status = JSON.parse(result.text);

        expect(status.capabilities).toBeDefined();
        expect(Array.isArray(status.capabilities)).toBe(true);
        expect(status.capabilities.length).toBeGreaterThan(0);
      }
    });

    it('should throw NotFoundError for invalid agent types', async () => {
      await expect(
        handler.handle({ agentType: 'invalid-agent' })
      ).rejects.toThrow('Unknown agent type');
    });
  });

  describe('Task Logs Handler', () => {
    let handler: TaskLogsHandler;

    beforeAll(() => {
      handler = new TaskLogsHandler();
    });

    it('should return task logs placeholder for valid task IDs', async () => {
      const result = await handler.handle({ taskId: 'task-123' });

      expect(result.uri).toBe('ccb://task/task-123/logs');
      expect(result.mimeType).toBe('text/plain');
      // Feature not yet implemented - verify placeholder message
      expect(result.text).toContain('Task Logs - Feature Not Yet Available');
      expect(result.text).toContain('task-123');
    });

    it('should return placeholder for all task IDs (not yet implemented)', async () => {
      const result = await handler.handle({ taskId: 'invalid-task-id' });

      // Current implementation returns placeholder for all tasks
      expect(result.text).toContain('Task Logs - Feature Not Yet Available');
      expect(result.text).toContain('invalid-task-id');
    });
  });

  describe('MCP Server Integration', () => {
    it('should handle agent status resource request via server', async () => {
      const handler = (server as any).server._requestHandlers.get('resources/read');
      const result = await handler({
        method: 'resources/read',
        params: { uri: 'ccb://agent/test-writer/status' },
      });

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].mimeType).toBe('application/json');

      const data = JSON.parse(result.contents[0].text);
      expect(data.agentType).toBe('test-writer');
      expect(data.status).toBe('active');
      expect(data.capabilities).toContain('generate-tests');
    });

    it('should handle task logs resource request via server', async () => {
      const handler = (server as any).server._requestHandlers.get('resources/read');
      const result = await handler({
        method: 'resources/read',
        params: { uri: 'ccb://task/task-456/logs' },
      });

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].mimeType).toBe('text/plain');
      // Feature not yet implemented - verify placeholder message
      expect(result.contents[0].text).toContain('Task Logs - Feature Not Yet Available');
    });

    it('should list available resource templates', async () => {
      const handler = (server as any).server._requestHandlers.get('resources/list');
      const result = await handler({
        method: 'resources/list',
        params: {},
      });

      expect(result.resources).toBeDefined();
      expect(Array.isArray(result.resources)).toBe(true);

      // Should include our dynamic resource templates
      const agentTemplate = result.resources.find((r: any) =>
        r.uriTemplate === 'ccb://agent/{agentType}/status'
      );
      const taskTemplate = result.resources.find((r: any) =>
        r.uriTemplate === 'ccb://task/{taskId}/logs'
      );

      expect(agentTemplate).toBeDefined();
      expect(taskTemplate).toBeDefined();
    });
  });
});

describe('MCP SDK 1.25.3 - Progress Reporting', () => {
  describe('ProgressReporter', () => {
    it('should report progress when token is provided', async () => {
      let capturedUpdate: any = null;

      const sendProgress = async (update: any) => {
        capturedUpdate = update;
      };

      const reporter = new ProgressReporter('test-token', sendProgress);

      await reporter.report(5, 10);

      expect(capturedUpdate).not.toBeNull();
      expect(capturedUpdate.progressToken).toBe('test-token');
      expect(capturedUpdate.progress).toBe(5);
      expect(capturedUpdate.total).toBe(10);
    });

    it('should skip reporting when no token is provided', async () => {
      let callCount = 0;

      const sendProgress = async () => {
        callCount++;
      };

      const reporter = new ProgressReporter(undefined, sendProgress);

      await reporter.report(5, 10);

      expect(callCount).toBe(0);
    });

    it('should indicate if progress reporting is enabled', () => {
      const reporter1 = new ProgressReporter('token', async () => {});
      const reporter2 = new ProgressReporter(undefined, async () => {});

      expect(reporter1.isEnabled()).toBe(true);
      expect(reporter2.isEnabled()).toBe(false);
    });

    it('should handle multiple progress updates', async () => {
      const updates: any[] = [];

      const sendProgress = async (update: any) => {
        updates.push(update);
      };

      const reporter = new ProgressReporter('test-token', sendProgress);

      await reporter.report(1, 10);
      await reporter.report(5, 10);
      await reporter.report(10, 10);

      expect(updates).toHaveLength(3);
      expect(updates[0].progress).toBe(1);
      expect(updates[1].progress).toBe(5);
      expect(updates[2].progress).toBe(10);
    });
  });
});

describe('MCP SDK 1.25.3 - Sampling & Content Generation', () => {
  describe('SamplingClient', () => {
    it('should generate content from prompt', async () => {
      const mockSampleFn = async (request: any) => ({
        role: 'assistant' as const,
        content: { type: 'text' as const, text: 'Generated content' },
      });

      const client = new SamplingClient(mockSampleFn);
      const result = await client.generate('Test prompt', { maxTokens: 100 });

      expect(result).toBe('Generated content');
    });

    it('should validate prompt input', async () => {
      const mockSampleFn = async () => ({
        role: 'assistant' as const,
        content: { type: 'text' as const, text: 'test' },
      });

      const client = new SamplingClient(mockSampleFn);

      await expect(
        client.generate('', { maxTokens: 100 })
      ).rejects.toThrow('Prompt cannot be empty');

      await expect(
        client.generate('   ', { maxTokens: 100 })
      ).rejects.toThrow('Prompt cannot be empty');
    });

    it('should validate maxTokens parameter', async () => {
      const mockSampleFn = async () => ({
        role: 'assistant' as const,
        content: { type: 'text' as const, text: 'test' },
      });

      const client = new SamplingClient(mockSampleFn);

      await expect(
        client.generate('Test', { maxTokens: 0 })
      ).rejects.toThrow('maxTokens must be positive');

      await expect(
        client.generate('Test', { maxTokens: -1 })
      ).rejects.toThrow('maxTokens must be positive');
    });

    it('should handle conversation history', async () => {
      let capturedMessages: any[] = [];

      const mockSampleFn = async (request: any) => {
        capturedMessages = request.messages;
        return {
          role: 'assistant' as const,
          content: { type: 'text' as const, text: 'Response' },
        };
      };

      const client = new SamplingClient(mockSampleFn);
      const messages = [
        { role: 'user' as const, content: 'Hello' },
        { role: 'assistant' as const, content: 'Hi there' },
        { role: 'user' as const, content: 'How are you?' },
      ];

      await client.generateWithHistory(messages, { maxTokens: 100 });

      expect(capturedMessages).toEqual(messages);
    });

    it('should handle sampling errors gracefully', async () => {
      const mockSampleFn = async () => {
        throw new Error('Network error');
      };

      const client = new SamplingClient(mockSampleFn);

      await expect(
        client.generate('Test', { maxTokens: 100 })
      ).rejects.toThrow('Sampling failed: Network error');
    });

    it('should validate response structure', async () => {
      const mockSampleFn = async () => ({
        role: 'assistant' as const,
        content: { type: 'text' as const, text: '' }, // Empty text
      });

      const client = new SamplingClient(mockSampleFn);

      await expect(
        client.generate('Test', { maxTokens: 100 })
      ).rejects.toThrow('Invalid response from sampling function');
    });
  });

  describe('TestGenerator', () => {
    it('should generate tests from specification', async () => {
      const mockSampleFn = async (request: any) => ({
        role: 'assistant' as const,
        content: {
          type: 'text' as const,
          text: `describe('Calculator', () => {
  it('should add numbers', () => {
    expect(add(1, 2)).toBe(3);
  });
});`,
        },
      });

      const client = new SamplingClient(mockSampleFn);
      const generator = new TestGenerator(client);

      const spec = 'Calculator with add function';
      const result = await generator.generateTests(spec);

      expect(result).toContain('describe');
      expect(result).toContain('it(');
      expect(result).toContain('expect');
    });

    it('should generate tests from source code', async () => {
      const mockSampleFn = async (request: any) => ({
        role: 'assistant' as const,
        content: {
          type: 'text' as const,
          text: `describe('multiply', () => {
  it('should multiply two numbers', () => {
    expect(multiply(2, 3)).toBe(6);
  });
});`,
        },
      });

      const client = new SamplingClient(mockSampleFn);
      const generator = new TestGenerator(client);

      const code = `
export function multiply(a: number, b: number): number {
  return a * b;
}
`;
      const result = await generator.generateTestsFromCode(code);

      expect(result).toContain('describe');
      expect(result).toContain('multiply');
      expect(result).toContain('expect');
    });

    it('should validate specification input', async () => {
      const mockSampleFn = async () => ({
        role: 'assistant' as const,
        content: { type: 'text' as const, text: 'test' },
      });

      const client = new SamplingClient(mockSampleFn);
      const generator = new TestGenerator(client);

      await expect(
        generator.generateTests('')
      ).rejects.toThrow('Specification cannot be empty');
    });

    it('should validate code input', async () => {
      const mockSampleFn = async () => ({
        role: 'assistant' as const,
        content: { type: 'text' as const, text: 'test' },
      });

      const client = new SamplingClient(mockSampleFn);
      const generator = new TestGenerator(client);

      await expect(
        generator.generateTestsFromCode('')
      ).rejects.toThrow('Code cannot be empty');
    });
  });

  describe('generate-tests MCP Tool', () => {
    it('should be available in MCP server tool list', async () => {
      const server = await ClaudeCodeBuddyMCPServer.create();
      const handler = (server as any).server._requestHandlers.get('tools/list');
      const result = await handler({ method: 'tools/list', params: {} });

      const generateTestsTool = result.tools.find((t: any) => t.name === 'generate-tests');

      expect(generateTestsTool).toBeDefined();
      expect(generateTestsTool.description).toContain('test');
      expect(generateTestsTool.inputSchema).toBeDefined();
    });
  });
});

describe('MCP SDK 1.25.3 - End-to-End Workflows', () => {
  it('should complete full workflow: resource discovery -> read -> content generation', async () => {
    const server = await ClaudeCodeBuddyMCPServer.create();

    // Step 1: List available resources
    const listHandler = (server as any).server._requestHandlers.get('resources/list');
    const listResult = await listHandler({ method: 'resources/list', params: {} });

    expect(listResult.resources.length).toBeGreaterThan(0);

    // Step 2: Read a specific resource
    const readHandler = (server as any).server._requestHandlers.get('resources/read');
    const readResult = await readHandler({
      method: 'resources/read',
      params: { uri: 'ccb://agent/code-reviewer/status' },
    });

    expect(readResult.contents[0].text).toBeDefined();

    // Step 3: Use the data for content generation (simulated)
    const agentStatus = JSON.parse(readResult.contents[0].text);
    expect(agentStatus.capabilities).toBeDefined();
  });

  it('should handle error scenarios gracefully', async () => {
    const server = await ClaudeCodeBuddyMCPServer.create();
    const readHandler = (server as any).server._requestHandlers.get('resources/read');

    // Invalid URI should throw
    await expect(
      readHandler({
        method: 'resources/read',
        params: { uri: 'ccb://invalid/resource' },
      })
    ).rejects.toThrow();
  });
});
