import { describe, it, expect, beforeEach } from 'vitest';
import { EvidenceCollector } from '../../../../src/agents/e2e-healing/analyzers/EvidenceCollector.js';
import { FailureAnalyzer } from '../../../../src/agents/e2e-healing/analyzers/FailureAnalyzer.js';

describe('EvidenceCollector', () => {
  let collector: EvidenceCollector;

  beforeEach(() => {
    collector = new EvidenceCollector();
  });

  it('should collect code context from test file', async () => {
    const mockReadFile = async (path: string) => {
      if (path.includes('Button.test.tsx')) {
        return `
import { test } from '@playwright/test';

test('should render button', async ({ page }) => {
  await page.goto('/');
  await page.click('button');
});
        `;
      }
      return '';
    };

    collector.setFileReader(mockReadFile);

    const evidence = await collector.collect('tests/Button.test.tsx');

    expect(evidence.testCode).toContain('should render button');
    expect(evidence.testFile).toBe('tests/Button.test.tsx');
  });

  it('should identify related component files', async () => {
    const mockReadFile = async (path: string) => {
      return 'test("dummy test", () => {});';
    };

    const mockGlob = async (pattern: string) => {
      if (pattern.includes('Button')) {
        return ['src/components/Button.tsx', 'src/components/Button.module.css'];
      }
      return [];
    };

    collector.setFileReader(mockReadFile);
    collector.setGlobber(mockGlob);

    const evidence = await collector.collect('tests/components/Button.test.tsx');

    expect(evidence.relatedFiles).toContain('src/components/Button.tsx');
    expect(evidence.relatedFiles).toContain('src/components/Button.module.css');
  });
});

describe('FailureAnalyzer', () => {
  let analyzer: FailureAnalyzer;

  beforeEach(() => {
    analyzer = new FailureAnalyzer();
  });

  it('should analyze test failure with Claude SDK', async () => {
    const mockSDK = {
      analyzeFailure: async (input: any) => ({
        rootCause: 'Missing CSS class "btn-primary"',
        tokensUsed: 150,
      }),
    };

    analyzer.setSDK(mockSDK as any);

    const evidence = {
      testFile: 'tests/Button.test.tsx',
      testCode: 'test code...',
      error: new Error('Element not found'),
      screenshot: 'base64...',
      relatedFiles: ['src/components/Button.tsx'],
    };

    const analysis = await analyzer.analyze(evidence);

    expect(analysis.rootCause).toContain('Missing CSS class');
    expect(analysis.confidence).toBeGreaterThan(0);
  });
});
