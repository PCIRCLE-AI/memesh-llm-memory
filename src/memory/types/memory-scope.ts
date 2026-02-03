/**
 * Memory Scope Type System
 *
 * Defines the hierarchical scope model for memory entries, enabling
 * intelligent memory organization and retrieval based on context.
 *
 * Scope Priority (High to Low):
 * 1. SESSION - Temporary, session-specific memories
 * 2. DOMAIN - Domain-specific knowledge (e.g., e-commerce, AI)
 * 3. PROJECT - Project-specific knowledge and decisions
 * 4. TECH_STACK - Technology-stack-specific best practices
 * 5. GLOBAL - Universal principles and anti-patterns
 */

/**
 * MemoryScope enum - Defines the five-tier scope hierarchy
 */
export enum MemoryScope {
  /** Global scope - Universal principles applicable everywhere */
  GLOBAL = 'global',

  /** Technology-stack scope - Knowledge specific to tech stack (React, TypeScript, etc.) */
  TECH_STACK = 'tech',

  /** Project scope - Knowledge specific to a particular project */
  PROJECT = 'project',

  /** Domain scope - Knowledge specific to a business domain (e-commerce, AI, etc.) */
  DOMAIN = 'domain',

  /** Session scope - Temporary memories for current session */
  SESSION = 'session',
}

/**
 * Metadata for scoping a memory entry
 *
 * This interface supports different combinations of fields based on the scope level.
 * Not all fields are required; use only those relevant to your scope.
 */
export interface MemoryScopeMetadata {
  /** The scope level of this memory */
  scope: MemoryScope;

  /**
   * Project name - used in PROJECT and SESSION scopes
   * Examples: 'memesh', 'my-ecommerce-app'
   */
  projectName?: string;

  /**
   * Business domain - used in DOMAIN and PROJECT scopes
   * Examples: 'e-commerce', 'ai-automation', 'machine-learning'
   */
  domain?: string;

  /**
   * Technology stack - used in TECH_STACK, PROJECT, and DOMAIN scopes
   * Examples: ['react', 'typescript'], ['python', 'tensorflow']
   */
  techStack?: string[];

  /**
   * Categories or tags for classification
   * Examples: ['security', 'best-practice'], ['performance', 'optimization']
   */
  category?: string[];

  /**
   * Session identifier - used in SESSION scope
   * Examples: 'session-2026-02-01-001', 'temp-debug-session'
   */
  sessionId?: string;
}

/**
 * Utility functions for working with MemoryScope
 */

/**
 * Determines if a scope requires a projectName
 */
export function requiresProjectName(scope: MemoryScope): boolean {
  return scope === MemoryScope.PROJECT || scope === MemoryScope.SESSION;
}

/**
 * Determines if a scope can have techStack information
 */
export function canHaveTechStack(scope: MemoryScope): boolean {
  return scope === MemoryScope.TECH_STACK || scope === MemoryScope.PROJECT || scope === MemoryScope.DOMAIN;
}

/**
 * Determines if a scope can have domain information
 */
export function canHaveDomain(scope: MemoryScope): boolean {
  return scope === MemoryScope.DOMAIN || scope === MemoryScope.PROJECT;
}

/**
 * Gets the priority number of a scope (higher = higher priority)
 */
export function getScopePriority(scope: MemoryScope): number {
  const priorities: Record<MemoryScope, number> = {
    [MemoryScope.SESSION]: 5,
    [MemoryScope.DOMAIN]: 4,
    [MemoryScope.PROJECT]: 3,
    [MemoryScope.TECH_STACK]: 2,
    [MemoryScope.GLOBAL]: 1,
  };
  return priorities[scope];
}

/**
 * Compares two scopes by priority for sorting (descending order: high to low)
 * @returns negative if scope1 has higher priority (should come first), positive if scope2 has higher priority, 0 if equal
 */
export function compareScopePriority(scope1: MemoryScope, scope2: MemoryScope): number {
  return getScopePriority(scope2) - getScopePriority(scope1);
}

/**
 * Gets a human-readable description of a scope
 */
export function getScopeDescription(scope: MemoryScope): string {
  const descriptions: Record<MemoryScope, string> = {
    [MemoryScope.GLOBAL]: 'Universal principles applicable everywhere',
    [MemoryScope.TECH_STACK]: 'Knowledge specific to technology stacks',
    [MemoryScope.PROJECT]: 'Knowledge specific to a particular project',
    [MemoryScope.DOMAIN]: 'Knowledge specific to a business domain',
    [MemoryScope.SESSION]: 'Temporary memories for current session',
  };
  return descriptions[scope];
}

/**
 * Validates MemoryScopeMetadata for consistency and required fields
 */
export function validateScopeMetadata(metadata: MemoryScopeMetadata): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate that scope is defined
  if (!metadata.scope) {
    errors.push('scope is required');
    return { valid: false, errors };
  }

  // Validate scope-specific requirements
  if (metadata.scope === MemoryScope.TECH_STACK && (!metadata.techStack || metadata.techStack.length === 0)) {
    errors.push('techStack is recommended for TECH_STACK scope');
  }

  if (metadata.scope === MemoryScope.DOMAIN && !metadata.domain) {
    errors.push('domain is recommended for DOMAIN scope');
  }

  // Validate that techStack is not used in GLOBAL scope
  if (metadata.scope === MemoryScope.GLOBAL && metadata.techStack) {
    errors.push('techStack should not be set for GLOBAL scope');
  }

  // Validate that domain is not used in GLOBAL or TECH_STACK scopes
  if ((metadata.scope === MemoryScope.GLOBAL || metadata.scope === MemoryScope.TECH_STACK) && metadata.domain) {
    errors.push(`domain should not be set for ${metadata.scope} scope`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Creates a scope metadata filter for memory queries
 */
export function createScopeFilter(scope: MemoryScope, options?: Partial<MemoryScopeMetadata>): MemoryScopeMetadata {
  return {
    scope,
    ...options,
  };
}
