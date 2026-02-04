/**
 * withEvolutionTracking - Proxy-based automatic tracking
 *
 * Wraps any agent/function with automatic evolution tracking.
 * ZERO code changes required in the agent implementation.
 *
 * Inspired by Agent Lightning's LLMProxy pattern.
 */

import { logger } from '../../utils/logger.js';
import { SpanTracker, getGlobalTracker } from './SpanTracker.js';
import type { SpanAttributes } from '../storage/types.js';
import type { TelemetryCollector } from '../../telemetry/TelemetryCollector.js';
import { hashStackTrace } from '../../telemetry/sanitization.js';

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
  extractAttributes?: (input: unknown) => SpanAttributes;

  /**
   * Extract custom attributes from output
   */
  extractOutputAttributes?: (output: unknown) => SpanAttributes;

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
export function withEvolutionTracking<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  options: TrackingOptions = {}
): T {
  const tracker = options.tracker || getGlobalTracker();
  const telemetry = options.telemetryCollector;

  return (async (...args: unknown[]) => {
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
        // Type assertion for result to access optional cost property
        const typedResult = result as { cost?: number } | undefined;
        await telemetry.recordEvent({
          event: 'agent_execution',
          agent_type: fn.name || 'unknown',
          success: true,
          duration_ms: Date.now() - startTime,
          cost: typedResult?.cost,
          // NO: actual data, code, prompts
        });
      }

      return result;
    } catch (error: unknown) {
      // Extract error details with type safety
      const errorDetails = getErrorDetails(error);

      // Sanitize error message to remove sensitive data
      const sanitizedMessage = sanitizeErrorMessage(errorDetails.message);

      // Record failure
      span.setStatus({
        code: 'ERROR',
        message: sanitizedMessage,
      });

      span.setAttributes({
        'execution.success': false,
        'error.type': errorDetails.typeName,
        'error.message': sanitizedMessage,
      });

      // Emit error telemetry (sanitized)
      if (telemetry) {
        // Type guard for error object
        const typedError = error instanceof Error ? error : new Error(String(error));
        await telemetry.recordEvent({
          event: 'error',
          error_type: typedError.constructor.name,
          error_category: categorizeError(typedError),
          component: `agents/${fn.name || 'unknown'}`,
          stack_trace_hash: typedError.stack ? hashStackTrace(typedError.stack) : undefined,
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
 * Extract error details from unknown error type
 * Type-safe helper for error handling
 */
function getErrorDetails(error: unknown): { message: string; typeName: string } {
  if (error instanceof Error) {
    return {
      message: error.message,
      typeName: error.constructor.name,
    };
  }
  return {
    message: String(error),
    typeName: 'UnknownError',
  };
}

/**
 * Sanitize error message to remove sensitive data
 * - Removes API keys, passwords, tokens, emails, file paths
 * - Preserves general structure for debugging
 */
function sanitizeErrorMessage(message: string): string {
  if (!message) return '[Error occurred]';

  let sanitized = message;

  // Pattern matching for sensitive data
  const SENSITIVE_PATTERNS = [
    // API Keys (various formats)
    { pattern: /sk-[a-zA-Z0-9-_]{32,}/gi, replacement: '[REDACTED_API_KEY]' },
    { pattern: /api[_-]?key[=:\s]+[a-zA-Z0-9-_]{16,}/gi, replacement: 'API_KEY=[REDACTED]' },

    // Bearer tokens
    { pattern: /Bearer\s+[a-zA-Z0-9-_\.]+/gi, replacement: 'Bearer [REDACTED_TOKEN]' },

    // Passwords
    { pattern: /password[=:\s]+[^\s,]+/gi, replacement: 'PASSWORD=[REDACTED]' },
    { pattern: /pass[=:\s]+[^\s,]+/gi, replacement: 'PASS=[REDACTED]' },

    // Auth tokens
    { pattern: /token[=:\s]+[a-zA-Z0-9-_\.]{16,}/gi, replacement: 'TOKEN=[REDACTED]' },
    { pattern: /auth[=:\s]+[a-zA-Z0-9-_\.]{16,}/gi, replacement: 'AUTH=[REDACTED]' },

    // Emails
    { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '[REDACTED_EMAIL]' },

    // File paths (Unix and Windows)
    { pattern: /\/(?:Users|home|usr|opt|var)\/[^\s,\)]+/g, replacement: '[REDACTED_PATH]' },
    { pattern: /[A-Z]:\\[^\s,\)]+/g, replacement: '[REDACTED_PATH]' },

    // JWT tokens
    { pattern: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g, replacement: '[REDACTED_JWT]' },
  ];

  // Apply all patterns
  for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, replacement);
  }

  // Truncate if too long
  if (sanitized.length > 500) {
    sanitized = sanitized.substring(0, 497) + '...';
  }

  return sanitized;
}

/**
 * Wrap an object (agent) with evolution tracking for all methods
 */
export function withEvolutionTrackingForAgent<T extends Record<string, any>>(
  agent: T,
  options: TrackingOptions = {}
): T {
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

      // Defensive type check before wrapping
      // Even though we checked typeof original === 'function' above,
      // we add additional runtime safety checks
      const originalFunc = original as Function;
      if (typeof originalFunc !== 'function' || typeof originalFunc.bind !== 'function') {
        logger.warn(
          `withEvolutionTrackingForAgent: Skipping non-function property ${String(prop)}`
        );
        return original;
      }

      // Wrap method with tracking (original is verified to be a Function with bind)
      // Type assertion is safe because we checked typeof originalFunc.bind === 'function' above
      return withEvolutionTracking(originalFunc.bind(target), {
          ...options,
          spanName: options.spanName || `${target.constructor.name}.${String(prop)}`,
          extractAttributes: (input) => {
            // Type-safe property access
            const targetObj = target as Record<string, unknown>;
            const attrs: SpanAttributes = {
              'agent.id': targetObj.id as string | undefined,
              'agent.type': target.constructor.name,
            };

            // Get agent config if available
            if (targetObj.config) {
              attrs['agent.config'] = JSON.stringify(targetObj.config);
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
              const typedOutput = output as Record<string, unknown>;
              if ('qualityScore' in output) {
                attrs['execution.quality_score'] = typedOutput.qualityScore as number;
              }
              if ('cost' in output) {
                attrs['execution.cost'] = typedOutput.cost as number;
              }
              if ('duration' in output) {
                attrs['execution.duration_ms'] = typedOutput.duration as number;
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
export function trackClass<T extends new (...args: any[]) => any>(
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

        // Type-safe property access
        const instance = this as Record<string, unknown>;
        const method = instance[methodName];

        // Only wrap functions
        if (typeof method !== 'function') continue;

        // Wrap method
        instance[methodName] = withEvolutionTracking(
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
export function extractTaskType(input: unknown): string | undefined {
  if (!input || typeof input !== 'object') {
    return undefined;
  }

  // Type guard for object with potential properties
  const obj = input as Record<string, unknown>;

  // Common task type fields
  if (typeof obj.taskType === 'string') return obj.taskType;
  if (typeof obj.task_type === 'string') return obj.task_type;
  if (typeof obj.type === 'string') return obj.type;

  // Infer from action
  if (typeof obj.action === 'string') return `${obj.action}_task`;

  return undefined;
}

/**
 * Helper: Extract skill name from input
 */
export function extractSkillName(input: unknown): string | undefined {
  if (!input || typeof input !== 'object') {
    return undefined;
  }

  // Type guard for object with potential properties
  const obj = input as Record<string, unknown>;

  if (typeof obj.skillName === 'string') return obj.skillName;
  if (typeof obj.skill_name === 'string') return obj.skill_name;
  if (typeof obj.skill === 'string') return obj.skill;

  return undefined;
}

/**
 * Create attribute extractor that includes task and skill info
 */
export function createStandardAttributeExtractor(): (input: unknown) => SpanAttributes {
  return (input: unknown) => {
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
