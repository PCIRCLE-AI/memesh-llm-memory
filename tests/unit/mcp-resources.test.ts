/**
 * MCP Resources Tests
 *
 * Verify that MeMesh MCP resources are properly declared and accessible
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { setupResourceHandlers } from '../../src/mcp/handlers/ResourceHandlers.js';

describe('MCP Resources', () => {
  let server: Server;

  beforeAll(() => {
    // Create minimal server instance for testing
    server = new Server(
      {
        name: 'test-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          resources: {
            listChanged: false,
          },
        },
      }
    );

    setupResourceHandlers(server);
  });

  afterAll(() => {
    server.close();
  });

  describe('Capability Declaration', () => {
    it('should declare resources capability with listChanged: false', () => {
      // Capabilities are set during server initialization
      // We verify this by checking if resource handlers are registered
      const hasResourceListHandler = (server as any)._requestHandlers.has('resources/list');
      const hasResourceReadHandler = (server as any)._requestHandlers.has('resources/read');

      expect(hasResourceListHandler).toBe(true);
      expect(hasResourceReadHandler).toBe(true);
    });
  });

  describe('Resource List', () => {
    it('should list all 6 available resources (4 static + 2 dynamic templates)', async () => {
      const handler = (server as any)._requestHandlers.get('resources/list');
      expect(handler).toBeDefined();

      const result = await handler({
        method: 'resources/list',
        params: {},
      });

      expect(result).toHaveProperty('resources');
      // 4 static resources + 2 URI templates (agent status, task logs)
      expect(result.resources).toHaveLength(6);
    });

    it('should include usage-guide resource', async () => {
      const handler = (server as any)._requestHandlers.get('resources/list');
      const result = await handler({
        method: 'resources/list',
        params: {},
      });

      const usageGuide = result.resources.find(
        (r: any) => r.uri === 'claude-code-buddy://usage-guide'
      );

      expect(usageGuide).toBeDefined();
      expect(usageGuide.name).toBe('MeMesh Complete Usage Guide');
      expect(usageGuide.mimeType).toBe('text/markdown');
      expect(usageGuide.description).toContain('Comprehensive guide');
    });

    it('should include quick-reference resource', async () => {
      const handler = (server as any)._requestHandlers.get('resources/list');
      const result = await handler({
        method: 'resources/list',
        params: {},
      });

      const quickRef = result.resources.find(
        (r: any) => r.uri === 'claude-code-buddy://quick-reference'
      );

      expect(quickRef).toBeDefined();
      expect(quickRef.name).toBe('Capabilities Quick Reference');
      expect(quickRef.mimeType).toBe('text/markdown');
    });

    it('should include examples resource', async () => {
      const handler = (server as any)._requestHandlers.get('resources/list');
      const result = await handler({
        method: 'resources/list',
        params: {},
      });

      const examples = result.resources.find(
        (r: any) => r.uri === 'claude-code-buddy://examples'
      );

      expect(examples).toBeDefined();
      expect(examples.name).toBe('Real-world Examples');
      expect(examples.mimeType).toBe('text/markdown');
    });

    it('should include best-practices resource', async () => {
      const handler = (server as any)._requestHandlers.get('resources/list');
      const result = await handler({
        method: 'resources/list',
        params: {},
      });

      const bestPractices = result.resources.find(
        (r: any) => r.uri === 'claude-code-buddy://best-practices'
      );

      expect(bestPractices).toBeDefined();
      expect(bestPractices.name).toBe('Best Practices Guide');
      expect(bestPractices.mimeType).toBe('text/markdown');
    });
  });

  describe('Resource Read', () => {
    it('should read usage-guide content successfully', async () => {
      const handler = (server as any)._requestHandlers.get('resources/read');
      expect(handler).toBeDefined();

      const result = await handler({
        method: 'resources/read',
        params: { uri: 'claude-code-buddy://usage-guide' },
      });

      expect(result).toHaveProperty('contents');
      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].uri).toBe('claude-code-buddy://usage-guide');
      expect(result.contents[0].mimeType).toBe('text/markdown');
      expect(result.contents[0].text).toContain('MeMesh Complete Usage Guide');
    });

    it('should read best-practices content successfully', async () => {
      const handler = (server as any)._requestHandlers.get('resources/read');

      const result = await handler({
        method: 'resources/read',
        params: { uri: 'claude-code-buddy://best-practices' },
      });

      expect(result.contents[0].text).toContain('MeMesh Best Practices');
      expect(result.contents[0].text).toContain('✅');
    });

    it('should throw error for unknown resource URI', async () => {
      const handler = (server as any)._requestHandlers.get('resources/read');

      await expect(
        handler({
          method: 'resources/read',
          params: { uri: 'claude-code-buddy://unknown' },
        })
      ).rejects.toThrow();
    });
  });

  describe('Resource Content Validation', () => {
    it('usage-guide should contain buddy-do documentation', async () => {
      const handler = (server as any)._requestHandlers.get('resources/read');
      const result = await handler({
        method: 'resources/read',
        params: { uri: 'claude-code-buddy://usage-guide' },
      });

      const content = result.contents[0].text;
      expect(content).toContain('buddy-do');
      expect(content).toContain('buddy-remember');
      // Note: generate-smart-plan tool was removed - planning delegated to Claude's built-in capabilities
    });

    it('best-practices should contain actionable tips', async () => {
      const handler = (server as any)._requestHandlers.get('resources/read');
      const result = await handler({
        method: 'resources/read',
        params: { uri: 'claude-code-buddy://best-practices' },
      });

      const content = result.contents[0].text;
      expect(content).toContain('Precise Requests');
      expect(content).toContain('Project Memory');
    });
  });
});
