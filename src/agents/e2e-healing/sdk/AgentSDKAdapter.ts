import Anthropic from '@anthropic-ai/sdk';

interface AnalyzeFailureInput {
  error: Error;
  screenshot?: string;
  codeContext: string;
  useExtendedThinking?: boolean;
}

interface AnalyzeFailureResult {
  rootCause: string;
  tokensUsed: number;
}

interface GenerateFixInput {
  rootCause: string;
  codeContext: string;
  testFile: string;
}

interface GenerateFixResult {
  code: string;
  tokensUsed: number;
  cacheHit: boolean;
}

export class AgentSDKAdapter {
  private client: Anthropic;

  constructor(client: Anthropic) {
    this.client = client;
  }

  async analyzeFailure(
    input: AnalyzeFailureInput
  ): Promise<AnalyzeFailureResult> {
    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4000,
      // Extended thinking mode for deeper analysis
      ...(input.useExtendedThinking
        ? {
            thinking: {
              type: 'enabled',
              budget_tokens: 10000,
            },
          }
        : {}),
      messages: [
        {
          role: 'user',
          content: `Analyze this E2E test failure:

Error: ${input.error.message}

Code Context:
${input.codeContext}

${input.screenshot ? `Screenshot: ${input.screenshot.slice(0, 100)}...` : ''}

Identify the root cause of this failure.`,
        },
      ],
    });

    const text = response.content
      .filter((c): c is Anthropic.TextBlock => c.type === 'text')
      .map((c) => c.text)
      .join('\n');

    return {
      rootCause: text,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
    };
  }

  async generateFix(input: GenerateFixInput): Promise<GenerateFixResult> {
    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4000,
      system: [
        {
          type: 'text' as const,
          text: 'You are an expert at fixing E2E test failures. Generate minimal code fixes.',
          // Prompt caching for cost optimization
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: `Generate a fix for this issue:

Root Cause: ${input.rootCause}

Code Context:
${input.codeContext}

Test File: ${input.testFile}

Provide the fixed code in a TypeScript code block.`,
        },
      ],
    });

    const text = response.content
      .filter((c): c is Anthropic.TextBlock => c.type === 'text')
      .map((c) => c.text)
      .join('\n');

    // Extract code from markdown code block
    const codeMatch = text.match(/```(?:typescript|tsx?)\n([\s\S]*?)```/);
    const code = codeMatch ? codeMatch[1] : text;

    const cacheReadTokens = response.usage.cache_read_input_tokens ?? 0;
    const cacheHit = cacheReadTokens > 0;

    return {
      code,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
      cacheHit,
    };
  }
}
