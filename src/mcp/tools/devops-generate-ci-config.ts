/**
 * Generate CI Config Tool
 *
 * Generates CI/CD configuration files for GitHub Actions or GitLab CI.
 */

import { z } from 'zod';

export const generateCIConfigTool = {
  name: 'devops_generate_ci_config',
  description:
    '🚀 DevOps: Generate CI/CD configuration files for GitHub Actions or GitLab CI. ' +
    'Creates production-ready pipeline configurations with testing, building, and optional deployment steps.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      platform: {
        type: 'string' as const,
        enum: ['github-actions', 'gitlab-ci'],
        description: 'CI/CD platform to generate config for',
      },
      testCommand: {
        type: 'string' as const,
        description: 'Command to run tests (e.g., "npm test")',
      },
      buildCommand: {
        type: 'string' as const,
        description: 'Command to build the project (e.g., "npm run build")',
      },
      deployCommand: {
        type: 'string' as const,
        description: 'Optional deployment command',
      },
      nodeVersion: {
        type: 'string' as const,
        description: 'Node.js version to use (default: "18")',
      },
      enableCaching: {
        type: 'boolean' as const,
        description: 'Enable dependency caching for faster builds (default: true)',
      },
    },
    required: ['platform', 'testCommand', 'buildCommand'],
  },

  handler: (
    input: {
      platform: 'github-actions' | 'gitlab-ci';
      testCommand: string;
      buildCommand: string;
      deployCommand?: string;
      nodeVersion?: string;
      enableCaching?: boolean;
    },
    devopsEngineer?: any
  ): {
    success: boolean;
    config: string;
    filename: string;
    configFileName: string;
    platform: string;
    instructions: string;
    error?: string;
  } => {
    const nodeVer = input.nodeVersion || '18';
    const caching = input.enableCaching !== false;

    let config: string;
    let filename: string;

    if (input.platform === 'github-actions') {
      filename = '.github/workflows/ci.yml';
      config = `name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  build-and-test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '${nodeVer}'${caching ? '\n          cache: \'npm\'' : ''}

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: ${input.testCommand}

      - name: Build project
        run: ${input.buildCommand}
${
  input.deployCommand
    ? `
      - name: Deploy
        if: github.ref == 'refs/heads/main'
        run: ${input.deployCommand}
        env:
          DEPLOY_TOKEN: \${{ secrets.DEPLOY_TOKEN }}
`
    : ''
}`;
    } else {
      // GitLab CI
      filename = '.gitlab-ci.yml';
      config = `stages:
  - test
  - build${input.deployCommand ? '\n  - deploy' : ''}

variables:
  NODE_VERSION: "${nodeVer}"

${
  caching
    ? `cache:
  paths:
    - node_modules/
    - .npm/

`
    : ''
}test:
  stage: test
  image: node:\${NODE_VERSION}
  script:
    - npm ci
    - ${input.testCommand}

build:
  stage: build
  image: node:\${NODE_VERSION}
  script:
    - npm ci
    - ${input.buildCommand}
  artifacts:
    paths:
      - dist/
    expire_in: 1 week
${
  input.deployCommand
    ? `
deploy:
  stage: deploy
  image: node:\${NODE_VERSION}
  script:
    - ${input.deployCommand}
  only:
    - main
  environment:
    name: production
`
    : ''
}`;
    }

    const instructions =
      input.platform === 'github-actions'
        ? '1. Commit and push the generated file to your repository\n2. GitHub will automatically detect the workflow file\n3. The CI pipeline will run on pushes and pull requests to main/develop branches'
        : '1. Commit and push the .gitlab-ci.yml file to your repository\n2. GitLab CI will automatically detect and run the pipeline\n3. Check the CI/CD > Pipelines page in your GitLab project';

    return {
      success: true,
      config,
      filename,
      configFileName: filename,
      platform: input.platform,
      instructions,
    };
  },
};
