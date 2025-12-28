/**
 * Evolution Dashboard MCP Tool Test
 *
 * Tests for evolution_dashboard tool integration in MCP server
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SmartAgentsMCPServer } from '../../src/mcp/server.js';

describe('evolution_dashboard MCP Tool', () => {
  let server: SmartAgentsMCPServer;

  beforeEach(() => {
    server = new SmartAgentsMCPServer();
  });

  describe('Tool Registration', () => {
    it('should register evolution_dashboard tool', async () => {
      // Access the server's tools list via reflection
      // Note: This test may need adjustment based on actual MCP SDK API
      const tools = await (server as any).server.request({
        method: 'tools/list',
      });

      const evolutionTool = tools.tools.find(
        (t: any) => t.name === 'evolution_dashboard'
      );

      expect(evolutionTool).toBeDefined();
      expect(evolutionTool.name).toBe('evolution_dashboard');
      expect(evolutionTool.description).toContain('evolution');
      expect(evolutionTool.description).toContain('dashboard');
    });

    it('should have correct input schema', async () => {
      const tools = await (server as any).server.request({
        method: 'tools/list',
      });

      const evolutionTool = tools.tools.find(
        (t: any) => t.name === 'evolution_dashboard'
      );

      expect(evolutionTool.inputSchema).toBeDefined();
      expect(evolutionTool.inputSchema.type).toBe('object');
      // evolution_dashboard should accept optional parameters
      expect(evolutionTool.inputSchema.properties).toBeDefined();
    });
  });

  describe('Tool Execution', () => {
    it('should return dashboard summary', async () => {
      const result = await (server as any).server.request({
        method: 'tools/call',
        params: {
          name: 'evolution_dashboard',
          arguments: {},
        },
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Evolution Dashboard');
    });

    it('should include key metrics', async () => {
      const result = await (server as any).server.request({
        method: 'tools/call',
        params: {
          name: 'evolution_dashboard',
          arguments: {},
        },
      });

      const output = result.content[0].text;

      expect(output).toContain('Total Agents');
      expect(output).toContain('22'); // Total agent count
      expect(output).toContain('Overview');
    });

    it('should support format parameter', async () => {
      const result = await (server as any).server.request({
        method: 'tools/call',
        params: {
          name: 'evolution_dashboard',
          arguments: {
            format: 'detailed',
          },
        },
      });

      expect(result).toBeDefined();
      expect(result.content[0].text).toContain('Evolution Dashboard');
    });
  });
});
