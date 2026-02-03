import { ListResourcesRequestSchema, ReadResourceRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { NotFoundError, OperationError } from '../../errors/index.js';
import { handleError, logError } from '../../utils/errorHandler.js';
import { ResourceRegistry } from '../resources/ResourceRegistry.js';
import { AgentStatusHandler } from '../resources/handlers/AgentStatusHandler.js';
import { TaskLogsHandler } from '../resources/handlers/TaskLogsHandler.js';
export function setupResourceHandlers(server) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const resourcesDir = path.join(__dirname, '..', 'resources');
    const resourceRegistry = new ResourceRegistry();
    const agentStatusHandler = new AgentStatusHandler();
    const taskLogsHandler = new TaskLogsHandler();
    resourceRegistry.register('ccb://agent/{agentType}/status', agentStatusHandler.handle.bind(agentStatusHandler));
    resourceRegistry.register('ccb://task/{taskId}/logs', taskLogsHandler.handle.bind(taskLogsHandler));
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
    server.setRequestHandler(ListResourcesRequestSchema, async () => {
        const staticResources = [
            {
                uri: 'claude-code-buddy://usage-guide',
                name: 'MeMesh Complete Usage Guide',
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
    server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
        const uri = request.params.uri;
        try {
            const dynamicResource = await resourceRegistry.handle(uri);
            if (dynamicResource) {
                return {
                    contents: [
                        {
                            ...dynamicResource,
                            type: 'text',
                        },
                    ],
                };
            }
        }
        catch (error) {
            if (error instanceof Error && !error.message.includes('No handler found for URI')) {
                logError(error, {
                    component: 'ResourceHandlers',
                    method: 'readResource',
                    operation: 'reading dynamic resource',
                    data: { uri },
                });
            }
        }
        const resourceFiles = {
            'claude-code-buddy://usage-guide': 'usage-guide.md',
            'claude-code-buddy://quick-reference': 'quick-reference.md',
            'claude-code-buddy://examples': 'examples.md',
            'claude-code-buddy://best-practices': 'best-practices.md',
        };
        const fileName = resourceFiles[uri];
        if (!fileName) {
            throw new NotFoundError(`Unknown resource: ${uri}`, 'resource', uri, { availableResources: Object.keys(resourceFiles) });
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
                        type: 'text',
                    },
                ],
            };
        }
        catch (error) {
            logError(error, {
                component: 'ResourceHandlers',
                method: 'readResource',
                operation: 'reading resource file',
                data: { uri, filePath },
            });
            const handledError = handleError(error, {
                component: 'ResourceHandlers',
                method: 'readResource',
            });
            throw new OperationError(`Failed to read resource ${uri}: ${handledError.message}`, {
                operation: 'readResource',
                uri,
                filePath,
                originalError: handledError.message,
                stack: handledError.stack,
            });
        }
    });
}
//# sourceMappingURL=ResourceHandlers.js.map