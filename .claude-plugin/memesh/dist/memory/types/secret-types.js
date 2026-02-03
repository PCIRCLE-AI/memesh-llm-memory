export const DEFAULT_SECRET_PATTERNS = [
    {
        name: 'OpenAI API Key',
        type: 'api_key',
        pattern: /sk-[a-zA-Z0-9]{20,}/g,
        confidence: 0.95,
    },
    {
        name: 'GitHub PAT',
        type: 'api_key',
        pattern: /ghp_[a-zA-Z0-9]{36,}/g,
        confidence: 0.95,
    },
    {
        name: 'GitHub OAuth',
        type: 'oauth_token',
        pattern: /gho_[a-zA-Z0-9]{36,}/g,
        confidence: 0.95,
    },
    {
        name: 'AWS Access Key',
        type: 'api_key',
        pattern: /AKIA[0-9A-Z]{16}/g,
        confidence: 0.95,
    },
    {
        name: 'Bearer Token',
        type: 'bearer_token',
        pattern: /Bearer\s+[a-zA-Z0-9\-._~+/]+=*/gi,
        confidence: 0.85,
    },
    {
        name: 'JWT',
        type: 'jwt',
        pattern: /eyJ[a-zA-Z0-9\-_]+\.eyJ[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+/g,
        confidence: 0.9,
    },
    {
        name: 'Password Assignment',
        type: 'password',
        pattern: /(?:password|passwd|pwd|secret|token)\s*[:=]\s*["']?([^"'\s]{8,})["']?/gi,
        confidence: 0.7,
    },
    {
        name: 'Anthropic API Key',
        type: 'api_key',
        pattern: /sk-ant-[a-zA-Z0-9\-]{20,}/g,
        confidence: 0.95,
    },
];
//# sourceMappingURL=secret-types.js.map