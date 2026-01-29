import { AgentSDKAdapter } from '../sdk/AgentSDKAdapter.js';

interface Evidence {
  testFile: string;
  testCode: string;
  error?: Error;
  screenshot?: string;
  logs?: string[];
  relatedFiles: string[];
}

interface Analysis {
  rootCause: string;
  confidence: number;
  tokensUsed: number;
}

export class FailureAnalyzer {
  private sdk?: AgentSDKAdapter;

  setSDK(sdk: AgentSDKAdapter): void {
    this.sdk = sdk;
  }

  async analyze(evidence: Evidence): Promise<Analysis> {
    if (!this.sdk) {
      throw new Error('AgentSDKAdapter not configured');
    }

    if (!evidence.error) {
      throw new Error('No error to analyze');
    }

    const result = await this.sdk.analyzeFailure({
      error: evidence.error,
      screenshot: evidence.screenshot,
      codeContext: evidence.testCode,
      useExtendedThinking: true,
    });

    // Calculate confidence based on analysis quality
    const confidence = this.calculateConfidence(result.rootCause);

    return {
      rootCause: result.rootCause,
      confidence,
      tokensUsed: result.tokensUsed,
    };
  }

  /**
   * Calculate confidence based on analysis quality
   * Simple heuristic: longer analysis = higher confidence
   */
  private calculateConfidence(rootCause: string): number {
    const thresholds = [
      { minLength: 500, confidence: 0.9 },
      { minLength: 200, confidence: 0.7 },
      { minLength: 100, confidence: 0.5 },
    ];

    const match = thresholds.find(t => rootCause.length > t.minLength);
    return match?.confidence ?? 0.3;
  }
}
