import { z } from 'zod';
import { ValidationError, OperationError } from '../../errors/index.js';
import { RateLimiter } from '../../utils/RateLimiter.js';
import { MistakePatternEngine } from '../../memory/MistakePatternEngine.js';
import { UserPreferenceEngine } from '../../memory/UserPreferenceEngine.js';
import { recallMemoryTool } from '../tools/recall-memory.js';
import { createEntitiesTool } from '../tools/create-entities.js';
import { addObservationsTool } from '../tools/add-observations.js';
import { createRelationsTool } from '../tools/create-relations.js';
import { generateTestsTool } from '../tools/generate-tests.js';
import { handleBuddyRecordMistake } from './BuddyRecordMistake.js';
import { handleError, logError } from '../../utils/errorHandler.js';
import { ListSkillsInputSchema, UninstallInputSchema, WorkflowGuidanceInputSchema, RecordTokenUsageInputSchema, HookToolUseInputSchema, RecallMemoryInputSchema, CreateEntitiesInputSchema, AddObservationsInputSchema, CreateRelationsInputSchema, GenerateTestsInputSchema, formatValidationError, } from '../validation.js';
export class ToolHandlers {
    router;
    agentRegistry;
    feedbackCollector;
    performanceTracker;
    learningManager;
    evolutionMonitor;
    skillManager;
    uninstallManager;
    developmentButler;
    checkpointDetector;
    hookIntegration;
    projectMemoryManager;
    knowledgeGraph;
    ui;
    samplingClient;
    memoryRateLimiter;
    unifiedMemoryStore;
    mistakePatternEngine;
    userPreferenceEngine;
    constructor(router, agentRegistry, feedbackCollector, performanceTracker, learningManager, evolutionMonitor, skillManager, uninstallManager, developmentButler, checkpointDetector, hookIntegration, projectMemoryManager, knowledgeGraph, ui, samplingClient, unifiedMemoryStore) {
        this.router = router;
        this.agentRegistry = agentRegistry;
        this.feedbackCollector = feedbackCollector;
        this.performanceTracker = performanceTracker;
        this.learningManager = learningManager;
        this.evolutionMonitor = evolutionMonitor;
        this.skillManager = skillManager;
        this.uninstallManager = uninstallManager;
        this.developmentButler = developmentButler;
        this.checkpointDetector = checkpointDetector;
        this.hookIntegration = hookIntegration;
        this.projectMemoryManager = projectMemoryManager;
        this.knowledgeGraph = knowledgeGraph;
        this.ui = ui;
        this.samplingClient = samplingClient;
        this.memoryRateLimiter = new RateLimiter({ requestsPerMinute: 10 });
        this.unifiedMemoryStore = unifiedMemoryStore;
        this.mistakePatternEngine = new MistakePatternEngine(this.unifiedMemoryStore);
        this.userPreferenceEngine = new UserPreferenceEngine(this.unifiedMemoryStore);
    }
    async handleListSkills(args) {
        try {
            let validatedInput;
            try {
                validatedInput = ListSkillsInputSchema.parse(args);
            }
            catch (error) {
                if (error instanceof z.ZodError) {
                    throw new ValidationError(formatValidationError(error), {
                        component: 'ToolHandlers',
                        method: 'handleListSkills',
                        schema: 'ListSkillsInputSchema',
                        providedArgs: args,
                    });
                }
                throw error;
            }
            const filter = validatedInput.filter || 'all';
            let skills;
            let title;
            switch (filter) {
                case 'claude-code-buddy':
                    skills = await this.skillManager.listSmartAgentsSkills();
                    title = '🎓 MeMesh Skills (sa: prefix)';
                    break;
                case 'user':
                    skills = await this.skillManager.listUserSkills();
                    title = '👤 User Skills';
                    break;
                case 'all':
                default:
                    const allSkillsMetadata = await this.skillManager.listAllSkills();
                    skills = allSkillsMetadata.map(s => s.name);
                    title = '🎓 All Skills';
                    break;
            }
            let output = `${title}\n`;
            output += '━'.repeat(60) + '\n\n';
            if (skills.length === 0) {
                output += '  No skills found.\n\n';
                if (filter === 'claude-code-buddy') {
                    output += '💡 MeMesh can generate skills automatically.\n';
                    output += '   Skills will appear here once generated.\n';
                }
            }
            else {
                output += `Total: ${skills.length} skill${skills.length === 1 ? '' : 's'}\n\n`;
                const saSkills = skills.filter(s => s.startsWith('sa:'));
                const userSkills = skills.filter(s => !s.startsWith('sa:'));
                if (filter === 'all') {
                    if (saSkills.length > 0) {
                        output += '🎓 MeMesh Skills:\n';
                        output += '─'.repeat(60) + '\n';
                        saSkills.forEach(skill => {
                            output += `  • ${skill}\n`;
                        });
                        output += '\n';
                    }
                    if (userSkills.length > 0) {
                        output += '👤 User Skills:\n';
                        output += '─'.repeat(60) + '\n';
                        userSkills.forEach(skill => {
                            output += `  • ${skill}\n`;
                        });
                        output += '\n';
                    }
                }
                else {
                    skills.forEach(skill => {
                        output += `  • ${skill}\n`;
                    });
                    output += '\n';
                }
            }
            output += '━'.repeat(60) + '\n';
            output += '\n💡 Usage:\n';
            output += '  • buddy_skills - List all skills\n';
            output += '  • buddy_skills --filter claude-code-buddy - List only sa: skills\n';
            output += '  • buddy_skills --filter user - List only user skills\n';
            output += '\n📚 Skill Naming Convention:\n';
            output += '  • sa:<name> - MeMesh generated skills\n';
            output += '  • <name> - User-installed skills\n';
            return {
                content: [
                    {
                        type: 'text',
                        text: output,
                    },
                ],
            };
        }
        catch (error) {
            logError(error, {
                component: 'ToolHandlers',
                method: 'handleListSkills',
                operation: 'listing skills',
                data: { filter: args?.filter },
            });
            const handled = handleError(error, {
                component: 'ToolHandlers',
                method: 'handleListSkills',
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ List skills failed: ${handled.message}`,
                    },
                ],
            };
        }
    }
    async handleUninstall(args) {
        try {
            let validatedInput;
            try {
                validatedInput = UninstallInputSchema.parse(args);
            }
            catch (error) {
                if (error instanceof z.ZodError) {
                    throw new ValidationError(formatValidationError(error), {
                        component: 'ToolHandlers',
                        method: 'handleUninstall',
                        schema: 'UninstallInputSchema',
                        providedArgs: args,
                    });
                }
                throw error;
            }
            const report = await this.uninstallManager.uninstall(validatedInput);
            const formattedReport = this.uninstallManager.formatReport(report);
            return {
                content: [
                    {
                        type: 'text',
                        text: formattedReport,
                    },
                ],
            };
        }
        catch (error) {
            logError(error, {
                component: 'ToolHandlers',
                method: 'handleUninstall',
                operation: 'uninstalling MeMesh',
                data: { options: args },
            });
            const handled = handleError(error, {
                component: 'ToolHandlers',
                method: 'handleUninstall',
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ Uninstall failed: ${handled.message}`,
                    },
                ],
            };
        }
    }
    async handleGetWorkflowGuidance(args) {
        try {
            let validatedInput;
            try {
                validatedInput = WorkflowGuidanceInputSchema.parse(args);
            }
            catch (error) {
                if (error instanceof z.ZodError) {
                    throw new ValidationError(formatValidationError(error), {
                        component: 'ToolHandlers',
                        method: 'handleGetWorkflowGuidance',
                        schema: 'WorkflowGuidanceInputSchema',
                        providedArgs: args,
                    });
                }
                throw error;
            }
            const normalizedPhase = this.normalizeWorkflowPhase(validatedInput.phase);
            if (!normalizedPhase) {
                throw new ValidationError(`Invalid workflow phase: ${validatedInput.phase}`, {
                    component: 'ToolHandlers',
                    method: 'handleGetWorkflowGuidance',
                    validPhases: ['idle', 'code-written', 'test-complete', 'commit-ready', 'committed'],
                    providedPhase: validatedInput.phase,
                });
            }
            const result = await this.developmentButler.processCheckpoint(normalizedPhase, {
                ...validatedInput,
                phase: normalizedPhase,
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: result.formattedRequest,
                    },
                ],
            };
        }
        catch (error) {
            logError(error, {
                component: 'ToolHandlers',
                method: 'handleGetWorkflowGuidance',
                operation: 'processing workflow checkpoint',
                data: { phase: args?.phase },
            });
            const handled = handleError(error, {
                component: 'ToolHandlers',
                method: 'handleGetWorkflowGuidance',
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ Workflow guidance failed: ${handled.message}`,
                    },
                ],
            };
        }
    }
    async handleGetSessionHealth() {
        try {
            const health = this.developmentButler.getContextMonitor().checkSessionHealth();
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(health, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            logError(error, {
                component: 'ToolHandlers',
                method: 'handleGetSessionHealth',
                operation: 'checking session health',
            });
            const handled = handleError(error, {
                component: 'ToolHandlers',
                method: 'handleGetSessionHealth',
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ Session health check failed: ${handled.message}`,
                    },
                ],
            };
        }
    }
    async handleReloadContext(input) {
        try {
            const requestId = `manual_${Date.now()}`;
            const result = await this.developmentButler.executeContextReload(requestId);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(result, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            logError(error, {
                component: 'ToolHandlers',
                method: 'handleReloadContext',
                operation: 'reloading context',
                data: { reason: input.reason },
            });
            const handled = handleError(error, {
                component: 'ToolHandlers',
                method: 'handleReloadContext',
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ Context reload failed: ${handled.message}`,
                    },
                ],
            };
        }
    }
    async handleRecordTokenUsage(args) {
        try {
            let validatedInput;
            try {
                validatedInput = RecordTokenUsageInputSchema.parse(args);
            }
            catch (error) {
                if (error instanceof z.ZodError) {
                    throw new ValidationError(formatValidationError(error), {
                        component: 'ToolHandlers',
                        method: 'handleRecordTokenUsage',
                        schema: 'RecordTokenUsageInputSchema',
                        providedArgs: args,
                    });
                }
                throw error;
            }
            this.developmentButler.getTokenTracker().recordUsage({
                inputTokens: validatedInput.inputTokens,
                outputTokens: validatedInput.outputTokens,
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({ success: true }, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            logError(error, {
                component: 'ToolHandlers',
                method: 'handleRecordTokenUsage',
                operation: 'recording token usage',
                data: { inputTokens: args?.inputTokens, outputTokens: args?.outputTokens },
            });
            const handled = handleError(error, {
                component: 'ToolHandlers',
                method: 'handleRecordTokenUsage',
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ Token usage recording failed: ${handled.message}`,
                    },
                ],
            };
        }
    }
    async handleHookToolUse(args) {
        try {
            let validatedInput;
            try {
                validatedInput = HookToolUseInputSchema.parse(args);
            }
            catch (error) {
                if (error instanceof z.ZodError) {
                    throw new ValidationError(formatValidationError(error), {
                        component: 'ToolHandlers',
                        method: 'handleHookToolUse',
                        schema: 'HookToolUseInputSchema',
                        providedArgs: args,
                    });
                }
                throw error;
            }
            await this.hookIntegration.processToolUse({
                toolName: validatedInput.toolName,
                arguments: validatedInput.arguments,
                success: validatedInput.success,
                duration: validatedInput.duration,
                tokensUsed: validatedInput.tokensUsed,
                output: validatedInput.output,
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({ success: true }, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            logError(error, {
                component: 'ToolHandlers',
                method: 'handleHookToolUse',
                operation: 'processing hook tool use',
                data: { toolName: args?.toolName },
            });
            const handled = handleError(error, {
                component: 'ToolHandlers',
                method: 'handleHookToolUse',
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ Hook processing failed: ${handled.message}`,
                    },
                ],
            };
        }
    }
    async handleRecallMemory(args) {
        if (!this.memoryRateLimiter.consume()) {
            throw new OperationError('Memory operation rate limit exceeded. Please try again later.', {
                component: 'ToolHandlers',
                method: 'handleRecallMemory',
                rateLimitStatus: this.memoryRateLimiter.getStatus(),
            });
        }
        try {
            let validatedInput;
            try {
                validatedInput = RecallMemoryInputSchema.parse(args);
            }
            catch (error) {
                if (error instanceof z.ZodError) {
                    throw new ValidationError(formatValidationError(error), {
                        component: 'ToolHandlers',
                        method: 'handleRecallMemory',
                        schema: 'RecallMemoryInputSchema',
                        providedArgs: args,
                    });
                }
                throw error;
            }
            const result = await recallMemoryTool.handler(validatedInput, this.projectMemoryManager);
            let text = '📚 Project Memory Recall\n';
            text += '━'.repeat(60) + '\n\n';
            if (result.memories.length === 0) {
                text += 'No memories found.\n\n';
                text += '💡 Memories will be created as you work on the project.\n';
            }
            else {
                text += `Found ${result.memories.length} recent memories:\n\n`;
                result.memories.forEach((memory, index) => {
                    text += `${index + 1}. ${memory.type}\n`;
                    if (memory.timestamp) {
                        text += `   Timestamp: ${memory.timestamp}\n`;
                    }
                    if (memory.observations && memory.observations.length > 0) {
                        text += '   Observations:\n';
                        memory.observations.forEach(obs => {
                            text += `   - ${obs}\n`;
                        });
                    }
                    text += '\n';
                });
            }
            text += '━'.repeat(60) + '\n';
            return {
                content: [
                    {
                        type: 'text',
                        text,
                    },
                ],
            };
        }
        catch (error) {
            logError(error, {
                component: 'ToolHandlers',
                method: 'handleRecallMemory',
                operation: 'recalling project memory',
                data: { query: args?.query, limit: args?.limit },
            });
            const handled = handleError(error, {
                component: 'ToolHandlers',
                method: 'handleRecallMemory',
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ Failed to recall memory: ${handled.message}`,
                    },
                ],
            };
        }
    }
    describeCapabilities(agentName) {
        const agent = this.agentRegistry.getAgent(agentName);
        if (!agent || !agent.capabilities || agent.capabilities.length === 0) {
            return undefined;
        }
        return agent.capabilities.slice(0, 3).join(', ');
    }
    async handleCreateEntities(args) {
        if (!this.memoryRateLimiter.consume()) {
            throw new OperationError('Memory operation rate limit exceeded. Please try again later.', {
                component: 'ToolHandlers',
                method: 'handleCreateEntities',
                rateLimitStatus: this.memoryRateLimiter.getStatus(),
            });
        }
        try {
            let validatedInput;
            try {
                validatedInput = CreateEntitiesInputSchema.parse(args);
            }
            catch (error) {
                if (error instanceof z.ZodError) {
                    throw new ValidationError(formatValidationError(error), {
                        component: 'ToolHandlers',
                        method: 'handleCreateEntities',
                        schema: 'CreateEntitiesInputSchema',
                        providedArgs: args,
                    });
                }
                throw error;
            }
            const result = await createEntitiesTool.handler(validatedInput, this.knowledgeGraph);
            let text = '✨ Knowledge Graph Entity Creation\n';
            text += '━'.repeat(60) + '\n\n';
            if (result.count === 0) {
                text += '⚠️ No entities were created.\n\n';
                if (result.errors && result.errors.length > 0) {
                    text += 'Errors encountered:\n';
                    result.errors.forEach(error => {
                        text += `  ❌ ${error.name}: ${error.error}\n`;
                    });
                }
            }
            else {
                text += `✅ Successfully created ${result.count} ${result.count === 1 ? 'entity' : 'entities'}:\n\n`;
                result.created.forEach((name, index) => {
                    text += `${index + 1}. ${name}\n`;
                });
                if (result.errors && result.errors.length > 0) {
                    text += '\n⚠️ Some entities failed:\n';
                    result.errors.forEach(error => {
                        text += `  ❌ ${error.name}: ${error.error}\n`;
                    });
                }
            }
            text += '\n' + '━'.repeat(60) + '\n';
            return {
                content: [
                    {
                        type: 'text',
                        text,
                    },
                ],
            };
        }
        catch (error) {
            logError(error, {
                component: 'ToolHandlers',
                method: 'handleCreateEntities',
                operation: 'creating knowledge graph entities',
                data: { entityCount: args?.entities?.length ?? 0 },
            });
            const handled = handleError(error, {
                component: 'ToolHandlers',
                method: 'handleCreateEntities',
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ Failed to create entities: ${handled.message}`,
                    },
                ],
            };
        }
    }
    async handleBuddyRecordMistake(args) {
        if (!this.memoryRateLimiter.consume()) {
            throw new OperationError('Memory operation rate limit exceeded. Please try again later.', {
                component: 'ToolHandlers',
                method: 'handleBuddyRecordMistake',
                rateLimitStatus: this.memoryRateLimiter.getStatus(),
            });
        }
        if (!args || typeof args !== 'object') {
            throw new ValidationError('Invalid input: expected object', {
                component: 'ToolHandlers',
                method: 'handleBuddyRecordMistake',
                providedArgs: args,
            });
        }
        const input = args;
        const requiredFields = ['action', 'errorType', 'userCorrection', 'correctMethod', 'impact', 'preventionMethod'];
        for (const field of requiredFields) {
            if (!(field in input) || !input[field]) {
                throw new ValidationError(`Missing required field: ${field}`, {
                    component: 'ToolHandlers',
                    method: 'handleBuddyRecordMistake',
                    missingField: field,
                });
            }
        }
        return handleBuddyRecordMistake(input, this.unifiedMemoryStore, this.mistakePatternEngine, this.userPreferenceEngine);
    }
    async handleAddObservations(args) {
        if (!this.memoryRateLimiter.consume()) {
            throw new OperationError('Memory operation rate limit exceeded. Please try again later.', {
                component: 'ToolHandlers',
                method: 'handleAddObservations',
                rateLimitStatus: this.memoryRateLimiter.getStatus(),
            });
        }
        try {
            let validatedInput;
            try {
                validatedInput = AddObservationsInputSchema.parse(args);
            }
            catch (error) {
                if (error instanceof z.ZodError) {
                    throw new ValidationError(formatValidationError(error), {
                        component: 'ToolHandlers',
                        method: 'handleAddObservations',
                        schema: 'AddObservationsInputSchema',
                        providedArgs: args,
                    });
                }
                throw error;
            }
            const result = await addObservationsTool.handler(validatedInput, this.knowledgeGraph);
            let text = '📝 Knowledge Graph Observation Update\n';
            text += '━'.repeat(60) + '\n\n';
            if (result.count === 0) {
                text += '⚠️ No observations were added.\n\n';
                if (result.notFound && result.notFound.length > 0) {
                    text += 'Entities not found:\n';
                    result.notFound.forEach(name => {
                        text += `  ❌ ${name}\n`;
                    });
                }
                if (result.errors && result.errors.length > 0) {
                    text += '\nErrors encountered:\n';
                    result.errors.forEach(error => {
                        text += `  ❌ ${error.entityName}: ${error.error}\n`;
                    });
                }
            }
            else {
                text += `✅ Successfully updated ${result.count} ${result.count === 1 ? 'entity' : 'entities'}:\n\n`;
                result.updated.forEach((name, index) => {
                    text += `${index + 1}. ${name}\n`;
                });
                if (result.notFound && result.notFound.length > 0) {
                    text += '\n⚠️ Some entities were not found:\n';
                    result.notFound.forEach(name => {
                        text += `  ❌ ${name}\n`;
                    });
                }
                if (result.errors && result.errors.length > 0) {
                    text += '\n⚠️ Some updates failed:\n';
                    result.errors.forEach(error => {
                        text += `  ❌ ${error.entityName}: ${error.error}\n`;
                    });
                }
            }
            text += '\n' + '━'.repeat(60) + '\n';
            return {
                content: [
                    {
                        type: 'text',
                        text,
                    },
                ],
            };
        }
        catch (error) {
            logError(error, {
                component: 'ToolHandlers',
                method: 'handleAddObservations',
                operation: 'adding observations to entities',
                data: { observationCount: args?.observations?.length ?? 0 },
            });
            const handled = handleError(error, {
                component: 'ToolHandlers',
                method: 'handleAddObservations',
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ Failed to add observations: ${handled.message}`,
                    },
                ],
            };
        }
    }
    async handleCreateRelations(args) {
        if (!this.memoryRateLimiter.consume()) {
            throw new OperationError('Memory operation rate limit exceeded. Please try again later.', {
                component: 'ToolHandlers',
                method: 'handleCreateRelations',
                rateLimitStatus: this.memoryRateLimiter.getStatus(),
            });
        }
        try {
            let validatedInput;
            try {
                validatedInput = CreateRelationsInputSchema.parse(args);
            }
            catch (error) {
                if (error instanceof z.ZodError) {
                    throw new ValidationError(formatValidationError(error), {
                        component: 'ToolHandlers',
                        method: 'handleCreateRelations',
                        schema: 'CreateRelationsInputSchema',
                        providedArgs: args,
                    });
                }
                throw error;
            }
            const result = await createRelationsTool.handler(validatedInput, this.knowledgeGraph);
            let text = '🔗 Knowledge Graph Relation Creation\n';
            text += '━'.repeat(60) + '\n\n';
            if (result.count === 0) {
                text += '⚠️ No relations were created.\n\n';
                if (result.missingEntities && result.missingEntities.length > 0) {
                    text += 'Entities not found:\n';
                    result.missingEntities.forEach(name => {
                        text += `  ❌ ${name}\n`;
                    });
                }
                if (result.errors && result.errors.length > 0) {
                    text += '\nErrors encountered:\n';
                    result.errors.forEach(error => {
                        text += `  ❌ ${error.from} → ${error.to}: ${error.error}\n`;
                    });
                }
            }
            else {
                text += `✅ Successfully created ${result.count} ${result.count === 1 ? 'relation' : 'relations'}:\n\n`;
                result.created.forEach((rel, index) => {
                    text += `${index + 1}. ${rel.from} --[${rel.type}]--> ${rel.to}\n`;
                });
                if (result.missingEntities && result.missingEntities.length > 0) {
                    text += '\n⚠️ Some entities were not found:\n';
                    result.missingEntities.forEach(name => {
                        text += `  ❌ ${name}\n`;
                    });
                }
                if (result.errors && result.errors.length > 0) {
                    text += '\n⚠️ Some relations failed:\n';
                    result.errors.forEach(error => {
                        text += `  ❌ ${error.from} → ${error.to}: ${error.error}\n`;
                    });
                }
            }
            text += '\n' + '━'.repeat(60) + '\n';
            return {
                content: [
                    {
                        type: 'text',
                        text,
                    },
                ],
            };
        }
        catch (error) {
            logError(error, {
                component: 'ToolHandlers',
                method: 'handleCreateRelations',
                operation: 'creating entity relations',
                data: { relationCount: args?.relations?.length ?? 0 },
            });
            const handled = handleError(error, {
                component: 'ToolHandlers',
                method: 'handleCreateRelations',
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ Failed to create relations: ${handled.message}`,
                    },
                ],
            };
        }
    }
    async handleGenerateTests(args) {
        try {
            const validatedInput = GenerateTestsInputSchema.parse(args);
            const input = validatedInput;
            const result = await generateTestsTool(input, this.samplingClient);
            let text = '🧪 Test Generation Result\n';
            text += '━'.repeat(60) + '\n\n';
            text += `${result.message}\n\n`;
            text += '```typescript\n';
            text += result.testCode;
            text += '\n```\n\n';
            text += '━'.repeat(60) + '\n';
            text += '\n💡 Next Steps:\n';
            text += '  • Review the generated tests for accuracy\n';
            text += '  • Adjust test cases as needed\n';
            text += '  • Add edge cases if necessary\n';
            text += '  • Run tests to verify they pass\n';
            return {
                content: [
                    {
                        type: 'text',
                        text,
                    },
                ],
            };
        }
        catch (error) {
            logError(error, {
                component: 'ToolHandlers',
                method: 'handleGenerateTests',
                operation: 'generating tests',
                data: { args },
            });
            const handled = handleError(error, {
                component: 'ToolHandlers',
                method: 'handleGenerateTests',
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ Failed to generate tests: ${handled.message}`,
                    },
                ],
            };
        }
    }
    normalizeWorkflowPhase(phase) {
        const normalized = phase.trim().toLowerCase();
        if (!normalized) {
            return null;
        }
        const cleaned = normalized.replace(/[_\s]+/g, '-');
        const direct = new Set(['idle', 'code-written', 'test-complete', 'commit-ready', 'committed']);
        if (direct.has(cleaned)) {
            return cleaned;
        }
        const aliases = {
            planning: 'idle',
            analysis: 'idle',
            start: 'idle',
            'code-analysis': 'code-written',
            implementation: 'code-written',
            coding: 'code-written',
            code: 'code-written',
            'test-analysis': 'test-complete',
            testing: 'test-complete',
            tests: 'test-complete',
            test: 'test-complete',
            'tests-complete': 'test-complete',
            'ready-to-commit': 'commit-ready',
            commit: 'commit-ready',
            'pre-commit': 'commit-ready',
            done: 'committed',
            merged: 'committed',
            shipped: 'committed',
            released: 'committed',
        };
        return aliases[cleaned] || null;
    }
}
//# sourceMappingURL=ToolHandlers.js.map