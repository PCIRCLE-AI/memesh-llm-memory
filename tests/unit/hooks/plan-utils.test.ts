import { describe, it, expect } from 'vitest';
import {
  tokenize,
  extractModuleHints,
  derivePlanName,
  parsePlanSteps,
  matchCommitToStep,
  renderTimeline,
  renderTimelineCompact,
  isPlanFile,
} from '../../../scripts/hooks/hook-utils.js';

describe('tokenize', () => {
  it('should lowercase and split text into words', () => {
    // 'set' and 'up' are filtered (stop words / too short)
    expect(tokenize('Set Up Auth Middleware')).toEqual(['auth', 'middleware']);
  });

  it('should remove punctuation', () => {
    expect(tokenize('feat(auth): add validation!')).toEqual(['feat', 'auth', 'add', 'validation']);
  });

  it('should filter words shorter than 3 chars', () => {
    expect(tokenize('a is to the big dog')).toEqual(['big', 'dog']);
  });

  it('should filter common stop words', () => {
    expect(tokenize('add the new feature for users')).toEqual(['add', 'new', 'feature', 'users']);
  });

  it('should return empty array for empty input', () => {
    expect(tokenize('')).toEqual([]);
  });
});

describe('extractModuleHints', () => {
  it('should extract meaningful words from step description', () => {
    const hints = extractModuleHints('Set up auth middleware');
    expect(hints).toContain('auth');
    expect(hints).toContain('middleware');
  });

  it('should handle technical terms', () => {
    const hints = extractModuleHints('Add JWT validation logic');
    expect(hints).toContain('jwt');
    expect(hints).toContain('validation');
  });
});

describe('derivePlanName', () => {
  it('should extract name from docs/plans/ path', () => {
    expect(derivePlanName('docs/plans/2026-02-25-auth-system-design.md'))
      .toBe('auth-system-design');
  });

  it('should extract name from -design.md suffix', () => {
    expect(derivePlanName('docs/auth-system-design.md'))
      .toBe('auth-system-design');
  });

  it('should extract name from -plan.md suffix', () => {
    expect(derivePlanName('my-feature-plan.md'))
      .toBe('my-feature-plan');
  });

  it('should handle path with no date prefix', () => {
    expect(derivePlanName('docs/plans/auth-design.md'))
      .toBe('auth-design');
  });
});

describe('parsePlanSteps', () => {
  it('should parse checkbox format steps', () => {
    const content = `# Plan
## Tasks
- [ ] Step 1: Set up auth middleware
- [ ] Step 2: Add JWT validation
- [ ] Step 3: Write tests
`;
    const steps = parsePlanSteps(content);
    expect(steps).toHaveLength(3);
    expect(steps[0]).toEqual({ number: 1, description: 'Set up auth middleware', completed: false });
    expect(steps[1]).toEqual({ number: 2, description: 'Add JWT validation', completed: false });
    expect(steps[2]).toEqual({ number: 3, description: 'Write tests', completed: false });
  });

  it('should parse checkbox format without "Step N:" prefix', () => {
    const content = `- [ ] Set up database
- [ ] Create API endpoints
`;
    const steps = parsePlanSteps(content);
    expect(steps).toHaveLength(2);
    expect(steps[0]).toEqual({ number: 1, description: 'Set up database', completed: false });
    expect(steps[1]).toEqual({ number: 2, description: 'Create API endpoints', completed: false });
  });

  it('should parse heading format steps', () => {
    const content = `# Plan
## Step 1: Set up auth middleware
Some details here.
## Step 2: Add JWT validation
More details.
`;
    const steps = parsePlanSteps(content);
    expect(steps).toHaveLength(2);
    expect(steps[0]).toEqual({ number: 1, description: 'Set up auth middleware', completed: false });
  });

  it('should parse numbered heading format', () => {
    const content = `### 1. Set up auth middleware
### 2. Add JWT validation
`;
    const steps = parsePlanSteps(content);
    expect(steps).toHaveLength(2);
    expect(steps[0]).toEqual({ number: 1, description: 'Set up auth middleware', completed: false });
  });

  it('should detect already-checked items as completed', () => {
    const content = `- [x] Step 1: Already done
- [ ] Step 2: Not done yet
`;
    const steps = parsePlanSteps(content);
    expect(steps[0].completed).toBe(true);
    expect(steps[1].completed).toBe(false);
  });

  it('should return empty array for content with no steps', () => {
    const content = `# Just a regular document
Some paragraph text here.
`;
    expect(parsePlanSteps(content)).toEqual([]);
  });

  it('should handle Task N: prefix format', () => {
    const content = `### Task 1: Set up database
### Task 2: Create API
`;
    const steps = parsePlanSteps(content);
    expect(steps).toHaveLength(2);
    expect(steps[0].description).toBe('Set up database');
  });

  it('should skip steps inside code fences', () => {
    const content = `# Implementation Plan
## Tasks
- [ ] Task 1: Set up database
- [ ] Task 2: Create API

### Task 1: Set up database

**Step 1: Write the failing test**

\`\`\`markdown
- [ ] Set up auth middleware
- [ ] Add JWT validation
- [ ] Write tests
\`\`\`

**Step 2: Implement**

\`\`\`javascript
// example code
const steps = parsePlanSteps(content);
\`\`\`

### Task 2: Create API
`;
    const steps = parsePlanSteps(content);
    // Should only find 2 checkbox steps + 2 heading steps = 4
    // NOT the 3 example checkboxes inside the code fence
    expect(steps).toHaveLength(4);
    expect(steps[0].description).toBe('Set up database');
    expect(steps[1].description).toBe('Create API');
  });

  it('should handle nested code fences and indented fences', () => {
    const content = `- [ ] Real step one
\`\`\`
- [ ] Fake step inside fence
\`\`\`
- [ ] Real step two
`;
    const steps = parsePlanSteps(content);
    expect(steps).toHaveLength(2);
    expect(steps[0].description).toBe('Real step one');
    expect(steps[1].description).toBe('Real step two');
  });
});

describe('matchCommitToStep', () => {
  const planSteps = [
    { number: 1, description: 'Set up auth middleware', completed: false },
    { number: 2, description: 'Add JWT validation', completed: false },
    { number: 3, description: 'Write integration tests', completed: false },
  ];

  it('should match commit to best matching step with confidence', () => {
    const commitInfo = {
      subject: 'feat(auth): Set up auth middleware',
      filesChanged: ['src/auth/middleware.ts'],
    };
    const match = matchCommitToStep(commitInfo, planSteps);
    expect(match).not.toBeNull();
    expect(match.step.number).toBe(1);
    expect(match.confidence).toBeGreaterThan(0.3);
  });

  it('should return high confidence for strong keyword + file match', () => {
    const commitInfo = {
      subject: 'feat(auth): Set up auth middleware',
      filesChanged: ['src/auth/middleware.ts'],
    };
    const match = matchCommitToStep(commitInfo, planSteps);
    expect(match.confidence).toBeGreaterThanOrEqual(0.6);
  });

  it('should get bonus score from file path match', () => {
    const commitInfo = {
      subject: 'feat: add validation logic',
      filesChanged: ['src/auth/jwt-validator.ts'],
    };
    const match = matchCommitToStep(commitInfo, planSteps);
    expect(match).not.toBeNull();
    expect(match.step.number).toBe(2); // jwt matches
  });

  it('should skip already completed steps', () => {
    const stepsWithCompleted = [
      { number: 1, description: 'Set up auth middleware', completed: true },
      { number: 2, description: 'Set up auth routes', completed: false },
    ];
    const commitInfo = {
      subject: 'feat(auth): Set up auth routes',
      filesChanged: ['src/auth/routes.ts'],
    };
    const match = matchCommitToStep(commitInfo, stepsWithCompleted);
    expect(match).not.toBeNull();
    expect(match.step.number).toBe(2);
  });

  it('should return null when no step matches above threshold', () => {
    const commitInfo = {
      subject: 'docs: update README',
      filesChanged: ['README.md'],
    };
    const match = matchCommitToStep(commitInfo, planSteps);
    expect(match).toBeNull();
  });

  it('should return null for empty steps array', () => {
    const commitInfo = { subject: 'feat: something', filesChanged: [] };
    expect(matchCommitToStep(commitInfo, [])).toBeNull();
  });
});

describe('renderTimeline', () => {
  const makePlan = (completed, total) => ({
    name: 'Plan: auth-system',
    metadata: {
      totalSteps: total,
      completed,
      stepsDetail: Array.from({ length: total }, (_, i) => ({
        number: i + 1,
        description: `Step ${i + 1} description`,
        completed: i < completed,
        commitHash: i < completed ? `abc${i}` : undefined,
      })),
    },
    _lastCommit: 'def456',
  });

  it('should render timeline with correct node symbols', () => {
    const output = renderTimeline(makePlan(2, 4));
    expect(output).toContain('\u25cf'); // ● completed nodes
    expect(output).toContain('\u25cb'); // ○ pending nodes
    expect(output).toContain('50%');
  });

  it('should highlight a specific step', () => {
    const output = renderTimeline(makePlan(2, 4), 2);
    expect(output).toContain('def456'); // last commit reference
  });

  it('should show next step', () => {
    const output = renderTimeline(makePlan(2, 4));
    expect(output).toContain('Next');
    expect(output).toContain('Step 3 description');
  });

  it('should show completion message when all done', () => {
    const output = renderTimeline(makePlan(4, 4));
    expect(output).toContain('complete');
  });

  it('should show (?) marker for low confidence match', () => {
    const plan = makePlan(2, 4);
    plan._matchConfidence = 0.4;
    const output = renderTimeline(plan, 2);
    expect(output).toContain('(?)');
  });

  it('should not show (?) for high confidence match', () => {
    const plan = makePlan(2, 4);
    plan._matchConfidence = 0.8;
    const output = renderTimeline(plan, 2);
    expect(output).not.toContain('(?)');
  });
});

describe('renderTimelineCompact', () => {
  const makePlan = (completed, total) => ({
    name: 'Plan: auth-system',
    metadata: {
      totalSteps: total,
      completed,
      stepsDetail: Array.from({ length: total }, (_, i) => ({
        number: i + 1,
        description: `Step ${i + 1} desc`,
        completed: i < completed,
      })),
    },
  });

  it('should render compact timeline with percentage', () => {
    const output = renderTimelineCompact(makePlan(2, 4));
    expect(output).toContain('50%');
    expect(output).toContain('auth-system');
  });

  it('should show next step in compact view', () => {
    const output = renderTimelineCompact(makePlan(1, 3));
    expect(output).toContain('Step 2 desc');
  });

  it('should show complete in compact view when done', () => {
    const output = renderTimelineCompact(makePlan(3, 3));
    expect(output).toContain('Complete');
  });
});

describe('isPlanFile', () => {
  it('should match docs/plans/*.md', () => {
    expect(isPlanFile('docs/plans/2026-02-25-auth-design.md')).toBe(true);
    expect(isPlanFile('docs/plans/my-plan.md')).toBe(true);
  });

  it('should match *-design.md', () => {
    expect(isPlanFile('docs/auth-system-design.md')).toBe(true);
    expect(isPlanFile('/full/path/to/feature-design.md')).toBe(true);
  });

  it('should match *-plan.md', () => {
    expect(isPlanFile('my-feature-plan.md')).toBe(true);
  });

  it('should NOT match regular files', () => {
    expect(isPlanFile('src/index.ts')).toBe(false);
    expect(isPlanFile('README.md')).toBe(false);
    expect(isPlanFile('docs/ARCHITECTURE.md')).toBe(false);
  });

  it('should handle undefined/null gracefully', () => {
    expect(isPlanFile(undefined)).toBe(false);
    expect(isPlanFile(null)).toBe(false);
    expect(isPlanFile('')).toBe(false);
  });
});
