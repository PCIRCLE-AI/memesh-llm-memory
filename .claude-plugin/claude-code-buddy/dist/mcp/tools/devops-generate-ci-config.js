export const generateCIConfigTool = {
    name: 'devops-generate-ci-config',
    description: 'Generate CI/CD configuration files for GitHub Actions or GitLab CI. Creates ready-to-use pipeline configs with test, build, and optional deployment steps.',
    inputSchema: {
        type: 'object',
        properties: {
            platform: {
                type: 'string',
                enum: ['github-actions', 'gitlab-ci'],
                description: 'CI/CD platform to generate config for',
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
            const config = await devopsEngineer.generateCIConfig({
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
                config,
                instructions: `
Save this configuration to ${configFileName}:

1. Create the file:
   ${args.platform === 'github-actions' ? 'mkdir -p .github/workflows' : ''}

2. Save the config to ${configFileName}

3. Commit and push:
   git add ${configFileName}
   git commit -m "ci: add ${args.platform} configuration"
   git push

4. The pipeline will run automatically on push
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
//# sourceMappingURL=devops-generate-ci-config.js.map