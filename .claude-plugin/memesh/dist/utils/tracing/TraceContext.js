import { AsyncLocalStorage } from 'async_hooks';
import crypto from 'crypto';
const traceStorage = new AsyncLocalStorage();
export function generateTraceId() {
    const timestamp = Date.now();
    const random = crypto.randomBytes(6).toString('hex');
    return `trace-${timestamp}-${random}`;
}
export function generateSpanId() {
    const random = crypto.randomBytes(4).toString('hex');
    return `span-${random}`;
}
export function isValidTraceId(traceId) {
    return /^trace-\d{13}-[0-9a-f]{12}$/.test(traceId);
}
export function isValidSpanId(spanId) {
    return /^span-[0-9a-f]{8}$/.test(spanId);
}
export function parseW3CTraceparent(traceparent) {
    const parts = traceparent.split('-');
    if (parts.length !== 4 || parts[0] !== '00') {
        return null;
    }
    const [, traceId, parentId, flags] = parts;
    const sampled = (parseInt(flags, 16) & 1) === 1;
    return {
        traceId: `trace-${Date.now()}-${traceId.substring(0, 12)}`,
        parentSpanId: `span-${parentId.substring(0, 8)}`,
        sampled,
    };
}
export function formatW3CTraceparent(context) {
    const traceHex = context.traceId.split('-')[2] || '000000000000';
    const spanHex = context.spanId.split('-')[1] || '00000000';
    const paddedTrace = traceHex.padEnd(32, '0');
    const paddedSpan = spanHex.padEnd(16, '0');
    const flags = context.sampled ? '01' : '00';
    return `00-${paddedTrace}-${paddedSpan}-${flags}`;
}
export function extractTraceContext(headers) {
    const normalizedHeaders = {};
    for (const [key, value] of Object.entries(headers)) {
        if (value !== undefined) {
            normalizedHeaders[key.toLowerCase()] = Array.isArray(value) ? value[0] : value;
        }
    }
    const traceparent = normalizedHeaders['traceparent'];
    if (traceparent) {
        const parsed = parseW3CTraceparent(traceparent);
        if (parsed) {
            return {
                traceId: parsed.traceId,
                parentSpanId: parsed.parentSpanId,
                sampled: parsed.sampled,
            };
        }
    }
    const xTraceId = normalizedHeaders['x-trace-id'];
    if (xTraceId && isValidTraceId(xTraceId)) {
        return {
            traceId: xTraceId,
            sampled: true,
        };
    }
    const xRequestId = normalizedHeaders['x-request-id'];
    if (xRequestId) {
        return {
            traceId: xRequestId.replace(/^req-/, 'trace-'),
            sampled: true,
        };
    }
    return null;
}
export function injectTraceContext(headers, context) {
    return {
        ...headers,
        'traceparent': formatW3CTraceparent(context),
        'X-Trace-Id': context.traceId,
        'X-Request-Id': context.traceId,
    };
}
export function createTraceContext(parentContext, sampled = true) {
    return {
        traceId: parentContext?.traceId || generateTraceId(),
        spanId: generateSpanId(),
        parentSpanId: parentContext?.spanId,
        sampled,
        baggage: parentContext?.baggage,
    };
}
export function getTraceContext() {
    return traceStorage.getStore();
}
export function runWithTraceContext(context, callback) {
    return traceStorage.run(context, callback);
}
export function createChildSpan(spanName) {
    const parent = getTraceContext();
    const context = createTraceContext(parent, parent?.sampled ?? true);
    if (spanName) {
        context.baggage = {
            ...context.baggage,
            spanName,
        };
    }
    return context;
}
export function withChildSpan(spanName, callback) {
    const childContext = createChildSpan(spanName);
    return runWithTraceContext(childContext, callback);
}
export async function withChildSpanAsync(spanName, callback) {
    const childContext = createChildSpan(spanName);
    return new Promise((resolve, reject) => {
        runWithTraceContext(childContext, () => {
            callback().then(resolve).catch(reject);
        });
    });
}
export function extractTraceTimestamp(traceId) {
    const match = traceId.match(/^trace-(\d{13})-[0-9a-f]{12}$/);
    if (!match) {
        return null;
    }
    return parseInt(match[1], 10);
}
//# sourceMappingURL=TraceContext.js.map