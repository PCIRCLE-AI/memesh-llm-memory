import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';
import {
  sqliteBatchEntity,
  parsePlanSteps,
  derivePlanName,
  isPlanFile,
  matchCommitToStep,
  queryActivePlans,
  addObservation,
  updateEntityMetadata,
  updateEntityTag,
  createRelation,
  renderTimeline,
  renderTimelineCompact,
} from '../../../scripts/hooks/hook-utils.js';

describe('Plan-Aware Hooks E2E Flow', () => {
  let dbPath;
  let testDir;

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), `plan-e2e-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });
    dbPath = path.join(testDir, 'test.db');
    const schema = `
      CREATE TABLE entities (id INTEGER PRIMARY KEY, name TEXT UNIQUE, type TEXT, created_at TEXT, metadata TEXT DEFAULT '{}');
      CREATE TABLE observations (id INTEGER PRIMARY KEY, entity_id INTEGER, content TEXT, created_at TEXT);
      CREATE TABLE tags (id INTEGER PRIMARY KEY, entity_id INTEGER, tag TEXT);
      CREATE TABLE relations (id INTEGER PRIMARY KEY, from_entity_id INTEGER, to_entity_id INTEGER, relation_type TEXT, metadata TEXT DEFAULT '{}', created_at TEXT, UNIQUE(from_entity_id, to_entity_id, relation_type));
    `;
    execFileSync('sqlite3', [dbPath], { input: schema, encoding: 'utf-8' });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should complete full plan lifecycle: create → progress → complete', () => {
    // 1. Simulate plan file creation
    const planContent = `# Auth System Plan
## Tasks
- [ ] Step 1: Set up auth middleware
- [ ] Step 2: Add JWT validation
- [ ] Step 3: Write tests
`;
    const steps = parsePlanSteps(planContent);
    expect(steps).toHaveLength(3);

    const filePath = 'docs/plans/2026-02-25-auth-system-design.md';
    expect(isPlanFile(filePath)).toBe(true);

    const planName = derivePlanName(filePath);
    expect(planName).toBe('auth-system-design');

    // 2. Create plan entity in KG
    const entityName = `Plan: ${planName}`;
    const metadata = {
      sourceFile: filePath,
      totalSteps: steps.length,
      completed: 0,
      status: 'active',
      stepsDetail: steps,
    };

    sqliteBatchEntity(dbPath,
      { name: entityName, type: 'workflow_checkpoint', metadata: JSON.stringify(metadata) },
      steps.map(s => `Step ${s.number}: ${s.description}`),
      ['plan', 'active', `plan:${planName}`, 'scope:project']
    );

    // 3. Verify plan is active
    let activePlans = queryActivePlans(dbPath);
    expect(activePlans).toHaveLength(1);
    expect(activePlans[0].metadata.completed).toBe(0);

    // 4. Simulate first commit matching step 1
    const match1 = matchCommitToStep(
      { subject: 'feat(auth): Set up auth middleware', filesChanged: ['src/auth/middleware.ts'] },
      steps
    );
    expect(match1).not.toBeNull();
    expect(match1.step.number).toBe(1);
    expect(match1.confidence).toBeGreaterThan(0.3);

    // Update plan
    const updatedSteps1 = steps.map(s =>
      s.number === 1 ? { ...s, completed: true, commitHash: 'abc1234' } : s
    );
    updateEntityMetadata(dbPath, entityName, { ...metadata, completed: 1, stepsDetail: updatedSteps1 });
    addObservation(dbPath, entityName, 'Step 1 completed by abc1234');

    // 5. Verify timeline renders correctly
    activePlans = queryActivePlans(dbPath);
    const timeline = renderTimeline({
      ...activePlans[0],
      metadata: { ...activePlans[0].metadata, completed: 1, stepsDetail: updatedSteps1 },
    });
    expect(timeline).toContain('33%');

    // 6. Create commit entity and relation
    sqliteBatchEntity(dbPath,
      { name: 'Commit abc1234: feat(auth): Set up auth middleware', type: 'commit' },
      [], ['commit']
    );
    createRelation(dbPath, 'Commit abc1234: feat(auth): Set up auth middleware', entityName, 'depends_on');

    // 7. Complete remaining steps
    updateEntityMetadata(dbPath, entityName, {
      ...metadata,
      completed: 3,
      status: 'completed',
      stepsDetail: steps.map(s => ({ ...s, completed: true })),
    });
    updateEntityTag(dbPath, entityName, 'active', 'completed');

    // 8. Verify plan no longer shows as active
    activePlans = queryActivePlans(dbPath);
    expect(activePlans).toHaveLength(0);

    // 9. Compact timeline shows complete
    const compact = renderTimelineCompact({
      name: entityName,
      metadata: { totalSteps: 3, completed: 3, stepsDetail: steps.map(s => ({ ...s, completed: true })) },
    });
    expect(compact).toContain('Complete');
  });
});
