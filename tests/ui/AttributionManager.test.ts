// tests/ui/AttributionManager.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AttributionManager } from '../../src/ui/AttributionManager.js';
import { UIEventBus } from '../../src/ui/UIEventBus.js';

describe('AttributionManager', () => {
  let manager: AttributionManager;
  let eventBus: UIEventBus;

  beforeEach(() => {
    eventBus = UIEventBus.getInstance();
    eventBus.removeAllListeners();
    manager = new AttributionManager(eventBus);
  });

  it('should record success attribution', () => {
    const handler = vi.fn();
    eventBus.onAttribution(handler);

    manager.recordSuccess(
      ['bg-123'],
      'Code review completed',
      { timeSaved: 15, tokensUsed: 5000 }
    );

    expect(handler).toHaveBeenCalledTimes(1);
    const attribution = handler.mock.calls[0][0];
    expect(attribution.type).toBe('success');
    expect(attribution.agentIds).toEqual(['bg-123']);
    expect(attribution.metadata?.timeSaved).toBe(15);
  });

  it('should record error attribution', () => {
    const handler = vi.fn();
    eventBus.onAttribution(handler);

    const error = new Error('Connection timeout');
    manager.recordError(['bg-456'], 'Test execution failed', error, true);

    expect(handler).toHaveBeenCalledTimes(1);
    const attribution = handler.mock.calls[0][0];
    expect(attribution.type).toBe('error');
    expect(attribution.metadata?.error?.message).toBe('Connection timeout');
    expect(attribution.metadata?.suggestGitHubIssue).toBe(true);
  });

  it('should generate GitHub issue suggestion', () => {
    const error = new Error('API timeout in BackgroundExecutor');
    const attribution = {
      id: 'attr-123',
      type: 'error' as const,
      timestamp: new Date(),
      agentIds: ['bg-789'],
      taskDescription: 'Running E2E tests',
      metadata: {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        suggestGitHubIssue: true,
      },
    };

    const suggestion = manager.generateIssueSuggestion(attribution, error);

    expect(suggestion.title).toContain('Error');
    expect(suggestion.body).toContain('API timeout');
    expect(suggestion.labels).toContain('bug');
    expect(suggestion.labels).toContain('claude-code-buddy');
  });

  it('should sanitize sensitive data from issue body', () => {
    const error = new Error('Failed to connect');
    error.stack = `Error: Failed to connect
    at /Users/username/project/api.ts:42
    Token: sk-abc123xyz456
    API_KEY=secret_key_here`;

    const attribution = {
      id: 'attr-123',
      type: 'error' as const,
      timestamp: new Date(),
      agentIds: ['bg-789'],
      taskDescription: 'API call',
      metadata: {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      },
    };

    const suggestion = manager.generateIssueSuggestion(attribution, error);

    // Should not contain user paths
    expect(suggestion.body).not.toContain('/Users/username');
    // Should not contain API keys/tokens
    expect(suggestion.body).not.toContain('sk-abc123xyz456');
    expect(suggestion.body).not.toContain('secret_key_here');
  });

  it('should retrieve recent attributions', () => {
    manager.recordSuccess(['bg-1'], 'Task 1', { timeSaved: 5 });
    manager.recordSuccess(['bg-2'], 'Task 2', { timeSaved: 10 });
    manager.recordError(['bg-3'], 'Task 3', new Error('Failed'), false);

    const recent = manager.getRecentAttributions(2);
    expect(recent).toHaveLength(2);
    expect(recent[0].taskDescription).toBe('Task 3'); // Most recent first
    expect(recent[1].taskDescription).toBe('Task 2');
  });
});
