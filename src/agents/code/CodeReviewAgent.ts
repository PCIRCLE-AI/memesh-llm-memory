/**
 * Code Review Agent - 代碼審查專家
 *
 * 職責：
 * - 代碼品質審查
 * - 安全漏洞檢測
 * - 最佳實踐建議
 * - 性能優化建議
 * - 代碼風格檢查
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  CollaborativeAgent,
  AgentCapability,
  AgentMessage,
} from '../../collaboration/types.js';
import { appConfig } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export class CodeReviewAgent implements CollaborativeAgent {
  id: string;
  name: string;
  type: 'code' = 'code';
  status: 'idle' | 'busy' | 'error' = 'idle';
  capabilities: AgentCapability[];

  private anthropic: Anthropic;
  private systemPrompt: string;

  constructor(config: {
    name?: string;
    systemPrompt?: string;
  } = {}) {
    this.id = uuidv4();
    this.name = config.name || 'Code Review Expert';
    this.anthropic = new Anthropic({
      apiKey: appConfig.claude.apiKey,
    });

    this.systemPrompt = config.systemPrompt || `You are an expert code reviewer with deep knowledge of:
- Code quality and maintainability
- Security vulnerabilities (OWASP Top 10, injection attacks, XSS, CSRF)
- Performance optimization
- Design patterns and anti-patterns
- Testing best practices
- Code style and conventions
- Type safety and error handling
- Memory leaks and resource management

Your role is to review code thoroughly, identify issues, and provide constructive feedback with specific suggestions for improvement.

Focus areas:
1. **Security**: Identify potential vulnerabilities
2. **Performance**: Detect inefficient algorithms or resource usage
3. **Maintainability**: Assess code readability and structure
4. **Best Practices**: Check adherence to language/framework conventions
5. **Testing**: Evaluate test coverage and quality
`;

    this.capabilities = [
      {
        name: 'code-review',
        description: 'Comprehensive code review including security, performance, and best practices',
        inputSchema: { code: 'string', language: 'string', context: 'string' },
        outputSchema: { review: 'string', issues: 'array', suggestions: 'array' },
        estimatedCost: 0.01,
        estimatedTimeMs: 5000,
      },
      {
        name: 'security-audit',
        description: 'Security vulnerability detection and analysis',
        inputSchema: { code: 'string', language: 'string' },
        outputSchema: { vulnerabilities: 'array', severity: 'string' },
        estimatedCost: 0.015,
        estimatedTimeMs: 7000,
      },
      {
        name: 'performance-analysis',
        description: 'Performance optimization suggestions',
        inputSchema: { code: 'string', language: 'string', metrics: 'object' },
        outputSchema: { analysis: 'string', optimizations: 'array' },
        estimatedCost: 0.012,
        estimatedTimeMs: 6000,
      },
    ];

    logger.info(`CodeReviewAgent initialized: ${this.name}`, {
      id: this.id,
      capabilities: this.capabilities.length,
    });
  }

  /**
   * 執行代碼審查
   */
  async reviewCode(code: string, options?: {
    language?: string;
    focus?: 'security' | 'performance' | 'maintainability' | 'all';
  }): Promise<string> {
    const language = options?.language || 'typescript';
    const focus = options?.focus || 'all';

    this.status = 'busy';

    const prompt = `Review the following ${language} code with focus on ${focus}:

\`\`\`${language}
${code}
\`\`\`

Provide a structured review covering:
1. Security issues (if any)
2. Performance concerns (if any)
3. Maintainability suggestions
4. Best practice recommendations
5. Overall rating (1-10)

Format your response as:
## Security Issues
[List issues or "None found"]

## Performance Concerns
[List concerns or "None found"]

## Maintainability
[Suggestions for improvement]

## Best Practices
[Recommendations]

## Overall Rating: X/10
[Brief summary]
`;

    try {
      const response = await this.anthropic.messages.create({
        model: appConfig.claude.models.sonnet,
        max_tokens: 2000,
        system: this.systemPrompt,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      this.status = 'idle';

      const content = response.content[0];
      if (content.type === 'text') {
        return content.text;
      }

      return 'Unable to generate review';
    } catch (error) {
      this.status = 'error';
      logger.error('Code review failed', { error });
      throw error;
    }
  }

  /**
   * 處理協作訊息
   */
  async processMessage(message: AgentMessage): Promise<AgentMessage> {
    this.status = 'busy';

    try {
      // Convert message content to string format for Claude API
      const userContent = message.content.task || JSON.stringify(message.content);

      const response = await this.anthropic.messages.create({
        model: appConfig.claude.models.sonnet,
        max_tokens: 2000,
        system: this.systemPrompt,
        messages: [
          {
            role: 'user',
            content: userContent,
          },
        ],
      });

      this.status = 'idle';

      const content = response.content[0];
      const responseText = content.type === 'text' ? content.text : 'Unable to process message';

      return {
        id: uuidv4(),
        from: this.id,
        to: message.from,
        content: {
          result: responseText,
        },
        timestamp: new Date(),
        type: 'response',
      };
    } catch (error) {
      this.status = 'error';
      logger.error('Message processing failed', { error });
      throw error;
    }
  }

  /**
   * 獲取當前狀態
   */
  getStatus() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      status: this.status,
      capabilities: this.capabilities,
    };
  }

  /**
   * Initialize agent (required by CollaborativeAgent interface)
   */
  async initialize(): Promise<void> {
    logger.info(`CodeReviewAgent ${this.name} initialized`);
  }

  /**
   * Shutdown agent (required by CollaborativeAgent interface)
   */
  async shutdown(): Promise<void> {
    this.status = 'idle';
    logger.info(`CodeReviewAgent ${this.name} shutdown`);
  }

  /**
   * Handle message (required by CollaborativeAgent interface)
   */
  async handleMessage(message: AgentMessage): Promise<AgentMessage> {
    return this.processMessage(message);
  }

  /**
   * Execute capability (required by CollaborativeAgent interface)
   */
  async execute(capability: string, input: any): Promise<any> {
    switch (capability) {
      case 'code-review':
        return this.reviewCode(input.code, {
          language: input.language,
          focus: input.focus || 'all'
        });
      case 'security-audit':
      case 'performance-analysis':
        // Use processMessage for now, can be specialized later
        return this.processMessage({
          id: uuidv4(),
          from: 'system',
          to: this.id,
          content: { task: JSON.stringify(input) },
          timestamp: new Date(),
          type: 'request',
        });
      default:
        throw new Error(`Unknown capability: ${capability}`);
    }
  }
}
