/**
 * SessionMemoryPipeline
 *
 * Orchestrator that wires together the four session memory modules into a
 * cohesive processing pipeline:
 *
 *   SessionMemoryWatcher  -- watches for file changes
 *   SessionMemoryParser   -- parses markdown into structured data
 *   SessionMemoryIngester -- converts parsed data into KnowledgeGraph entities
 *   SessionContextInjector -- queries KG to produce context for new sessions
 *
 * Lifecycle:
 *   1. construct(knowledgeGraph, config?)  -- wires up sub-modules
 *   2. start()                             -- begins watching for file changes
 *   3. (file change detected)              -- parse -> ingest (automatic)
 *   4. generateContext(ctx?)               -- query KG for session context
 *   5. stop()                              -- tears down the watcher
 *
 * Error handling:
 *   Parse/ingest errors are caught and logged but never propagate upward.
 *   The watcher continues running even if individual events fail to process.
 */

import os from 'os';
import path from 'path';
import { logger } from '../../utils/logger.js';
import type { KnowledgeGraph } from '../../knowledge-graph/index.js';
import type { SessionMemoryEvent } from './types.js';
import { SessionMemoryWatcher } from './SessionMemoryWatcher.js';
import { SessionMemoryParser } from './SessionMemoryParser.js';
import { SessionMemoryIngester } from './SessionMemoryIngester.js';
import { SessionContextInjector, type InjectionContext } from './SessionContextInjector.js';

// ─── Configuration ───────────────────────────────────────────────────

export interface PipelineConfig {
  /** Directory containing Claude Code project session data (default: ~/.claude/projects) */
  projectsDir?: string;
  /** Debounce delay in ms passed to the watcher (default: watcher's own default) */
  debounceMs?: number;
}

// ─── Pipeline Class ──────────────────────────────────────────────────

export class SessionMemoryPipeline {
  private watcher: SessionMemoryWatcher;
  private parser: SessionMemoryParser;
  private ingester: SessionMemoryIngester;
  private injector: SessionContextInjector;
  private running = false;

  constructor(knowledgeGraph: KnowledgeGraph, config?: PipelineConfig) {
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

  /**
   * Start the pipeline. Begins watching for session memory file changes.
   * Idempotent: calling start() when already running is a no-op.
   */
  async start(): Promise<void> {
    if (this.running) return;
    await this.watcher.start();
    this.running = true;
  }

  /**
   * Stop the pipeline. Tears down the watcher and releases resources.
   * Idempotent: calling stop() when not running is a no-op.
   */
  async stop(): Promise<void> {
    if (!this.running) return;
    await this.watcher.stop();
    this.running = false;
  }

  /**
   * Generate context for injection into a new session.
   * Delegates to SessionContextInjector.generateContext().
   */
  generateContext(ctx?: InjectionContext): string {
    return this.injector.generateContext(ctx);
  }

  /**
   * Whether the pipeline is currently running (watcher active).
   */
  get isRunning(): boolean {
    return this.running;
  }

  /**
   * Internal callback invoked by the watcher when a session memory file
   * is created or updated. Runs the parse -> ingest pipeline.
   *
   * Errors are caught and logged but never propagate. This ensures the
   * watcher continues to run even if processing a single event fails.
   */
  private async handleMemoryUpdate(event: SessionMemoryEvent): Promise<void> {
    try {
      const parsed = this.parser.parse(event.content);
      await this.ingester.ingest(parsed, event);
      logger.info('SessionMemoryPipeline: ingested session memory', {
        sessionId: event.sessionId,
        changeType: event.changeType,
      });
    } catch (error) {
      logger.error('SessionMemoryPipeline: failed to process memory update', {
        sessionId: event.sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
