import { ValidationError } from '../../errors/index.js';

export const githubActionsTemplate = `name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: {{testCommand}}

      - name: Build
        run: {{buildCommand}}
`;

export const gitlabCITemplate = `.gitlab-ci.yml template placeholder`;

export function generateCIConfig(options: {
  platform: 'github-actions' | 'gitlab-ci';
  testCommand: string;
  buildCommand: string;
}): string {
  const { platform, testCommand, buildCommand } = options;

  if (platform === 'github-actions') {
    return githubActionsTemplate
      .replace('{{testCommand}}', testCommand)
      .replace('{{buildCommand}}', buildCommand);
  }

  throw new ValidationError(
    `Unsupported CI platform: ${platform}`,
    {
      providedPlatform: platform,
      allowedPlatforms: ['github-actions', 'gitlab-ci'],
      function: 'generateCIConfig',
    }
  );
}
