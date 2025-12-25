/**
 * Research Agent - 研究調查專家
 *
 * 職責：
 * - 技術調研
 * - 文獻搜尋
 * - 競品分析
 * - 市場研究
 * - 最佳實踐蒐集
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

export class ResearchAgent implements CollaborativeAgent {
  id: string;
  name: string;
  type: 'research' = 'research';
  status: 'idle' | 'busy' | 'error' = 'idle';
  capabilities: AgentCapability[];

  private anthropic: Anthropic;
  private systemPrompt: string;

  constructor(config: {
    name?: string;
    systemPrompt?: string;
  } = {}) {
    this.id = uuidv4();
    this.name = config.name || 'Research Analyst';
    this.anthropic = new Anthropic({
      apiKey: appConfig.claude.apiKey,
    });

    this.systemPrompt = config.systemPrompt || `You are an expert research analyst with deep knowledge of:
- Technology trends and emerging tools
- Software engineering best practices
- Competitive analysis and market research
- Academic and industry research methodologies
- Data analysis and synthesis
- Critical evaluation of sources
- Technical documentation review

Your role is to conduct thorough research, analyze information from multiple sources, identify patterns and insights, and present findings in a clear, actionable format.

Research Methodology:
1. **Define Scope**: Clearly understand research objectives
2. **Gather Sources**: Identify credible, diverse information sources
3. **Analyze**: Critically evaluate information and identify patterns
4. **Synthesize**: Combine findings into coherent insights
5. **Report**: Present findings with evidence and recommendations

Focus on:
- Accuracy and credibility of sources
- Balanced perspective (multiple viewpoints)
- Practical, actionable insights
- Clear documentation of findings
`;

    this.capabilities = [
      {
        name: 'technical-research',
        description: 'Technical research on frameworks, libraries, and tools',
      },
      {
        name: 'competitive-analysis',
        description: 'Competitive product and feature analysis',
      },
      {
        name: 'best-practices',
        description: 'Research industry best practices and patterns',
      },
    ];

    logger.info(`ResearchAgent initialized: ${this.name}`, {
      id: this.id,
      capabilities: this.capabilities.length,
    });
  }

  /**
   * 執行技術調研
   */
  async conductResearch(topic: string, options?: {
    depth?: 'quick' | 'comprehensive' | 'deep-dive';
    focus?: string[];
  }): Promise<string> {
    const depth = options?.depth || 'comprehensive';
    const focus = options?.focus || [];

    this.status = 'busy';

    const focusSection = focus.length > 0
      ? `\n\nSpecific focus areas:\n${focus.map(f => `- ${f}`).join('\n')}`
      : '';

    const prompt = `Conduct a ${depth} research on: "${topic}"${focusSection}

Provide a structured research report covering:
1. Overview and Context
2. Key Findings
3. Pros and Cons
4. Use Cases and Applications
5. Alternatives and Comparisons
6. Recommendations
7. Further Reading/Resources

Format your response as a well-structured research report with clear sections.
`;

    try {
      const response = await this.anthropic.messages.create({
        model: appConfig.claude.models.sonnet,
        max_tokens: 3000,
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

      return 'Unable to generate research report';
    } catch (error) {
      this.status = 'error';
      logger.error('Research failed', { error });
      throw error;
    }
  }

  /**
   * 競品分析
   */
  async analyzeCompetitors(product: string, competitors: string[]): Promise<string> {
    this.status = 'busy';

    const competitorsList = competitors.map(c => `- ${c}`).join('\n');
    const prompt = `Analyze "${product}" compared to the following competitors:
${competitorsList}

Provide a comprehensive competitive analysis covering:
1. Feature Comparison Matrix
2. Strengths and Weaknesses
3. Pricing Comparison (if applicable)
4. Target Audience
5. Unique Value Propositions
6. Market Positioning
7. Recommendations

Present in a clear, comparative format.
`;

    try {
      const response = await this.anthropic.messages.create({
        model: appConfig.claude.models.sonnet,
        max_tokens: 3000,
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

      return 'Unable to generate competitive analysis';
    } catch (error) {
      this.status = 'error';
      logger.error('Competitive analysis failed', { error });
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
