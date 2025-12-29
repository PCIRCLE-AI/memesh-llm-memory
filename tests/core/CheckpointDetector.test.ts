import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CheckpointDetector } from '../../src/core/CheckpointDetector.js';

describe('CheckpointDetector', () => {
  let detector: CheckpointDetector;

  beforeEach(() => {
    detector = new CheckpointDetector();
  });

  describe('Checkpoint Registration', () => {
    it('should register a checkpoint with callback', () => {
      const callback = vi.fn();
      const result = detector.registerCheckpoint('test-complete', callback);

      expect(result).toBe(true);
      expect(detector.isCheckpointRegistered('test-complete')).toBe(true);
    });

    it('should check if a checkpoint is registered', () => {
      expect(detector.isCheckpointRegistered('nonexistent')).toBe(false);

      const callback = vi.fn();
      detector.registerCheckpoint('code-written', callback);

      expect(detector.isCheckpointRegistered('code-written')).toBe(true);
    });

    it('should get list of all registered checkpoints', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      detector.registerCheckpoint('test-complete', callback1);
      detector.registerCheckpoint('code-written', callback2);

      const checkpoints = detector.getRegisteredCheckpoints();

      expect(checkpoints).toHaveLength(2);
      expect(checkpoints).toContain('test-complete');
      expect(checkpoints).toContain('code-written');
    });
  });

  describe('Checkpoint Triggering', () => {
    it('should trigger a registered checkpoint callback', async () => {
      const callback = vi.fn().mockResolvedValue({ success: true });
      detector.registerCheckpoint('test-complete', callback);

      const result = await detector.triggerCheckpoint('test-complete', {
        testResults: { passed: 10, failed: 0 },
      });

      expect(callback).toHaveBeenCalledWith({
        testResults: { passed: 10, failed: 0 },
      });
      expect(result.triggered).toBe(true);
      expect(result.checkpointName).toBe('test-complete');
    });

    it('should throw error when triggering unregistered checkpoint', async () => {
      await expect(
        detector.triggerCheckpoint('unregistered', {})
      ).rejects.toThrow('Checkpoint "unregistered" is not registered');
    });

    it('should handle callback errors gracefully', async () => {
      const callback = vi.fn().mockRejectedValue(new Error('Callback failed'));
      detector.registerCheckpoint('error-checkpoint', callback);

      const result = await detector.triggerCheckpoint('error-checkpoint', {});

      expect(result.triggered).toBe(false);
      expect(result.error).toBe('Callback failed');
    });
  });

  describe('Multiple Callbacks per Checkpoint', () => {
    it('should support multiple callbacks for same checkpoint', async () => {
      const callback1 = vi.fn().mockResolvedValue({ success: true });
      const callback2 = vi.fn().mockResolvedValue({ success: true });

      detector.registerCheckpoint('test-complete', callback1);
      detector.addCallback('test-complete', callback2);

      await detector.triggerCheckpoint('test-complete', { data: 'test' });

      expect(callback1).toHaveBeenCalledWith({ data: 'test' });
      expect(callback2).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should execute all callbacks even if one fails', async () => {
      const callback1 = vi.fn().mockRejectedValue(new Error('Failed'));
      const callback2 = vi.fn().mockResolvedValue({ success: true });

      detector.registerCheckpoint('test-checkpoint', callback1);
      detector.addCallback('test-checkpoint', callback2);

      const result = await detector.triggerCheckpoint('test-checkpoint', {});

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
      expect(result.triggered).toBe(true);
      expect(result.failedCallbacks).toBe(1);
    });
  });

  describe('Checkpoint Unregistration', () => {
    it('should unregister a checkpoint', () => {
      const callback = vi.fn();
      detector.registerCheckpoint('temp-checkpoint', callback);

      expect(detector.isCheckpointRegistered('temp-checkpoint')).toBe(true);

      const result = detector.unregisterCheckpoint('temp-checkpoint');

      expect(result).toBe(true);
      expect(detector.isCheckpointRegistered('temp-checkpoint')).toBe(false);
    });

    it('should return false when unregistering nonexistent checkpoint', () => {
      const result = detector.unregisterCheckpoint('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('Checkpoint Metadata', () => {
    it('should store and retrieve checkpoint metadata', () => {
      const callback = vi.fn();
      const metadata = {
        description: 'Triggered when tests complete',
        priority: 'high',
        category: 'testing',
      };

      detector.registerCheckpoint('test-complete', callback, metadata);

      const retrieved = detector.getCheckpointMetadata('test-complete');

      expect(retrieved).toBeDefined();
      expect(retrieved?.description).toBe('Triggered when tests complete');
      expect(retrieved?.priority).toBe('high');
      expect(retrieved?.category).toBe('testing');
    });

    it('should return undefined for unregistered checkpoint metadata', () => {
      const result = detector.getCheckpointMetadata('nonexistent');

      expect(result).toBeUndefined();
    });
  });
});
