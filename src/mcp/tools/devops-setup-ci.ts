/**
 * Setup CI Tool
 *
 * Complete CI/CD setup that generates config, writes to file, and records to Knowledge Graph.
 */

import { z } from 'zod';
import { promises as fs } from 'fs';
import { dirname } from 'path';
import { generateCIConfigTool } from './devops-generate-ci-config.js';
import { KnowledgeGraph } from '../../knowledge-graph/index.js';

export const setupCITool = {
  name: 'devops_setup_ci',
  description:
    '⚙️ DevOps: Complete CI/CD setup that generates configuration, writes it to the appropriate file, ' +
    'and records the setup in the Knowledge Graph for future reference.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      platform: {
        type: 'string' as const,
        enum: ['github-actions', 'gitlab-ci'],
        description: 'CI/CD platform to set up',
      },
      testCommand: {
        type: 'string' as const,
        description: 'Command to run tests (e.g., "npm test")',
      },
      buildCommand: {
        type: 'string' as const,
        description: 'Command to build the project (e.g., "npm run build")',
      },
      projectPath: {
        type: 'string' as const,
        description: 'Path to the project root directory (default: current directory)',
      },
    },
    required: ['platform', 'testCommand', 'buildCommand'],
  },

  handler: async (
    input: {
      platform: 'github-actions' | 'gitlab-ci';
      testCommand: string;
      buildCommand: string;
      projectPath?: string;
    },
    knowledgeGraph?: KnowledgeGraph
  ): Promise<{
    success: boolean;
    message: string;
    nextSteps: string;
    details?: {
      configFile?: string;
      testCommand?: string;
      buildCommand?: string;
    };
    configFileName?: string;
    filePath?: string;
    configContent?: string;
    recorded?: boolean;
    error?: string;
  }> => {
    try {
      // Generate CI config
      const generated = generateCIConfigTool.handler({
        platform: input.platform,
        testCommand: input.testCommand,
        buildCommand: input.buildCommand,
      });

      // Determine file path
      const projectPath = input.projectPath || process.cwd();
      const filePath = `${projectPath}/${generated.filename}`;

      // Ensure directory exists
      await fs.mkdir(dirname(filePath), { recursive: true });

      // Write config file
      await fs.writeFile(filePath, generated.config, 'utf-8');

      // Record to Knowledge Graph if available
      let recorded = false;
      if (knowledgeGraph) {
        try {
          knowledgeGraph.createEntity({
            name: `CI/CD Setup - ${input.platform}`,
            type: 'devops_config' as any,
            observations: [
              `Platform: ${input.platform}`,
              `Test Command: ${input.testCommand}`,
              `Build Command: ${input.buildCommand}`,
              `Config File: ${generated.filename}`,
              `Setup Date: ${new Date().toISOString()}`,
            ],
            tags: [],
            metadata: {},
          });
          recorded = true;
        } catch (error) {
          // Knowledge Graph recording is optional, don't fail if it errors
          console.warn('Failed to record CI setup in Knowledge Graph:', error);
        }
      }

      return {
        success: true,
        message: `✅ CI/CD setup complete for ${input.platform}!`,
        nextSteps: generated.instructions,
        details: {
          configFile: generated.filename,
          testCommand: input.testCommand,
          buildCommand: input.buildCommand,
        },
        configFileName: generated.filename,
        filePath,
        configContent: generated.config,
        recorded,
      };
    } catch (error) {
      return {
        success: false,
        message: 'CI/CD setup failed',
        nextSteps: 'Please check the error details and try again',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};
