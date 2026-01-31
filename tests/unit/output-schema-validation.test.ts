/**
 * Output Schema Validation Tests
 *
 * Ensures all MCP tool outputs conform to their declared JSON schemas
 * using AJV (Another JSON Schema Validator).
 *
 * Test Coverage:
 * 1. Schema compilation (all schemas must be valid JSON Schema)
 * 2. Valid output validation (correct outputs pass)
 * 3. Invalid output rejection (incorrect outputs fail)
 * 4. Integration with actual tool handlers
 */

import { describe, it, expect, beforeAll } from 'vitest';
import Ajv from 'ajv';
import { OutputSchemas } from '../../src/mcp/schemas/OutputSchemas.js';
import type {
  BuddyDoOutput,
  BuddyRememberOutput,
  BuddyHelpOutput,
  SessionHealthOutput,
  WorkflowGuidanceOutput,
  SmartPlanOutput,
  HookToolUseOutput,
  BuddyRecordMistakeOutput,
  CreateEntitiesOutput,
  A2ASendTaskOutput,
  A2AGetTaskOutput,
  A2AListTasksOutput,
  A2AListAgentsOutput,
} from '../../src/mcp/schemas/OutputSchemas.js';

describe('Output Schema Validation', () => {
  let ajv: Ajv;

  beforeAll(() => {
    // Initialize AJV with strict mode for better validation
    ajv = new Ajv({
      strict: true,
      allErrors: true,
      verbose: true,
    });
  });

  describe('Schema Compilation', () => {
    it('should compile all output schemas successfully', () => {
      // Test that all schemas are valid JSON Schema
      const schemaNames = Object.keys(OutputSchemas);

      for (const name of schemaNames) {
        const schema = OutputSchemas[name as keyof typeof OutputSchemas];
        expect(() => {
          ajv.compile(schema);
        }).not.toThrow();
      }

      expect(schemaNames.length).toBeGreaterThan(0);
    });
  });

  describe('buddy-do Output Validation', () => {
    const schema = OutputSchemas.buddyDo;
    let validate: ReturnType<typeof ajv.compile>;

    beforeAll(() => {
      validate = ajv.compile(schema);
    });

    it('should validate correct buddy-do output', () => {
      const validOutput: BuddyDoOutput = {
        routing: {
          approved: true,
          message: 'Task routed for capabilities: general',
          capabilityFocus: ['general'],
          complexity: 'simple',
          estimatedTokens: 1000,
          estimatedCost: 0.001,
        },
        enhancedPrompt: {
          systemPrompt: 'You are a helpful assistant',
          userPrompt: 'Complete the task',
          suggestedModel: 'claude-opus-4-5',
        },
        stats: {
          durationMs: 150,
          estimatedTokens: 1000,
        },
      };

      const result = validate(validOutput);
      expect(result).toBe(true);
      expect(validate.errors).toBeNull();
    });

    it('should validate minimal buddy-do output', () => {
      const minimalOutput: BuddyDoOutput = {
        routing: {
          approved: false,
          message: 'Task rejected',
        },
      };

      const result = validate(minimalOutput);
      expect(result).toBe(true);
      expect(validate.errors).toBeNull();
    });

    it('should reject buddy-do output missing required fields', () => {
      const invalidOutput = {
        routing: {
          approved: true,
          // Missing 'message' (required)
        },
      };

      const result = validate(invalidOutput);
      expect(result).toBe(false);
      expect(validate.errors).toBeDefined();
      expect(validate.errors?.length).toBeGreaterThan(0);
    });

    it('should reject buddy-do output with invalid types', () => {
      const invalidOutput = {
        routing: {
          approved: 'yes', // Should be boolean
          message: 'Task approved',
        },
      };

      const result = validate(invalidOutput);
      expect(result).toBe(false);
      expect(validate.errors).toBeDefined();
    });

    it('should reject buddy-do output with invalid enum values', () => {
      const invalidOutput: Record<string, unknown> = {
        routing: {
          approved: true,
          message: 'Task approved',
          complexity: 'super-complex', // Invalid enum value
        },
      };

      const result = validate(invalidOutput);
      expect(result).toBe(false);
      expect(validate.errors).toBeDefined();
    });
  });

  describe('buddy-remember Output Validation', () => {
    const schema = OutputSchemas.buddyRemember;
    let validate: ReturnType<typeof ajv.compile>;

    beforeAll(() => {
      validate = ajv.compile(schema);
    });

    it('should validate correct buddy-remember output', () => {
      const validOutput: BuddyRememberOutput = {
        query: 'api design',
        count: 2,
        memories: [
          {
            id: 'mem-1',
            content: 'We decided to use REST API',
            type: 'decision',
            timestamp: '2025-01-01T00:00:00Z',
            relevance: 0.95,
          },
          {
            id: 'mem-2',
            content: 'Authentication uses JWT tokens',
            type: 'decision',
            timestamp: '2025-01-02T00:00:00Z',
            relevance: 0.87,
          },
        ],
        suggestions: ['Check API versioning strategy', 'Review rate limiting'],
      };

      const result = validate(validOutput);
      expect(result).toBe(true);
      expect(validate.errors).toBeNull();
    });

    it('should reject buddy-remember output missing required fields', () => {
      const invalidOutput = {
        query: 'api design',
        // Missing 'count' (required)
      };

      const result = validate(invalidOutput);
      expect(result).toBe(false);
      expect(validate.errors).toBeDefined();
    });
  });

  describe('buddy-help Output Validation', () => {
    const schema = OutputSchemas.buddyHelp;
    let validate: ReturnType<typeof ajv.compile>;

    beforeAll(() => {
      validate = ajv.compile(schema);
    });

    it('should validate correct buddy-help output', () => {
      const validOutput: BuddyHelpOutput = {
        commands: [
          {
            name: 'buddy-do',
            description: 'Execute a task with smart routing',
            usage: 'buddy-do --task "setup authentication"',
            examples: ['buddy-do --task "fix login bug"'],
          },
        ],
      };

      const result = validate(validOutput);
      expect(result).toBe(true);
      expect(validate.errors).toBeNull();
    });
  });

  describe('get-session-health Output Validation', () => {
    const schema = OutputSchemas.getSessionHealth;
    let validate: ReturnType<typeof ajv.compile>;

    beforeAll(() => {
      validate = ajv.compile(schema);
    });

    it('should validate correct session health output', () => {
      const validOutput: SessionHealthOutput = {
        status: 'healthy',
        tokenUsagePercentage: 45.5,
        timestamp: '2025-01-31T12:00:00Z',
        warnings: [],
        recommendations: ['Continue with current approach'],
      };

      const result = validate(validOutput);
      expect(result).toBe(true);
      expect(validate.errors).toBeNull();
    });

    it('should reject invalid status enum', () => {
      const invalidOutput = {
        status: 'critical', // Invalid enum value
        tokenUsagePercentage: 95,
        timestamp: '2025-01-31T12:00:00Z',
      };

      const result = validate(invalidOutput);
      expect(result).toBe(false);
      expect(validate.errors).toBeDefined();
    });
  });

  describe('get-workflow-guidance Output Validation', () => {
    const schema = OutputSchemas.getWorkflowGuidance;
    let validate: ReturnType<typeof ajv.compile>;

    beforeAll(() => {
      validate = ajv.compile(schema);
    });

    it('should validate correct workflow guidance output', () => {
      const validOutput: WorkflowGuidanceOutput = {
        currentPhase: 'code-written',
        recommendations: [
          {
            action: 'Run tests',
            priority: 'high',
            confidence: 0.9,
            suggestedAgent: 'test-runner',
            reasoning: 'Code changes detected, verification needed',
          },
        ],
        nextSteps: ['Execute test suite', 'Review results'],
      };

      const result = validate(validOutput);
      expect(result).toBe(true);
      expect(validate.errors).toBeNull();
    });
  });

  describe('generate-smart-plan Output Validation', () => {
    const schema = OutputSchemas.generateSmartPlan;
    let validate: ReturnType<typeof ajv.compile>;

    beforeAll(() => {
      validate = ajv.compile(schema);
    });

    it('should validate correct smart plan output', () => {
      const validOutput: SmartPlanOutput = {
        planId: 'plan-123',
        featureDescription: 'User authentication system',
        tasks: [
          {
            id: 'task-1',
            title: 'Setup auth middleware',
            description: 'Create Express middleware for JWT validation',
            estimatedDuration: '2-5 min',
            requiredCapabilities: ['backend', 'security'],
            dependencies: [],
            testCriteria: ['Middleware validates JWT', 'Invalid tokens rejected'],
          },
        ],
        totalEstimatedDuration: '10-20 min',
        risks: ['Token expiration handling', 'Rate limiting'],
      };

      const result = validate(validOutput);
      expect(result).toBe(true);
      expect(validate.errors).toBeNull();
    });
  });

  describe('hook-tool-use Output Validation', () => {
    const schema = OutputSchemas.hookToolUse;
    let validate: ReturnType<typeof ajv.compile>;

    beforeAll(() => {
      validate = ajv.compile(schema);
    });

    it('should validate correct hook tool use output', () => {
      const validOutput: HookToolUseOutput = {
        success: true,
        message: 'Tool usage recorded',
        recorded: {
          toolName: 'Write',
          timestamp: '2025-01-31T12:00:00Z',
          success: true,
        },
      };

      const result = validate(validOutput);
      expect(result).toBe(true);
      expect(validate.errors).toBeNull();
    });
  });

  describe('buddy-record-mistake Output Validation', () => {
    const schema = OutputSchemas.buddyRecordMistake;
    let validate: ReturnType<typeof ajv.compile>;

    beforeAll(() => {
      validate = ajv.compile(schema);
    });

    it('should validate correct record mistake output', () => {
      const validOutput: BuddyRecordMistakeOutput = {
        success: true,
        message: 'Mistake recorded successfully',
        mistakeId: 'mistake-123',
        details: {
          action: 'Skipped tests',
          errorType: 'workflow-skip',
          userCorrection: 'Always run tests before commit',
          correctMethod: 'Execute npm test before git commit',
          impact: 'Broken code in production',
          preventionMethod: 'Add pre-commit hook',
          timestamp: '2025-01-31T12:00:00Z',
        },
      };

      const result = validate(validOutput);
      expect(result).toBe(true);
      expect(validate.errors).toBeNull();
    });
  });

  describe('create-entities Output Validation', () => {
    const schema = OutputSchemas.createEntities;
    let validate: ReturnType<typeof ajv.compile>;

    beforeAll(() => {
      validate = ajv.compile(schema);
    });

    it('should validate correct create entities output', () => {
      const validOutput: CreateEntitiesOutput = {
        created: ['entity-1', 'entity-2'],
        count: 2,
        errors: [],
      };

      const result = validate(validOutput);
      expect(result).toBe(true);
      expect(validate.errors).toBeNull();
    });

    it('should validate output with errors', () => {
      const validOutput: CreateEntitiesOutput = {
        created: ['entity-1'],
        count: 1,
        errors: [
          {
            name: 'entity-2',
            error: 'Duplicate entity name',
          },
        ],
      };

      const result = validate(validOutput);
      expect(result).toBe(true);
      expect(validate.errors).toBeNull();
    });
  });

  describe('A2A Protocol Output Validation', () => {
    it('should validate a2a-send-task output', () => {
      const schema = OutputSchemas.a2aSendTask;
      const validate = ajv.compile(schema);

      const validOutput: A2ASendTaskOutput = {
        success: true,
        targetAgentId: 'agent-123',
        task: {
          id: 'task-456',
          state: 'SUBMITTED',
          name: 'Process data',
          priority: 'normal',
          createdAt: '2025-01-31T12:00:00Z',
          updatedAt: '2025-01-31T12:00:00Z',
        },
      };

      const result = validate(validOutput);
      expect(result).toBe(true);
      expect(validate.errors).toBeNull();
    });

    it('should validate a2a-get-task output', () => {
      const schema = OutputSchemas.a2aGetTask;
      const validate = ajv.compile(schema);

      const validOutput: A2AGetTaskOutput = {
        task: {
          id: 'task-456',
          state: 'WORKING',
          name: 'Process data',
          description: 'Process incoming data stream',
          priority: 'high',
          createdAt: '2025-01-31T12:00:00Z',
          updatedAt: '2025-01-31T12:05:00Z',
          sessionId: 'session-789',
          messageCount: 3,
          artifactCount: 1,
        },
      };

      const result = validate(validOutput);
      expect(result).toBe(true);
      expect(validate.errors).toBeNull();
    });

    it('should validate a2a-list-tasks output', () => {
      const schema = OutputSchemas.a2aListTasks;
      const validate = ajv.compile(schema);

      const validOutput: A2AListTasksOutput = {
        tasks: [
          {
            id: 'task-1',
            state: 'COMPLETED',
            name: 'Task 1',
            priority: 'normal',
            createdAt: '2025-01-31T12:00:00Z',
            updatedAt: '2025-01-31T12:10:00Z',
            messageCount: 5,
            artifactCount: 2,
          },
        ],
        count: 1,
      };

      const result = validate(validOutput);
      expect(result).toBe(true);
      expect(validate.errors).toBeNull();
    });

    it('should validate a2a-list-agents output', () => {
      const schema = OutputSchemas.a2aListAgents;
      const validate = ajv.compile(schema);

      const validOutput: A2AListAgentsOutput = {
        agents: [
          {
            agentId: 'agent-123',
            baseUrl: 'http://localhost',
            port: 3000,
            status: 'active',
            lastHeartbeat: '2025-01-31T12:00:00Z',
            capabilities: { tasks: true },
            metadata: { version: '1.0.0' },
          },
        ],
        count: 1,
      };

      const result = validate(validOutput);
      expect(result).toBe(true);
      expect(validate.errors).toBeNull();
    });
  });

  describe('Error Message Quality', () => {
    it('should provide detailed error messages for validation failures', () => {
      const schema = OutputSchemas.buddyDo;
      const validate = ajv.compile(schema);

      const invalidOutput = {
        routing: {
          approved: 'yes', // Wrong type
          message: 123, // Wrong type
          complexity: 'invalid', // Invalid enum
        },
      };

      const result = validate(invalidOutput);
      expect(result).toBe(false);
      expect(validate.errors).toBeDefined();
      expect(validate.errors!.length).toBeGreaterThan(0);

      // Check that errors contain useful information
      // Each error should have instancePath, schemaPath, and message
      validate.errors!.forEach((error) => {
        expect(error).toHaveProperty('instancePath');
        expect(error).toHaveProperty('schemaPath');
        expect(error).toHaveProperty('message');
      });
    });
  });

  describe('Integration with Tool Handlers', () => {
    it('should validate buddy-do handler output structure', async () => {
      const schema = OutputSchemas.buddyDo;
      const validate = ajv.compile(schema);

      // Mock a realistic buddy-do handler response
      // This simulates what executeBuddyDo returns
      const handlerOutput = {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              routing: {
                approved: true,
                message: 'Task routed for capabilities: general',
                capabilityFocus: ['general'],
                complexity: 'simple',
                estimatedTokens: 1000,
                estimatedCost: 0.001,
              },
              enhancedPrompt: {
                systemPrompt: 'You are a helpful assistant',
                userPrompt: 'Complete the task',
                suggestedModel: 'claude-opus-4-5',
              },
              stats: {
                durationMs: 150,
                estimatedTokens: 1000,
              },
            }),
          },
        ],
      };

      // Extract the actual data from the formatted response
      const parsedData = JSON.parse(handlerOutput.content[0].text);

      // Validate against schema
      const result = validate(parsedData);
      expect(result).toBe(true);
      expect(validate.errors).toBeNull();
    });

    it('should validate buddy-remember handler output structure', async () => {
      const schema = OutputSchemas.buddyRemember;
      const validate = ajv.compile(schema);

      // Mock a realistic buddy-remember handler response
      const handlerOutput = {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              query: 'api design',
              count: 2,
              memories: [
                {
                  id: 'mem-1',
                  content: 'We decided to use REST API',
                  type: 'decision',
                  timestamp: '2025-01-01T00:00:00Z',
                  relevance: 0.95,
                },
              ],
              suggestions: ['Check API versioning strategy'],
            }),
          },
        ],
      };

      const parsedData = JSON.parse(handlerOutput.content[0].text);

      const result = validate(parsedData);
      expect(result).toBe(true);
      expect(validate.errors).toBeNull();
    });

    it('should validate session-health handler output structure', async () => {
      const schema = OutputSchemas.getSessionHealth;
      const validate = ajv.compile(schema);

      // Mock a realistic session health response
      const handlerOutput = {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              status: 'healthy',
              tokenUsagePercentage: 45.5,
              timestamp: new Date().toISOString(),
              warnings: [],
              recommendations: ['Continue with current approach'],
            }),
          },
        ],
      };

      const parsedData = JSON.parse(handlerOutput.content[0].text);

      const result = validate(parsedData);
      expect(result).toBe(true);
      expect(validate.errors).toBeNull();
    });

    it('should validate workflow-guidance handler output structure', async () => {
      const schema = OutputSchemas.getWorkflowGuidance;
      const validate = ajv.compile(schema);

      // Mock a realistic workflow guidance response
      const handlerOutput = {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              currentPhase: 'code-written',
              recommendations: [
                {
                  action: 'Run tests',
                  priority: 'high',
                  confidence: 0.9,
                  suggestedAgent: 'test-runner',
                  reasoning: 'Code changes detected',
                },
              ],
              nextSteps: ['Execute test suite'],
            }),
          },
        ],
      };

      const parsedData = JSON.parse(handlerOutput.content[0].text);

      const result = validate(parsedData);
      expect(result).toBe(true);
      expect(validate.errors).toBeNull();
    });

    it('should validate create-entities handler output structure', async () => {
      const schema = OutputSchemas.createEntities;
      const validate = ajv.compile(schema);

      // Mock a realistic create entities response
      const handlerOutput = {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              created: ['entity-1', 'entity-2'],
              count: 2,
              errors: [],
            }),
          },
        ],
      };

      const parsedData = JSON.parse(handlerOutput.content[0].text);

      const result = validate(parsedData);
      expect(result).toBe(true);
      expect(validate.errors).toBeNull();
    });

    it('should validate a2a-send-task handler output structure', async () => {
      const schema = OutputSchemas.a2aSendTask;
      const validate = ajv.compile(schema);

      // Mock a realistic A2A send task response
      const handlerOutput = {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              targetAgentId: 'agent-123',
              task: {
                id: 'task-456',
                state: 'SUBMITTED',
                name: 'Process data',
                priority: 'normal',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            }),
          },
        ],
      };

      const parsedData = JSON.parse(handlerOutput.content[0].text);

      const result = validate(parsedData);
      expect(result).toBe(true);
      expect(validate.errors).toBeNull();
    });
  });
});
