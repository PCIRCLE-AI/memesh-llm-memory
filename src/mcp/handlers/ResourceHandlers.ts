/**
 * Resource Handlers Module
 *
 * Handles MCP resource operations (list resources, read resources).
 * Extracted from server.ts for better modularity.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { NotFoundError, OperationError } from '../../errors/index.js';

/**
 * Setup MCP Resource handlers
 *
 * Registers handlers for listing and reading MCP resources.
 * Resources include usage guides, quick references, examples, and best practices.
 */
export function setupResourceHandlers(server: Server): void {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const resourcesDir = path.join(__dirname, '..', 'resources');

  // List available resources
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      {
        uri: 'claude-code-buddy://usage-guide',
        name: 'Claude Code Buddy Complete Usage Guide',
        mimeType: 'text/markdown',
        description: 'Comprehensive guide to all 13 specialized agents with examples and best practices',
      },
      {
        uri: 'claude-code-buddy://quick-reference',
        name: 'Agents Quick Reference',
        mimeType: 'text/markdown',
        description: 'Quick lookup table for all agents, keywords, and common workflows',
      },
      {
        uri: 'claude-code-buddy://examples',
        name: 'Real-world Examples',
        mimeType: 'text/markdown',
        description: 'Complete project workflows and single-task examples demonstrating agent usage',
      },
      {
        uri: 'claude-code-buddy://best-practices',
        name: 'Best Practices Guide',
        mimeType: 'text/markdown',
        description: 'Tips, guidelines, and best practices for effective agent utilization',
      },
    ],
  }));

  // Read resource content
  server.setRequestHandler(ReadResourceRequestSchema, async request => {
    const uri = request.params.uri;

    // Map URIs to file names
    const resourceFiles: Record<string, string> = {
      'claude-code-buddy://usage-guide': 'usage-guide.md',
      'claude-code-buddy://quick-reference': 'quick-reference.md',
      'claude-code-buddy://examples': 'examples.md',
      'claude-code-buddy://best-practices': 'best-practices.md',
    };

    const fileName = resourceFiles[uri];
    if (!fileName) {
      throw new NotFoundError(
        `Unknown resource: ${uri}`,
        'resource',
        uri,
        { availableResources: Object.keys(resourceFiles) }
      );
    }

    const filePath = path.join(resourcesDir, fileName);

    try {
      const content = await fs.readFile(filePath, 'utf-8');

      return {
        contents: [
          {
            uri,
            mimeType: 'text/markdown',
            text: content,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new OperationError(
        `Failed to read resource ${uri}: ${errorMessage}`,
        {
          operation: 'readResource',
          uri,
          filePath,
          originalError: errorMessage,
        }
      );
    }
  });
}
