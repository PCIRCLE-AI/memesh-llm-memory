export interface TestTemplate {
  imports: string;
  describe: string;
  testCase: string;
}

export const vitestTemplate: TestTemplate = {
  imports: `import { describe, it, expect } from 'vitest';`,
  describe: `describe('{{moduleName}}', () => {
  {{testCases}}
});`,
  testCase: `  it('{{testDescription}}', () => {
    {{testBody}}
  });`
};

export function generateTestFile(options: {
  moduleName: string;
  importPath: string;
  functions: Array<{ name: string; testCases: Array<{ description: string; body: string }> }>;
}): string {
  const { moduleName, importPath, functions } = options;

  // Generate imports
  const functionNames = functions.map(f => f.name).join(', ');
  const imports = `${vitestTemplate.imports}\nimport { ${functionNames} } from '${importPath}';`;

  // Generate test cases
  const testCases = functions.flatMap(func =>
    func.testCases.map(tc =>
      vitestTemplate.testCase
        .replace('{{testDescription}}', tc.description)
        .replace('{{testBody}}', tc.body)
    )
  ).join('\n\n');

  // Generate describe block
  const describeBlock = vitestTemplate.describe
    .replace('{{moduleName}}', moduleName)
    .replace('{{testCases}}', testCases);

  return `${imports}\n\n${describeBlock}\n`;
}
