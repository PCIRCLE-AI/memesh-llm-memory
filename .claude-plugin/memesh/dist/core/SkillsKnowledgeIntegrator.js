import { promises as fs } from 'fs';
import { resolve, join } from 'path';
import { logger } from '../utils/logger.js';
export class SkillsKnowledgeIntegrator {
    skillsPath;
    bestPractices = new Map();
    skillsLoaded = false;
    constructor(skillsPath) {
        this.skillsPath = skillsPath || this.resolveSkillsPath();
    }
    resolveSkillsPath() {
        const homeDir = process.env.HOME || process.env.USERPROFILE || '~';
        return resolve(homeDir, '.claude', 'skills');
    }
    async scanSkills() {
        try {
            const files = await fs.readdir(this.skillsPath);
            const mdFiles = files.filter((f) => f.endsWith('.md'));
            for (const file of mdFiles) {
                const filePath = join(this.skillsPath, file);
                const content = await fs.readFile(filePath, 'utf-8');
                await this.extractPracticesFromSkill(file, content);
            }
            this.skillsLoaded = true;
            logger.info('[SkillsKnowledgeIntegrator] Scanned skills', {
                filesScanned: mdFiles.length,
                practicesExtracted: this.getTotalPracticesCount(),
            });
        }
        catch (error) {
            logger.warn('[SkillsKnowledgeIntegrator] Failed to scan skills', {
                path: this.skillsPath,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    async extractPracticesFromSkill(filename, content) {
        const practices = [];
        if (content.includes('subagent') ||
            content.includes('parallel') ||
            content.includes('dispatch')) {
            practices.push({
                id: `${filename}-subagent-dispatch`,
                name: 'Parallel Subagent Dispatching',
                tool: 'Task',
                description: 'Dispatch multiple subagents in parallel for independent tasks',
                whenToUse: 'When you have 2+ independent tasks that can be worked on without dependencies',
                example: 'Use Task tool with multiple parallel invocations for concurrent work',
                source: filename,
            });
        }
        if (content.includes('background') || content.includes('async')) {
            practices.push({
                id: `${filename}-background-worker`,
                name: 'Background Worker Pattern',
                tool: 'Task',
                description: 'Run long-running tasks in background',
                whenToUse: 'When task takes > 2 minutes and you can continue other work',
                example: 'Use run_in_background parameter for Task tool',
                source: filename,
            });
        }
        if (content.includes('TaskCreate') || content.includes('TaskUpdate')) {
            practices.push({
                id: `${filename}-task-management`,
                name: 'Task Tool Management',
                tool: 'TaskCreate',
                description: 'Use task tools to track multi-step work',
                whenToUse: 'For complex tasks requiring 3+ steps or multiple operations',
                example: 'Create tasks, update status, mark completed',
                source: filename,
            });
        }
        if (content.includes('code-review') || content.includes('review-pr')) {
            practices.push({
                id: `${filename}-code-review`,
                name: 'Code Review Best Practices',
                phase: 'test-complete',
                tool: 'code-reviewer',
                description: 'Use code-reviewer subagent for thorough review',
                whenToUse: 'After tests pass, before committing code',
                example: 'Dispatch code-reviewer subagent with specific files',
                source: filename,
            });
        }
        if (content.includes('test-driven') || content.includes('tdd')) {
            practices.push({
                id: `${filename}-tdd`,
                name: 'Test-Driven Development',
                phase: 'code-written',
                tool: 'vitest',
                description: 'Write tests before implementation',
                whenToUse: 'When implementing new features or fixing bugs',
                example: 'Create test file first, write failing test, then implement',
                source: filename,
            });
        }
        if (content.includes('planning') || content.includes('writing-plans')) {
            practices.push({
                id: `${filename}-planning`,
                name: 'Planning Before Execution',
                tool: 'EnterPlanMode',
                description: 'Plan implementation before writing code',
                whenToUse: 'For non-trivial tasks or multi-file changes',
                example: 'Use EnterPlanMode to create implementation plan',
                source: filename,
            });
        }
        for (const practice of practices) {
            const key = practice.tool;
            const existing = this.bestPractices.get(key) || [];
            existing.push(practice);
            this.bestPractices.set(key, existing);
        }
    }
    getBestPractices(tool) {
        return this.bestPractices.get(tool) || [];
    }
    getAllPractices() {
        const all = [];
        for (const practices of this.bestPractices.values()) {
            all.push(...practices);
        }
        return all;
    }
    getPracticesForPhase(phase) {
        return this.getAllPractices().filter((p) => p.phase === phase);
    }
    getTotalPracticesCount() {
        let count = 0;
        for (const practices of this.bestPractices.values()) {
            count += practices.length;
        }
        return count;
    }
    isLoaded() {
        return this.skillsLoaded;
    }
    async reload() {
        this.bestPractices.clear();
        this.skillsLoaded = false;
        await this.scanSkills();
    }
    getRecommendationEnhancements(phase) {
        const practices = this.getPracticesForPhase(phase);
        return practices.map((p) => `${p.name}: ${p.description} (${p.whenToUse})`);
    }
}
//# sourceMappingURL=SkillsKnowledgeIntegrator.js.map