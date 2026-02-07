import chokidar from 'chokidar';
import { createHash } from 'crypto';
import { readFile } from 'fs/promises';
import { logger } from '../../utils/logger.js';
const DEFAULT_DEBOUNCE_MS = 2000;
export class SessionMemoryWatcher {
    watcher = null;
    processedHashes = new Map();
    debounceTimers = new Map();
    changeTypes = new Map();
    stopped = false;
    config;
    constructor(config) {
        this.config = {
            ...config,
            debounceMs: config.debounceMs ?? DEFAULT_DEBOUNCE_MS,
        };
    }
    async start() {
        if (this.watcher) {
            await this.stop();
        }
        this.stopped = false;
        const watchPattern = `${this.config.projectsDir}/**/session-memory/summary.md`;
        logger.info('SessionMemoryWatcher starting', {
            pattern: watchPattern,
            debounceMs: this.config.debounceMs,
        });
        this.watcher = chokidar.watch(watchPattern, {
            persistent: true,
            ignoreInitial: true,
            awaitWriteFinish: {
                stabilityThreshold: 1000,
                pollInterval: 200,
            },
        });
        this.watcher.on('add', (filePath) => {
            this.handleFileChange(filePath, 'created');
        });
        this.watcher.on('change', (filePath) => {
            this.handleFileChange(filePath, 'updated');
        });
        this.watcher.on('error', (error) => {
            const message = error instanceof Error ? error.message : String(error);
            logger.error('SessionMemoryWatcher chokidar error', {
                error: message,
            });
        });
    }
    async stop() {
        this.stopped = true;
        for (const timer of this.debounceTimers.values()) {
            clearTimeout(timer);
        }
        this.debounceTimers.clear();
        this.changeTypes.clear();
        this.processedHashes.clear();
        if (this.watcher) {
            await this.watcher.close();
            this.watcher = null;
        }
        logger.info('SessionMemoryWatcher stopped');
    }
    parseFilePath(filePath) {
        const normalizedProjectsDir = this.config.projectsDir.replace(/\/+$/, '');
        if (!filePath.startsWith(normalizedProjectsDir + '/')) {
            throw new Error(`File path does not start with projectsDir: ${filePath}`);
        }
        const remainder = filePath.slice(normalizedProjectsDir.length + 1);
        const segments = remainder.split('/');
        if (segments.length < 4 || segments[segments.length - 2] !== 'session-memory') {
            throw new Error(`Invalid session memory path structure: ${filePath}`);
        }
        const sanitizedPath = segments[0];
        const sessionMemoryIdx = segments.lastIndexOf('session-memory');
        const sessionId = segments[sessionMemoryIdx - 1];
        return { sessionId, sanitizedPath };
    }
    desanitizePath(sanitized) {
        const withoutLeading = sanitized.startsWith('-')
            ? sanitized.slice(1)
            : sanitized;
        return '/' + withoutLeading.replace(/-/g, '/');
    }
    handleFileChange(filePath, changeType) {
        if (!this.changeTypes.has(filePath)) {
            this.changeTypes.set(filePath, changeType);
        }
        const existingTimer = this.debounceTimers.get(filePath);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }
        const timer = setTimeout(() => {
            this.debounceTimers.delete(filePath);
            const resolvedChangeType = this.changeTypes.get(filePath) ?? 'updated';
            this.changeTypes.delete(filePath);
            void this.processFile(filePath, resolvedChangeType);
        }, this.config.debounceMs);
        this.debounceTimers.set(filePath, timer);
    }
    async processFile(filePath, changeType) {
        if (this.stopped)
            return;
        try {
            const content = await readFile(filePath, 'utf-8');
            const hash = createHash('sha256').update(content).digest('hex');
            const previousHash = this.processedHashes.get(filePath);
            if (previousHash === hash) {
                logger.debug('SessionMemoryWatcher: skipping unchanged file', {
                    filePath,
                });
                return;
            }
            this.processedHashes.set(filePath, hash);
            const { sessionId, sanitizedPath } = this.parseFilePath(filePath);
            const projectPath = this.desanitizePath(sanitizedPath);
            const event = {
                sessionId,
                projectPath,
                sanitizedPath,
                summaryPath: filePath,
                content,
                timestamp: new Date(),
                changeType,
            };
            await this.config.onMemoryUpdate(event);
            logger.info('SessionMemoryWatcher: processed session memory', {
                sessionId,
                changeType,
                filePath,
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logger.error('SessionMemoryWatcher: error processing file', {
                filePath,
                error: message,
            });
        }
    }
    get isWatching() {
        return this.watcher !== null && !this.watcher.closed;
    }
}
//# sourceMappingURL=SessionMemoryWatcher.js.map