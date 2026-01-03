export const setupCITool = {
    name: 'devops-setup-ci',
    description: 'Complete CI/CD setup in one command. Generates config, writes to file, and records to Knowledge Graph. Ready-to-commit CI/CD configuration.',
    inputSchema: {
        type: 'object',
        properties: {
            platform: {
                type: 'string',
                enum: ['github-actions', 'gitlab-ci'],
                description: 'CI/CD platform to set up',
            },
            testCommand: {
                type: 'string',
                description: 'Command to run tests (e.g., "npm test", "pytest")',
            },
            buildCommand: {
                type: 'string',
                description: 'Command to build the project (e.g., "npm run build", "make")',
            },
        },
        required: ['platform', 'testCommand', 'buildCommand'],
    },
    async handler(args, devopsEngineer) {
        try {
            await devopsEngineer.setupCI({
                platform: args.platform,
                testCommand: args.testCommand,
                buildCommand: args.buildCommand,
            });
            const configFileName = args.platform === 'github-actions'
                ? '.github/workflows/ci.yml'
                : '.gitlab-ci.yml';
            return {
                success: true,
                platform: args.platform,
                configFileName,
                message: `✅ CI/CD setup complete!`,
                details: {
                    configFile: configFileName,
                    testCommand: args.testCommand,
                    buildCommand: args.buildCommand,
                },
                nextSteps: `
Next steps:

1. Review the generated config:
   cat ${configFileName}

2. Commit and push:
   git add ${configFileName}
   git commit -m "ci: add ${args.platform} configuration"
   git push

3. Monitor the pipeline:
   ${args.platform === 'github-actions'
                    ? 'Visit: https://github.com/<owner>/<repo>/actions'
                    : 'Visit: https://gitlab.com/<namespace>/<project>/-/pipelines'}

The configuration has been recorded to Knowledge Graph for future reference.
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
//# sourceMappingURL=devops-setup-ci.js.map