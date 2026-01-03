import crypto from 'crypto';
export const BANNED_FIELDS = [
    'email',
    'username',
    'user_id',
    'ip_address',
    'mac_address',
    'api_key',
    'password',
    'token',
    'secret',
    'auth_token',
    'bearer',
    'authorization',
    'file_content',
    'code_content',
    'file_path',
    'directory_path',
    'absolute_path',
    'git_commit',
    'git_branch',
    'repository_url',
    'repo_url',
    'error_message',
    'stack_trace',
    'input_data',
    'output_data',
    'prompt_content',
    'llm_response',
    'user_input',
    'user_data',
];
const SENSITIVE_PATTERNS = [
    /sk-[a-zA-Z0-9-_]+/,
    /Bearer\s+[a-zA-Z0-9-_\.]+/,
    /ghp_[a-zA-Z0-9]{36}/,
    /gho_[a-zA-Z0-9]{36}/,
    /ghu_[a-zA-Z0-9]{36}/,
    /ghs_[a-zA-Z0-9]{36}/,
    /ghr_[a-zA-Z0-9]{36}/,
    /AKIA[0-9A-Z]{16}/,
    /[a-zA-Z0-9\/\+]{40}/,
    /AIza[0-9A-Za-z_-]{35}/,
    /ya29\.[0-9A-Za-z_-]+/,
    /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/,
    /postgres:\/\/[^:]+:[^@]+@[^\/]+/,
    /mysql:\/\/[^:]+:[^@]+@[^\/]+/,
    /mongodb(\+srv)?:\/\/[^:]+:[^@]+@[^\/]+/,
    /redis:\/\/[^:]+:[^@]+@[^\/]+/,
    /\/Users\/[^\/]+\//,
    /\/home\/[^\/]+\//,
    /C:\\Users\\[^\\]+\\/,
    /\/private\/[^\/]+\//,
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
    /\d{3}-\d{2}-\d{4}/,
    /\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/,
    /\+?1?\d{10,14}/,
    /-----BEGIN (RSA |DSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /-----BEGIN CERTIFICATE-----/,
];
export function looksLikeSensitive(value) {
    return SENSITIVE_PATTERNS.some(pattern => pattern.test(value));
}
export function hashValue(value) {
    try {
        return crypto
            .createHash('sha256')
            .update(value)
            .digest('hex')
            .substring(0, 16);
    }
    catch (error) {
        return '[hash_failed]'.padEnd(16, '0');
    }
}
export function sanitizeEvent(event, visited = new WeakSet(), depth = 0) {
    try {
        const MAX_DEPTH = 50;
        if (depth > MAX_DEPTH) {
            return '[Max Depth Exceeded]';
        }
        if (event == null) {
            return event;
        }
        if (typeof event !== 'object') {
            return event;
        }
        if (visited.has(event)) {
            return '[Circular Reference]';
        }
        visited.add(event);
        if (Array.isArray(event)) {
            return event.map(item => sanitizeEvent(item, visited, depth + 1));
        }
        if (event instanceof Date) {
            return event.toISOString();
        }
        if (event instanceof Error) {
            return {
                name: event.name,
                message: '[Error Message Redacted]',
            };
        }
        const sanitized = {};
        const eventObj = event;
        for (const key in eventObj) {
            try {
                if (BANNED_FIELDS.includes(key)) {
                    continue;
                }
                if (!Object.prototype.hasOwnProperty.call(eventObj, key)) {
                    continue;
                }
                let value;
                try {
                    value = eventObj[key];
                }
                catch (error) {
                    continue;
                }
                if (typeof value === 'string') {
                    if (looksLikeSensitive(value)) {
                        sanitized[key] = hashValue(value);
                    }
                    else if (value.length > 1000) {
                        sanitized[key] = value.substring(0, 1000) + '...[truncated]';
                    }
                    else {
                        sanitized[key] = value;
                    }
                }
                else if (value && typeof value === 'object') {
                    sanitized[key] = sanitizeEvent(value, visited, depth + 1);
                }
                else {
                    sanitized[key] = value;
                }
            }
            catch (error) {
                continue;
            }
        }
        return sanitized;
    }
    catch (error) {
        return {
            event: event?.event || 'sanitization_failed',
            error: 'Failed to sanitize event',
        };
    }
}
export function hashStackTrace(stackTrace) {
    try {
        if (!stackTrace || typeof stackTrace !== 'string') {
            return '[invalid_stack]'.padEnd(16, '0');
        }
        const normalized = stackTrace
            .split('\n')
            .map(line => {
            try {
                return line
                    .replace(/:\d+:\d+/g, '')
                    .replace(/\/[^\s]+\//g, '');
            }
            catch {
                return line;
            }
        })
            .join('\n');
        return crypto
            .createHash('sha256')
            .update(normalized)
            .digest('hex')
            .substring(0, 16);
    }
    catch (error) {
        return '[hash_failed]'.padEnd(16, '0');
    }
}
//# sourceMappingURL=sanitization.js.map