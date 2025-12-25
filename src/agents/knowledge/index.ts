/**
 * Knowledge Agent
 *
 * High-level API for interacting with the Knowledge Graph
 * Provides convenient methods for common operations
 */

import { KnowledgeGraph, Entity, Relation, EntityType, RelationType } from '../../knowledge-graph/index.js';

export class KnowledgeAgent {
  private kg: KnowledgeGraph;

  constructor(dbPath?: string) {
    this.kg = new KnowledgeGraph(dbPath);
  }

  /**
   * Record an architecture or technical decision
   */
  async recordDecision(decision: {
    name: string;
    reason: string;
    alternatives?: string[];
    tradeoffs?: string[];
    outcome?: string;
    tags?: string[];
  }): Promise<void> {
    const observations: string[] = [
      `💡 Reason: ${decision.reason}`
    ];

    if (decision.alternatives && decision.alternatives.length > 0) {
      observations.push(`🔀 Alternatives considered: ${decision.alternatives.join(', ')}`);
    }

    if (decision.tradeoffs && decision.tradeoffs.length > 0) {
      observations.push(`⚖️ Tradeoffs: ${decision.tradeoffs.join('; ')}`);
    }

    if (decision.outcome) {
      observations.push(`✅ Outcome: ${decision.outcome}`);
    }

    this.kg.createEntity({
      name: decision.name,
      type: 'decision',
      observations,
      tags: decision.tags || ['decision', 'architecture']
    });
  }

  /**
   * Record a bug fix with root cause analysis
   */
  async recordBugFix(bugFix: {
    name: string;
    rootCause: string;
    solution: string;
    prevention?: string;
    relatedTo?: string;  // Related decision or feature
    tags?: string[];
  }): Promise<void> {
    const observations: string[] = [
      `🐛 Root Cause: ${bugFix.rootCause}`,
      `🔧 Solution: ${bugFix.solution}`
    ];

    if (bugFix.prevention) {
      observations.push(`🛡️ Prevention: ${bugFix.prevention}`);
    }

    this.kg.createEntity({
      name: bugFix.name,
      type: 'bug_fix',
      observations,
      tags: bugFix.tags || ['bug', 'lesson_learned']
    });

    // Create relation if specified
    if (bugFix.relatedTo) {
      this.kg.createRelation({
        from: bugFix.name,
        to: bugFix.relatedTo,
        relationType: 'caused_by'
      });
    }
  }

  /**
   * Record a lesson learned from an incident or mistake
   */
  async recordLessonLearned(lesson: {
    name: string;
    whatHappened: string;
    whyItHappened: string;
    whatWeLearned: string;
    howToPrevent: string;
    tags?: string[];
  }): Promise<void> {
    const observations: string[] = [
      `📋 What Happened: ${lesson.whatHappened}`,
      `🔍 Why It Happened: ${lesson.whyItHappened}`,
      `💡 What We Learned: ${lesson.whatWeLearned}`,
      `🛡️ How to Prevent: ${lesson.howToPrevent}`
    ];

    this.kg.createEntity({
      name: lesson.name,
      type: 'lesson_learned',
      observations,
      tags: lesson.tags || ['lesson', 'incident']
    });
  }

  /**
   * Record a feature implementation
   */
  async recordFeature(feature: {
    name: string;
    description: string;
    implementation: string;
    challenges?: string[];
    followsPattern?: string;  // Reference to a similar feature
    tags?: string[];
  }): Promise<void> {
    const observations: string[] = [
      `📝 Description: ${feature.description}`,
      `⚙️ Implementation: ${feature.implementation}`
    ];

    if (feature.challenges && feature.challenges.length > 0) {
      observations.push(`⚠️ Challenges: ${feature.challenges.join('; ')}`);
    }

    this.kg.createEntity({
      name: feature.name,
      type: 'feature',
      observations,
      tags: feature.tags || ['feature']
    });

    // Create relation if it follows a pattern
    if (feature.followsPattern) {
      this.kg.createRelation({
        from: feature.name,
        to: feature.followsPattern,
        relationType: 'follows_pattern'
      });
    }
  }

  /**
   * Record a best practice
   */
  async recordBestPractice(practice: {
    name: string;
    description: string;
    why: string;
    example?: string;
    tags?: string[];
  }): Promise<void> {
    const observations: string[] = [
      `📖 Practice: ${practice.description}`,
      `💡 Why: ${practice.why}`
    ];

    if (practice.example) {
      observations.push(`💻 Example: ${practice.example}`);
    }

    this.kg.createEntity({
      name: practice.name,
      type: 'best_practice',
      observations,
      tags: practice.tags || ['best_practice']
    });
  }

  /**
   * Find similar issues or decisions
   */
  async findSimilar(query: string, type?: EntityType): Promise<Entity[]> {
    return this.kg.searchEntities({
      namePattern: query,
      type,
      limit: 10
    });
  }

  /**
   * Find all lessons learned (for review and improvement)
   */
  async getLessonsLearned(): Promise<Entity[]> {
    return this.kg.searchEntities({
      type: 'lesson_learned'
    });
  }

  /**
   * Find all decisions (for architecture review)
   */
  async getDecisions(): Promise<Entity[]> {
    return this.kg.searchEntities({
      type: 'decision'
    });
  }

  /**
   * Find entities by tag
   */
  async findByTag(tag: string): Promise<Entity[]> {
    return this.kg.searchEntities({
      tag
    });
  }

  /**
   * Trace the impact of a decision or feature
   */
  async traceImpact(entityName: string) {
    return this.kg.traceRelations(entityName, 2);
  }

  /**
   * Get knowledge graph statistics
   */
  async getStats() {
    return this.kg.getStats();
  }

  /**
   * Close the knowledge graph connection
   */
  close() {
    this.kg.close();
  }
}

export type { EntityType, RelationType } from '../../knowledge-graph/index.js';
