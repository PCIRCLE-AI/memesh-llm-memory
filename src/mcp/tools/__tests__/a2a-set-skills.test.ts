/**
 * Tests for a2a-set-skills MCP Tool
 *
 * Comprehensive test coverage for setting agent skills in the unified task board.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { handleA2ASetSkills, A2ASetSkillsInputSchema } from '../a2a-set-skills.js';
import { TaskBoard } from '../../../a2a/storage/TaskBoard.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock the agentId module
vi.mock('../../../a2a/utils/agentId.js', () => ({
  generateAgentId: vi.fn(() => 'test-host-testuser-claude-code'),
}));

// Mock the platformDetection module
vi.mock('../../../a2a/utils/platformDetection.js', () => ({
  detectPlatform: vi.fn(() => 'claude-code'),
}));

describe('a2a-set-skills MCP Tool', () => {
  let testDbPath: string;
  let taskBoard: TaskBoard;

  beforeEach(() => {
    // Use temp directory for test database with unique name
    testDbPath = path.join(
      os.tmpdir(),
      `test-a2a-set-skills-${Date.now()}-${Math.random().toString(36).substring(7)}.db`
    );
    taskBoard = new TaskBoard(testDbPath);
  });

  afterEach(() => {
    taskBoard.close();
    // Cleanup test database files
    try {
      fs.unlinkSync(testDbPath);
    } catch {
      // Ignore if file doesn't exist
    }
    try {
      fs.unlinkSync(testDbPath + '-wal');
    } catch {
      // Ignore WAL file
    }
    try {
      fs.unlinkSync(testDbPath + '-shm');
    } catch {
      // Ignore SHM file
    }
  });

  describe('Input Validation', () => {
    it('should accept valid skills array', () => {
      const result = A2ASetSkillsInputSchema.safeParse({
        skills: ['typescript', 'testing', 'code-review'],
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty skills array (clears skills)', () => {
      const result = A2ASetSkillsInputSchema.safeParse({
        skills: [],
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing skills field', () => {
      const result = A2ASetSkillsInputSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject non-array skills', () => {
      const result = A2ASetSkillsInputSchema.safeParse({
        skills: 'typescript',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty string skill', () => {
      const result = A2ASetSkillsInputSchema.safeParse({
        skills: ['typescript', ''],
      });
      expect(result.success).toBe(false);
    });

    it('should reject whitespace-only skill', () => {
      const result = A2ASetSkillsInputSchema.safeParse({
        skills: ['typescript', '   '],
      });
      expect(result.success).toBe(false);
    });

    it('should reject skill exceeding 100 characters', () => {
      const longSkill = 'a'.repeat(101);
      const result = A2ASetSkillsInputSchema.safeParse({
        skills: [longSkill],
      });
      expect(result.success).toBe(false);
    });

    it('should accept skill with exactly 100 characters', () => {
      const maxSkill = 'a'.repeat(100);
      const result = A2ASetSkillsInputSchema.safeParse({
        skills: [maxSkill],
      });
      expect(result.success).toBe(true);
    });

    it('should reject non-string skills array elements', () => {
      const result = A2ASetSkillsInputSchema.safeParse({
        skills: ['typescript', 123],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('handleA2ASetSkills - New Agent Registration', () => {
    it('should register new agent with skills when agent does not exist', () => {
      const result = handleA2ASetSkills(
        { skills: ['typescript', 'testing'] },
        testDbPath
      );

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const text = result.content[0].text;
      expect(text).toContain('Skills updated successfully');
      expect(text).toContain('test-host-testuser-claude-code');
      expect(text).toContain('claude-code');
      expect(text).toContain('typescript');
      expect(text).toContain('testing');
    });

    it('should persist agent in database after registration', () => {
      handleA2ASetSkills({ skills: ['nodejs', 'api-design'] }, testDbPath);

      // Verify agent was persisted
      const agent = taskBoard.getAgent('test-host-testuser-claude-code');
      expect(agent).not.toBeNull();
      expect(agent!.agent_id).toBe('test-host-testuser-claude-code');
      expect(agent!.platform).toBe('claude-code');
    });

    it('should store skills in agent record', () => {
      handleA2ASetSkills({ skills: ['python', 'data-analysis'] }, testDbPath);

      const agent = taskBoard.getAgent('test-host-testuser-claude-code');
      expect(agent).not.toBeNull();
      expect(agent!.skills).not.toBeNull();

      const skills = JSON.parse(agent!.skills!);
      expect(skills).toContain('python');
      expect(skills).toContain('data-analysis');
    });
  });

  describe('handleA2ASetSkills - Update Existing Agent', () => {
    it('should update skills for existing agent', () => {
      // First, register the agent with initial skills
      taskBoard.registerAgent({
        agent_id: 'test-host-testuser-claude-code',
        platform: 'claude-code',
        hostname: 'test-host',
        username: 'testuser',
        skills: ['old-skill'],
      });

      // Now update skills
      const result = handleA2ASetSkills(
        { skills: ['new-skill-1', 'new-skill-2'] },
        testDbPath
      );

      const text = result.content[0].text;
      expect(text).toContain('Skills updated successfully');
      expect(text).toContain('new-skill-1');
      expect(text).toContain('new-skill-2');

      // Verify skills were updated in database
      const agent = taskBoard.getAgent('test-host-testuser-claude-code');
      const skills = JSON.parse(agent!.skills!);
      expect(skills).toContain('new-skill-1');
      expect(skills).toContain('new-skill-2');
      expect(skills).not.toContain('old-skill');
    });
  });

  describe('handleA2ASetSkills - Skills Processing', () => {
    it('should trim whitespace from skills', () => {
      const result = handleA2ASetSkills(
        { skills: ['  typescript  ', '  testing  '] },
        testDbPath
      );

      const text = result.content[0].text;
      // Skills should appear trimmed in output
      expect(text).toMatch(/typescript/);
      expect(text).toMatch(/testing/);

      // Verify trimmed in database
      const agent = taskBoard.getAgent('test-host-testuser-claude-code');
      const skills = JSON.parse(agent!.skills!);
      expect(skills).toContain('typescript');
      expect(skills).toContain('testing');
    });

    it('should accept empty skills array (clears skills)', () => {
      // First register with skills
      taskBoard.registerAgent({
        agent_id: 'test-host-testuser-claude-code',
        platform: 'claude-code',
        hostname: 'test-host',
        username: 'testuser',
        skills: ['existing-skill'],
      });

      // Clear skills
      const result = handleA2ASetSkills({ skills: [] }, testDbPath);

      const text = result.content[0].text;
      expect(text).toContain('Skills updated successfully');

      // Verify skills were cleared
      const agent = taskBoard.getAgent('test-host-testuser-claude-code');
      const skills = JSON.parse(agent!.skills!);
      expect(skills).toEqual([]);
    });
  });

  describe('handleA2ASetSkills - Output Format', () => {
    it('should return proper MCP tool result structure', () => {
      const result = handleA2ASetSkills({ skills: ['format-test'] }, testDbPath);

      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');
      expect(typeof result.content[0].text).toBe('string');
    });

    it('should include success indicator in output', () => {
      const result = handleA2ASetSkills({ skills: ['success-test'] }, testDbPath);
      const text = result.content[0].text;

      // Should have checkmark or success indicator
      expect(text).toMatch(/[✅]/);
    });

    it('should include agent ID in output', () => {
      const result = handleA2ASetSkills({ skills: ['agent-id-test'] }, testDbPath);
      const text = result.content[0].text;

      expect(text).toContain('test-host-testuser-claude-code');
    });

    it('should include platform in output', () => {
      const result = handleA2ASetSkills({ skills: ['platform-test'] }, testDbPath);
      const text = result.content[0].text;

      expect(text).toContain('claude-code');
    });

    it('should include all skills in output', () => {
      const result = handleA2ASetSkills(
        { skills: ['skill-a', 'skill-b', 'skill-c'] },
        testDbPath
      );
      const text = result.content[0].text;

      expect(text).toContain('skill-a');
      expect(text).toContain('skill-b');
      expect(text).toContain('skill-c');
    });

    it('should include guidance for next steps', () => {
      const result = handleA2ASetSkills({ skills: ['guidance-test'] }, testDbPath);
      const text = result.content[0].text;

      expect(text).toContain('a2a-find-tasks');
    });
  });

  describe('handleA2ASetSkills - Error Cases', () => {
    it('should handle database errors gracefully', () => {
      // Use an invalid path that will cause database error
      const invalidPath = '/invalid/path/that/does/not/exist/test.db';

      const result = handleA2ASetSkills({ skills: ['test'] }, invalidPath);
      const text = result.content[0].text;

      expect(text).toContain('Error');
    });

    it('should include error indicator for failures', () => {
      const invalidPath = '/invalid/path/that/does/not/exist/test.db';

      const result = handleA2ASetSkills({ skills: ['test'] }, invalidPath);
      const text = result.content[0].text;

      // Should have error indicator
      expect(text).toMatch(/[❌]/);
    });
  });
});
