import { SimpleConfig } from '../config/simple-config.js';
import { AGENT_PERSONAS, AGENT_TOOLS, AGENT_INSTRUCTIONS, MODEL_SUGGESTIONS, } from '../prompts/templates/PromptTemplates.js';
export class PromptEnhancer {
    enhance(agentType, task, complexity = 'medium') {
        const systemPrompt = this.buildSystemPrompt(agentType);
        const guardrails = this.buildGuardrails(agentType);
        const userPrompt = this.buildUserPrompt(task, agentType, guardrails);
        const suggestedModel = this.suggestModel(agentType, complexity);
        const metadata = {
            agentType,
            taskId: task.id,
            complexity,
            timestamp: Date.now(),
            tools: AGENT_TOOLS[agentType],
        };
        if (guardrails) {
            metadata.guardrails = guardrails;
        }
        return { systemPrompt, userPrompt, suggestedModel, metadata };
    }
    buildSystemPrompt(agentType) {
        const persona = AGENT_PERSONAS[agentType];
        const tools = AGENT_TOOLS[agentType];
        let systemPrompt = persona;
        if (tools.length > 0) {
            systemPrompt += `\n\nAvailable Tools:\n${tools.map(tool => `- ${tool}`).join('\n')}`;
        }
        systemPrompt += `\n\nIMPORTANT: Provide detailed, actionable responses with specific examples when helpful.`;
        return systemPrompt;
    }
    buildUserPrompt(task, agentType, guardrails) {
        let userPrompt = task.description;
        const agentInstructions = this.getAgentSpecificInstructions(agentType);
        if (agentInstructions) {
            userPrompt += `\n\n${agentInstructions}`;
        }
        if (task.metadata && Object.keys(task.metadata).length > 0) {
            userPrompt += `\n\nAdditional Context:\n${JSON.stringify(task.metadata, null, 2)}`;
        }
        if (guardrails) {
            userPrompt += `\n\n${guardrails}`;
        }
        return userPrompt;
    }
    buildGuardrails(agentType) {
        const sections = [];
        if (SimpleConfig.EVIDENCE_MODE) {
            const evidenceLines = [
                'Do not invent files, APIs, errors, or test results.',
                'Cite file paths/symbols or command output for each claim.',
                'If evidence is missing, label it as "Assumption" and request the missing input.',
                'Separate facts vs assumptions and list risks explicitly.',
            ];
            const agentSpecific = this.getEvidenceGuardrails(agentType);
            if (agentSpecific.length > 0) {
                evidenceLines.push(...agentSpecific);
            }
            sections.push(`Evidence & Risk Guard:\n${evidenceLines.map((line) => `- ${line}`).join('\n')}`);
        }
        if (SimpleConfig.BEGINNER_MODE) {
            const beginnerLines = [
                'Provide a 1-2 sentence plain-language summary.',
                'Give exactly one "Next Step" and explain why it matters.',
                'If a command is needed, include the safest command and expected output.',
            ];
            sections.push(`Beginner-Friendly Output:\n${beginnerLines.map((line) => `- ${line}`).join('\n')}`);
        }
        return sections.length > 0 ? sections.join('\n\n') : null;
    }
    getEvidenceGuardrails(agentType) {
        switch (agentType) {
            case 'code-reviewer':
                return [
                    'Group findings by severity (Blocker/High/Medium/Low).',
                    'Include at least one concrete code reference per finding.',
                    'List tests to run and highlight missing coverage.',
                ];
            case 'debugger':
                return [
                    'Provide reproduction steps or request them if missing.',
                    'Explain root cause with evidence, then propose minimal fix.',
                    'Include verification steps to prevent regressions.',
                ];
            case 'test-writer':
            case 'test-automator':
                return [
                    'State which tests were run; if none, say "Not run".',
                    'Provide the exact test command and summarize results.',
                ];
            case 'e2e-healing-agent':
                return [
                    'Cite screenshots/logs/traces when describing failures.',
                    'State healing status and verification steps explicitly.',
                ];
            default:
                return [];
        }
    }
    getAgentSpecificInstructions(agentType) {
        return AGENT_INSTRUCTIONS[agentType];
    }
    suggestModel(agentType, complexity) {
        return MODEL_SUGGESTIONS[agentType][complexity];
    }
    getAgentPersona(agentType) {
        return AGENT_PERSONAS[agentType];
    }
    getAgentTools(agentType) {
        return AGENT_TOOLS[agentType];
    }
}
//# sourceMappingURL=PromptEnhancer.js.map