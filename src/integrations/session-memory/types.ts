/**
 * Session Memory Integration Types
 *
 * Type definitions for integrating Claude Code's native Session Memory
 * (summary.md files) with CCB's KnowledgeGraph.
 *
 * Claude Code writes session memories as structured markdown files at:
 *   ~/.claude/projects/{sanitized-path}/{session-id}/session-memory/summary.md
 *
 * These types define the parsed structure and ingestion pipeline interfaces.
 */

import type { EntityType } from '../../knowledge-graph/types.js';

// ─── Parsed Session Memory Structure ───────────────────────────────

/**
 * Complete parsed representation of a Claude Code summary.md file.
 * Each field corresponds to a markdown section in the native format.
 */
export interface ParsedSessionMemory {
  /** Session title extracted from "# Session Title" section */
  title: string;

  /** Current work state from "# Current State" section */
  currentState: string | null;

  /** Task specification from "# Task specification" section */
  taskSpec: string | null;

  /** File references from "# Files and Functions" section */
  filesAndFunctions: FileReference[];

  /** Workflow steps from "# Workflow" section */
  workflow: WorkflowStep[];

  /** Errors and corrections from "# Errors & Corrections" section */
  errorsAndCorrections: ErrorCorrection[];

  /** Codebase documentation from "# Codebase and System Documentation" section */
  codebaseDoc: string | null;

  /** Learnings from "# Learnings" section */
  learnings: Learning[];

  /** Worklog entries from "# Worklog" section (optional section) */
  worklog: WorklogEntry[];

  /** Raw section content for sections not explicitly parsed */
  rawSections: Map<string, string>;
}

/**
 * A file reference mentioned in session memory
 */
export interface FileReference {
  /** File path (relative or absolute) */
  path: string;

  /** What the file contains or does */
  description: string;
}

/**
 * A workflow step (bash command or process) from session memory
 */
export interface WorkflowStep {
  /** The command or action */
  command: string;

  /** Description of what this step does */
  description: string;
}

/**
 * An error encountered and its correction
 */
export interface ErrorCorrection {
  /** The error that occurred */
  error: string;

  /** How it was corrected */
  correction: string;

  /** Approach that was tried and failed (if mentioned) */
  failedApproach?: string;
}

/**
 * A learning extracted from session memory
 */
export interface Learning {
  /** The learning content */
  content: string;

  /** Classification based on sentiment analysis */
  type: LearningType;
}

export type LearningType = 'positive' | 'negative' | 'neutral';

/**
 * A worklog entry documenting chronological progress
 */
export interface WorklogEntry {
  /** The activity description */
  activity: string;

  /** Optional timestamp or step number */
  marker?: string;
}

// ─── Watcher / Ingestion Events ────────────────────────────────────

/**
 * Event emitted when a session memory file is created or updated
 */
export interface SessionMemoryEvent {
  /** Claude Code session UUID */
  sessionId: string;

  /** Original project path (desanitized) */
  projectPath: string;

  /** Sanitized project path (as stored in ~/.claude/projects/) */
  sanitizedPath: string;

  /** Full path to the summary.md file */
  summaryPath: string;

  /** Raw markdown content of summary.md */
  content: string;

  /** When the change was detected */
  timestamp: Date;

  /** Whether this is a new file or an update */
  changeType: 'created' | 'updated';
}

// ─── Ingestion Results ─────────────────────────────────────────────

/**
 * Result of ingesting a session memory into the KnowledgeGraph
 */
export interface IngestionResult {
  /** Number of new entities created */
  entitiesCreated: number;

  /** Number of existing entities updated with new observations */
  entitiesUpdated: number;

  /** Number of entities skipped due to deduplication */
  entitiesSkipped: number;

  /** Number of relations created between entities */
  relationsCreated: number;

  /** Session ID that was ingested */
  sessionId: string;

  /** Errors encountered during ingestion (non-fatal) */
  errors: IngestionError[];
}

/**
 * Non-fatal error during ingestion
 */
export interface IngestionError {
  /** Which entity/section caused the error */
  source: string;

  /** Error message */
  message: string;
}

// ─── Entity Mapping Configuration ──────────────────────────────────

/**
 * Mapping from learning types to KnowledgeGraph entity types.
 * Negative learnings become prevention rules to avoid repeating mistakes.
 * Positive learnings become best practices.
 */
export const LEARNING_TYPE_TO_ENTITY_TYPE: Record<LearningType, EntityType> = {
  negative: 'prevention_rule',
  positive: 'best_practice',
  neutral: 'best_practice',
};

/**
 * Session memory section names as they appear in summary.md.
 * Used by the parser to identify markdown sections.
 */
export const SESSION_MEMORY_SECTIONS = {
  TITLE: 'Session Title',
  CURRENT_STATE: 'Current State',
  TASK_SPEC: 'Task specification',
  FILES: 'Files and Functions',
  WORKFLOW: 'Workflow',
  ERRORS: 'Errors & Corrections',
  CODEBASE: 'Codebase and System Documentation',
  LEARNINGS: 'Learnings',
  WORKLOG: 'Worklog',
  KEY_RESULTS: 'Key results',
} as const;

/**
 * Tags automatically added to entities ingested from native session memory.
 * Used to distinguish CCB-native entities from session memory-derived ones.
 */
export const AUTO_TAGS = {
  SOURCE: 'source:native-session-memory',
  AUTO_INGESTED: 'auto-ingested',
} as const;
