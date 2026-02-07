/**
 * Session Memory Integration
 *
 * Integrates Claude Code's native Session Memory (summary.md)
 * with CCB's KnowledgeGraph for structured storage and semantic retrieval.
 */

export { SessionMemoryParser } from './SessionMemoryParser.js';
export { SessionMemoryIngester } from './SessionMemoryIngester.js';
export { SessionMemoryWatcher } from './SessionMemoryWatcher.js';
export { SessionContextInjector } from './SessionContextInjector.js';
export type { InjectionConfig, InjectionContext } from './SessionContextInjector.js';
export { SessionMemoryPipeline } from './SessionMemoryPipeline.js';
export type { PipelineConfig } from './SessionMemoryPipeline.js';
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
