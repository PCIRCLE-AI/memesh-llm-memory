/**
 * Evolution Bootstrap - Preloaded Patterns for New Users
 *
 * Provides immediate value to new users by loading common workflow patterns
 * before they have enough data to learn patterns themselves.
 *
 * Bootstrap patterns have lower confidence (0.5) so they're gradually replaced
 * by real learned patterns as the user accumulates more task history.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';
import type { LearnedPattern } from './types.js';
import type { LearningManager } from './LearningManager.js';
import type { AgentRegistry } from '../core/AgentRegistry.js';
import type { PerformanceTracker } from './PerformanceTracker.js';
import { ValidationError } from '../errors/index.js';

/**
 * Bootstrap pattern from JSON file
 */
export interface BootstrapPattern {
  id: string;
  type: 'success' | 'failure' | 'optimization' | 'anti-pattern';
  name: string;
  description: string;
  sequence: string[]; // Agent IDs in sequence
  confidence: number;
  observationCount: number;
  successCount: number;
  successRate: number;
  taskType: string;
  conditions: {
    taskComplexity?: 'low' | 'medium' | 'high';
    requiredCapabilities?: string[];
    context?: Record<string, any>;
  };
  action: {
    type: 'adjust_prompt' | 'change_model' | 'add_step' | 'remove_step' | 'modify_timeout';
    parameters: Record<string, any>;
  };
}

/**
 * Bootstrap file structure
 */
export interface BootstrapFile {
  version: string;
  description: string;
  patterns: BootstrapPattern[];
}

/**
 * Pattern validation error
 */
export interface PatternValidationError {
  patternId: string;
  field: string;
  message: string;
}

export class EvolutionBootstrap {
  private readonly BOOTSTRAP_FILE: string;
  private readonly MIN_TASKS_FOR_BOOTSTRAP = 10; // Below this, load bootstrap
  private readonly MAX_CONFIDENCE = 1.0;
  private readonly MIN_CONFIDENCE = 0.0;
  private readonly MIN_SEQUENCE_LENGTH = 2;
  private readonly MAX_BOOTSTRAP_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly CURRENT_BOOTSTRAP_VERSION = '1.0.0';
  private readonly LARGE_SAMPLE_THRESHOLD = 1000; // Sample size above which to use FP tolerance
  private readonly LARGE_SAMPLE_FP_TOLERANCE = 0.0001; // 0.01% tolerance for large samples

  constructor(
    private agentRegistry: AgentRegistry,
    private performanceTracker: PerformanceTracker,
    private dataDir: string = 'data',
    bootstrapFile: string = 'bootstrap/patterns.json'
  ) {
    this.BOOTSTRAP_FILE = bootstrapFile;
  }

  /**
   * Get the absolute path to the bootstrap patterns file
   *
   * @returns Absolute path to bootstrap file
   */
  private getBootstrapFilePath(): string {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const projectRoot = path.resolve(__dirname, '../..');
    return path.join(projectRoot, this.dataDir, this.BOOTSTRAP_FILE);
  }

  /**
   * Safely parse JSON content with error handling
   *
   * @param content - JSON string to parse
   * @returns Parsed object or null if parsing fails
   */
  private safeJsonParse(content: string): unknown | null {
    try {
      return JSON.parse(content);
    } catch (parseError) {
      logger.error('Invalid JSON in bootstrap file:', parseError);
      return null;
    }
  }

  /**
   * Check if user is new and needs bootstrap patterns
   */
  async shouldBootstrap(): Promise<boolean> {
    try {
      const taskCount = await this.performanceTracker.getTotalTaskCount();
      const isNewUser = taskCount < this.MIN_TASKS_FOR_BOOTSTRAP;

      if (isNewUser) {
        logger.info(
          `New user detected (${taskCount} tasks < ${this.MIN_TASKS_FOR_BOOTSTRAP}). Bootstrap patterns will be loaded.`
        );
      }

      return isNewUser;
    } catch (error) {
      logger.error('Error checking bootstrap eligibility:', error);
      return false;
    }
  }

  /**
   * Load and validate bootstrap patterns
   */
  async loadBootstrapPatterns(): Promise<LearnedPattern[]> {
    try {
      const bootstrapPath = this.getBootstrapFilePath();

      logger.info(`Loading bootstrap patterns from: ${bootstrapPath}`);

      // Check file size first (prevent loading huge files into memory)
      const stats = await fs.stat(bootstrapPath);
      if (stats.size > this.MAX_BOOTSTRAP_FILE_SIZE) {
        logger.error(
          `Bootstrap file too large: ${stats.size} bytes (max: ${this.MAX_BOOTSTRAP_FILE_SIZE})`
        );
        return [];
      }

      // Read bootstrap file
      const fileContent = await fs.readFile(bootstrapPath, 'utf-8');

      // Parse with error handling
      const bootstrapData = this.safeJsonParse(fileContent);
      if (bootstrapData === null) {
        return [];
      }

      // Validate schema
      if (!this.isValidBootstrapFile(bootstrapData)) {
        logger.error('Bootstrap file does not match expected schema');
        return [];
      }

      const validData = bootstrapData as BootstrapFile;

      // Version compatibility check
      if (!this.isCompatibleVersion(validData.version)) {
        logger.error(
          `Incompatible bootstrap version: ${validData.version} (expected: ${this.CURRENT_BOOTSTRAP_VERSION})`
        );
        return [];
      }

      logger.info(
        `Loaded ${validData.patterns.length} bootstrap patterns (version: ${validData.version})`
      );

      // Validate patterns
      const validationErrors = this.validatePatterns(validData.patterns);

      if (validationErrors.length > 0) {
        logger.warn(`Found ${validationErrors.length} validation errors in bootstrap patterns:`);
        validationErrors.forEach(error => {
          logger.warn(`  - Pattern ${error.patternId}: ${error.field} - ${error.message}`);
        });

        // Filter out invalid patterns
        const validPatterns = validData.patterns.filter(pattern => {
          return !validationErrors.some(error => error.patternId === pattern.id);
        });

        logger.info(`Using ${validPatterns.length} valid patterns out of ${validData.patterns.length}`);

        return this.convertToLearnedPatterns(validPatterns);
      }

      return this.convertToLearnedPatterns(validData.patterns);
    } catch (error) {
      logger.error('Error loading bootstrap patterns:', error);
      return [];
    }
  }

  /**
   * Type guard to check if a string is a valid AgentType
   */
  private isValidAgentType(agentId: string): agentId is import('../orchestrator/types.js').AgentType {
    const validAgentTypes = new Set(this.agentRegistry.getAllAgentTypes());
    return validAgentTypes.has(agentId as import('../orchestrator/types.js').AgentType);
  }

  /**
   * Validate bootstrap file schema
   */
  private isValidBootstrapFile(data: unknown): data is BootstrapFile {
    if (typeof data !== 'object' || data === null) return false;
    const obj = data as Record<string, unknown>;

    return (
      typeof obj.version === 'string' &&
      typeof obj.description === 'string' &&
      Array.isArray(obj.patterns) &&
      obj.patterns.every(p => this.isValidBootstrapPattern(p))
    );
  }

  /**
   * Validate bootstrap pattern structure
   */
  private isValidBootstrapPattern(data: unknown): data is BootstrapPattern {
    if (typeof data !== 'object' || data === null) return false;
    const p = data as Record<string, unknown>;

    return (
      typeof p.id === 'string' &&
      ['success', 'failure', 'optimization', 'anti-pattern'].includes(p.type as string) &&
      typeof p.name === 'string' &&
      typeof p.description === 'string' &&
      Array.isArray(p.sequence) &&
      typeof p.confidence === 'number' &&
      typeof p.observationCount === 'number' &&
      typeof p.successCount === 'number' &&
      typeof p.successRate === 'number' &&
      typeof p.taskType === 'string' &&
      typeof p.conditions === 'object' &&
      typeof p.action === 'object'
    );
  }

  /**
   * Check version compatibility
   */
  private isCompatibleVersion(version: string): boolean {
    // For now, just check major version match
    const [currentMajor] = this.CURRENT_BOOTSTRAP_VERSION.split('.');
    const [fileMajor] = version.split('.');

    return currentMajor === fileMajor;
  }

  /**
   * Validate bootstrap patterns
   */
  private validatePatterns(patterns: BootstrapPattern[]): PatternValidationError[] {
    const errors: PatternValidationError[] = [];

    // Get valid agent types for error messages
    const validAgentTypes = this.agentRegistry.getAllAgentTypes();

    for (const pattern of patterns) {
      // Validate sequence length
      if (!pattern.sequence || pattern.sequence.length < this.MIN_SEQUENCE_LENGTH) {
        errors.push({
          patternId: pattern.id,
          field: 'sequence',
          message: `Sequence must have at least ${this.MIN_SEQUENCE_LENGTH} agents`,
        });
      }

      // Validate all agents exist in registry
      if (pattern.sequence) {
        for (const agentId of pattern.sequence) {
          // Use type guard for safe type checking
          if (!this.isValidAgentType(agentId)) {
            errors.push({
              patternId: pattern.id,
              field: 'sequence',
              message: `Unknown agent: ${agentId}. Valid agents: ${validAgentTypes.join(', ')}`,
            });
          }
        }
      }

      // Validate confidence range
      if (
        pattern.confidence < this.MIN_CONFIDENCE ||
        pattern.confidence > this.MAX_CONFIDENCE
      ) {
        errors.push({
          patternId: pattern.id,
          field: 'confidence',
          message: `Confidence must be between ${this.MIN_CONFIDENCE} and ${this.MAX_CONFIDENCE}`,
        });
      }

      // Validate success rate with appropriate tolerance
      // Strategy: Use strict validation for small samples, minimal tolerance for large samples
      // Rationale: Small samples should have exact integer counts; large samples may have
      //            minor floating-point rounding from repeated calculations
      if (pattern.observationCount > 0) {
        const calculatedSuccessRate = pattern.successCount / pattern.observationCount;

        // For small sample sizes (< 1000), use integer validation (zero tolerance)
        // Example: 7/10 = 0.7 exactly, not 0.6999999
        if (pattern.observationCount < this.LARGE_SAMPLE_THRESHOLD) {
          const expectedSuccessCount = Math.round(pattern.successRate * pattern.observationCount);
          if (expectedSuccessCount !== pattern.successCount) {
            errors.push({
              patternId: pattern.id,
              field: 'successRate',
              message: `Success rate ${pattern.successRate} inconsistent with counts (${pattern.successCount}/${pattern.observationCount})`,
            });
          }
        } else {
          // For large samples (≥ 1000), allow minimal floating point tolerance (0.01%)
          // Example: 701/1000 might be stored as 0.7009999 or 0.7010001 due to FP arithmetic
          if (Math.abs(pattern.successRate - calculatedSuccessRate) > this.LARGE_SAMPLE_FP_TOLERANCE) {
            errors.push({
              patternId: pattern.id,
              field: 'successRate',
              message: `Success rate ${pattern.successRate} doesn't match calculated ${calculatedSuccessRate.toFixed(4)}`,
            });
          }
        }
      }

      // Validate required fields
      if (!pattern.id) {
        errors.push({
          patternId: pattern.id || 'unknown',
          field: 'id',
          message: 'Pattern ID is required',
        });
      }

      if (!pattern.type) {
        errors.push({
          patternId: pattern.id,
          field: 'type',
          message: 'Pattern type is required',
        });
      }

      if (!pattern.taskType) {
        errors.push({
          patternId: pattern.id,
          field: 'taskType',
          message: 'Task type is required',
        });
      }

      if (!pattern.description) {
        errors.push({
          patternId: pattern.id,
          field: 'description',
          message: 'Pattern description is required',
        });
      }
    }

    return errors;
  }

  /**
   * Convert bootstrap patterns to LearnedPattern format
   */
  private convertToLearnedPatterns(bootstrapPatterns: BootstrapPattern[]): LearnedPattern[] {
    const now = new Date();

    return bootstrapPatterns.map(pattern => {
      // Defensive check: ensure sequence exists and has at least one element
      // (should be caught by validation, but extra safety)
      if (!pattern.sequence || pattern.sequence.length === 0) {
        throw new ValidationError(
          `Pattern ${pattern.id} has empty sequence`,
          {
            component: 'EvolutionBootstrap',
            method: 'getDefaultPatterns',
            patternId: pattern.id,
            patternType: pattern.type,
            constraint: 'sequence must have at least one agent',
          }
        );
      }

      return {
        id: pattern.id,
        type: pattern.type,
        agentId: pattern.sequence[0], // Primary agent is first in sequence
        taskType: pattern.taskType,
        description: pattern.description,
        conditions: pattern.conditions,
        action: pattern.action,
        confidence: pattern.confidence,
        observationCount: pattern.observationCount,
        successCount: pattern.successCount,
        successRate: pattern.successRate,
        createdAt: now,
        updatedAt: now,
      };
    });
  }

  /**
   * Import bootstrap patterns into LearningManager
   *
   * @param learningManager - Learning manager instance to import patterns into
   * @returns Number of successfully imported patterns
   * @throws Error if learningManager is invalid
   */
  async importPatterns(learningManager: LearningManager): Promise<number> {
    if (!learningManager || typeof learningManager !== 'object') {
      throw new ValidationError(
        'learningManager must be a valid LearningManager instance',
        {
          component: 'EvolutionBootstrap',
          method: 'importPatterns',
          providedValue: learningManager,
          providedType: typeof learningManager,
          constraint: 'must be a valid LearningManager instance',
        }
      );
    }

    try {
      // Check if bootstrap is needed
      const needsBootstrap = await this.shouldBootstrap();

      if (!needsBootstrap) {
        logger.info('User has sufficient task history. Skipping bootstrap.');
        return 0;
      }

      // Load and validate patterns
      const patterns = await this.loadBootstrapPatterns();

      if (patterns.length === 0) {
        logger.warn('No valid bootstrap patterns found.');
        return 0;
      }

      // Import patterns into learning manager
      let importedCount = 0;

      for (const pattern of patterns) {
        try {
          // Use the learning manager's public method to add bootstrap pattern
          learningManager.addBootstrapPattern(pattern);
          importedCount++;
        } catch (error) {
          logger.error(`Error importing pattern ${pattern.id}:`, error);
        }
      }

      logger.info(
        `Successfully imported ${importedCount}/${patterns.length} bootstrap patterns`
      );

      return importedCount;
    } catch (error) {
      logger.error('Error importing bootstrap patterns:', error);
      return 0;
    }
  }

  /**
   * Get bootstrap statistics
   */
  async getBootstrapStats(): Promise<{
    isNewUser: boolean;
    taskCount: number;
    availablePatterns: number;
    validPatterns: number;
    invalidPatterns: number;
  }> {
    try {
      const taskCount = await this.performanceTracker.getTotalTaskCount();
      const isNewUser = taskCount < this.MIN_TASKS_FOR_BOOTSTRAP;

      const patterns = await this.loadBootstrapPatterns();
      const bootstrapPath = this.getBootstrapFilePath();

      // Use safe loading with validation
      const fileContent = await fs.readFile(bootstrapPath, 'utf-8');
      const bootstrapData = this.safeJsonParse(fileContent);
      if (bootstrapData === null) {
        // If parsing fails, return safe defaults
        return {
          isNewUser,
          taskCount,
          availablePatterns: 0,
          validPatterns: 0,
          invalidPatterns: 0,
        };
      }

      // Validate before using
      if (!this.isValidBootstrapFile(bootstrapData)) {
        return {
          isNewUser,
          taskCount,
          availablePatterns: 0,
          validPatterns: 0,
          invalidPatterns: 0,
        };
      }

      const validData = bootstrapData as BootstrapFile;
      const validationErrors = this.validatePatterns(validData.patterns);
      const invalidCount = new Set(validationErrors.map(e => e.patternId)).size;

      return {
        isNewUser,
        taskCount,
        availablePatterns: validData.patterns.length,
        validPatterns: patterns.length,
        invalidPatterns: invalidCount,
      };
    } catch (error) {
      logger.error('Error getting bootstrap stats:', error);
      return {
        isNewUser: false,
        taskCount: 0,
        availablePatterns: 0,
        validPatterns: 0,
        invalidPatterns: 0,
      };
    }
  }
}
