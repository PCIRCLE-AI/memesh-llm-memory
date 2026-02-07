import { createHash } from 'crypto';
import { AUTO_TAGS, LEARNING_TYPE_TO_ENTITY_TYPE, } from './types.js';
const MAX_SLUG_LENGTH = 60;
function slugify(input) {
    return input
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, MAX_SLUG_LENGTH);
}
function contentHash(content) {
    return createHash('sha256').update(content).digest('hex');
}
function filePathToEntityName(filePath) {
    const cleaned = filePath.replace(/^\/+/, '');
    return `file:${cleaned.replace(/\//g, ':')}`;
}
function buildMetadata(event, extra = {}) {
    return {
        sessionId: event.sessionId,
        sourceType: 'claude-native-session-memory',
        ...extra,
    };
}
function buildTags(extra = []) {
    return [AUTO_TAGS.SOURCE, AUTO_TAGS.AUTO_INGESTED, ...extra];
}
export class SessionMemoryIngester {
    knowledgeGraph;
    constructor(knowledgeGraph) {
        this.knowledgeGraph = knowledgeGraph;
    }
    async ingest(parsed, event) {
        const result = {
            entitiesCreated: 0,
            entitiesUpdated: 0,
            entitiesSkipped: 0,
            relationsCreated: 0,
            sessionId: event.sessionId,
            errors: [],
        };
        const sessionEntityName = `session:${event.sessionId.substring(0, 8)}`;
        this.createSessionEntity(parsed, event, sessionEntityName, result);
        const lessonNames = this.ingestErrorCorrections(parsed.errorsAndCorrections, event, result);
        const learningNames = this.ingestLearnings(parsed.learnings, event, result);
        const fileNames = this.ingestFileReferences(parsed.filesAndFunctions, event, result);
        const workflowName = this.ingestWorkflow(parsed.workflow, event, sessionEntityName, result);
        this.createRelations(sessionEntityName, lessonNames, 'caused_by', result);
        this.createRelations(sessionEntityName, learningNames, 'follows_pattern', result);
        this.createRelations(sessionEntityName, fileNames, 'depends_on', result);
        if (workflowName) {
            this.createRelations(sessionEntityName, [workflowName], 'enabled_by', result);
        }
        return result;
    }
    createSessionEntity(parsed, event, sessionEntityName, result) {
        const observations = [
            `Title: ${parsed.title}`,
        ];
        if (parsed.currentState) {
            observations.push(`Current state: ${parsed.currentState}`);
        }
        if (parsed.taskSpec) {
            observations.push(`Task: ${parsed.taskSpec}`);
        }
        const entity = {
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
    ingestErrorCorrections(corrections, event, result) {
        const createdNames = [];
        for (const correction of corrections) {
            const slug = slugify(correction.error);
            const name = `lesson:${slug}`;
            const observations = [
                `Error: ${correction.error}`,
                `Correction: ${correction.correction}`,
            ];
            if (correction.failedApproach) {
                observations.push(`Failed approach: ${correction.failedApproach}`);
            }
            const entity = {
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
    ingestLearnings(learnings, event, result) {
        const createdNames = [];
        for (const learning of learnings) {
            const slug = slugify(learning.content);
            const name = `learning:${slug}`;
            const entityType = LEARNING_TYPE_TO_ENTITY_TYPE[learning.type];
            const observations = [
                learning.content,
            ];
            const entity = {
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
    ingestFileReferences(files, event, result) {
        const createdNames = [];
        for (const file of files) {
            const name = filePathToEntityName(file.path);
            const observations = [
                `Path: ${file.path}`,
                `Description: ${file.description}`,
            ];
            const entity = {
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
    ingestWorkflow(steps, event, sessionEntityName, result) {
        if (steps.length === 0) {
            return null;
        }
        const name = `workflow:${sessionEntityName}`;
        const observations = steps.map((step) => `${step.command}: ${step.description}`);
        const entity = {
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
    safeCreateEntity(entity, source, result) {
        try {
            const candidate = this.knowledgeGraph.getEntity(entity.name);
            const existing = candidate && candidate.name === entity.name ? candidate : null;
            if (existing) {
                if (existing.contentHash && existing.contentHash === entity.contentHash) {
                    result.entitiesSkipped++;
                    return true;
                }
                const mergedObservations = [
                    ...new Set([...(existing.observations || []), ...entity.observations]),
                ];
                const updatedEntity = {
                    ...entity,
                    observations: mergedObservations,
                };
                this.knowledgeGraph.createEntity(updatedEntity);
                result.entitiesUpdated++;
                return true;
            }
            this.knowledgeGraph.createEntity(entity);
            result.entitiesCreated++;
            return true;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            result.errors.push({
                source,
                message: errorMessage,
            });
            return false;
        }
    }
    createRelations(fromEntity, toEntities, relationType, result) {
        for (const toEntity of toEntities) {
            try {
                this.knowledgeGraph.createRelation({
                    from: fromEntity,
                    to: toEntity,
                    relationType,
                });
                result.relationsCreated++;
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                result.errors.push({
                    source: `relation:${fromEntity}->${toEntity}`,
                    message: errorMessage,
                });
            }
        }
    }
}
//# sourceMappingURL=SessionMemoryIngester.js.map