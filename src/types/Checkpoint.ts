/**
 * Checkpoint Types
 *
 * Enum of all supported checkpoint types in the Development Butler system.
 * Checkpoints are logical points in the development workflow where the butler
 * can provide automated assistance.
 */
export enum Checkpoint {
  /** Triggered when new code is written */
  CODE_WRITTEN = 'code-written',

  /** Triggered when tests are completed */
  TEST_COMPLETE = 'test-complete',

  /** Triggered when code is ready to commit */
  COMMIT_READY = 'commit-ready',

  /** Triggered before a commit is made */
  BEFORE_COMMIT = 'before-commit',

  /** Triggered when a significant change is detected */
  SIGNIFICANT_CHANGE = 'significant-change',

  /** Triggered when a test fails */
  TEST_FAILURE = 'test-failure',

  /** Triggered at the end of a development session */
  SESSION_END = 'session-end',

  /** Triggered when a security concern is detected */
  SECURITY_CONCERN = 'security-concern',

  /** Triggered when a performance issue is detected */
  PERFORMANCE_ISSUE = 'performance-issue',
}
