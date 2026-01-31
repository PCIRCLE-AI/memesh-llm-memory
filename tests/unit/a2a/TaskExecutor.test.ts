/**
 * TaskExecutor Unit Tests
 * Tests for A2A Protocol Task Executor (Phase 0.5 - Simplified)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TaskExecutor } from '../../../src/a2a/executor/TaskExecutor.js';
import { TaskQueue } from '../../../src/a2a/storage/TaskQueue.js';
import { unlinkSync, existsSync } from 'fs';
import { join } from 'path';

describe('TaskExecutor (Phase 0.5 - Simplified)', () => {
  const testDbPath = join(process.cwd(), 'test-executor.db');
  let taskQueue: TaskQueue;
  let executor: TaskExecutor;

  beforeEach(() => {
    // Clean up any existing test database
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }

    taskQueue = new TaskQueue('test-executor', testDbPath);
    executor = new TaskExecutor(taskQueue);
  });

  afterEach(() => {
    taskQueue.close();
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
  });

  describe('Task State Transitions', () => {
    it('should transition task from SUBMITTED to WORKING when execution starts', async () => {
      // Arrange: Create a task
      const task = taskQueue.createTask({
        name: 'Test Task',
        description: 'Test task for state transitions',
        initialMessage: {
          role: 'user',
          parts: [{ type: 'text', text: 'Hello, please help me with this task.' }],
        },
      });

      expect(task.state).toBe('SUBMITTED');

      // Act: Execute the task (start execution)
      const executionPromise = executor.executeTask(task.id);

      // Wait a bit for state to update to WORKING
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Assert: Task should be in WORKING state
      const workingTask = taskQueue.getTask(task.id);
      expect(workingTask).not.toBeNull();
      expect(workingTask!.state).toBe('WORKING');

      // Wait for execution to complete
      await executionPromise;
    });

    it('should transition task from WORKING to COMPLETED after execution finishes', async () => {
      // Arrange: Create a task
      const task = taskQueue.createTask({
        name: 'Test Task',
        description: 'Test task for completion',
        initialMessage: {
          role: 'user',
          parts: [{ type: 'text', text: 'Complete this task.' }],
        },
      });

      // Act: Execute the task
      await executor.executeTask(task.id);

      // Assert: Task should be in COMPLETED state
      const completedTask = taskQueue.getTask(task.id);
      expect(completedTask).not.toBeNull();
      expect(completedTask!.state).toBe('COMPLETED');
    });

    it('should complete full lifecycle: SUBMITTED → WORKING → COMPLETED', async () => {
      // Arrange
      const task = taskQueue.createTask({
        name: 'Full Lifecycle Test',
        description: 'Test complete state transition lifecycle',
        initialMessage: {
          role: 'user',
          parts: [{ type: 'text', text: 'Test message' }],
        },
      });

      // Assert initial state
      expect(task.state).toBe('SUBMITTED');

      // Act & Assert: Execute and verify transitions
      const executionPromise = executor.executeTask(task.id);

      // Check WORKING state
      await new Promise((resolve) => setTimeout(resolve, 50));
      const workingTask = taskQueue.getTask(task.id);
      expect(workingTask!.state).toBe('WORKING');

      // Wait for completion
      await executionPromise;

      // Check COMPLETED state
      const completedTask = taskQueue.getTask(task.id);
      expect(completedTask!.state).toBe('COMPLETED');
    });
  });

  describe('Artifact Generation', () => {
    it('should generate artifact with echo response after task completion', async () => {
      // Arrange: Create a task with a message
      const userMessage = 'Please echo this message back to me.';
      const task = taskQueue.createTask({
        name: 'Echo Test',
        description: 'Test artifact generation',
        initialMessage: {
          role: 'user',
          parts: [{ type: 'text', text: userMessage }],
        },
      });

      // Act: Execute the task
      await executor.executeTask(task.id);

      // Assert: Task should have an artifact
      const completedTask = taskQueue.getTask(task.id);
      expect(completedTask).not.toBeNull();
      expect(completedTask!.artifacts).toBeDefined();
      expect(completedTask!.artifacts!.length).toBeGreaterThan(0);

      // Assert: Artifact should contain echo response
      const artifact = completedTask!.artifacts![0];
      expect(artifact.type).toBe('text/plain');
      expect(artifact.content).toContain('Echo:');
      expect(artifact.content).toContain(userMessage);
    });

    it('should add assistant message with response content', async () => {
      // Arrange
      const task = taskQueue.createTask({
        name: 'Assistant Message Test',
        description: 'Test assistant response message',
        initialMessage: {
          role: 'user',
          parts: [{ type: 'text', text: 'Hello assistant' }],
        },
      });

      const initialMessageCount = task.messages.length;

      // Act: Execute the task
      await executor.executeTask(task.id);

      // Assert: Should have added an assistant message
      const completedTask = taskQueue.getTask(task.id);
      expect(completedTask).not.toBeNull();
      expect(completedTask!.messages.length).toBe(initialMessageCount + 1);

      const assistantMessage = completedTask!.messages[completedTask!.messages.length - 1];
      expect(assistantMessage.role).toBe('assistant');
      expect(assistantMessage.parts).toBeDefined();
      expect(assistantMessage.parts.length).toBeGreaterThan(0);
      expect(assistantMessage.parts[0].type).toBe('text');
    });

    it('should handle tasks without initial messages', async () => {
      // Arrange: Create task without initial message
      const task = taskQueue.createTask({
        name: 'No Message Test',
        description: 'Task without initial message',
      });

      // Act: Execute the task
      await executor.executeTask(task.id);

      // Assert: Should complete successfully with default response
      const completedTask = taskQueue.getTask(task.id);
      expect(completedTask).not.toBeNull();
      expect(completedTask!.state).toBe('COMPLETED');
      expect(completedTask!.artifacts!.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent task gracefully', async () => {
      // Act & Assert
      await expect(executor.executeTask('non-existent-id')).rejects.toThrow();
    });

    it('should transition to FAILED state when execution encounters error', async () => {
      // Arrange: Create a task
      const task = taskQueue.createTask({
        name: 'Error Test Task',
        description: 'Task that will fail during execution',
        initialMessage: {
          role: 'user',
          parts: [{ type: 'text', text: 'Test error handling' }],
        },
      });

      // Mock TaskQueue.addMessage to throw error
      const originalAddMessage = taskQueue.addMessage.bind(taskQueue);
      taskQueue.addMessage = () => {
        throw new Error('Simulated execution error');
      };

      // Act: Execute the task (should fail)
      try {
        await executor.executeTask(task.id);
      } catch (error) {
        // Expected to throw
      }

      // Restore original method
      taskQueue.addMessage = originalAddMessage;

      // Assert: Task should be in FAILED state
      const failedTask = taskQueue.getTask(task.id);
      expect(failedTask).not.toBeNull();
      expect(failedTask!.state).toBe('FAILED');
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple user messages and concatenate them', async () => {
      // Arrange: Create task with initial message
      const task = taskQueue.createTask({
        name: 'Multiple Messages Test',
        description: 'Test multiple user messages',
        initialMessage: {
          role: 'user',
          parts: [{ type: 'text', text: 'First message' }],
        },
      });

      // Add more user messages
      taskQueue.addMessage({
        taskId: task.id,
        role: 'user',
        parts: [{ type: 'text', text: 'Second message' }],
      });

      taskQueue.addMessage({
        taskId: task.id,
        role: 'user',
        parts: [{ type: 'text', text: 'Third message' }],
      });

      // Act: Execute the task
      await executor.executeTask(task.id);

      // Assert: Response should contain all user messages
      const completedTask = taskQueue.getTask(task.id);
      expect(completedTask).not.toBeNull();

      const artifact = completedTask!.artifacts![0];
      expect(artifact.content).toContain('First message');
      expect(artifact.content).toContain('Second message');
      expect(artifact.content).toContain('Third message');
    });

    it('should handle messages with non-text parts gracefully', async () => {
      // Arrange: Create task with mixed message parts
      const task = taskQueue.createTask({
        name: 'Mixed Parts Test',
        description: 'Test messages with non-text parts',
        initialMessage: {
          role: 'user',
          parts: [
            { type: 'text', text: 'Text part' },
            { type: 'image', source: { type: 'base64', data: 'fake-image-data' } } as any,
          ],
        },
      });

      // Act: Execute the task
      await executor.executeTask(task.id);

      // Assert: Should complete successfully, extracting only text parts
      const completedTask = taskQueue.getTask(task.id);
      expect(completedTask).not.toBeNull();
      expect(completedTask!.state).toBe('COMPLETED');

      const artifact = completedTask!.artifacts![0];
      expect(artifact.content).toContain('Text part');
      // Should not fail on non-text parts
    });

    it('should handle tasks with only non-text message parts', async () => {
      // Arrange: Create task with only image parts
      const task = taskQueue.createTask({
        name: 'Image Only Test',
        description: 'Test messages with only image parts',
        initialMessage: {
          role: 'user',
          parts: [
            { type: 'image', source: { type: 'base64', data: 'fake-image-data' } } as any,
          ],
        },
      });

      // Act: Execute the task
      await executor.executeTask(task.id);

      // Assert: Should complete with fallback message
      const completedTask = taskQueue.getTask(task.id);
      expect(completedTask).not.toBeNull();
      expect(completedTask!.state).toBe('COMPLETED');

      const artifact = completedTask!.artifacts![0];
      expect(artifact.content).toContain('(No text content in messages)');
    });

    it('should handle tasks with multiple message parts in single message', async () => {
      // Arrange: Create task with multiple text parts in one message
      const task = taskQueue.createTask({
        name: 'Multiple Parts Test',
        description: 'Test message with multiple text parts',
        initialMessage: {
          role: 'user',
          parts: [
            { type: 'text', text: 'Part one' },
            { type: 'text', text: 'Part two' },
            { type: 'text', text: 'Part three' },
          ],
        },
      });

      // Act: Execute the task
      await executor.executeTask(task.id);

      // Assert: All parts should be concatenated
      const completedTask = taskQueue.getTask(task.id);
      expect(completedTask).not.toBeNull();

      const artifact = completedTask!.artifacts![0];
      expect(artifact.content).toContain('Part one');
      expect(artifact.content).toContain('Part two');
      expect(artifact.content).toContain('Part three');
    });
  });
});
