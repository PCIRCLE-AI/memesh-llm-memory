/**
 * Session Memory Ingester
 *
 * Converts parsed session memory data (ParsedSessionMemory) into
 * KnowledgeGraph entities with proper type mapping, deduplication,
 * relation creation, and auto-tagging.
 *
 * Each section of the parsed memory maps to a specific entity type:
 * - Session itself -> session_snapshot
 * - ErrorCorrection -> lesson_learned
 * - Learning (negative) -> prevention_rule
 * - Learning (positive/neutral) -> best_practice
 * - FileReference -> feature
 * - Workflow steps -> decision (aggregated)
 */

import { createHash } from 'crypto';
import type { KnowledgeGraph } from '../../knowledge-graph/index.js';
import type { Entity, EntityType, RelationType } from '../../knowledge-graph/types.js';
import type {
  ParsedSessionMemory,
  SessionMemoryEvent,
  IngestionResult,
  IngestionError,
  ErrorCorrection,
  Learning,
  FileReference,
  WorkflowStep,
} from './types.js';
import {
  AUTO_TAGS,
  LEARNING_TYPE_TO_ENTITY_TYPE,
} from './types.js';

/** Maximum length for the slug portion of entity names */
const MAX_SLUG_LENGTH = 60;

/**
 * Slugify a string for use in entity names.
 * Converts to lowercase, replaces spaces with hyphens,
 * removes non-alphanumeric characters (except hyphens),
 * and truncates to MAX_SLUG_LENGTH.
 */
function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')       // collapse multiple hyphens
    .replace(/^-|-$/g, '')     // trim leading/trailing hyphens
    .slice(0, MAX_SLUG_LENGTH);
}

/**
 * Generate a SHA-256 content hash for deduplication.
 */
function contentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Convert a file path to a colon-separated entity name.
 * e.g., "src/auth/jwt.ts" -> "file:src:auth:jwt.ts"
 */
function filePathToEntityName(filePath: string): string {
  // Remove leading slash if present
  const cleaned = filePath.replace(/^\/+/, '');
  return `file:${cleaned.replace(/\//g, ':')}`;
}

/**
 * Build the base metadata object that all entities share.
 */
function buildMetadata(
  event: SessionMemoryEvent,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    sessionId: event.sessionId,
    sourceType: 'claude-native-session-memory',
    ...extra,
  };
}

/**
 * Build the standard tags array for auto-tagging.
 */
function buildTags(extra: string[] = []): string[] {
  return [AUTO_TAGS.SOURCE, AUTO_TAGS.AUTO_INGESTED, ...extra];
}

/**
 * Ingests ParsedSessionMemory into KnowledgeGraph entities.
 *
 * Fault-tolerant: each entity creation is wrapped in try/catch,
 * so a single failure does not abort the entire ingestion.
 * All errors are collected in IngestionResult.errors.
 */
export class SessionMemoryIngester {
  constructor(
    private knowledgeGraph: KnowledgeGraph,
  ) {}

  /**
   * Ingest a parsed session memory into the KnowledgeGraph.
   *
   * Creates entities for: session snapshot, error corrections (lessons),
   * learnings (best practices / prevention rules), file references (features),
   * and workflow steps (decisions).
   *
   * Relations are created from the session entity to each child entity.
   *
   * @param parsed - The parsed session memory data
   * @param event - The session memory event with session metadata
   * @returns IngestionResult with counts and any errors
   */
  async ingest(
    parsed: ParsedSessionMemory,
    event: SessionMemoryEvent,
  ): Promise<IngestionResult> {
    const result: IngestionResult = {
      entitiesCreated: 0,
      entitiesUpdated: 0,
      entitiesSkipped: 0,
      relationsCreated: 0,
      sessionId: event.sessionId,
      errors: [],
    };

    const sessionEntityName = `session:${event.sessionId.substring(0, 8)}`;

    // 1. Create session entity
    this.createSessionEntity(parsed, event, sessionEntityName, result);

    // 2. Ingest error corrections -> lesson_learned entities
    const lessonNames = this.ingestErrorCorrections(
      parsed.errorsAndCorrections,
      event,
      result,
    );

    // 3. Ingest learnings -> best_practice / prevention_rule entities
    const learningNames = this.ingestLearnings(
      parsed.learnings,
      event,
      result,
    );

    // 4. Ingest file references -> feature entities
    const fileNames = this.ingestFileReferences(
      parsed.filesAndFunctions,
      event,
      result,
    );

    // 5. Ingest workflow -> decision entity (aggregated)
    const workflowName = this.ingestWorkflow(
      parsed.workflow,
      event,
      sessionEntityName,
      result,
    );

    // 6. Create relations from session entity to child entities
    this.createRelations(
      sessionEntityName,
      lessonNames,
      'caused_by',
      result,
    );
    this.createRelations(
      sessionEntityName,
      learningNames,
      'follows_pattern',
      result,
    );
    this.createRelations(
      sessionEntityName,
      fileNames,
      'depends_on',
      result,
    );
    if (workflowName) {
      this.createRelations(
        sessionEntityName,
        [workflowName],
        'enabled_by',
        result,
      );
    }

    return result;
  }

  /**
   * Create the session snapshot entity.
   */
  private createSessionEntity(
    parsed: ParsedSessionMemory,
    event: SessionMemoryEvent,
    sessionEntityName: string,
    result: IngestionResult,
  ): void {
    const observations: string[] = [
      `Title: ${parsed.title}`,
    ];

    if (parsed.currentState) {
      observations.push(`Current state: ${parsed.currentState}`);
    }
    if (parsed.taskSpec) {
      observations.push(`Task: ${parsed.taskSpec}`);
    }

    const entity: Entity = {
      name: sessionEntityName,
      entityType: 'session_snapshot',
      observations,
      tags: buildTags(),
      metadata: buildMetadata(event, {
        projectPath: event.projectPath,
        timestamp: event.timestamp.toISOString(),
      }),
      contentHash: contentHash(`session:${event.sessionId}:${parsed.title}`),
    };

    this.safeCreateEntity(entity, 'session', result);
  }

  /**
   * Ingest error corrections into lesson_learned entities.
   * Returns the names of successfully created entities.
   */
  private ingestErrorCorrections(
    corrections: ErrorCorrection[],
    event: SessionMemoryEvent,
    result: IngestionResult,
  ): string[] {
    const createdNames: string[] = [];

    for (const correction of corrections) {
      const slug = slugify(correction.error);
      const name = `lesson:${slug}`;

      const observations: string[] = [
        `Error: ${correction.error}`,
        `Correction: ${correction.correction}`,
      ];

      if (correction.failedApproach) {
        observations.push(`Failed approach: ${correction.failedApproach}`);
      }

      const entity: Entity = {
        name,
        entityType: 'lesson_learned',
        observations,
        tags: buildTags(),
        metadata: buildMetadata(event),
        contentHash: contentHash(`lesson:${correction.error}:${correction.correction}`),
      };

      const created = this.safeCreateEntity(entity, `lesson:${correction.error}`, result);
      if (created) {
        createdNames.push(name);
      }
    }

    return createdNames;
  }

  /**
   * Ingest learnings into best_practice or prevention_rule entities.
   * Returns the names of successfully created entities.
   */
  private ingestLearnings(
    learnings: Learning[],
    event: SessionMemoryEvent,
    result: IngestionResult,
  ): string[] {
    const createdNames: string[] = [];

    for (const learning of learnings) {
      const slug = slugify(learning.content);
      const name = `learning:${slug}`;

      const entityType: EntityType = LEARNING_TYPE_TO_ENTITY_TYPE[learning.type];

      const observations: string[] = [
        learning.content,
      ];

      const entity: Entity = {
        name,
        entityType,
        observations,
        tags: buildTags([`learning-type:${learning.type}`]),
        metadata: buildMetadata(event, {
          learningType: learning.type,
        }),
        contentHash: contentHash(`learning:${learning.content}`),
      };

      const created = this.safeCreateEntity(entity, `learning:${learning.content}`, result);
      if (created) {
        createdNames.push(name);
      }
    }

    return createdNames;
  }

  /**
   * Ingest file references into feature entities.
   * Returns the names of successfully created entities.
   */
  private ingestFileReferences(
    files: FileReference[],
    event: SessionMemoryEvent,
    result: IngestionResult,
  ): string[] {
    const createdNames: string[] = [];

    for (const file of files) {
      const name = filePathToEntityName(file.path);

      const observations: string[] = [
        `Path: ${file.path}`,
        `Description: ${file.description}`,
      ];

      const entity: Entity = {
        name,
        entityType: 'feature',
        observations,
        tags: buildTags(),
        metadata: buildMetadata(event, {
          filePath: file.path,
        }),
        contentHash: contentHash(`file:${file.path}:${file.description}`),
      };

      const created = this.safeCreateEntity(entity, `file:${file.path}`, result);
      if (created) {
        createdNames.push(name);
      }
    }

    return createdNames;
  }

  /**
   * Ingest workflow steps into a single decision entity.
   * Returns the entity name if created, or null if no workflow steps.
   */
  private ingestWorkflow(
    steps: WorkflowStep[],
    event: SessionMemoryEvent,
    sessionEntityName: string,
    result: IngestionResult,
  ): string | null {
    if (steps.length === 0) {
      return null;
    }

    const name = `workflow:${sessionEntityName}`;

    const observations = steps.map(
      (step) => `${step.command}: ${step.description}`,
    );

    const entity: Entity = {
      name,
      entityType: 'decision',
      observations,
      tags: buildTags(),
      metadata: buildMetadata(event),
      contentHash: contentHash(`workflow:${event.sessionId}:${observations.join('|')}`),
    };

    const created = this.safeCreateEntity(entity, `workflow:${event.sessionId}`, result);
    return created ? name : null;
  }

  /**
   * Safely create an entity, handling deduplication and errors.
   *
   * Checks for existing entity by name first:
   * - If same name + same content hash -> skip (deduplicated)
   * - If same name + different content -> update (merge observations)
   * - If no existing entity -> create new
   *
   * Returns true if entity was created or updated, false if skipped or errored.
   */
  private safeCreateEntity(
    entity: Entity,
    source: string,
    result: IngestionResult,
  ): boolean {
    try {
      // Check for existing entity with the same name.
      // NOTE: getEntity internally uses FTS/pattern search, so we must verify
      // exact name match to avoid dedup errors from fuzzy partial matches.
      const candidate = this.knowledgeGraph.getEntity(entity.name);
      const existing = candidate && candidate.name === entity.name ? candidate : null;

      if (existing) {
        // Same name exists - check if content is the same
        if (existing.contentHash && existing.contentHash === entity.contentHash) {
          // Content hash match -> skip (duplicate)
          result.entitiesSkipped++;
          return true; // Still considered "handled" for relation purposes
        }

        // Same name, different content -> update with merged observations
        const mergedObservations = [
          ...new Set([...(existing.observations || []), ...entity.observations]),
        ];

        const updatedEntity: Entity = {
          ...entity,
          observations: mergedObservations,
        };

        this.knowledgeGraph.createEntity(updatedEntity);
        result.entitiesUpdated++;
        return true;
      }

      // No existing entity -> create new
      this.knowledgeGraph.createEntity(entity);
      result.entitiesCreated++;
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push({
        source,
        message: errorMessage,
      });
      return false;
    }
  }

  /**
   * Create relations from a source entity to multiple target entities.
   * Each relation creation is wrapped in try/catch for fault tolerance.
   */
  private createRelations(
    fromEntity: string,
    toEntities: string[],
    relationType: RelationType,
    result: IngestionResult,
  ): void {
    for (const toEntity of toEntities) {
      try {
        this.knowledgeGraph.createRelation({
          from: fromEntity,
          to: toEntity,
          relationType,
        });
        result.relationsCreated++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.errors.push({
          source: `relation:${fromEntity}->${toEntity}`,
          message: errorMessage,
        });
      }
    }
  }
}
