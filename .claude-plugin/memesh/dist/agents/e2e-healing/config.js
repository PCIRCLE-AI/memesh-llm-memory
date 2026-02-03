export const DEFAULT_CONFIG = {
    maxAttempts: 3,
    cooldownPeriod: 30 * 60 * 1000,
    failureThreshold: 3,
    resetTimeout: 24 * 60 * 60 * 1000,
};
export const DEFAULT_CONSTRAINTS = {
    maxAttempts: 3,
    maxFilesModified: 3,
    maxLinesChanged: 100,
    allowedFilePatterns: [
        '**/*.css',
        '**/*.scss',
        '**/*.module.css',
        '**/*.jsx',
        '**/*.tsx',
        '**/components/**/*.ts',
    ],
    forbiddenFilePatterns: [
        '**/api/**',
        '**/models/**',
        '**/database/**',
        '**/*.config.ts',
        '**/package.json',
    ],
    maxDirectoryDepth: 2,
};
//# sourceMappingURL=config.js.map