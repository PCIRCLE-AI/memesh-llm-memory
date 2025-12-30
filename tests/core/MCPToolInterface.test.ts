import { describe, it, expect, beforeEach } from 'vitest';
import { MCPToolInterface } from '../../src/core/MCPToolInterface.js';

describe('MCPToolInterface', () => {
  let toolInterface: MCPToolInterface;

  beforeEach(() => {
    toolInterface = new MCPToolInterface();
  });

  describe('Tool Registration', () => {
    it('should register an MCP tool', () => {
      const result = toolInterface.registerTool('filesystem', {
        description: 'File system operations',
        methods: ['read', 'write', 'delete'],
      });

      expect(result).toBe(true);
      expect(toolInterface.isToolRegistered('filesystem')).toBe(true);
    });

    it('should check if a tool is registered', () => {
      expect(toolInterface.isToolRegistered('nonexistent')).toBe(false);

      toolInterface.registerTool('memory', {
        description: 'Memory operations',
        methods: ['store', 'retrieve'],
      });

      expect(toolInterface.isToolRegistered('memory')).toBe(true);
    });

    it('should get list of all registered tools', () => {
      toolInterface.registerTool('filesystem', {
        description: 'File system operations',
        methods: ['read', 'write'],
      });
      toolInterface.registerTool('memory', {
        description: 'Memory operations',
        methods: ['store', 'retrieve'],
      });

      const tools = toolInterface.getRegisteredTools();

      expect(tools).toHaveLength(2);
      expect(tools).toContain('filesystem');
      expect(tools).toContain('memory');
    });
  });

  describe('Tool Invocation', () => {
    beforeEach(() => {
      toolInterface.registerTool('filesystem', {
        description: 'File system operations',
        methods: ['read', 'write'],
      });
    });

    it('should throw error for tool invocation (v2.1.0 limitation)', async () => {
      // v2.1.0 limitation: MCP tool invocation not yet implemented
      // Agents work via prompt enhancement instead of direct tool calls
      await expect(
        toolInterface.invokeTool('filesystem', 'read', {
          path: '/test/file.txt',
        })
      ).rejects.toThrow('MCP tool invocation not yet implemented (v2.1.0 limitation)');
    });

    it('should throw error when invoking unregistered tool', async () => {
      await expect(
        toolInterface.invokeTool('unregistered', 'someMethod', {})
      ).rejects.toThrow('Tool "unregistered" is not registered');
    });

    it('should validate tool method exists', async () => {
      await expect(
        toolInterface.invokeTool('filesystem', 'invalidMethod', {})
      ).rejects.toThrow('Method "invalidMethod" not available for tool "filesystem"');
    });
  });

  describe('Tool Dependencies', () => {
    it('should check if required tools are available', () => {
      toolInterface.registerTool('filesystem', {
        description: 'File system operations',
        methods: ['read', 'write'],
      });
      toolInterface.registerTool('memory', {
        description: 'Memory operations',
        methods: ['store', 'retrieve'],
      });

      const required = ['filesystem', 'memory'];
      const result = toolInterface.checkRequiredTools(required);

      expect(result.allAvailable).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('should identify missing required tools', () => {
      toolInterface.registerTool('filesystem', {
        description: 'File system operations',
        methods: ['read', 'write'],
      });

      const required = ['filesystem', 'memory', 'bash'];
      const result = toolInterface.checkRequiredTools(required);

      expect(result.allAvailable).toBe(false);
      expect(result.missing).toHaveLength(2);
      expect(result.missing).toContain('memory');
      expect(result.missing).toContain('bash');
    });
  });

  describe('Tool Metadata', () => {
    it('should get tool metadata', () => {
      const metadata = {
        description: 'File system operations',
        methods: ['read', 'write', 'delete'],
      };

      toolInterface.registerTool('filesystem', metadata);

      const result = toolInterface.getToolMetadata('filesystem');

      expect(result).toBeDefined();
      expect(result?.description).toBe('File system operations');
      expect(result?.methods).toHaveLength(3);
      expect(result?.methods).toContain('read');
    });

    it('should return undefined for unregistered tool', () => {
      const result = toolInterface.getToolMetadata('nonexistent');

      expect(result).toBeUndefined();
    });
  });
});
