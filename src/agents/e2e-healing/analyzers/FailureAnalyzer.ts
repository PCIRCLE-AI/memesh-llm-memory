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

  private calculateConfidence(rootCause: string): number {
    // Simple heuristic: longer analysis = higher confidence
    // Real implementation would use more sophisticated metrics
    const length = rootCause.length;
    if (length > 500) return 0.9;
    if (length > 200) return 0.7;
    if (length > 100) return 0.5;
    return 0.3;
  }
}
