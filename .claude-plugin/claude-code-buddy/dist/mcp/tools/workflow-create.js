export const createWorkflowTool = {
    name: 'workflow-create',
    description: 'Create automated workflows using Google Opal or n8n. Automatically selects the best platform (Opal for AI prototypes, n8n for production workflows) based on your description.',
    inputSchema: {
        type: 'object',
        properties: {
            description: {
                type: 'string',
                description: 'Natural language description of what the workflow should do (e.g., "Call API and send results via email", "AI-powered data processing pipeline")',
            },
            platform: {
                type: 'string',
                enum: ['opal', 'n8n', 'auto'],
                description: 'Platform to use: "opal" (fast AI prototypes), "n8n" (production workflows), or "auto" (automatic selection, default)',
            },
            priority: {
                type: 'string',
                enum: ['speed', 'production'],
                description: 'Priority: "speed" (fast prototyping), "production" (reliability and integration)',
            },
        },
        required: ['description'],
    },
    async handler(args, workflowOrchestrator) {
        try {
            const result = await workflowOrchestrator.createWorkflow({
                description: args.description,
                platform: args.platform || 'auto',
                priority: args.priority,
            });
            if (!result.success) {
                return {
                    success: false,
                    error: result.error || 'Workflow creation failed',
                };
            }
            return {
                success: true,
                platform: result.platform,
                workflowUrl: result.workflowUrl,
                workflowId: result.workflowId,
                screenshot: result.screenshot,
                reasoning: result.reasoning,
                message: `✅ Workflow created on ${result.platform.toUpperCase()}!`,
                nextSteps: `
Next steps:

1. Open the workflow:
   ${result.workflowUrl}

${result.screenshot ? `2. View screenshot:
   ${result.screenshot}
` : ''}
${result.platform === 'opal' ? `3. Edit in natural language at opal.withgoogle.com
` : `3. Configure nodes and connections at n8n dashboard
`}
4. Test the workflow with sample data
5. Activate for production use

Why ${result.platform}? ${result.reasoning}
`.trim(),
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    },
};
//# sourceMappingURL=workflow-create.js.map