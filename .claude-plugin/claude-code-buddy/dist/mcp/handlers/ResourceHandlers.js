import { ListResourcesRequestSchema, ReadResourceRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { NotFoundError, OperationError } from '../../errors/index.js';
import { handleError, logError } from '../../utils/errorHandler.js';
export function setupResourceHandlers(server) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const resourcesDir = path.join(__dirname, '..', 'resources');
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
    server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
        const uri = request.params.uri;
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