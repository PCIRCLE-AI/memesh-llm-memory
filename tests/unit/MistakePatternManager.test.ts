// tests/unit/MistakePatternManager.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MistakePatternManager } from '../../src/core/MistakePatternManager.js';
import type { UnifiedMemoryStore } from '../../src/memory/UnifiedMemoryStore.js';
import type { UnifiedMemory } from '../../src/memory/types/unified-memory.js';

describe('MistakePatternManager', () => {
  let manager: MistakePatternManager;
  let mockMemoryStore: UnifiedMemoryStore;

  beforeEach(() => {
    mockMemoryStore = {
      searchByType: vi.fn().mockResolvedValue([]),
    } as unknown as UnifiedMemoryStore;

    manager = new MistakePatternManager(mockMemoryStore);
  });

  describe('Basic pattern extraction', () => {
    it('should extract patterns from mistakes', async () => {
      const mockMistakes: UnifiedMemory[] = [
        {
          id: '1',
          type: 'mistake',
          content: 'Failed to run tests before commit',
          importance: 0.8,
          timestamp: new Date('2025-01-01'),
          tags: ['test', 'commit'],
          metadata: {
            errorType: 'workflow-violation',
            phase: 'commit-ready',
          },
        },
        {
          id: '2',
          type: 'mistake',
          content: 'Failed to run tests before commit',
          importance: 0.9,
          timestamp: new Date('2025-01-02'),
          tags: ['test', 'commit'],
          metadata: {
            errorType: 'workflow-violation',
            phase: 'commit-ready',
          },
        },
      ];

      vi.mocked(mockMemoryStore.searchByType).mockResolvedValue(mockMistakes);

      const patterns = await manager.extractPatterns('commit-ready');

      expect(patterns.length).toBeGreaterThan(0);
      // Should group similar mistakes together
      expect(patterns[0].occurrenceCount).toBeGreaterThanOrEqual(1);
    });

    it('should calculate pattern weight correctly', async () => {
      const mockMistakes: UnifiedMemory[] = [
        {
          id: '1',
          type: 'mistake',
          content: 'Test mistake',
          importance: 0.8,
          timestamp: new Date(),
          tags: [],
          metadata: { errorType: 'test-error' },
        },
      ];

      vi.mocked(mockMemoryStore.searchByType).mockResolvedValue(mockMistakes);

      const patterns = await manager.extractPatterns();

      expect(patterns[0].weight).toBeGreaterThan(0);
      expect(patterns[0].weight).toBeLessThanOrEqual(1);
    });
  });

  // CRITICAL-2: Future timestamp and invalid decayRate tests
  describe('CRITICAL-2: Future timestamp and decayRate validation', () => {
    it('should handle future timestamps gracefully', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1); // 1 year in future

      const mockMistakes: UnifiedMemory[] = [
        {
          id: '1',
          type: 'mistake',
          content: 'Test mistake',
          importance: 0.8,
          timestamp: futureDate, // Future timestamp
          tags: [],
          metadata: { errorType: 'test-error' },
        },
      ];

      vi.mocked(mockMemoryStore.searchByType).mockResolvedValue(mockMistakes);

      const patterns = await manager.extractPatterns();

      // Should not crash, weight should be 0 for future timestamps
      expect(patterns[0].weight).toBe(0);
    });

    it('should handle NaN decayRate gracefully', async () => {
      const managerWithBadConfig = new MistakePatternManager(mockMemoryStore, {
        decayRate: NaN,
      });

      const mockMistakes: UnifiedMemory[] = [
        {
          id: '1',
          type: 'mistake',
          content: 'Test mistake',
          importance: 0.8,
          timestamp: new Date(),
          tags: [],
          metadata: { errorType: 'test-error' },
        },
      ];

      vi.mocked(mockMemoryStore.searchByType).mockResolvedValue(mockMistakes);

      const patterns = await managerWithBadConfig.extractPatterns();

      // Should not crash, falls back to default decayRate 0.01
      expect(patterns[0].weight).toBeGreaterThan(0);
      expect(patterns[0].weight).toBeLessThanOrEqual(1);
    });

    it('should handle Infinity decayRate gracefully', async () => {
      const managerWithBadConfig = new MistakePatternManager(mockMemoryStore, {
        decayRate: Infinity,
      });

      const mockMistakes: UnifiedMemory[] = [
        {
          id: '1',
          type: 'mistake',
          content: 'Test mistake',
          importance: 0.8,
          timestamp: new Date(),
          tags: [],
          metadata: { errorType: 'test-error' },
        },
      ];

      vi.mocked(mockMemoryStore.searchByType).mockResolvedValue(mockMistakes);

      const patterns = await managerWithBadConfig.extractPatterns();

      // Should not crash
      expect(patterns[0].weight).toBe(0.5);
    });

    it('should handle zero decayRate gracefully', async () => {
      const managerWithBadConfig = new MistakePatternManager(mockMemoryStore, {
        decayRate: 0,
      });

      const mockMistakes: UnifiedMemory[] = [
        {
          id: '1',
          type: 'mistake',
          content: 'Test mistake',
          importance: 0.8,
          timestamp: new Date(),
          tags: [],
          metadata: { errorType: 'test-error' },
        },
      ];

      vi.mocked(mockMemoryStore.searchByType).mockResolvedValue(mockMistakes);

      const patterns = await managerWithBadConfig.extractPatterns();

      // Should not crash, falls back to default decayRate 0.01
      expect(patterns[0].weight).toBeGreaterThan(0);
      expect(patterns[0].weight).toBeLessThanOrEqual(1);
    });

    it('should handle negative decayRate gracefully', async () => {
      const managerWithBadConfig = new MistakePatternManager(mockMemoryStore, {
        decayRate: -0.1,
      });

      const mockMistakes: UnifiedMemory[] = [
        {
          id: '1',
          type: 'mistake',
          content: 'Test mistake',
          importance: 0.8,
          timestamp: new Date(),
          tags: [],
          metadata: { errorType: 'test-error' },
        },
      ];

      vi.mocked(mockMemoryStore.searchByType).mockResolvedValue(mockMistakes);

      const patterns = await managerWithBadConfig.extractPatterns();

      // Should not crash
      expect(patterns[0].weight).toBe(0.5);
    });

    it('should handle very old timestamps correctly', async () => {
      const veryOldDate = new Date('2020-01-01'); // 5+ years ago

      const mockMistakes: UnifiedMemory[] = [
        {
          id: '1',
          type: 'mistake',
          content: 'Test mistake',
          importance: 0.8,
          timestamp: veryOldDate,
          tags: [],
          metadata: { errorType: 'test-error' },
        },
      ];

      vi.mocked(mockMemoryStore.searchByType).mockResolvedValue(mockMistakes);

      const patterns = await manager.extractPatterns();

      // Weight should be very small due to decay, but not zero
      expect(patterns[0].weight).toBeGreaterThan(0);
      expect(patterns[0].weight).toBeLessThan(0.5);
    });

    it('should handle recent timestamps correctly', async () => {
      const recentDate = new Date(); // Now

      const mockMistakes: UnifiedMemory[] = [
        {
          id: '1',
          type: 'mistake',
          content: 'Test mistake',
          importance: 0.8,
          timestamp: recentDate,
          tags: [],
          metadata: { errorType: 'test-error' },
        },
      ];

      vi.mocked(mockMemoryStore.searchByType).mockResolvedValue(mockMistakes);

      const patterns = await manager.extractPatterns();

      // Recent mistakes should have higher weight
      expect(patterns[0].weight).toBeGreaterThan(0.5);
    });
  });

  // CRITICAL-3: Empty array division by zero test
  describe('CRITICAL-3: Empty array division protection', () => {
    it('should handle empty mistakes array gracefully', async () => {
      vi.mocked(mockMemoryStore.searchByType).mockResolvedValue([]);

      const patterns = await manager.extractPatterns();

      expect(patterns).toEqual([]);
    });

    it('should handle single mistake correctly', async () => {
      const mockMistakes: UnifiedMemory[] = [
        {
          id: '1',
          type: 'mistake',
          content: 'Test mistake',
          importance: 0.8,
          timestamp: new Date(),
          tags: [],
          metadata: { errorType: 'test-error' },
        },
      ];

      vi.mocked(mockMemoryStore.searchByType).mockResolvedValue(mockMistakes);

      const patterns = await manager.extractPatterns();

      expect(patterns.length).toBe(1);
      expect(patterns[0].baseImportance).toBe(0.8);
      expect(patterns[0].occurrenceCount).toBe(1);
    });

    it('should calculate average importance correctly for multiple mistakes', async () => {
      const mockMistakes: UnifiedMemory[] = [
        {
          id: '1',
          type: 'mistake',
          content: 'Test mistake 1',
          importance: 0.6,
          timestamp: new Date(),
          tags: [],
          metadata: { errorType: 'test-error' },
        },
        {
          id: '2',
          type: 'mistake',
          content: 'Test mistake 2',
          importance: 0.8,
          timestamp: new Date(),
          tags: [],
          metadata: { errorType: 'test-error' },
        },
        {
          id: '3',
          type: 'mistake',
          content: 'Test mistake 3',
          importance: 1.0,
          timestamp: new Date(),
          tags: [],
          metadata: { errorType: 'test-error' },
        },
      ];

      vi.mocked(mockMemoryStore.searchByType).mockResolvedValue(mockMistakes);

      const patterns = await manager.extractPatterns();

      // Average of 0.6, 0.8, 1.0 = 0.8
      expect(patterns[0].baseImportance).toBeCloseTo(0.8, 2);
    });

    it('should handle minOccurrences filter correctly', async () => {
      const managerWithMinOccurrences = new MistakePatternManager(mockMemoryStore, {
        minOccurrences: 2,
      });

      const mockMistakes: UnifiedMemory[] = [
        {
          id: '1',
          type: 'mistake',
          content: 'Single occurrence mistake',
          importance: 0.8,
          timestamp: new Date(),
          tags: [],
          metadata: { errorType: 'unique-error' },
        },
        {
          id: '2',
          type: 'mistake',
          content: 'Repeated mistake first',
          importance: 0.8,
          timestamp: new Date(),
          tags: [],
          metadata: { errorType: 'repeated-error', phase: 'test' },
        },
        {
          id: '3',
          type: 'mistake',
          content: 'Repeated mistake first',
          importance: 0.9,
          timestamp: new Date(),
          tags: [],
          metadata: { errorType: 'repeated-error', phase: 'test' },
        },
      ];

      vi.mocked(mockMemoryStore.searchByType).mockResolvedValue(mockMistakes);

      const patterns = await managerWithMinOccurrences.extractPatterns();

      // Should filter out patterns with < minOccurrences
      // Pattern grouping is by signature (errorType + phase + content words)
      // All patterns should have occurrenceCount >= minOccurrences
      patterns.forEach(pattern => {
        expect(pattern.occurrenceCount).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('Top patterns functionality', () => {
    it('should return top N patterns by weight', async () => {
      const mockMistakes: UnifiedMemory[] = [
        {
          id: '1',
          type: 'mistake',
          content: 'High importance mistake',
          importance: 0.9,
          timestamp: new Date(),
          tags: [],
          metadata: { errorType: 'error-1' },
        },
        {
          id: '2',
          type: 'mistake',
          content: 'Medium importance mistake',
          importance: 0.6,
          timestamp: new Date(),
          tags: [],
          metadata: { errorType: 'error-2' },
        },
        {
          id: '3',
          type: 'mistake',
          content: 'Low importance mistake',
          importance: 0.3,
          timestamp: new Date(),
          tags: [],
          metadata: { errorType: 'error-3' },
        },
      ];

      vi.mocked(mockMemoryStore.searchByType).mockResolvedValue(mockMistakes);

      const topPatterns = await manager.getTopPatterns(undefined, 2);

      expect(topPatterns.length).toBeLessThanOrEqual(2);
      // Should be sorted by weight descending
      if (topPatterns.length === 2) {
        expect(topPatterns[0].weight).toBeGreaterThanOrEqual(topPatterns[1].weight);
      }
    });
  });
});
