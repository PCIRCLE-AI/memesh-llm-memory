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
import { handleError, logError } from '../../utils/errorHandler.js';
import { ResourceRegistry } from '../resources/ResourceRegistry.js';
import { AgentStatusHandler } from '../resources/handlers/AgentStatusHandler.js';
import { TaskLogsHandler } from '../resources/handlers/TaskLogsHandler.js';

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

  // Initialize ResourceRegistry for dynamic resources
  const resourceRegistry = new ResourceRegistry();

  // Create handler instances
  const agentStatusHandler = new AgentStatusHandler();
  const taskLogsHandler = new TaskLogsHandler();

  // Register handlers with URI templates
  resourceRegistry.register('ccb://agent/{agentType}/status', agentStatusHandler.handle.bind(agentStatusHandler));
  resourceRegistry.register('ccb://task/{taskId}/logs', taskLogsHandler.handle.bind(taskLogsHandler));

  // Register URI templates for resource listing
  resourceRegistry.registerTemplate({
    uriTemplate: 'ccb://agent/{agentType}/status',
    name: 'Agent Status',
    description: 'Real-time status of a specific agent (code-reviewer, test-writer, etc.)',
    mimeType: 'application/json',
  });

  resourceRegistry.registerTemplate({
    uriTemplate: 'ccb://task/{taskId}/logs',
    name: 'Task Execution Logs',
    description: 'Execution logs and output for a specific task',
    mimeType: 'text/plain',
  });

  // List available resources (static + dynamic templates)
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const staticResources = [
      {
        uri: 'claude-code-buddy://usage-guide',
        name: 'Claude Code Buddy Complete Usage Guide',
        mimeType: 'text/markdown',
        description: 'Comprehensive guide to core capabilities with examples and best practices',
      },
      {
        uri: 'claude-code-buddy://quick-reference',
        name: 'Capabilities Quick Reference',
        mimeType: 'text/markdown',
        description: 'Quick lookup table for capability keywords and common workflows',
      },
      {
        uri: 'claude-code-buddy://examples',
        name: 'Real-world Examples',
        mimeType: 'text/markdown',
        description: 'Complete project workflows and single-task examples demonstrating capability usage',
      },
      {
        uri: 'claude-code-buddy://best-practices',
        name: 'Best Practices Guide',
        mimeType: 'text/markdown',
        description: 'Tips, guidelines, and best practices for effective capability utilization',
      },
    ];

    const dynamicTemplates = resourceRegistry.getTemplates();

    return {
      resources: [...staticResources, ...dynamicTemplates],
    };
  });

  // Read resource content (dynamic + static)
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;

    // Try dynamic resources first
    try {
      const dynamicResource = await resourceRegistry.handle(uri);
      if (dynamicResource) {
        return {
          contents: [
            {
              ...dynamicResource,
              type: 'text' as const,
            },
          ],
        };
      }
    } catch (error) {
      // If it's not a dynamic resource, fall through to static resources
      // Only log if it's an actual error (not just "no matching template")
      if (error instanceof Error && !error.message.includes('No handler found for URI')) {
        logError(error, {
          component: 'ResourceHandlers',
          method: 'readResource',
          operation: 'reading dynamic resource',
          data: { uri },
        });
      }
    }

    // Fall back to static resources
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
            type: 'text' as const,
          },
        ],
      };
    } catch (error) {
      // Log error with full stack trace and context
      logError(error, {
        component: 'ResourceHandlers',
        method: 'readResource',
        operation: 'reading resource file',
        data: { uri, filePath },
      });

      // Get formatted error for exception
      const handledError = handleError(error, {
        component: 'ResourceHandlers',
        method: 'readResource',
      });

      throw new OperationError(
        `Failed to read resource ${uri}: ${handledError.message}`,
        {
          operation: 'readResource',
          uri,
          filePath,
          originalError: handledError.message,
          stack: handledError.stack,
        }
      );
    }
  });
}
