/**
 * withEvolutionTracking - Proxy-based automatic tracking
 *
 * Wraps any agent/function with automatic evolution tracking.
 * ZERO code changes required in the agent implementation.
 *
 * Inspired by Agent Lightning's LLMProxy pattern.
 */

import { SpanTracker, getGlobalTracker, ActiveSpan } from './SpanTracker';
import type { SpanAttributes } from '../storage/types';
import type { TelemetryCollector } from '../../telemetry/TelemetryCollector';
import { hashStackTrace } from '../../telemetry/sanitization';

export interface TrackingOptions {
  /**
   * Custom span tracker (defaults to global)
   */
  tracker?: SpanTracker;

  /**
   * Automatic tags to add to all spans
   */
  autoTags?: string[];

  /**
   * Sample rate (0-1, default 1.0 = 100% sampling)
   */
  sampleRate?: number;

  /**
   * Extract custom attributes from input
   */
  extractAttributes?: (input: any) => SpanAttributes;

  /**
   * Extract custom attributes from output
   */
  extractOutputAttributes?: (output: any) => SpanAttributes;

  /**
   * Span name override
   */
  spanName?: string;

  /**
   * Telemetry collector for privacy-first event tracking
   */
  telemetryCollector?: TelemetryCollector;
}

/**
 * Wrap any function with evolution tracking
 */
export function withEvolutionTracking<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: TrackingOptions = {}
): T {
  const tracker = options.tracker || getGlobalTracker();
  const telemetry = options.telemetryCollector;

  return (async (...args: any[]) => {
    // Sample rate check
    if (options.sampleRate && Math.random() > options.sampleRate) {
      // Skip tracking
      return fn(...args);
    }

    // Determine span name
    const spanName = options.spanName || fn.name || 'anonymous_function';

    // Extract input attributes
    let inputAttributes: SpanAttributes = {};
    if (options.extractAttributes) {
      inputAttributes = options.extractAttributes(args[0]);
    }

    // Start span
    const span = tracker.startSpan({
      name: spanName,
      attributes: {
        'function.name': fn.name,
        'function.args_count': args.length,
        ...inputAttributes,
      },
      tags: options.autoTags,
    });

    const startTime = Date.now();

    try {
      // Execute function
      const result = await fn(...args);
      const duration = Date.now() - startTime;

      // Extract output attributes
      let outputAttributes: SpanAttributes = {};
      if (options.extractOutputAttributes) {
        outputAttributes = options.extractOutputAttributes(result);
      }

      // Record success
      span.setStatus({ code: 'OK' });
      span.setAttributes({
        'execution.success': true,
        ...outputAttributes,
      });

      // Emit telemetry (if enabled)
      if (telemetry) {
        await telemetry.recordEvent({
          event: 'agent_execution',
          agent_type: fn.name || 'unknown',
          success: true,
          duration_ms: duration,
          cost: result?.cost,
          // NO: actual data, code, prompts
        });
      }

      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;

      // Record failure
      span.setStatus({
        code: 'ERROR',
        message: error.message,
      });

      span.setAttributes({
        'execution.success': false,
        'error.type': error.constructor.name,
        'error.message': error.message,
      });

      // Emit error telemetry (sanitized)
      if (telemetry) {
        await telemetry.recordEvent({
          event: 'error',
          error_type: error.constructor.name,
          error_category: categorizeError(error),
          component: `agents/${fn.name || 'unknown'}`,
          stack_trace_hash: error.stack ? hashStackTrace(error.stack) : undefined,
          // NO: actual error message, stack trace
        });
      }

      throw error;
    } finally {
      await span.end();
    }
  }) as T;
}

function categorizeError(error: Error): string {
  if (error.name.includes('Network')) return 'network';
  if (error.name.includes('Timeout')) return 'timeout';
  if (error.name.includes('Type')) return 'runtime';
  return 'unknown';
}

/**
 * Wrap an object (agent) with evolution tracking for all methods
 */
export function withEvolutionTrackingForAgent<T extends Record<string, any>>(
  agent: T,
  options: TrackingOptions = {}
): T {
  const tracker = options.tracker || getGlobalTracker();

  return new Proxy(agent, {
    get(target, prop, receiver) {
      const original = Reflect.get(target, prop, receiver);

      // Only wrap functions (methods)
      if (typeof original !== 'function') {
        return original;
      }

      // Don't wrap private methods (starting with _)
      if (typeof prop === 'string' && prop.startsWith('_')) {
        return original;
      }

      // Don't wrap constructor
      if (prop === 'constructor') {
        return original;
      }

      // Wrap method with tracking
      return withEvolutionTracking(
        original.bind(target),
        {
          ...options,
          spanName: options.spanName || `${target.constructor.name}.${String(prop)}`,
          extractAttributes: (input) => {
            const attrs: SpanAttributes = {
              'agent.id': (target as any).id,
              'agent.type': target.constructor.name,
            };

            // Get agent config if available
            if ((target as any).config) {
              attrs['agent.config'] = JSON.stringify((target as any).config);
            }

            // Custom attribute extraction
            if (options.extractAttributes) {
              Object.assign(attrs, options.extractAttributes(input));
            }

            return attrs;
          },
          extractOutputAttributes: (output) => {
            const attrs: SpanAttributes = {};

            // Extract common result fields
            if (output && typeof output === 'object') {
              if ('qualityScore' in output) {
                attrs['execution.quality_score'] = output.qualityScore;
              }
              if ('cost' in output) {
                attrs['execution.cost'] = output.cost;
              }
              if ('duration' in output) {
                attrs['execution.duration_ms'] = output.duration;
              }
            }

            // Custom attribute extraction
            if (options.extractOutputAttributes) {
              Object.assign(attrs, options.extractOutputAttributes(output));
            }

            return attrs;
          },
        }
      );
    },
  });
}

/**
 * Wrap a class constructor with evolution tracking
 */
export function trackClass<T extends { new (...args: any[]): any }>(
  constructor: T,
  options: TrackingOptions = {}
): T {
  return class extends constructor {
    constructor(...args: any[]) {
      super(...args);

      // Wrap all methods
      const prototype = Object.getPrototypeOf(this);
      const methodNames = Object.getOwnPropertyNames(prototype);

      for (const methodName of methodNames) {
        // Skip constructor
        if (methodName === 'constructor') continue;

        // Skip private methods
        if (methodName.startsWith('_')) continue;

        const method = (this as any)[methodName];

        // Only wrap functions
        if (typeof method !== 'function') continue;

        // Wrap method
        (this as any)[methodName] = withEvolutionTracking(
          method.bind(this),
          {
            ...options,
            spanName: `${constructor.name}.${methodName}`,
          }
        );
      }
    }
  } as T;
}

/**
 * Helper: Extract task type from input
 */
export function extractTaskType(input: any): string | undefined {
  if (!input || typeof input !== 'object') {
    return undefined;
  }

  // Common task type fields
  if (input.taskType) return input.taskType;
  if (input.task_type) return input.task_type;
  if (input.type) return input.type;

  // Infer from action
  if (input.action) return `${input.action}_task`;

  return undefined;
}

/**
 * Helper: Extract skill name from input
 */
export function extractSkillName(input: any): string | undefined {
  if (!input || typeof input !== 'object') {
    return undefined;
  }

  if (input.skillName) return input.skillName;
  if (input.skill_name) return input.skill_name;
  if (input.skill) return input.skill;

  return undefined;
}

/**
 * Create attribute extractor that includes task and skill info
 */
export function createStandardAttributeExtractor(): (input: any) => SpanAttributes {
  return (input: any) => {
    const attrs: SpanAttributes = {};

    const taskType = extractTaskType(input);
    if (taskType) {
      attrs['task.type'] = taskType;
    }

    const skillName = extractSkillName(input);
    if (skillName) {
      attrs['skill.name'] = skillName;
    }

    // Serialize input (truncated)
    if (input && typeof input === 'object') {
      const inputStr = JSON.stringify(input);
      attrs['task.input'] = inputStr.length > 500
        ? inputStr.substring(0, 500) + '...'
        : inputStr;
    }

    return attrs;
  };
}
