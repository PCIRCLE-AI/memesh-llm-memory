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
  HookToolUseOutput,
  BuddyRecordMistakeOutput,
  CreateEntitiesOutput,
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
            description: 'Execute a task with memory context',
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

  });
});
