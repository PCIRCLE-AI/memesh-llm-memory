/**
 * Session Memory Integration
 *
 * Integrates Claude Code's native Session Memory (summary.md)
 * with CCB's KnowledgeGraph for structured storage and semantic retrieval.
 */

export { SessionMemoryParser } from './SessionMemoryParser.js';
export { SessionMemoryIngester } from './SessionMemoryIngester.js';
export type {
  ParsedSessionMemory,
  SessionMemoryEvent,
  IngestionResult,
  FileReference,
  WorkflowStep,
  ErrorCorrection,
  Learning,
  LearningType,
  WorklogEntry,
  IngestionError,
} from './types.js';
