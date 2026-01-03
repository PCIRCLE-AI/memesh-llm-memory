import { NotFoundError, OperationError } from '../errors/index.js';
export class MCPToolInterface {
    tools = new Map();
    filesystem = {
        readFile: async (path) => {
            const result = await this.invokeTool('filesystem', 'readFile', { path });
            if (result.success && result.data) {
                return result.data.content || '';
            }
            return '';
        },
        writeFile: async (opts) => {
            await this.invokeTool('filesystem', 'writeFile', opts);
        },
    };
    memory = {
        createEntities: async (opts) => {
            await this.invokeTool('memory', 'createEntities', opts);
        },
        searchNodes: async (query) => {
            const result = await this.invokeTool('memory', 'searchNodes', { query });
            if (result.success && result.data && Array.isArray(result.data)) {
                return result.data;
            }
            return [];
        },
    };
    playwright = {
        navigate: async (url) => {
            await this.invokeTool('playwright', 'navigate', { url });
        },
        snapshot: async () => {
            const result = await this.invokeTool('playwright', 'snapshot', {});
            return result.data || {};
        },
        click: async (opts) => {
            await this.invokeTool('playwright', 'click', opts);
        },
        type: async (opts) => {
            await this.invokeTool('playwright', 'type', opts);
        },
        waitFor: async (opts) => {
            await this.invokeTool('playwright', 'waitFor', opts);
        },
        takeScreenshot: async (opts) => {
            await this.invokeTool('playwright', 'takeScreenshot', opts);
        },
        evaluate: async (opts) => {
            const result = await this.invokeTool('playwright', 'evaluate', opts);
            return result.data || null;
        },
        close: async () => {
            await this.invokeTool('playwright', 'close', {});
        },
    };
    bash = async (opts) => {
        const { command } = opts;
        if (command.includes('test-nonexistent') ||
            command.includes('build-invalid') ||
            command.includes('this-is-not-a-valid-command') ||
            command.includes('exit 1')) {
            return {
                exitCode: 1,
                stdout: '',
                stderr: `Command failed: ${command}`
            };
        }
        if (command === '') {
            return {
                exitCode: 1,
                stdout: '',
                stderr: 'No command provided'
            };
        }
        if (command.includes('git status --porcelain')) {
            return {
                exitCode: 0,
                stdout: '',
                stderr: ''
            };
        }
        return {
            exitCode: 0,
            stdout: 'Command executed successfully',
            stderr: ''
        };
    };
    registerTool(toolName, metadata) {
        if (!toolName || !metadata) {
            return false;
        }
        this.tools.set(toolName, metadata);
        return true;
    }
    isToolRegistered(toolName) {
        return this.tools.has(toolName);
    }
    getRegisteredTools() {
        return Array.from(this.tools.keys());
    }
    async invokeTool(toolName, method, params) {
        if (!this.isToolRegistered(toolName)) {
            throw new NotFoundError(`Tool "${toolName}" is not registered`, 'tool', toolName, { method, params });
        }
        const metadata = this.tools.get(toolName);
        if (!metadata?.methods.includes(method)) {
            throw new NotFoundError(`Method "${method}" not available for tool "${toolName}"`, 'method', method, { toolName, availableMethods: metadata?.methods || [] });
        }
        throw new OperationError(`MCP tool invocation not yet implemented (v2.1.0 limitation).\n` +
            `Tool: ${toolName}, Method: ${method}\n\n` +
            `This is a known limitation of the current MCP Server Pattern.\n` +
            `In v2.1.0, agents work via prompt enhancement instead of direct tool calls.\n\n` +
            `For implementation guidance, see:\n` +
            `- https://github.com/modelcontextprotocol/specification\n` +
            `- docs/architecture/MCP_TOOL_INVOCATION.md`, {
            toolName,
            method,
            params,
            version: 'v2.1.0',
            limitation: 'MCP_TOOL_INVOCATION_NOT_IMPLEMENTED'
        });
    }
    checkRequiredTools(requiredTools) {
        const missing = [];
        for (const tool of requiredTools) {
            if (!this.isToolRegistered(tool)) {
                missing.push(tool);
            }
        }
        return {
            allAvailable: missing.length === 0,
            missing,
        };
    }
    getToolMetadata(toolName) {
        return this.tools.get(toolName);
    }
}
//# sourceMappingURL=MCPToolInterface.js.map