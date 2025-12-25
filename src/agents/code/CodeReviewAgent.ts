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
  type: 'code-review' = 'code-review';
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
      },
      {
        name: 'security-audit',
        description: 'Security vulnerability detection and analysis',
      },
      {
        name: 'performance-analysis',
        description: 'Performance optimization suggestions',
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
      const response = await this.anthropic.messages.create({
        model: appConfig.claude.models.sonnet,
        max_tokens: 2000,
        system: this.systemPrompt,
        messages: [
          {
            role: 'user',
            content: message.content,
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
        content: responseText,
        timestamp: Date.now(),
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
}
