export const listWorkflowsTool = {
    name: 'workflow-list',
    description: 'List all workflows from Google Opal and n8n platforms. Shows workflow URLs, names, and descriptions from both platforms.',
    inputSchema: {
        type: 'object',
        properties: {
            platform: {
                type: 'string',
                enum: ['opal', 'n8n', 'all'],
                description: 'Filter by platform: "opal", "n8n", or "all" (default)',
            },
        },
        required: [],
    },
    async handler(args, workflowOrchestrator) {
        try {
            const allWorkflows = await workflowOrchestrator.listAllWorkflows();
            const platform = args.platform || 'all';
            const opalWorkflows = platform === 'all' || platform === 'opal'
                ? allWorkflows.opal
                : [];
            const n8nWorkflows = platform === 'all' || platform === 'n8n'
                ? allWorkflows.n8n
                : [];
            const opalSummary = opalWorkflows.map((workflow, index) => ({
                index: index + 1,
                platform: 'Opal',
                url: workflow.url,
                description: workflow.description || 'No description',
            }));
            const n8nSummary = n8nWorkflows.map((workflow, index) => ({
                index: index + 1,
                platform: 'n8n',
                id: workflow.id,
                name: workflow.name,
                nodes: workflow.nodes?.length || 0,
                active: workflow.active ? 'Active' : 'Inactive',
            }));
            return {
                success: true,
                summary: {
                    total: opalWorkflows.length + n8nWorkflows.length,
                    opal: opalWorkflows.length,
                    n8n: n8nWorkflows.length,
                },
                opalWorkflows: opalSummary,
                n8nWorkflows: n8nSummary,
                message: `
Found ${opalWorkflows.length + n8nWorkflows.length} workflows:
- ${opalWorkflows.length} Opal workflows (AI-powered prototypes)
- ${n8nWorkflows.length} n8n workflows (production integrations)

Use workflow-create to add more workflows.
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
//# sourceMappingURL=workflow-list.js.map