import { spawn } from 'child_process';
import path from 'path';
import { NotFoundError, OperationError, ValidationError } from '../errors/index.js';
export class MCPToolInterface {
    tools = new Map();
    toolDispatcher;
    commandPolicy;
    commandRunner;
    memoryProvider;
    activeProcesses = new Set();
    constructor(options = {}) {
        this.toolDispatcher = options.toolDispatcher;
        this.commandPolicy = options.commandPolicy || createDefaultCommandPolicy();
        this.commandRunner = options.commandRunner || createDefaultCommandRunner(this.activeProcesses);
        this.memoryProvider = options.memoryProvider;
    }
    dispose() {
        for (const child of this.activeProcesses) {
            try {
                child.kill('SIGTERM');
                setTimeout(() => {
                    try {
                        child.kill('SIGKILL');
                    }
                    catch {
                    }
                }, 1000);
            }
            catch {
            }
        }
        this.activeProcesses.clear();
    }
    attachToolDispatcher(dispatcher) {
        this.toolDispatcher = dispatcher;
    }
    attachMemoryProvider(provider) {
        this.memoryProvider = provider;
    }
    supportsMemory() {
        return Boolean(this.memoryProvider) || this.isToolRegistered('memory');
    }
    setCommandPolicy(policy) {
        this.commandPolicy = policy;
    }
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
            if (this.memoryProvider) {
                await this.memoryProvider.createEntities(opts);
                return;
            }
            await this.invokeTool('memory', 'createEntities', opts);
        },
        searchNodes: async (query) => {
            if (this.memoryProvider) {
                return await this.memoryProvider.searchNodes(query);
            }
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
        const { command, timeout, confirmed } = opts;
        if (!command || !command.trim()) {
            throw new ValidationError('Command is required', {
                component: 'MCPToolInterface',
                method: 'bash',
                providedValue: command,
            });
        }
        let decision;
        try {
            decision = this.commandPolicy.evaluate(command);
        }
        catch (error) {
            throw new OperationError(`Command policy evaluation failed: ${error instanceof Error ? error.message : String(error)}`, { command });
        }
        if (!decision.allowed) {
            throw new OperationError(decision.reason ? `Command blocked: ${decision.reason}` : 'Command blocked by policy', { command });
        }
        if (decision.requiresConfirmation && !confirmed) {
            throw new OperationError('Command requires confirmation. Re-run with confirmed: true.', { command });
        }
        const result = await this.commandRunner.run(command, timeout);
        if (result.exitCode !== 0) {
            throw new OperationError(`Command failed with exit code ${result.exitCode}`, { command, stdout: result.stdout, stderr: result.stderr });
        }
        return result;
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
        throw new OperationError('External MCP tool invocation is not configured. Attach a ToolDispatcher for in-process tools.', {
            toolName,
            method,
            params,
        });
    }
    async invokeToolByName(toolName, args) {
        if (!this.toolDispatcher) {
            throw new OperationError('Tool dispatcher is not attached', {
                toolName,
                args,
            });
        }
        const result = await this.toolDispatcher.routeToolCall({
            name: toolName,
            arguments: args,
        });
        return {
            success: !result.isError,
            data: result,
            error: result.isError ? 'Tool execution failed' : undefined,
        };
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
const DEFAULT_ALLOWED_BINARIES = new Set([
    'rg',
    'ls',
    'pwd',
    'cat',
    'stat',
    'head',
    'tail',
    'node',
    'npm',
    'pnpm',
    'yarn',
    'bun',
    'python',
    'python3',
    'pip',
    'pip3',
    'pytest',
    'vitest',
    'jest',
    'mocha',
    'tsc',
    'eslint',
    'prettier',
    'go',
    'cargo',
    'make',
]);
const DEFAULT_CONFIRM_BINARIES = new Set([
    'node',
    'npm',
    'pnpm',
    'yarn',
    'bun',
    'python',
    'python3',
    'pip',
    'pip3',
    'go',
    'cargo',
    'make',
]);
function createDefaultCommandPolicy() {
    return {
        evaluate: (command) => {
            const tokens = parseCommandLine(command);
            if (tokens.length === 0) {
                return { allowed: false, requiresConfirmation: false, reason: 'Empty command' };
            }
            const [binary] = tokens;
            const normalizedBinary = path.basename(binary);
            if (!DEFAULT_ALLOWED_BINARIES.has(normalizedBinary)) {
                return {
                    allowed: false,
                    requiresConfirmation: false,
                    reason: `Command not allowed by default: ${normalizedBinary}`,
                };
            }
            return {
                allowed: true,
                requiresConfirmation: DEFAULT_CONFIRM_BINARIES.has(normalizedBinary),
            };
        },
    };
}
function createDefaultCommandRunner(activeProcesses) {
    return {
        run: async (command, timeoutMs) => {
            const tokens = parseCommandLine(command);
            if (tokens.length === 0) {
                return { exitCode: 1, stdout: '', stderr: 'No command provided' };
            }
            const [binary, ...args] = tokens;
            const child = spawn(binary, args, { stdio: ['ignore', 'pipe', 'pipe'] });
            if (activeProcesses) {
                activeProcesses.add(child);
            }
            let stdout = '';
            let stderr = '';
            let settled = false;
            let killTimeoutId;
            return await new Promise((resolve) => {
                const cleanup = () => {
                    if (activeProcesses) {
                        activeProcesses.delete(child);
                    }
                    if (killTimeoutId) {
                        clearTimeout(killTimeoutId);
                        killTimeoutId = undefined;
                    }
                    child.stdout.removeAllListeners();
                    child.stderr.removeAllListeners();
                    child.removeAllListeners();
                };
                const finish = (exitCode, extraStderr) => {
                    if (settled)
                        return;
                    settled = true;
                    if (timeoutId)
                        clearTimeout(timeoutId);
                    if (extraStderr) {
                        stderr += stderr ? `\n${extraStderr}` : extraStderr;
                    }
                    cleanup();
                    resolve({ exitCode, stdout, stderr });
                };
                const timeoutId = timeoutMs && timeoutMs > 0 ? setTimeout(() => {
                    try {
                        child.kill('SIGTERM');
                    }
                    catch {
                        finish(124, 'Command timed out');
                        return;
                    }
                    killTimeoutId = setTimeout(() => {
                        try {
                            child.kill('SIGKILL');
                        }
                        catch {
                        }
                    }, 2000);
                    finish(124, 'Command timed out');
                }, timeoutMs) : undefined;
                child.stdout.on('data', (chunk) => {
                    stdout += chunk.toString();
                });
                child.stderr.on('data', (chunk) => {
                    stderr += chunk.toString();
                });
                child.on('error', (error) => {
                    finish(1, error.message);
                });
                child.on('close', (code) => {
                    finish(code ?? 1);
                });
            });
        },
    };
}
function parseCommandLine(command) {
    const tokens = [];
    let current = '';
    let quote = null;
    let escape = false;
    for (let i = 0; i < command.length; i += 1) {
        const char = command[i];
        if (escape) {
            current += char;
            escape = false;
            continue;
        }
        if (char === '\\\\' && quote !== '\'') {
            escape = true;
            continue;
        }
        if ((char === '\"' || char === '\'') && !quote) {
            quote = char;
            continue;
        }
        if (quote && char === quote) {
            quote = null;
            continue;
        }
        if (!quote && /\\s/.test(char)) {
            if (current) {
                tokens.push(current);
                current = '';
            }
            continue;
        }
        current += char;
    }
    if (escape) {
        current += '\\\\';
    }
    if (quote) {
        throw new Error('Unterminated quote in command');
    }
    if (current) {
        tokens.push(current);
    }
    return tokens;
}
//# sourceMappingURL=MCPToolInterface.js.map