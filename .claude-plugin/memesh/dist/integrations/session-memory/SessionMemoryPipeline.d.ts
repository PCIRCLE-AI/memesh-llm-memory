import type { KnowledgeGraph } from '../../knowledge-graph/index.js';
import { type InjectionContext } from './SessionContextInjector.js';
export interface PipelineConfig {
    projectsDir?: string;
    debounceMs?: number;
}
export declare class SessionMemoryPipeline {
    private watcher;
    private parser;
    private ingester;
    private injector;
    private running;
    constructor(knowledgeGraph: KnowledgeGraph, config?: PipelineConfig);
    start(): Promise<void>;
    stop(): Promise<void>;
    generateContext(ctx?: InjectionContext): string;
    get isRunning(): boolean;
    private handleMemoryUpdate;
}
//# sourceMappingURL=SessionMemoryPipeline.d.ts.map