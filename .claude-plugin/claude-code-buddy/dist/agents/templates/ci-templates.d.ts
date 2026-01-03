export declare const githubActionsTemplate = "name: CI/CD Pipeline\n\non:\n  push:\n    branches: [ main, develop ]\n  pull_request:\n    branches: [ main, develop ]\n\njobs:\n  test:\n    runs-on: ubuntu-latest\n\n    steps:\n      - uses: actions/checkout@v3\n\n      - name: Setup Node.js\n        uses: actions/setup-node@v3\n        with:\n          node-version: '18'\n          cache: 'npm'\n\n      - name: Install dependencies\n        run: npm ci\n\n      - name: Run tests\n        run: {{testCommand}}\n\n      - name: Build\n        run: {{buildCommand}}\n";
export declare const gitlabCITemplate = ".gitlab-ci.yml template placeholder";
export declare function generateCIConfig(options: {
    platform: 'github-actions' | 'gitlab-ci';
    testCommand: string;
    buildCommand: string;
}): string;
//# sourceMappingURL=ci-templates.d.ts.map