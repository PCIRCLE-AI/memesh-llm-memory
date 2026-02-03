import { logger } from '../../utils/logger.js';
import { getGlobalTracker } from './SpanTracker.js';
import { hashStackTrace } from '../../telemetry/sanitization.js';
export function withEvolutionTracking(fn, options = {}) {
    const tracker = options.tracker || getGlobalTracker();
    const telemetry = options.telemetryCollector;
    return (async (...args) => {
        if (options.sampleRate && Math.random() > options.sampleRate) {
            return fn(...args);
        }
        const spanName = options.spanName || fn.name || 'anonymous_function';
        let inputAttributes = {};
        if (options.extractAttributes) {
            inputAttributes = options.extractAttributes(args[0]);
        }
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
            const result = await fn(...args);
            const duration = Date.now() - startTime;
            let outputAttributes = {};
            if (options.extractOutputAttributes) {
                outputAttributes = options.extractOutputAttributes(result);
            }
            span.setStatus({ code: 'OK' });
            span.setAttributes({
                'execution.success': true,
                ...outputAttributes,
            });
            if (telemetry) {
                const typedResult = result;
                await telemetry.recordEvent({
                    event: 'agent_execution',
                    agent_type: fn.name || 'unknown',
                    success: true,
                    duration_ms: Date.now() - startTime,
                    cost: typedResult?.cost,
                });
            }
            return result;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            const errorDetails = getErrorDetails(error);
            const sanitizedMessage = sanitizeErrorMessage(errorDetails.message);
            span.setStatus({
                code: 'ERROR',
                message: sanitizedMessage,
            });
            span.setAttributes({
                'execution.success': false,
                'error.type': errorDetails.typeName,
                'error.message': sanitizedMessage,
            });
            if (telemetry) {
                const typedError = error instanceof Error ? error : new Error(String(error));
                await telemetry.recordEvent({
                    event: 'error',
                    error_type: typedError.constructor.name,
                    error_category: categorizeError(typedError),
                    component: `agents/${fn.name || 'unknown'}`,
                    stack_trace_hash: typedError.stack ? hashStackTrace(typedError.stack) : undefined,
                });
            }
            throw error;
        }
        finally {
            await span.end();
        }
    });
}
function categorizeError(error) {
    if (error.name.includes('Network'))
        return 'network';
    if (error.name.includes('Timeout'))
        return 'timeout';
    if (error.name.includes('Type'))
        return 'runtime';
    return 'unknown';
}
function getErrorDetails(error) {
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
function sanitizeErrorMessage(message) {
    if (!message)
        return '[Error occurred]';
    let sanitized = message;
    const SENSITIVE_PATTERNS = [
        { pattern: /sk-[a-zA-Z0-9-_]{32,}/gi, replacement: '[REDACTED_API_KEY]' },
        { pattern: /api[_-]?key[=:\s]+[a-zA-Z0-9-_]{16,}/gi, replacement: 'API_KEY=[REDACTED]' },
        { pattern: /Bearer\s+[a-zA-Z0-9-_\.]+/gi, replacement: 'Bearer [REDACTED_TOKEN]' },
        { pattern: /password[=:\s]+[^\s,]+/gi, replacement: 'PASSWORD=[REDACTED]' },
        { pattern: /pass[=:\s]+[^\s,]+/gi, replacement: 'PASS=[REDACTED]' },
        { pattern: /token[=:\s]+[a-zA-Z0-9-_\.]{16,}/gi, replacement: 'TOKEN=[REDACTED]' },
        { pattern: /auth[=:\s]+[a-zA-Z0-9-_\.]{16,}/gi, replacement: 'AUTH=[REDACTED]' },
        { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '[REDACTED_EMAIL]' },
        { pattern: /\/(?:Users|home|usr|opt|var)\/[^\s,\)]+/g, replacement: '[REDACTED_PATH]' },
        { pattern: /[A-Z]:\\[^\s,\)]+/g, replacement: '[REDACTED_PATH]' },
        { pattern: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g, replacement: '[REDACTED_JWT]' },
    ];
    for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
        sanitized = sanitized.replace(pattern, replacement);
    }
    if (sanitized.length > 500) {
        sanitized = sanitized.substring(0, 497) + '...';
    }
    return sanitized;
}
export function withEvolutionTrackingForAgent(agent, options = {}) {
    return new Proxy(agent, {
        get(target, prop, receiver) {
            const original = Reflect.get(target, prop, receiver);
            if (typeof original !== 'function') {
                return original;
            }
            if (typeof prop === 'string' && prop.startsWith('_')) {
                return original;
            }
            if (prop === 'constructor') {
                return original;
            }
            const originalFunc = original;
            if (typeof originalFunc !== 'function' || typeof originalFunc.bind !== 'function') {
                logger.warn(`withEvolutionTrackingForAgent: Skipping non-function property ${String(prop)}`);
                return original;
            }
            return withEvolutionTracking(originalFunc.bind(target), {
                ...options,
                spanName: options.spanName || `${target.constructor.name}.${String(prop)}`,
                extractAttributes: (input) => {
                    const targetObj = target;
                    const attrs = {
                        'agent.id': targetObj.id,
                        'agent.type': target.constructor.name,
                    };
                    if (targetObj.config) {
                        attrs['agent.config'] = JSON.stringify(targetObj.config);
                    }
                    if (options.extractAttributes) {
                        Object.assign(attrs, options.extractAttributes(input));
                    }
                    return attrs;
                },
                extractOutputAttributes: (output) => {
                    const attrs = {};
                    if (output && typeof output === 'object') {
                        const typedOutput = output;
                        if ('qualityScore' in output) {
                            attrs['execution.quality_score'] = typedOutput.qualityScore;
                        }
                        if ('cost' in output) {
                            attrs['execution.cost'] = typedOutput.cost;
                        }
                        if ('duration' in output) {
                            attrs['execution.duration_ms'] = typedOutput.duration;
                        }
                    }
                    if (options.extractOutputAttributes) {
                        Object.assign(attrs, options.extractOutputAttributes(output));
                    }
                    return attrs;
                },
            });
        },
    });
}
export function trackClass(constructor, options = {}) {
    return class extends constructor {
        constructor(...args) {
            super(...args);
            const prototype = Object.getPrototypeOf(this);
            const methodNames = Object.getOwnPropertyNames(prototype);
            for (const methodName of methodNames) {
                if (methodName === 'constructor')
                    continue;
                if (methodName.startsWith('_'))
                    continue;
                const instance = this;
                const method = instance[methodName];
                if (typeof method !== 'function')
                    continue;
                instance[methodName] = withEvolutionTracking(method.bind(this), {
                    ...options,
                    spanName: `${constructor.name}.${methodName}`,
                });
            }
        }
    };
}
export function extractTaskType(input) {
    if (!input || typeof input !== 'object') {
        return undefined;
    }
    const obj = input;
    if (typeof obj.taskType === 'string')
        return obj.taskType;
    if (typeof obj.task_type === 'string')
        return obj.task_type;
    if (typeof obj.type === 'string')
        return obj.type;
    if (typeof obj.action === 'string')
        return `${obj.action}_task`;
    return undefined;
}
export function extractSkillName(input) {
    if (!input || typeof input !== 'object') {
        return undefined;
    }
    const obj = input;
    if (typeof obj.skillName === 'string')
        return obj.skillName;
    if (typeof obj.skill_name === 'string')
        return obj.skill_name;
    if (typeof obj.skill === 'string')
        return obj.skill;
    return undefined;
}
export function createStandardAttributeExtractor() {
    return (input) => {
        const attrs = {};
        const taskType = extractTaskType(input);
        if (taskType) {
            attrs['task.type'] = taskType;
        }
        const skillName = extractSkillName(input);
        if (skillName) {
            attrs['skill.name'] = skillName;
        }
        if (input && typeof input === 'object') {
            const inputStr = JSON.stringify(input);
            attrs['task.input'] = inputStr.length > 500
                ? inputStr.substring(0, 500) + '...'
                : inputStr;
        }
        return attrs;
    };
}
//# sourceMappingURL=withEvolutionTracking.js.map