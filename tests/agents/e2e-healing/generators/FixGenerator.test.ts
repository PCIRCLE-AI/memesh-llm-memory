import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FixGenerator } from '../../../../src/agents/e2e-healing/generators/FixGenerator.js';
import { AgentSDKAdapter } from '../../../../src/agents/e2e-healing/sdk/AgentSDKAdapter.js';

describe('FixGenerator', () => {
  let fixGenerator: FixGenerator;
  let mockSDK: AgentSDKAdapter;

  beforeEach(() => {
    fixGenerator = new FixGenerator();

    // Mock AgentSDKAdapter
    mockSDK = {
      generateFix: vi.fn(),
    } as unknown as AgentSDKAdapter;
  });

  describe('setSDK', () => {
    it('should configure the SDK adapter', () => {
      fixGenerator.setSDK(mockSDK);
      expect(() => fixGenerator.setSDK(mockSDK)).not.toThrow();
    });
  });

  describe('generate', () => {
    it('should throw error when SDK is not configured', async () => {
      const input = {
        rootCause: 'Button text mismatch',
        codeContext: 'LoginPage component',
        testFile: 'tests/e2e/login.test.ts',
        componentFile: 'src/components/LoginPage.tsx',
      };

      await expect(fixGenerator.generate(input)).rejects.toThrow(
        'AgentSDKAdapter not configured'
      );
    });

    it('should generate fix for component file when root cause is general', async () => {
      fixGenerator.setSDK(mockSDK);

      const mockResult = {
        code: 'const LoginButton = () => <button>Sign In</button>',
        tokensUsed: 150,
        cacheHit: false,
      };

      vi.mocked(mockSDK.generateFix).mockResolvedValue(mockResult);

      const input = {
        rootCause: 'Button text mismatch: expected "Sign In", found "Login"',
        codeContext: 'LoginPage component renders button',
        testFile: 'tests/e2e/login.test.ts',
        componentFile: 'src/components/LoginPage.tsx',
      };

      const result = await fixGenerator.generate(input);

      expect(result).toEqual({
        code: mockResult.code,
        targetFile: 'src/components/LoginPage.tsx',
        tokensUsed: 150,
        cacheHit: false,
      });

      expect(mockSDK.generateFix).toHaveBeenCalledWith({
        rootCause: input.rootCause,
        codeContext: input.codeContext,
        testFile: input.testFile,
      });
    });

    it('should generate fix for style file when root cause mentions CSS', async () => {
      fixGenerator.setSDK(mockSDK);

      const mockResult = {
        code: '.login-button { background: blue; }',
        tokensUsed: 100,
        cacheHit: true,
      };

      vi.mocked(mockSDK.generateFix).mockResolvedValue(mockResult);

      const input = {
        rootCause: 'Button background color mismatch: CSS class missing',
        codeContext: 'LoginPage styles',
        testFile: 'tests/e2e/login.test.ts',
        componentFile: 'src/components/LoginPage.tsx',
        styleFile: 'src/components/LoginPage.css',
      };

      const result = await fixGenerator.generate(input);

      expect(result).toEqual({
        code: mockResult.code,
        targetFile: 'src/components/LoginPage.css',
        tokensUsed: 100,
        cacheHit: true,
      });
    });

    it('should generate fix for style file when root cause mentions style', async () => {
      fixGenerator.setSDK(mockSDK);

      const mockResult = {
        code: '.modal { display: block; }',
        tokensUsed: 80,
        cacheHit: false,
      };

      vi.mocked(mockSDK.generateFix).mockResolvedValue(mockResult);

      const input = {
        rootCause: 'Modal visibility issue: style not applied',
        codeContext: 'Modal component',
        testFile: 'tests/e2e/modal.test.ts',
        componentFile: 'src/components/Modal.tsx',
        styleFile: 'src/components/Modal.css',
      };

      const result = await fixGenerator.generate(input);

      expect(result.targetFile).toBe('src/components/Modal.css');
    });

    it('should generate fix for style file when root cause mentions class', async () => {
      fixGenerator.setSDK(mockSDK);

      const mockResult = {
        code: '.button-primary { color: white; }',
        tokensUsed: 90,
        cacheHit: false,
      };

      vi.mocked(mockSDK.generateFix).mockResolvedValue(mockResult);

      const input = {
        rootCause: 'Button class not found',
        codeContext: 'Button component',
        testFile: 'tests/e2e/button.test.ts',
        componentFile: 'src/components/Button.tsx',
        styleFile: 'src/components/Button.css',
      };

      const result = await fixGenerator.generate(input);

      expect(result.targetFile).toBe('src/components/Button.css');
    });

    it('should default to component file when no component file specified', async () => {
      fixGenerator.setSDK(mockSDK);

      const mockResult = {
        code: 'export const HomePage = () => <div>Home</div>',
        tokensUsed: 120,
        cacheHit: false,
      };

      vi.mocked(mockSDK.generateFix).mockResolvedValue(mockResult);

      const input = {
        rootCause: 'HomePage component not rendering',
        codeContext: 'HomePage',
        testFile: 'tests/e2e/home.test.ts',
      };

      const result = await fixGenerator.generate(input);

      // Should derive component file from test file
      expect(result.targetFile).toBe('tests/e2e/home.ts');
    });

    it('should track token usage from SDK', async () => {
      fixGenerator.setSDK(mockSDK);

      const mockResult = {
        code: 'const fix = "code"',
        tokensUsed: 250,
        cacheHit: false,
      };

      vi.mocked(mockSDK.generateFix).mockResolvedValue(mockResult);

      const input = {
        rootCause: 'Test failure',
        codeContext: 'Component',
        testFile: 'test.ts',
        componentFile: 'src/Component.tsx',
      };

      const result = await fixGenerator.generate(input);

      expect(result.tokensUsed).toBe(250);
    });

    it('should propagate cache hit status from SDK', async () => {
      fixGenerator.setSDK(mockSDK);

      const mockResult = {
        code: 'cached code',
        tokensUsed: 0,
        cacheHit: true,
      };

      vi.mocked(mockSDK.generateFix).mockResolvedValue(mockResult);

      const input = {
        rootCause: 'Known issue',
        codeContext: 'Component',
        testFile: 'test.ts',
        componentFile: 'src/Component.tsx',
      };

      const result = await fixGenerator.generate(input);

      expect(result.cacheHit).toBe(true);
    });
  });
});
