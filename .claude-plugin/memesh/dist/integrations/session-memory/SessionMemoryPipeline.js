import os from 'os';
import path from 'path';
import { logger } from '../../utils/logger.js';
import { SessionMemoryWatcher } from './SessionMemoryWatcher.js';
import { SessionMemoryParser } from './SessionMemoryParser.js';
import { SessionMemoryIngester } from './SessionMemoryIngester.js';
import { SessionContextInjector } from './SessionContextInjector.js';
export class SessionMemoryPipeline {
    watcher;
    parser;
    ingester;
    injector;
    running = false;
    constructor(knowledgeGraph, config) {
        const projectsDir = config?.projectsDir ?? path.join(os.homedir(), '.claude', 'projects');
        this.parser = new SessionMemoryParser();
        this.ingester = new SessionMemoryIngester(knowledgeGraph);
        this.injector = new SessionContextInjector(knowledgeGraph);
        this.watcher = new SessionMemoryWatcher({
            projectsDir,
            debounceMs: config?.debounceMs,
            onMemoryUpdate: async (event) => this.handleMemoryUpdate(event),
        });
    }
    async start() {
        if (this.running)
            return;
        await this.watcher.start();
        this.running = true;
    }
    async stop() {
        if (!this.running)
            return;
        await this.watcher.stop();
        this.running = false;
    }
    generateContext(ctx) {
        return this.injector.generateContext(ctx);
    }
    get isRunning() {
        return this.running;
    }
    async handleMemoryUpdate(event) {
        try {
            const parsed = this.parser.parse(event.content);
            await this.ingester.ingest(parsed, event);
            logger.info('SessionMemoryPipeline: ingested session memory', {
                sessionId: event.sessionId,
                changeType: event.changeType,
            });
        }
        catch (error) {
            logger.error('SessionMemoryPipeline: failed to process memory update', {
                sessionId: event.sessionId,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
}
//# sourceMappingURL=SessionMemoryPipeline.js.map