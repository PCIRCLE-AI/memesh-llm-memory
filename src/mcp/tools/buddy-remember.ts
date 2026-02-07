import { z } from 'zod';
import type { ProjectMemoryManager } from '../../memory/ProjectMemoryManager.js';
import type { ResponseFormatter } from '../../ui/ResponseFormatter.js';
import type { KnowledgeGraph } from '../../knowledge-graph/index.js';
import type { Entity } from '../../knowledge-graph/types.js';
import { logger } from '../../utils/logger.js';

/**
 * Search mode for buddy-remember
 * - semantic: Uses AI embeddings for similarity search (requires embeddings in DB)
 * - keyword: Traditional keyword matching (FTS5 + LIKE)
 * - hybrid: Combines semantic and keyword search (default)
 */
export type SearchMode = 'semantic' | 'keyword' | 'hybrid';

/**
 * Result from semantic/hybrid search
 */
export interface SemanticSearchResult {
  entity: Entity;
  similarity: number;
}

export const BuddyRememberInputSchema = z.object({
  query: z.string().trim().min(1).describe('Search query (natural language supported for semantic search)'),
  mode: z
    .enum(['semantic', 'keyword', 'hybrid'])
    .optional()
    .default('hybrid')
    .describe('Search mode: semantic (AI similarity), keyword (exact match), hybrid (both combined)'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .default(10)
    .describe('Maximum number of results to return'),
  minSimilarity: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .default(0.3)
    .describe('Minimum similarity score (0-1) for semantic/hybrid search'),
});

export type ValidatedBuddyRememberInput = z.infer<typeof BuddyRememberInputSchema>;

/**
 * Format search results for display
 */
function formatSearchResults(
  results: SemanticSearchResult[],
  searchMethod: string,
  query: string
): string {
  const lines = [`Found ${results.length} memories (${searchMethod}):\n`];

  results.forEach((r, index) => {
    const matchPercent = Math.round(r.similarity * 100);
    lines.push(`${index + 1}. **${r.entity.name}** (${matchPercent}% match)`);
    lines.push(`   Type: ${r.entity.entityType}`);

    if (r.entity.observations?.length) {
      lines.push(`   Observations:`);
      r.entity.observations.slice(0, 3).forEach(obs => {
        lines.push(`   - ${obs.slice(0, 100)}${obs.length > 100 ? '...' : ''}`);
      });
      if (r.entity.observations.length > 3) {
        lines.push(`   - ... and ${r.entity.observations.length - 3} more`);
      }
    }

    lines.push('');
  });

  return lines.join('\n');
}

/**
 * Perform keyword search using the knowledge graph
 */
async function keywordSearch(
  knowledgeGraph: KnowledgeGraph,
  query: string,
  limit: number
): Promise<SemanticSearchResult[]> {
  const entities = knowledgeGraph.searchEntities({
    namePattern: query,
    limit,
  });

  // Keyword matches get similarity score of 1.0
  return entities.map(entity => ({
    entity,
    similarity: 1.0,
  }));
}

/**
 * Interface for knowledge graphs that support semantic search
 */
interface SemanticSearchCapable {
  semanticSearch(
    query: string,
    options: { limit?: number; minSimilarity?: number; entityTypes?: string[] }
  ): Promise<SemanticSearchResult[]>;
}

/**
 * Check if knowledge graph supports semantic search
 */
function hasSemanticSearch(kg: KnowledgeGraph): kg is KnowledgeGraph & SemanticSearchCapable {
  return 'semanticSearch' in kg && typeof (kg as any).semanticSearch === 'function';
}

/**
 * Perform semantic search using embeddings
 * Uses the knowledge graph's semanticSearch if available, otherwise falls back to keyword search.
 */
async function semanticSearch(
  knowledgeGraph: KnowledgeGraph,
  query: string,
  limit: number,
  minSimilarity: number
): Promise<SemanticSearchResult[]> {
  // Check if semantic search is available on this knowledge graph
  if (hasSemanticSearch(knowledgeGraph)) {
    logger.debug('[buddy-remember] Using native semantic search', {
      query,
      limit,
      minSimilarity,
    });

    try {
      return await knowledgeGraph.semanticSearch(query, { limit, minSimilarity });
    } catch (error) {
      logger.warn('[buddy-remember] Semantic search failed, falling back to keyword', {
        query,
        error: error instanceof Error ? error.message : error,
      });
      // Fall through to keyword search
    }
  } else {
    logger.debug('[buddy-remember] Semantic search not available, using keyword fallback', {
      query,
      limit,
      minSimilarity,
      reason: 'KnowledgeGraph does not support semanticSearch method',
    });
  }

  // Fall back to keyword search
  return keywordSearch(knowledgeGraph, query, limit);
}

/**
 * Interface for knowledge graphs that support hybrid search
 */
interface HybridSearchCapable {
  hybridSearch(
    query: string,
    options: { limit?: number; minSimilarity?: number }
  ): Promise<SemanticSearchResult[]>;
}

/**
 * Check if knowledge graph supports hybrid search
 */
function hasHybridSearch(kg: KnowledgeGraph): kg is KnowledgeGraph & HybridSearchCapable {
  return 'hybridSearch' in kg && typeof (kg as any).hybridSearch === 'function';
}

/**
 * Perform hybrid search combining semantic and keyword matching
 * Uses the knowledge graph's hybridSearch if available, otherwise falls back to semantic or keyword.
 */
async function hybridSearch(
  knowledgeGraph: KnowledgeGraph,
  query: string,
  limit: number,
  minSimilarity: number
): Promise<SemanticSearchResult[]> {
  // Check if hybrid search is available on this knowledge graph
  if (hasHybridSearch(knowledgeGraph)) {
    logger.debug('[buddy-remember] Using native hybrid search', {
      query,
      limit,
      minSimilarity,
    });

    try {
      return await knowledgeGraph.hybridSearch(query, { limit, minSimilarity });
    } catch (error) {
      logger.warn('[buddy-remember] Hybrid search failed, falling back to semantic', {
        query,
        error: error instanceof Error ? error.message : error,
      });
      // Fall through to semantic search
    }
  } else {
    logger.debug('[buddy-remember] Hybrid search not available, trying semantic search', {
      query,
      limit,
      minSimilarity,
    });
  }

  // Try semantic search as fallback (which may itself fall back to keyword)
  return semanticSearch(knowledgeGraph, query, limit, minSimilarity);
}

/**
 * buddy_remember tool - Recall project memory with semantic search support
 *
 * Searches knowledge graph for:
 * - Past decisions and architecture choices
 * - API design decisions
 * - Bug fixes and solutions
 * - Project patterns and conventions
 *
 * Search modes:
 * - semantic: AI-powered similarity search (finds conceptually related content)
 * - keyword: Traditional exact/fuzzy keyword matching
 * - hybrid: Combines both approaches for best results (default)
 *
 * Examples:
 *   buddy-remember "how do we handle authentication" → finds JWT, OAuth, session memories
 *   buddy-remember "database" mode=keyword → exact keyword match only
 *   buddy-remember "user login" mode=semantic minSimilarity=0.5 → high-quality semantic matches
 */
export async function executeBuddyRemember(
  input: ValidatedBuddyRememberInput,
  projectMemory: ProjectMemoryManager,
  formatter: ResponseFormatter,
  knowledgeGraph?: KnowledgeGraph
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const { query, mode = 'hybrid', limit = 10, minSimilarity = 0.3 } = input;

  try {
    let results: SemanticSearchResult[];
    let searchMethod: string;

    // If no knowledgeGraph provided, fall back to keyword search via projectMemory
    if (!knowledgeGraph) {
      logger.debug('[buddy-remember] No knowledge graph provided, using projectMemory.search');
      const memories = await projectMemory.search(query, limit);
      results = memories.map(entity => ({ entity, similarity: 1.0 }));
      searchMethod = 'keyword search (legacy)';
    } else {
      // Use the appropriate search method based on mode
      switch (mode) {
        case 'semantic':
          results = await semanticSearch(knowledgeGraph, query, limit, minSimilarity);
          searchMethod = 'semantic search';
          break;
        case 'keyword':
          results = await keywordSearch(knowledgeGraph, query, limit);
          searchMethod = 'keyword search';
          break;
        case 'hybrid':
        default:
          results = await hybridSearch(knowledgeGraph, query, limit, minSimilarity);
          searchMethod = 'hybrid search';
          break;
      }
    }

    // Handle no results
    if (results.length === 0) {
      const formattedResponse = formatter.format({
        agentType: 'buddy-remember',
        taskDescription: `Search project memory: ${query}`,
        status: 'success',
        results: {
          query,
          mode,
          searchMethod,
          count: 0,
          suggestions: [
            'Try a broader search term',
            'Check if memories were stored for this topic',
            'Use different keywords',
            mode === 'semantic' ? 'Try mode=keyword for exact matches' : 'Try mode=semantic for conceptual matches',
          ],
        },
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: formattedResponse,
          },
        ],
      };
    }

    // Format results with similarity scores
    const formattedResults = formatSearchResults(results, searchMethod, query);

    const formattedResponse = formatter.format({
      agentType: 'buddy-remember',
      taskDescription: `Search project memory: ${query}`,
      status: 'success',
      results: {
        query,
        mode,
        searchMethod,
        count: results.length,
        memories: results.map(r => ({
          ...r.entity,
          similarity: Math.round(r.similarity * 100),
        })),
        formattedOutput: formattedResults,
      },
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: formattedResponse,
        },
      ],
    };
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));

    logger.error('[buddy-remember] Search failed', {
      query,
      mode,
      error: errorObj.message,
    });

    const formattedError = formatter.format({
      agentType: 'buddy-remember',
      taskDescription: `Search project memory: ${query}`,
      status: 'error',
      error: errorObj,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: formattedError,
        },
      ],
    };
  }
}
