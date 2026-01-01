import { E2EHealingConfig, HealingConstraints } from './types.js';

export const DEFAULT_CONFIG: E2EHealingConfig = {
  maxAttempts: 3,
  cooldownPeriod: 30 * 60 * 1000, // 30 minutes
  failureThreshold: 3,
  resetTimeout: 24 * 60 * 60 * 1000, // 24 hours
};

export const DEFAULT_CONSTRAINTS: HealingConstraints = {
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
