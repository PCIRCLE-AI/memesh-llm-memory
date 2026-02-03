import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';
import { ValidationError } from '../errors/index.js';
export class EvolutionBootstrap {
    agentRegistry;
    performanceTracker;
    dataDir;
    BOOTSTRAP_FILE;
    MIN_TASKS_FOR_BOOTSTRAP = 10;
    MAX_CONFIDENCE = 1.0;
    MIN_CONFIDENCE = 0.0;
    MIN_SEQUENCE_LENGTH = 2;
    MAX_BOOTSTRAP_FILE_SIZE = 10 * 1024 * 1024;
    CURRENT_BOOTSTRAP_VERSION = '1.0.0';
    LARGE_SAMPLE_THRESHOLD = 1000;
    LARGE_SAMPLE_FP_TOLERANCE = 0.0001;
    constructor(agentRegistry, performanceTracker, dataDir = 'data', bootstrapFile = 'bootstrap/patterns.json') {
        this.agentRegistry = agentRegistry;
        this.performanceTracker = performanceTracker;
        this.dataDir = dataDir;
        this.BOOTSTRAP_FILE = bootstrapFile;
    }
    getBootstrapFilePath() {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const projectRoot = path.resolve(__dirname, '../..');
        return path.join(projectRoot, this.dataDir, this.BOOTSTRAP_FILE);
    }
    safeJsonParse(content) {
        try {
            return JSON.parse(content);
        }
        catch (parseError) {
            logger.error('Invalid JSON in bootstrap file:', parseError);
            return null;
        }
    }
    async shouldBootstrap() {
        try {
            const taskCount = await this.performanceTracker.getTotalTaskCount();
            const isNewUser = taskCount < this.MIN_TASKS_FOR_BOOTSTRAP;
            if (isNewUser) {
                logger.info(`New user detected (${taskCount} tasks < ${this.MIN_TASKS_FOR_BOOTSTRAP}). Bootstrap patterns will be loaded.`);
            }
            return isNewUser;
        }
        catch (error) {
            logger.error('Error checking bootstrap eligibility:', error);
            return false;
        }
    }
    async loadBootstrapPatterns() {
        try {
            const bootstrapPath = this.getBootstrapFilePath();
            logger.info(`Loading bootstrap patterns from: ${bootstrapPath}`);
            const stats = await fs.stat(bootstrapPath);
            if (stats.size > this.MAX_BOOTSTRAP_FILE_SIZE) {
                logger.error(`Bootstrap file too large: ${stats.size} bytes (max: ${this.MAX_BOOTSTRAP_FILE_SIZE})`);
                return [];
            }
            const fileContent = await fs.readFile(bootstrapPath, 'utf-8');
            const bootstrapData = this.safeJsonParse(fileContent);
            if (bootstrapData === null) {
                return [];
            }
            if (!this.isValidBootstrapFile(bootstrapData)) {
                logger.error('Bootstrap file does not match expected schema');
                return [];
            }
            const validData = bootstrapData;
            if (!this.isCompatibleVersion(validData.version)) {
                logger.error(`Incompatible bootstrap version: ${validData.version} (expected: ${this.CURRENT_BOOTSTRAP_VERSION})`);
                return [];
            }
            logger.info(`Loaded ${validData.patterns.length} bootstrap patterns (version: ${validData.version})`);
            const validationErrors = this.validatePatterns(validData.patterns);
            if (validationErrors.length > 0) {
                logger.warn(`Found ${validationErrors.length} validation errors in bootstrap patterns:`);
                validationErrors.forEach(error => {
                    logger.warn(`  - Pattern ${error.patternId}: ${error.field} - ${error.message}`);
                });
                const validPatterns = validData.patterns.filter(pattern => {
                    return !validationErrors.some(error => error.patternId === pattern.id);
                });
                logger.info(`Using ${validPatterns.length} valid patterns out of ${validData.patterns.length}`);
                return this.convertToLearnedPatterns(validPatterns);
            }
            return this.convertToLearnedPatterns(validData.patterns);
        }
        catch (error) {
            logger.error('Error loading bootstrap patterns:', error);
            return [];
        }
    }
    isValidAgentType(agentId) {
        const validAgentTypes = new Set(this.agentRegistry.getAllAgentTypes());
        return validAgentTypes.has(agentId);
    }
    isValidBootstrapFile(data) {
        if (typeof data !== 'object' || data === null)
            return false;
        const obj = data;
        return (typeof obj.version === 'string' &&
            typeof obj.description === 'string' &&
            Array.isArray(obj.patterns) &&
            obj.patterns.every(p => this.isValidBootstrapPattern(p)));
    }
    isValidBootstrapPattern(data) {
        if (typeof data !== 'object' || data === null)
            return false;
        const p = data;
        return (typeof p.id === 'string' &&
            ['success', 'failure', 'optimization', 'anti-pattern'].includes(p.type) &&
            typeof p.name === 'string' &&
            typeof p.description === 'string' &&
            Array.isArray(p.sequence) &&
            typeof p.confidence === 'number' &&
            typeof p.observationCount === 'number' &&
            typeof p.successCount === 'number' &&
            typeof p.successRate === 'number' &&
            typeof p.taskType === 'string' &&
            typeof p.conditions === 'object' &&
            typeof p.action === 'object');
    }
    isCompatibleVersion(version) {
        const [currentMajor] = this.CURRENT_BOOTSTRAP_VERSION.split('.');
        const [fileMajor] = version.split('.');
        return currentMajor === fileMajor;
    }
    validatePatterns(patterns) {
        const errors = [];
        const validAgentTypes = this.agentRegistry.getAllAgentTypes();
        for (const pattern of patterns) {
            if (!pattern.sequence || pattern.sequence.length < this.MIN_SEQUENCE_LENGTH) {
                errors.push({
                    patternId: pattern.id,
                    field: 'sequence',
                    message: `Sequence must have at least ${this.MIN_SEQUENCE_LENGTH} agents`,
                });
            }
            if (pattern.sequence) {
                for (const agentId of pattern.sequence) {
                    if (!this.isValidAgentType(agentId)) {
                        errors.push({
                            patternId: pattern.id,
                            field: 'sequence',
                            message: `Unknown agent: ${agentId}. Valid agents: ${validAgentTypes.join(', ')}`,
                        });
                    }
                }
            }
            if (pattern.confidence < this.MIN_CONFIDENCE ||
                pattern.confidence > this.MAX_CONFIDENCE) {
                errors.push({
                    patternId: pattern.id,
                    field: 'confidence',
                    message: `Confidence must be between ${this.MIN_CONFIDENCE} and ${this.MAX_CONFIDENCE}`,
                });
            }
            if (pattern.observationCount > 0) {
                const calculatedSuccessRate = pattern.successCount / pattern.observationCount;
                if (pattern.observationCount < this.LARGE_SAMPLE_THRESHOLD) {
                    const expectedSuccessCount = Math.round(pattern.successRate * pattern.observationCount);
                    if (expectedSuccessCount !== pattern.successCount) {
                        errors.push({
                            patternId: pattern.id,
                            field: 'successRate',
                            message: `Success rate ${pattern.successRate} inconsistent with counts (${pattern.successCount}/${pattern.observationCount})`,
                        });
                    }
                }
                else {
                    if (Math.abs(pattern.successRate - calculatedSuccessRate) > this.LARGE_SAMPLE_FP_TOLERANCE) {
                        errors.push({
                            patternId: pattern.id,
                            field: 'successRate',
                            message: `Success rate ${pattern.successRate} doesn't match calculated ${calculatedSuccessRate.toFixed(4)}`,
                        });
                    }
                }
            }
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
    convertToLearnedPatterns(bootstrapPatterns) {
        const now = new Date();
        return bootstrapPatterns.map(pattern => {
            if (!pattern.sequence || pattern.sequence.length === 0) {
                throw new ValidationError(`Pattern ${pattern.id} has empty sequence`, {
                    component: 'EvolutionBootstrap',
                    method: 'getDefaultPatterns',
                    patternId: pattern.id,
                    patternType: pattern.type,
                    constraint: 'sequence must have at least one agent',
                });
            }
            return {
                id: pattern.id,
                type: pattern.type,
                agentId: pattern.sequence[0],
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
    async importPatterns(learningManager) {
        if (!learningManager || typeof learningManager !== 'object') {
            throw new ValidationError('learningManager must be a valid LearningManager instance', {
                component: 'EvolutionBootstrap',
                method: 'importPatterns',
                providedValue: learningManager,
                providedType: typeof learningManager,
                constraint: 'must be a valid LearningManager instance',
            });
        }
        try {
            const needsBootstrap = await this.shouldBootstrap();
            if (!needsBootstrap) {
                logger.info('User has sufficient task history. Skipping bootstrap.');
                return 0;
            }
            const patterns = await this.loadBootstrapPatterns();
            if (patterns.length === 0) {
                logger.warn('No valid bootstrap patterns found.');
                return 0;
            }
            let importedCount = 0;
            for (const pattern of patterns) {
                try {
                    learningManager.addPattern(pattern);
                    importedCount++;
                }
                catch (error) {
                    logger.error(`Error importing pattern ${pattern.id}:`, error);
                }
            }
            logger.info(`Successfully imported ${importedCount}/${patterns.length} bootstrap patterns`);
            return importedCount;
        }
        catch (error) {
            logger.error('Error importing bootstrap patterns:', error);
            return 0;
        }
    }
    async getBootstrapStats() {
        try {
            const taskCount = await this.performanceTracker.getTotalTaskCount();
            const isNewUser = taskCount < this.MIN_TASKS_FOR_BOOTSTRAP;
            const patterns = await this.loadBootstrapPatterns();
            const bootstrapPath = this.getBootstrapFilePath();
            const fileContent = await fs.readFile(bootstrapPath, 'utf-8');
            const bootstrapData = this.safeJsonParse(fileContent);
            if (bootstrapData === null) {
                return {
                    isNewUser,
                    taskCount,
                    availablePatterns: 0,
                    validPatterns: 0,
                    invalidPatterns: 0,
                };
            }
            if (!this.isValidBootstrapFile(bootstrapData)) {
                return {
                    isNewUser,
                    taskCount,
                    availablePatterns: 0,
                    validPatterns: 0,
                    invalidPatterns: 0,
                };
            }
            const validData = bootstrapData;
            const validationErrors = this.validatePatterns(validData.patterns);
            const invalidCount = new Set(validationErrors.map(e => e.patternId)).size;
            return {
                isNewUser,
                taskCount,
                availablePatterns: validData.patterns.length,
                validPatterns: patterns.length,
                invalidPatterns: invalidCount,
            };
        }
        catch (error) {
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
//# sourceMappingURL=EvolutionBootstrap.js.map