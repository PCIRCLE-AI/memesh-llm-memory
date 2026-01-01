import { AgentSDKAdapter } from '../sdk/AgentSDKAdapter.js';

/**
 * Input for fix generation
 */
export interface GenerateFixInput {
  /** Root cause description from failure analysis */
  rootCause: string;
  /** Code context around the failure */
  codeContext: string;
  /** Test file that failed */
  testFile: string;
  /** Component file to fix (optional) */
  componentFile?: string;
  /** Style file to fix (optional) */
  styleFile?: string;
}

/**
 * Generated fix output
 */
export interface GeneratedFix {
  /** Generated fix code */
  code: string;
  /** Target file to apply the fix to */
  targetFile: string;
  /** Number of tokens used for generation */
  tokensUsed: number;
  /** Whether this result was served from cache */
  cacheHit: boolean;
}

/**
 * FixGenerator - AI-powered code fix generation
 *
 * Generates code fixes based on root cause analysis using Claude Agent SDK.
 * Intelligently determines target files (component vs style) based on root cause.
 */
export class FixGenerator {
  private sdk?: AgentSDKAdapter;

  /**
   * Configure the AgentSDKAdapter for fix generation
   */
  setSDK(sdk: AgentSDKAdapter): void {
    this.sdk = sdk;
  }

  /**
   * Generate a fix for the given failure
   *
   * @param input - Fix generation input
   * @returns Generated fix with target file and metadata
   * @throws Error if SDK is not configured
   */
  async generate(input: GenerateFixInput): Promise<GeneratedFix> {
    if (!this.sdk) {
      throw new Error('AgentSDKAdapter not configured');
    }

    // Determine target file based on root cause
    const targetFile = this.determineTargetFile(input);

    // Generate fix code
    const result = await this.sdk.generateFix({
      rootCause: input.rootCause,
      codeContext: input.codeContext,
      testFile: input.testFile,
    });

    return {
      code: result.code,
      targetFile,
      tokensUsed: result.tokensUsed,
      cacheHit: result.cacheHit,
    };
  }

  /**
   * Determine target file based on root cause analysis
   *
   * Strategy:
   * - If root cause mentions CSS/style/class AND styleFile exists → target style file
   * - Otherwise → target component file (or derive from test file if not specified)
   *
   * @param input - Fix generation input
   * @returns Target file path
   */
  private determineTargetFile(input: GenerateFixInput): string {
    const rootCauseLower = input.rootCause.toLowerCase();

    // Check if root cause indicates a style issue
    const isStyleIssue =
      rootCauseLower.includes('css') ||
      rootCauseLower.includes('style') ||
      rootCauseLower.includes('class');

    // If root cause mentions CSS/styles AND we have a style file, target it
    if (input.styleFile && isStyleIssue) {
      return input.styleFile;
    }

    // Default to component file
    // If component file not specified, derive from test file
    return input.componentFile || input.testFile.replace('.test.', '.');
  }
}
