import { recallMemoryTool } from '../tools/recall-memory.js';
import { createEntitiesTool } from '../tools/create-entities.js';
import { addObservationsTool } from '../tools/add-observations.js';
import { createRelationsTool } from '../tools/create-relations.js';
import { generateCIConfigTool } from '../tools/devops-generate-ci-config.js';
import { analyzeDeploymentTool } from '../tools/devops-analyze-deployment.js';
import { setupCITool } from '../tools/devops-setup-ci.js';
import { createWorkflowTool } from '../tools/workflow-create.js';
import { listWorkflowsTool } from '../tools/workflow-list.js';
import { handleError, logError } from '../../utils/errorHandler.js';
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
    planningEngine;
    projectMemoryManager;
    knowledgeGraph;
    ui;
    devopsEngineer;
    workflowOrchestrator;
    constructor(router, agentRegistry, feedbackCollector, performanceTracker, learningManager, evolutionMonitor, skillManager, uninstallManager, developmentButler, checkpointDetector, planningEngine, projectMemoryManager, knowledgeGraph, ui, devopsEngineer, workflowOrchestrator) {
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
        this.planningEngine = planningEngine;
        this.projectMemoryManager = projectMemoryManager;
        this.knowledgeGraph = knowledgeGraph;
        this.ui = ui;
        this.devopsEngineer = devopsEngineer;
        this.workflowOrchestrator = workflowOrchestrator;
    }
    async handleListAgents() {
        try {
            const agents = this.agentRegistry.getAllAgents();
            const categories = new Map();
            agents.forEach(agent => {
                const category = agent.category || 'general';
                if (!categories.has(category)) {
                    categories.set(category, []);
                }
                categories.get(category).push(agent);
            });
            let output = '🤖 Claude Code Buddy - Available Agents\n';
            output += '━'.repeat(60) + '\n\n';
            output += `**Total**: ${agents.length} specialized agents\n\n`;
            const categoryEmojis = {
                code: '💻',
                design: '🎨',
                testing: '🧪',
                analysis: '🔍',
                documentation: '📚',
                deployment: '🚀',
                general: '🌐',
            };
            categories.forEach((categoryAgents, category) => {
                const emoji = categoryEmojis[category] || '📦';
                output += `${emoji} **${category.charAt(0).toUpperCase() + category.slice(1)}** (${categoryAgents.length})\n\n`;
                categoryAgents.forEach(agent => {
                    output += `  • **${agent.name}**\n`;
                    output += `    ${agent.description}\n\n`;
                });
            });
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
                method: 'handleListAgents',
                operation: 'listing available agents',
            });
            const handled = handleError(error, {
                component: 'ToolHandlers',
                method: 'handleListAgents',
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ List agents failed: ${handled.message}`,
                    },
                ],
            };
        }
    }
    async handleListSkills(input) {
        try {
            const filter = input.filter || 'all';
            let skills;
            let title;
            switch (filter) {
                case 'claude-code-buddy':
                    skills = await this.skillManager.listSmartAgentsSkills();
                    title = '🎓 Claude Code Buddy Skills (sa: prefix)';
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
                    output += '💡 Claude Code Buddy can generate skills automatically.\n';
                    output += '   Skills will appear here once generated.\n';
                }
            }
            else {
                output += `Total: ${skills.length} skill${skills.length === 1 ? '' : 's'}\n\n`;
                const saSkills = skills.filter(s => s.startsWith('sa:'));
                const userSkills = skills.filter(s => !s.startsWith('sa:'));
                if (filter === 'all') {
                    if (saSkills.length > 0) {
                        output += '🎓 Claude Code Buddy Skills:\n';
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
            output += '  • sa:<name> - Claude Code Buddy generated skills\n';
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
                data: { filter: input.filter },
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
    async handleUninstall(input) {
        try {
            const options = {
                keepData: input.keepData,
                keepConfig: input.keepConfig,
                dryRun: input.dryRun,
            };
            const report = await this.uninstallManager.uninstall(options);
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
                operation: 'uninstalling Claude Code Buddy',
                data: { options: input },
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
    async handleGetWorkflowGuidance(input) {
        try {
            const result = await this.developmentButler.processCheckpoint(input.phase, input);
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
                data: { phase: input.phase },
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
    async handleRecordTokenUsage(input) {
        try {
            this.developmentButler.getTokenTracker().recordUsage({
                inputTokens: input.inputTokens,
                outputTokens: input.outputTokens,
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
                data: { inputTokens: input.inputTokens, outputTokens: input.outputTokens },
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
    async handleGenerateSmartPlan(input) {
        try {
            const plan = await this.planningEngine.generatePlan({
                featureDescription: input.featureDescription,
                requirements: input.requirements,
                constraints: input.constraints,
            });
            let planText = `# ${plan.title}\n\n`;
            planText += `**Goal**: ${plan.goal}\n\n`;
            planText += `**Architecture**: ${plan.architecture}\n\n`;
            planText += `**Tech Stack**: ${plan.techStack.join(', ')}\n\n`;
            planText += `**Total Estimated Time**: ${plan.totalEstimatedTime}\n\n`;
            planText += `---\n\n`;
            planText += `## Tasks\n\n`;
            for (const task of plan.tasks) {
                planText += `### ${task.id}: ${task.description}\n\n`;
                planText += `- **Priority**: ${task.priority}\n`;
                planText += `- **Estimated Duration**: ${task.estimatedDuration}\n`;
                if (task.suggestedAgent) {
                    planText += `- **Suggested Agent**: ${task.suggestedAgent}\n`;
                }
                if (task.dependencies.length > 0) {
                    planText += `- **Dependencies**: ${task.dependencies.join(', ')}\n`;
                }
                planText += `\n**Steps**:\n`;
                task.steps.forEach((step, index) => {
                    planText += `${index + 1}. ${step}\n`;
                });
                if (task.files.create && task.files.create.length > 0) {
                    planText += `\n**Files to Create**: ${task.files.create.join(', ')}\n`;
                }
                if (task.files.modify && task.files.modify.length > 0) {
                    planText += `**Files to Modify**: ${task.files.modify.join(', ')}\n`;
                }
                if (task.files.test && task.files.test.length > 0) {
                    planText += `**Test Files**: ${task.files.test.join(', ')}\n`;
                }
                planText += `\n---\n\n`;
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: planText,
                    },
                ],
            };
        }
        catch (error) {
            logError(error, {
                component: 'ToolHandlers',
                method: 'handleGenerateSmartPlan',
                operation: 'generating smart plan',
                data: { featureDescription: input.featureDescription },
            });
            const handled = handleError(error, {
                component: 'ToolHandlers',
                method: 'handleGenerateSmartPlan',
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ Smart plan generation failed: ${handled.message}`,
                    },
                ],
            };
        }
    }
    async handleRecallMemory(input) {
        try {
            const result = await recallMemoryTool.handler(input, this.projectMemoryManager);
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
                data: { query: input.query, limit: input.limit },
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
    async handleCreateEntities(input) {
        try {
            const result = await createEntitiesTool.handler(input, this.knowledgeGraph);
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
                data: { entityCount: input.entities.length },
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
    async handleAddObservations(input) {
        try {
            const result = await addObservationsTool.handler(input, this.knowledgeGraph);
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
                data: { observationCount: input.observations.length },
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
    async handleCreateRelations(input) {
        try {
            const result = await createRelationsTool.handler(input, this.knowledgeGraph);
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
                data: { relationCount: input.relations.length },
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
    async handleGenerateCIConfig(input) {
        try {
            const result = await generateCIConfigTool.handler(input, this.devopsEngineer);
            if (!result.success) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `❌ Failed to generate CI config: ${result.error}`,
                        },
                    ],
                };
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `🚀 CI/CD Configuration Generated

Platform: ${result.platform}
Config File: ${result.configFileName}

${result.instructions}

──────────────────────────────────────
Configuration Content:
──────────────────────────────────────

${result.config}
`,
                    },
                ],
            };
        }
        catch (error) {
            logError(error, {
                component: 'ToolHandlers',
                method: 'handleGenerateCIConfig',
                operation: 'generating CI/CD config',
                data: { platform: input.platform },
            });
            const handled = handleError(error, {
                component: 'ToolHandlers',
                method: 'handleGenerateCIConfig',
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ Failed to generate CI config: ${handled.message}`,
                    },
                ],
            };
        }
    }
    async handleAnalyzeDeployment(input) {
        try {
            const result = await analyzeDeploymentTool.handler(input, this.devopsEngineer);
            if (!result.success) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `❌ Deployment analysis failed: ${result.error}`,
                        },
                    ],
                };
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: result.summary || 'Deployment analysis completed',
                    },
                ],
            };
        }
        catch (error) {
            logError(error, {
                component: 'ToolHandlers',
                method: 'handleAnalyzeDeployment',
                operation: 'analyzing deployment readiness',
            });
            const handled = handleError(error, {
                component: 'ToolHandlers',
                method: 'handleAnalyzeDeployment',
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ Failed to analyze deployment: ${handled.message}`,
                    },
                ],
            };
        }
    }
    async handleSetupCI(input) {
        try {
            const result = await setupCITool.handler(input, this.devopsEngineer);
            if (!result.success) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `❌ CI setup failed: ${result.error}`,
                        },
                    ],
                };
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `${result.message}

${result.nextSteps}

──────────────────────────────────────
Configuration Details:
──────────────────────────────────────

Config File: ${result.details?.configFile || result.configFileName}
Test Command: ${result.details?.testCommand || input.testCommand}
Build Command: ${result.details?.buildCommand || input.buildCommand}
`,
                    },
                ],
            };
        }
        catch (error) {
            logError(error, {
                component: 'ToolHandlers',
                method: 'handleSetupCI',
                operation: 'setting up CI/CD',
                data: { platform: input.platform },
            });
            const handled = handleError(error, {
                component: 'ToolHandlers',
                method: 'handleSetupCI',
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ Failed to setup CI: ${handled.message}`,
                    },
                ],
            };
        }
    }
    async handleCreateWorkflow(input) {
        try {
            const result = await createWorkflowTool.handler(input, this.workflowOrchestrator);
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
                method: 'handleCreateWorkflow',
                operation: 'creating workflow',
                data: { description: input.description, platform: input.platform },
            });
            const handled = handleError(error, {
                component: 'ToolHandlers',
                method: 'handleCreateWorkflow',
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ Failed to create workflow: ${handled.message}`,
                    },
                ],
            };
        }
    }
    async handleListWorkflows(input) {
        try {
            const result = await listWorkflowsTool.handler(input, this.workflowOrchestrator);
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
                method: 'handleListWorkflows',
                operation: 'listing workflows',
                data: { platform: input.platform },
            });
            const handled = handleError(error, {
                component: 'ToolHandlers',
                method: 'handleListWorkflows',
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ Failed to list workflows: ${handled.message}`,
                    },
                ],
            };
        }
    }
}
//# sourceMappingURL=ToolHandlers.js.map