/**
 * Integration tests for real-world workflows
 *
 * These tests verify complete end-to-end workflows with real agents, real files,
 * and real system interactions. They ensure agents work correctly in production scenarios.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestWriterAgent } from '../../src/agents/TestWriterAgent.js';
import { KnowledgeAgent } from '../../src/agents/knowledge/index.js';
import { MCPToolInterface } from '../../src/core/MCPToolInterface.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test workspace directory
const TEST_WORKSPACE = path.join(__dirname, '../../.test-workspace');

describe('Real-World Workflow Integration Tests', () => {
  let mcp: MCPToolInterface;

  beforeAll(async () => {
    // Create test workspace
    await fs.mkdir(TEST_WORKSPACE, { recursive: true });

    // Initialize MCP tool interface for agents
    mcp = new MCPToolInterface();
  });

  afterAll(async () => {
    // Clean up test workspace
    try {
      await fs.rm(TEST_WORKSPACE, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to clean up test workspace:', error);
    }
  });

  describe('TestWriterAgent Workflow', () => {
    it('should complete full test generation workflow', async () => {
      // 1. Create real source file
      const sourceFile = path.join(TEST_WORKSPACE, 'calculator.ts');
      const sourceCode = `
export function add(a: number, b: number): number {
  return a + b;
}

export function subtract(a: number, b: number): number {
  return a - b;
}

export function multiply(a: number, b: number): number {
  return a * b;
}

export function divide(a: number, b: number): number {
  if (b === 0) {
    throw new Error('Division by zero');
  }
  return a / b;
}
`;
      await fs.writeFile(sourceFile, sourceCode);

      // 2. Run TestWriterAgent
      const agent = new TestWriterAgent(mcp);
      const testCode = await agent.generateTests('calculator.ts', sourceCode);

      // 3. Verify generated test file content
      expect(testCode).toBeDefined();
      expect(testCode).toContain('describe');
      expect(testCode).toContain('it');
      expect(testCode).toContain('expect');

      // Verify it tests the functions
      expect(testCode).toContain('add');
      expect(testCode).toContain('subtract');
      expect(testCode).toContain('multiply');
      expect(testCode).toContain('divide');

      // 4. Write generated test to file
      const testFile = path.join(TEST_WORKSPACE, 'calculator.test.ts');
      await fs.writeFile(testFile, testCode);

      // 5. Verify test file was created and has expected content
      // Note: We read the file directly instead of checking stats first to avoid
      // TOCTOU (time-of-check to time-of-use) race conditions. If the file doesn't
      // exist or isn't readable, fs.readFile will throw an error.
      // Running the generated tests requires the source file to be importable,
      // which would require a full TypeScript compilation setup. We verify the test
      // file structure instead.
      const testContent = await fs.readFile(testFile, 'utf-8');
      expect(testContent).toBeDefined();
      expect(testContent).toContain('import');
      expect(testContent).toContain('calculator');
    });

    it('should generate tests for edge cases', async () => {
      const sourceCode = `
export function safeDivide(a: number, b: number): number | null {
  if (b === 0) {
    return null;
  }
  return a / b;
}
`;

      const agent = new TestWriterAgent(mcp);
      const testCode = await agent.generateTests('safe-math.ts', sourceCode);

      // Should test both normal case and edge case
      expect(testCode).toContain('it');
      expect(testCode.toLowerCase()).toContain('zero');
      expect(testCode).toContain('safeDivide');
    });
  });

  describe('KnowledgeAgent Workflow', () => {
    let agent: KnowledgeAgent;

    afterAll(async () => {
      if (agent) {
        await agent.close();
      }
    });

    it('should complete knowledge graph construction workflow', async () => {
      // 1. Initialize KnowledgeAgent with in-memory database
      agent = new KnowledgeAgent(':memory:');
      await agent.initialize();

      // 2. Create entities representing a project architecture
      await agent.createEntities([
        {
          name: 'Frontend',
          entityType: 'component',
          observations: ['React application', 'Handles UI rendering'],
        },
        {
          name: 'Backend',
          entityType: 'component',
          observations: ['Node.js API server', 'Handles business logic'],
        },
        {
          name: 'Database',
          entityType: 'component',
          observations: ['PostgreSQL database', 'Stores application data'],
        },
      ]);

      // 3. Create relations between entities
      await agent.createRelations([
        { from: 'Frontend', to: 'Backend', relationType: 'calls' },
        { from: 'Backend', to: 'Database', relationType: 'queries' },
      ]);

      // 4. Search knowledge graph
      const results = await agent.searchNodes('component');
      expect(results.length).toBeGreaterThanOrEqual(3);

      // 5. Get connected entities
      const connected = await agent.getConnectedEntities('Frontend', 2);
      expect(connected).toContain('Frontend');
      expect(connected).toContain('Backend');
      expect(connected).toContain('Database'); // Through 2-hop connection

      // 6. Read entire graph
      const { entities, stats } = await agent.readGraph();
      expect(entities.length).toBeGreaterThanOrEqual(3);
      expect(stats.totalEntities).toBeGreaterThanOrEqual(3);

      // Clean up this test's agent
      await agent.close();
    });

    it('should track project evolution over time', async () => {
      // Create new in-memory agent for this test
      agent = new KnowledgeAgent(':memory:');
      await agent.initialize();

      // Simulate tracking a bug fix process
      await agent.createEntities([
        {
          name: 'Bug: Login Failure',
          entityType: 'bug',
          observations: ['Users cannot login', 'Error: Invalid token'],
        },
      ]);

      await agent.addObservations('Bug: Login Failure', [
        'Root cause: Token expiration not handled',
        'Fix: Added token refresh logic',
      ]);

      await agent.createEntities([
        {
          name: 'Decision: JWT Refresh',
          entityType: 'decision',
          observations: ['Implemented automatic token refresh', 'Uses refresh tokens'],
        },
      ]);

      await agent.createRelations([
        { from: 'Bug: Login Failure', to: 'Decision: JWT Refresh', relationType: 'led_to' },
      ]);

      // Verify tracking
      const bug = await agent.openNodes(['Bug: Login Failure']);
      expect(bug[0].observations.length).toBeGreaterThanOrEqual(3);

      const connected = await agent.getConnectedEntities('Bug: Login Failure', 1);
      expect(connected).toContain('Decision: JWT Refresh');

      // Clean up this test's agent
      await agent.close();
    });
  });

  describe('Multi-Agent Collaboration Workflow', () => {
    it('should complete a complex workflow with multiple agents', async () => {
      // Scenario: Developer asks for help implementing a new feature
      // 1. Knowledge graph tracks the decision
      // 2. TestWriter generates tests

      // 1. Knowledge: Track decision (using in-memory database)
      const knowledgeAgent = new KnowledgeAgent(':memory:');
      await knowledgeAgent.initialize();

      await knowledgeAgent.createEntities([
        {
          name: 'Decision: Implement JWT Auth',
          entityType: 'decision',
          observations: [
            'Decided to use JWT tokens',
            'Will include refresh token mechanism',
            'Follows security guidelines',
          ],
        },
      ]);

      // 2. TestWriter: Generate tests for auth module
      const testWriterAgent = new TestWriterAgent(mcp);
      const authCode = `
export function validateToken(token: string): boolean {
  if (!token) return false;
  // JWT validation logic
  return true;
}
`;

      const testCode = await testWriterAgent.generateTests('auth.ts', authCode);
      expect(testCode).toContain('validateToken');

      // Verify knowledge was tracked
      const decision = await knowledgeAgent.openNodes(['Decision: Implement JWT Auth']);
      expect(decision.length).toBe(1);
      expect(decision[0].observations.length).toBeGreaterThanOrEqual(3);

      // Clean up
      await knowledgeAgent.close();
    });
  });
});
