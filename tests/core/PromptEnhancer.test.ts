import { afterEach, describe, expect, it } from 'vitest';
import { PromptEnhancer } from '../../src/core/PromptEnhancer.js';
import type { Task } from '../../src/orchestrator/types.js';

const baseTask: Task = {
  id: 'task-1',
  description: 'Review auth.ts for security issues',
};

const ORIGINAL_BEGINNER_MODE = process.env.BEGINNER_MODE;
const ORIGINAL_EVIDENCE_MODE = process.env.EVIDENCE_MODE;

afterEach(() => {
  if (ORIGINAL_BEGINNER_MODE === undefined) {
    delete process.env.BEGINNER_MODE;
  } else {
    process.env.BEGINNER_MODE = ORIGINAL_BEGINNER_MODE;
  }

  if (ORIGINAL_EVIDENCE_MODE === undefined) {
    delete process.env.EVIDENCE_MODE;
  } else {
    process.env.EVIDENCE_MODE = ORIGINAL_EVIDENCE_MODE;
  }
});

describe('PromptEnhancer guardrails', () => {
  it('adds evidence and beginner guardrails when enabled', () => {
    process.env.BEGINNER_MODE = 'true';
    process.env.EVIDENCE_MODE = 'true';

    const enhancer = new PromptEnhancer();
    const prompt = enhancer.enhance('code-reviewer', baseTask, 'simple');

    expect(prompt.userPrompt).toContain('Evidence & Risk Guard');
    expect(prompt.userPrompt).toContain('Beginner-Friendly Output');
    expect(prompt.userPrompt).toContain('Group findings by severity');
    expect(prompt.metadata?.guardrails).toContain('Evidence & Risk Guard');
  });

  it('omits guardrails when disabled', () => {
    process.env.BEGINNER_MODE = 'false';
    process.env.EVIDENCE_MODE = 'false';

    const enhancer = new PromptEnhancer();
    const prompt = enhancer.enhance('code-reviewer', baseTask, 'simple');

    expect(prompt.userPrompt).not.toContain('Evidence & Risk Guard');
    expect(prompt.userPrompt).not.toContain('Beginner-Friendly Output');
    expect(prompt.metadata?.guardrails).toBeUndefined();
  });
});
