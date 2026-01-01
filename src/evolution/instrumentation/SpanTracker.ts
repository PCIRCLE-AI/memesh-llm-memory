/**
 * SpanTracker - Core tracking logic for Evolution System
 *
 * Manages the creation and lifecycle of spans, following OpenTelemetry patterns.
 */

import { v4 as uuid } from 'uuid';
import type { EvolutionStore } from '../storage/EvolutionStore.js';
import type {
  Span,
  SpanKind,
  SpanStatus,
  SpanAttributes,
  ResourceAttributes,
  SpanLink,
  SpanEvent,
  Task,
  Execution,
} from '../storage/types.js';
import { StateError } from '../../errors/index.js';

export interface SpanContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
}

export interface StartSpanOptions {
  name: string;
  kind?: SpanKind;
  attributes?: SpanAttributes;
  tags?: string[];
  links?: SpanLink[];
  parentSpan?: ActiveSpan;
}

export class ActiveSpan {
  private span: Partial<Span>;
  private startTime: number;
  private events: SpanEvent[] = [];

  constructor(
    private tracker: SpanTracker,
    options: StartSpanOptions,
    private context: SpanContext,
    private resource: ResourceAttributes
  ) {
    this.startTime = Date.now();

    this.span = {
      span_id: context.spanId,
      trace_id: context.traceId,
      parent_span_id: context.parentSpanId,
      task_id: resource['task.id'],
      execution_id: resource['execution.id'],
      name: options.name,
      kind: options.kind || 'internal',
      start_time: this.startTime,
      status: { code: 'UNSET' },
      attributes: options.attributes || {},
      resource,
      tags: options.tags,
      links: options.links,
    };
  }

  /**
   * Set span status
   */
  setStatus(status: SpanStatus): void {
    this.span.status = status;
  }

  /**
   * Set attributes (merge with existing)
   */
  setAttributes(attributes: SpanAttributes): void {
    this.span.attributes = {
      ...this.span.attributes,
      ...attributes,
    };
  }

  /**
   * Set a single attribute
   */
  setAttribute(key: string, value: unknown): void {
    if (!this.span.attributes) {
      this.span.attributes = {};
    }
    this.span.attributes[key] = value;
  }

  /**
   * Add tags
   */
  addTags(tags: string[]): void {
    if (!this.span.tags) {
      this.span.tags = [];
    }
    this.span.tags.push(...tags);
  }

  /**
   * Add event
   */
  addEvent(name: string, attributes?: Record<string, any>): void {
    this.events.push({
      name,
      timestamp: Date.now(),
      attributes,
    });
  }

  /**
   * Add link to another span
   */
  addLink(link: SpanLink): void {
    if (!this.span.links) {
      this.span.links = [];
    }
    this.span.links.push(link);
  }

  /**
   * End the span and record it
   */
  async end(): Promise<void> {
    const endTime = Date.now();
    const duration = endTime - this.startTime;

    const completedSpan: Span = {
      ...this.span,
      end_time: endTime,
      duration_ms: duration,
      events: this.events.length > 0 ? this.events : undefined,
    } as Span;

    // Record span
    await this.tracker.recordSpan(completedSpan);

    // Remove from active spans
    this.tracker.removeActiveSpan(this.span.span_id!);
  }

  /**
   * Get span context (for creating child spans)
   */
  getContext(): SpanContext {
    return this.context;
  }

  /**
   * Get span ID
   */
  get spanId(): string {
    return this.context.spanId;
  }

  /**
   * Get trace ID
   */
  get traceId(): string {
    return this.context.traceId;
  }
}

export interface SpanTrackerOptions {
  store: EvolutionStore;
  serviceName?: string;
  serviceVersion?: string;
  environment?: 'dev' | 'staging' | 'production';
}

export class SpanTracker {
  private store: EvolutionStore;
  private currentTask?: Task;
  private currentExecution?: Execution;
  private activeSpans: Map<string, ActiveSpan> = new Map();
  private resource: ResourceAttributes;

  constructor(options: SpanTrackerOptions) {
    this.store = options.store;

    // Default resource attributes
    this.resource = {
      'service.name': options.serviceName || 'claude-code-buddy',
      'service.version': options.serviceVersion || '1.0.0',
      'deployment.environment': options.environment || 'dev',
    } as ResourceAttributes;
  }

  /**
   * Start a new task (creates task and execution)
   */
  async startTask(input: Record<string, any>, metadata?: Record<string, any>): Promise<Task> {
    this.currentTask = await this.store.createTask(input, metadata);

    // Update resource with task ID
    this.resource['task.id'] = this.currentTask.id;

    // Mark task as running
    await this.store.updateTask(this.currentTask.id, {
      status: 'running',
      started_at: new Date(),
    });

    return this.currentTask;
  }

  /**
   * Start a new execution for the current task
   */
  async startExecution(metadata?: Record<string, any>): Promise<Execution> {
    if (!this.currentTask) {
      throw new StateError(
        'No active task. Call startTask() first.',
        {
          state: 'not_initialized',
          component: 'SpanTracker',
          method: 'startExecution',
          requiredState: 'active task',
          currentState: 'no task',
          action: 'call startTask() before startExecution()',
        }
      );
    }

    this.currentExecution = await this.store.createExecution(
      this.currentTask.id,
      metadata
    );

    // Update resource with execution ID
    this.resource['execution.id'] = this.currentExecution.id;
    this.resource['execution.attempt'] = this.currentExecution.attempt_number;

    return this.currentExecution;
  }

  /**
   * End the current execution
   */
  async endExecution(result?: Record<string, any>, error?: string): Promise<void> {
    if (!this.currentExecution) {
      throw new StateError(
        'No active execution.',
        {
          state: 'invalid_state',
          component: 'SpanTracker',
          method: 'endExecution',
          requiredState: 'active execution',
          currentState: 'no execution',
          action: 'call startExecution() before endExecution()',
        }
      );
    }

    await this.store.updateExecution(this.currentExecution.id, {
      status: error ? 'failed' : 'completed',
      completed_at: new Date(),
      result,
      error,
    });

    // Clear reference to prevent memory leak
    this.currentExecution = undefined;
  }

  /**
   * End the current task
   */
  async endTask(status: 'completed' | 'failed'): Promise<void> {
    if (!this.currentTask) {
      throw new StateError(
        'No active task.',
        {
          state: 'invalid_state',
          component: 'SpanTracker',
          method: 'endTask',
          requiredState: 'active task',
          currentState: 'no task',
          action: 'call startTask() before endTask()',
        }
      );
    }

    // End all active spans (cleanup orphaned spans)
    await this.endAllSpans();

    await this.store.updateTask(this.currentTask.id, {
      status,
      completed_at: new Date(),
    });

    // Clear references to prevent memory leak
    this.currentTask = undefined;
    this.currentExecution = undefined;
  }

  /**
   * Get current task
   */
  getCurrentTask(): Task | undefined {
    return this.currentTask;
  }

  /**
   * Get current execution
   */
  getCurrentExecution(): Execution | undefined {
    return this.currentExecution;
  }

  /**
   * Start a new span
   */
  startSpan(options: StartSpanOptions): ActiveSpan {
    // Generate IDs
    const spanId = uuid();
    const traceId = options.parentSpan
      ? options.parentSpan.traceId
      : uuid();
    const parentSpanId = options.parentSpan?.spanId;

    const context: SpanContext = {
      traceId,
      spanId,
      parentSpanId,
    };

    // Create active span
    const activeSpan = new ActiveSpan(
      this,
      options,
      context,
      this.resource
    );

    // Track active span
    this.activeSpans.set(spanId, activeSpan);

    return activeSpan;
  }

  /**
   * Record a completed span
   */
  async recordSpan(span: Span): Promise<void> {
    await this.store.recordSpan(span);
  }

  /**
   * Remove active span (called by ActiveSpan.end())
   */
  removeActiveSpan(spanId: string): void {
    this.activeSpans.delete(spanId);
  }

  /**
   * Get all active spans
   */
  getActiveSpans(): ActiveSpan[] {
    return Array.from(this.activeSpans.values());
  }

  /**
   * End all active spans (cleanup)
   */
  async endAllSpans(): Promise<void> {
    const spans = Array.from(this.activeSpans.values());
    for (const span of spans) {
      await span.end();
    }
  }

  /**
   * Set global resource attributes
   */
  setResource(attributes: Partial<ResourceAttributes>): void {
    this.resource = {
      ...this.resource,
      ...attributes,
    };
  }

  /**
   * Clean up all state (for testing or resetting tracker)
   * - Ends all active spans
   * - Clears task and execution references
   * - Prevents memory leaks in long-running processes
   */
  async cleanup(): Promise<void> {
    // End all active spans
    await this.endAllSpans();

    // Clear all references
    this.currentTask = undefined;
    this.currentExecution = undefined;
  }
}

// ============================================================================
// Global Tracker Instance
// ============================================================================

let globalTracker: SpanTracker | null = null;

export function setGlobalTracker(tracker: SpanTracker): void {
  globalTracker = tracker;
}

export function getGlobalTracker(): SpanTracker {
  if (!globalTracker) {
    throw new StateError(
      'Global tracker not initialized. Call setGlobalTracker() first.',
      {
        state: 'not_initialized',
        component: 'SpanTracker',
        method: 'getGlobalTracker',
        requiredState: 'initialized global tracker',
        currentState: 'uninitialized',
        action: 'call setGlobalTracker() before getGlobalTracker()',
      }
    );
  }
  return globalTracker;
}
