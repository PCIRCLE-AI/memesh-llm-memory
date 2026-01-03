import { AGENT_PERSONAS, AGENT_TOOLS, AGENT_INSTRUCTIONS, MODEL_SUGGESTIONS, } from '../prompts/templates/PromptTemplates.js';
export class PromptEnhancer {
    enhance(agentType, task, complexity = 'medium') {
        const systemPrompt = this.buildSystemPrompt(agentType);
        const userPrompt = this.buildUserPrompt(task, agentType);
        const suggestedModel = this.suggestModel(agentType, complexity);
        return {
            systemPrompt,
            userPrompt,
            suggestedModel,
            metadata: {
                agentType,
                taskId: task.id,
                complexity,
                timestamp: Date.now(),
                tools: AGENT_TOOLS[agentType],
            },
        };
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
    buildUserPrompt(task, agentType) {
        let userPrompt = task.description;
        const agentInstructions = this.getAgentSpecificInstructions(agentType);
        if (agentInstructions) {
            userPrompt += `\n\n${agentInstructions}`;
        }
        if (task.metadata && Object.keys(task.metadata).length > 0) {
            userPrompt += `\n\nAdditional Context:\n${JSON.stringify(task.metadata, null, 2)}`;
        }
        return userPrompt;
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