# Smart-Agents Messaging Implementation Guide

> Developer guide for implementing messaging strategy in codebase

---

## Overview

This guide shows how to implement the messaging strategy defined in `MESSAGING_STRATEGY.md` into the smart-agents codebase.

---

## 1. Attribution System Implementation

### 1.1 Success Attribution

**Location**: `src/core/AttributionManager.ts` (new file)

**Interface**:
```typescript
interface SuccessAttribution {
  agent: {
    id: string;
    name: string;
    type: AgentType;
  };
  task: {
    name: string;
    type: TaskType;
    description: string;
  };
  performance: {
    duration: number;
    estimatedDuration: number;
    timeSaved: number;
  };
  result: {
    summary: string;
    details?: any;
  };
  timestamp: number;
}

interface AttributionMessageOptions {
  template?: 'celebratory' | 'professional' | 'conversational' | 'minimal';
  includeDetails?: boolean;
  includeTimeTracking?: boolean;
}

class AttributionManager {
  /**
   * Generate success attribution message
   */
  formatSuccessMessage(
    attribution: SuccessAttribution,
    options: AttributionMessageOptions = {}
  ): string {
    const template = options.template || 'celebratory';

    switch (template) {
      case 'celebratory':
        return this.formatCelebratory(attribution, options);
      case 'professional':
        return this.formatProfessional(attribution, options);
      case 'conversational':
        return this.formatConversational(attribution, options);
      case 'minimal':
        return this.formatMinimal(attribution);
      default:
        return this.formatCelebratory(attribution, options);
    }
  }

  private formatCelebratory(
    attr: SuccessAttribution,
    options: AttributionMessageOptions
  ): string {
    const timeSaved = this.formatDuration(attr.performance.timeSaved);

    let message = `✨ Smart-agents handled ${attr.task.name} in ${this.formatDuration(attr.performance.duration)}\n`;
    message += `   Agent: ${attr.agent.name}\n`;
    message += `   Result: ${attr.result.summary}\n`;

    if (options.includeDetails) {
      message += `   [View details]`;
    }
    if (options.includeTimeTracking) {
      message += ` [Track time saved: ${timeSaved}]`;
    }

    return message;
  }

  private formatProfessional(
    attr: SuccessAttribution,
    options: AttributionMessageOptions
  ): string {
    const estimated = this.formatDuration(attr.performance.estimatedDuration);
    const actual = this.formatDuration(attr.performance.duration);

    let message = `✓ Background task complete\n`;
    message += `   Task: ${attr.task.name}\n`;
    message += `   Agent: ${attr.agent.type}\n`;
    message += `   Duration: ${actual} (estimated: ${estimated})\n`;
    message += `   [Show result]`;

    return message;
  }

  private formatConversational(
    attr: SuccessAttribution,
    options: AttributionMessageOptions
  ): string {
    const duration = this.formatDuration(attr.performance.duration);

    let message = `🤝 Your coding partner finished ${attr.task.name}\n`;
    message += `   While you worked, the ${attr.agent.name}\n`;
    message += `   completed ${attr.task.description} in ${duration}.\n`;
    message += `   [See what changed]`;

    return message;
  }

  private formatMinimal(attr: SuccessAttribution): string {
    const duration = this.formatDuration(attr.performance.duration);
    return `✓ ${attr.agent.name} • ${attr.task.name} • ${duration}`;
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}min`;
  }
}
```

### 1.2 Error Attribution

**Location**: `src/core/ErrorAttributionManager.ts` (new file)

**Interface**:
```typescript
interface ErrorAttribution {
  agent: {
    id: string;
    name: string;
    type: AgentType;
  };
  task: {
    name: string;
    type: TaskType;
  };
  error: {
    code: string;
    message: string;
    userFriendlyMessage: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    stack?: string;
  };
  impact: {
    scope: 'task' | 'agent' | 'system';
    description: string;
  };
  remediation: {
    autoAttempted?: boolean;
    suggestion: string;
    steps?: string[];
  };
  timestamp: number;
}

interface ErrorMessageOptions {
  template?: 'accountable' | 'solution-focused' | 'learning' | 'critical';
  includeGitHubLink?: boolean;
  includeTechnicalDetails?: boolean;
}

class ErrorAttributionManager {
  formatErrorMessage(
    attribution: ErrorAttribution,
    options: ErrorMessageOptions = {}
  ): string {
    // Always use 'critical' template for critical errors
    if (attribution.error.severity === 'critical') {
      return this.formatCriticalError(attribution);
    }

    const template = options.template || 'accountable';

    switch (template) {
      case 'accountable':
        return this.formatAccountable(attribution, options);
      case 'solution-focused':
        return this.formatSolutionFocused(attribution, options);
      case 'learning':
        return this.formatLearningOpportunity(attribution, options);
      default:
        return this.formatAccountable(attribution, options);
    }
  }

  private formatAccountable(
    attr: ErrorAttribution,
    options: ErrorMessageOptions
  ): string {
    let message = `⚠️ Smart-agents encountered an issue\n`;
    message += `   Agent: ${attr.agent.id}\n`;
    message += `   Task: ${attr.task.name}\n`;
    message += `   Error: ${attr.error.userFriendlyMessage}\n\n`;

    message += `   What happened: ${attr.impact.description}\n`;
    message += `   What we're doing: ${attr.remediation.suggestion}\n\n`;

    if (options.includeGitHubLink) {
      message += `   [Help improve smart-agents]`;
    }
    if (options.includeTechnicalDetails) {
      message += ` [View error details]`;
    }

    return message;
  }

  private formatSolutionFocused(
    attr: ErrorAttribution,
    options: ErrorMessageOptions
  ): string {
    let message = `🔧 Oops, ${attr.agent.name} hit a snag\n`;
    message += `   Issue: ${attr.error.userFriendlyMessage}\n`;
    message += `   Impact: ${attr.impact.description}\n\n`;

    message += `   Quick fix: ${attr.remediation.suggestion}\n`;
    message += `   [Apply fix] [Report issue]`;

    return message;
  }

  private formatLearningOpportunity(
    attr: ErrorAttribution,
    options: ErrorMessageOptions
  ): string {
    let message = `❌ Smart-agents made a mistake (and wants to learn from it)\n`;
    message += `   Agent: ${attr.agent.id}\n`;
    message += `   What went wrong: ${attr.error.userFriendlyMessage}\n\n`;

    message += `   Your feedback helps everyone. Report this?\n`;
    message += `   [Yes, auto-generate issue] [Not now]`;

    return message;
  }

  private formatCriticalError(attr: ErrorAttribution): string {
    let message = `🚨 Critical error from smart-agents\n`;
    message += `   Agent ${attr.agent.id} caused: ${attr.error.userFriendlyMessage}\n\n`;

    message += `   We've automatically:\n`;
    if (attr.remediation.autoAttempted) {
      message += `   ✓ Rolled back changes\n`;
      message += `   ✓ Disabled this agent temporarily\n`;
      message += `   ✓ Created incident report\n\n`;
    }

    message += `   [View incident] [Contact support]`;

    return message;
  }

  /**
   * Generate GitHub issue body for error reporting
   */
  generateGitHubIssue(attribution: ErrorAttribution): GitHubIssue {
    const title = `[Auto] ${attribution.agent.type} error: ${attribution.error.message}`;

    const body = `
## Error Details

**Agent**: ${attribution.agent.id}
**Task**: ${attribution.task.name}
**Error**: ${attribution.error.message}
**Timestamp**: ${new Date(attribution.timestamp).toISOString()}

## Impact

- Severity: ${attribution.error.severity}
- Scope: ${attribution.impact.scope}
- Description: ${attribution.impact.description}

## Context

**System**:
- OS: ${process.platform}
- Node: ${process.version}
- Smart-agents: ${this.getVersion()}

**Task Context**:
\`\`\`json
${JSON.stringify(attribution.task, null, 2)}
\`\`\`

**Error Stack**:
\`\`\`
${attribution.error.stack || 'N/A'}
\`\`\`

---

*This issue was automatically generated by smart-agents error reporter.*
*User consent: ✓ Granted*
*Privacy: All sensitive data redacted*
    `.trim();

    return {
      title,
      body,
      labels: ['auto-generated', 'error-report', `severity-${attribution.error.severity}`]
    };
  }
}
```

---

## 2. Productivity Tracking Implementation

### 2.1 Metrics Collector

**Location**: `src/monitoring/ProductivityMetrics.ts`

**Interface**:
```typescript
interface ProductivityMetrics {
  period: 'daily' | 'weekly' | 'monthly';
  startTime: number;
  endTime: number;

  tasks: {
    total: number;
    background: number;
    foreground: number;
    byType: Record<TaskType, number>;
    successRate: number;
  };

  agents: {
    totalUsed: number;
    usage: Array<{
      agent: string;
      taskCount: number;
      percentage: number;
    }>;
    topContributor: {
      agent: string;
      taskCount: number;
    };
  };

  performance: {
    totalTimeSaved: number;
    averageTimeSaved: number;
    longestTask: {
      name: string;
      duration: number;
    };
    velocityIncrease: number; // percentage
  };

  learning: {
    correctionsReceived: number;
    accuracyImprovement: number; // percentage
  };
}

class ProductivityMetricsCollector {
  async getDailyMetrics(date: Date): Promise<ProductivityMetrics> {
    // Implementation
  }

  async getWeeklyMetrics(startDate: Date): Promise<ProductivityMetrics> {
    // Implementation
  }

  formatDailySummary(metrics: ProductivityMetrics): string {
    // See template below
  }

  formatWeeklyReport(metrics: ProductivityMetrics): string {
    // See template below
  }

  checkMilestones(metrics: ProductivityMetrics): Milestone[] {
    // Check for milestone achievements
  }
}
```

### 2.2 Daily Summary Template

```typescript
private formatDailySummary(metrics: ProductivityMetrics): string {
  const timeSaved = this.formatDuration(metrics.performance.totalTimeSaved);

  let message = `☀️ Good morning! Yesterday smart-agents:\n`;
  message += `   • Completed ${metrics.tasks.total} tasks while you coded\n`;
  message += `   • Saved you ~${timeSaved}\n`;
  message += `   • Top contributor: ${metrics.agents.topContributor.agent} (${metrics.agents.topContributor.taskCount} tasks)\n\n`;
  message += `   [View details] [Weekly trends]`;

  return message;
}
```

### 2.3 Weekly Report Email Template

```typescript
private formatWeeklyReportEmail(metrics: ProductivityMetrics): EmailContent {
  const subject = `Your week with smart-agents: +${metrics.performance.velocityIncrease}% velocity 🚀`;

  const body = `
Hi there,

Here's how smart-agents powered your week:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 PRODUCTIVITY METRICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Tasks completed:        ${metrics.tasks.total} tasks
Time saved:            ${this.formatDuration(metrics.performance.totalTimeSaved)}
Velocity increase:     +${metrics.performance.velocityIncrease}% vs last week
Most productive day:   ${this.getMostProductiveDay(metrics)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 YOUR AI TEAM PERFORMANCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${this.formatAgentUsage(metrics.agents.usage)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 INSIGHTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Background mode adoption: ${metrics.tasks.background / metrics.tasks.total * 100}%
• Agent accuracy: ${metrics.tasks.successRate * 100}%
${metrics.learning.correctionsReceived > 0
  ? `• Improved from ${metrics.learning.correctionsReceived} corrections`
  : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 NEXT WEEK SUGGESTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${this.generateSuggestions(metrics)}

[View full dashboard] [Share with team]

Keep shipping!
The Smart-Agents Team
  `.trim();

  return { subject, body };
}
```

---

## 3. Onboarding Flow Implementation

### 3.1 Onboarding State Manager

**Location**: `src/onboarding/OnboardingManager.ts`

```typescript
interface OnboardingState {
  userId: string;
  step: number;
  completedSteps: string[];
  preferences: {
    messageTemplate: 'celebratory' | 'professional' | 'minimal';
    dailySummary: boolean;
    weeklyReport: boolean;
  };
  firstBackgroundTaskCompleted: boolean;
  firstCorrectionMade: boolean;
}

class OnboardingManager {
  async getWelcomeMessage(isFirstTime: boolean): Promise<string> {
    if (!isFirstTime) return '';

    return `
👋 Welcome to Smart-Agents!

You've unlocked the Pro feature that turns Claude Code
into your AI development team.

Here's what changed:
✅ Agents work in background (non-blocking)
✅ Multiple agents in parallel
✅ Real-time progress tracking
✅ System learns from your feedback

Let's run your first background task →

[Start tutorial] [Skip, I'll explore]
    `.trim();
  }

  async getContextualTip(context: {
    taskType: TaskType;
    estimatedDuration: number;
    isFirstOfType: boolean;
  }): Promise<string | null> {
    // Show tips based on context
    if (context.estimatedDuration > 300000 && context.isFirstOfType) {
      return `
💡 Tip: Long task detected

This task might take 5+ minutes.
Smart-agents can run it in background so you can keep coding.

[Run in background] [Run normally]

☑️ Remember my choice for ${context.taskType}
      `.trim();
    }

    return null;
  }

  async recordOnboardingProgress(
    userId: string,
    event: OnboardingEvent
  ): Promise<void> {
    // Track onboarding progress
  }
}
```

---

## 4. GitHub Integration

### 4.1 Issue Reporter

**Location**: `src/integrations/GitHubIssueReporter.ts`

```typescript
interface IssueReportConfig {
  repo: string;
  owner: string;
  token: string;
  autoReport: boolean;
  userConsent: boolean;
}

class GitHubIssueReporter {
  async promptUserToReport(error: ErrorAttribution): Promise<boolean> {
    const message = `
🐛 Help improve smart-agents

This error affects ${error.impact.scope}:
• Error type: ${error.error.code}
• Severity: ${error.error.severity}

Report to team (takes 30 seconds)?
We've pre-filled the issue with:
✓ Error details & logs
✓ System context
✓ Reproduction steps

[Yes, create issue] [Not now] [Never for this error]
    `.trim();

    const response = await this.showPrompt(message);
    return response === 'yes';
  }

  async createIssue(attribution: ErrorAttribution): Promise<string> {
    const issue = this.generateGitHubIssue(attribution);

    // Check for duplicates
    const existingIssue = await this.findDuplicate(issue);
    if (existingIssue) {
      await this.addComment(existingIssue.number, `Another occurrence reported.`);
      return existingIssue.url;
    }

    // Create new issue
    const created = await this.githubClient.createIssue({
      owner: this.config.owner,
      repo: this.config.repo,
      title: issue.title,
      body: issue.body,
      labels: issue.labels
    });

    return created.html_url;
  }

  private async findDuplicate(issue: GitHubIssue): Promise<Issue | null> {
    // Search for similar issues
    const query = `repo:${this.config.owner}/${this.config.repo} is:issue is:open ${issue.title}`;
    const results = await this.githubClient.search(query);

    // Use similarity threshold
    const similar = results.items.find(item =>
      this.calculateSimilarity(item.title, issue.title) > 0.8
    );

    return similar || null;
  }
}
```

---

## 5. Configuration & Settings

### 5.1 User Preferences

**Location**: `src/config/UserPreferences.ts`

```typescript
interface UserPreferences {
  messaging: {
    attribution: {
      successTemplate: 'celebratory' | 'professional' | 'conversational' | 'minimal';
      errorTemplate: 'accountable' | 'solution-focused' | 'learning';
      includeTimeTracking: boolean;
    };
    productivity: {
      dailySummary: boolean;
      dailySummaryTime: string; // "09:00"
      weeklyReport: boolean;
      weeklyReportDay: number; // 1 = Monday
      milestoneNotifications: boolean;
    };
    onboarding: {
      showTips: boolean;
      tipFrequency: 'always' | 'occasionally' | 'never';
    };
  };

  errorReporting: {
    autoReport: boolean;
    requireConfirmation: boolean;
    neverReportErrors: string[]; // error codes
  };
}

class UserPreferencesManager {
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    // Load from storage
  }

  async updatePreferences(
    userId: string,
    updates: Partial<UserPreferences>
  ): Promise<void> {
    // Save to storage
  }

  getDefaultPreferences(): UserPreferences {
    return {
      messaging: {
        attribution: {
          successTemplate: 'celebratory',
          errorTemplate: 'accountable',
          includeTimeTracking: true
        },
        productivity: {
          dailySummary: false, // Opt-in
          dailySummaryTime: '09:00',
          weeklyReport: true, // Default ON
          weeklyReportDay: 1, // Monday
          milestoneNotifications: true
        },
        onboarding: {
          showTips: true,
          tipFrequency: 'occasionally'
        }
      },
      errorReporting: {
        autoReport: false,
        requireConfirmation: true,
        neverReportErrors: []
      }
    };
  }
}
```

---

## 6. CLI Integration

### 6.1 Message Display

**Location**: `src/cli/MessageDisplay.ts`

```typescript
import chalk from 'chalk';

class CLIMessageDisplay {
  displaySuccessAttribution(message: string): void {
    console.log(chalk.green(message));
  }

  displayErrorAttribution(message: string): void {
    console.log(chalk.red(message));
  }

  displayTip(message: string): void {
    console.log(chalk.blue(message));
  }

  displayProductivitySummary(message: string): void {
    console.log(chalk.cyan(message));
  }

  async promptUser(message: string, choices: string[]): Promise<string> {
    // Use inquirer or similar for interactive prompts
  }
}
```

---

## 7. Testing

### 7.1 Message Template Tests

**Location**: `src/core/__tests__/AttributionManager.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { AttributionManager } from '../AttributionManager';

describe('AttributionManager', () => {
  describe('formatSuccessMessage', () => {
    it('should format celebratory message correctly', () => {
      const manager = new AttributionManager();
      const attribution: SuccessAttribution = {
        agent: {
          id: 'research-1',
          name: 'Research Agent',
          type: 'research'
        },
        task: {
          name: 'API documentation research',
          type: 'research',
          description: 'Gather Stripe API docs'
        },
        performance: {
          duration: 120000, // 2 minutes
          estimatedDuration: 300000, // 5 minutes
          timeSaved: 180000 // 3 minutes
        },
        result: {
          summary: 'Found comprehensive API documentation'
        },
        timestamp: Date.now()
      };

      const message = manager.formatSuccessMessage(attribution, {
        template: 'celebratory',
        includeTimeTracking: true
      });

      expect(message).toContain('✨ Smart-agents handled');
      expect(message).toContain('Research Agent');
      expect(message).toContain('2.0min');
      expect(message).toContain('Track time saved: 3.0min');
    });

    it('should format minimal message correctly', () => {
      const manager = new AttributionManager();
      const attribution = { /* ... */ };

      const message = manager.formatSuccessMessage(attribution, {
        template: 'minimal'
      });

      expect(message).toMatch(/✓ .+ • .+ • .+/);
    });
  });
});
```

---

## 8. Analytics Integration

### 8.1 Event Tracking

**Location**: `src/analytics/EventTracker.ts`

```typescript
interface MessageEvent {
  type: 'success_attribution' | 'error_attribution' | 'productivity_summary' | 'tip_shown' | 'cta_clicked';
  template: string;
  userId: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

class MessageEventTracker {
  trackMessageShown(event: MessageEvent): void {
    // Send to analytics service
  }

  trackCTAClicked(cta: string, context: string): void {
    // Track CTA engagement
  }

  trackPreferenceChange(
    userId: string,
    preference: string,
    oldValue: any,
    newValue: any
  ): void {
    // Track preference changes
  }
}
```

---

## 9. Localization Support (Future)

### 9.1 Message Templates

**Location**: `src/i18n/messages/en.json`

```json
{
  "attribution": {
    "success": {
      "celebratory": "✨ Smart-agents handled {taskName} in {duration}",
      "professional": "✓ Background task complete",
      "conversational": "🤝 Your coding partner finished {taskName}"
    },
    "error": {
      "accountable": "⚠️ Smart-agents encountered an issue",
      "solution": "🔧 Oops, {agentName} hit a snag",
      "learning": "❌ Smart-agents made a mistake (and wants to learn from it)"
    }
  },
  "productivity": {
    "dailySummary": "☀️ Good morning! Yesterday smart-agents:",
    "weeklyReport": "Your week with smart-agents: +{velocityIncrease}% velocity 🚀"
  }
}
```

---

## 10. Implementation Checklist

### Phase 1: Core Attribution (Week 1)
- [ ] Create `AttributionManager.ts`
- [ ] Create `ErrorAttributionManager.ts`
- [ ] Add unit tests for message formatting
- [ ] Integrate into agent task completion flow
- [ ] Add user preferences for message templates

### Phase 2: Productivity Tracking (Week 2)
- [ ] Create `ProductivityMetricsCollector.ts`
- [ ] Implement daily summary generation
- [ ] Implement weekly report email
- [ ] Add milestone detection
- [ ] Create dashboard API endpoints

### Phase 3: Onboarding (Week 3)
- [ ] Create `OnboardingManager.ts`
- [ ] Implement welcome flow
- [ ] Add contextual tips system
- [ ] Create onboarding progress tracking
- [ ] Add tutorial mode

### Phase 4: GitHub Integration (Week 4)
- [ ] Create `GitHubIssueReporter.ts`
- [ ] Implement duplicate detection
- [ ] Add auto-generation of issue body
- [ ] Create user consent flow
- [ ] Test with real GitHub repo

### Phase 5: Configuration (Week 5)
- [ ] Create `UserPreferencesManager.ts`
- [ ] Build preferences UI (CLI + API)
- [ ] Implement preference persistence
- [ ] Add preference migration logic
- [ ] Document all preference options

### Phase 6: Testing & Polish (Week 6)
- [ ] Write comprehensive unit tests
- [ ] Add integration tests
- [ ] Test all message templates
- [ ] A/B test message variations
- [ ] Gather user feedback

---

## 11. File Structure

```
src/
├── core/
│   ├── AttributionManager.ts
│   ├── ErrorAttributionManager.ts
│   └── __tests__/
│       ├── AttributionManager.test.ts
│       └── ErrorAttributionManager.test.ts
│
├── monitoring/
│   ├── ProductivityMetrics.ts
│   └── MilestoneDetector.ts
│
├── onboarding/
│   ├── OnboardingManager.ts
│   └── OnboardingState.ts
│
├── integrations/
│   ├── GitHubIssueReporter.ts
│   └── EmailReporter.ts
│
├── config/
│   ├── UserPreferences.ts
│   └── MessageTemplates.ts
│
├── cli/
│   └── MessageDisplay.ts
│
├── analytics/
│   └── EventTracker.ts
│
└── i18n/
    └── messages/
        └── en.json
```

---

## 12. Best Practices

### Message Formatting
- Always sanitize user data before including in messages
- Use consistent emoji usage (refer to `MESSAGING_STRATEGY.md`)
- Keep messages concise (< 3 lines for in-app, longer OK for email)
- Always provide actionable next steps

### Error Handling
- Never show stack traces to users (offer "View technical details" link)
- Always explain impact in user terms
- Provide clear remediation steps
- Log all errors for internal tracking

### Performance
- Cache message templates
- Batch productivity calculations
- Lazy-load detailed reports
- Use async for non-critical notifications

### Privacy
- Redact sensitive data (API keys, tokens, passwords)
- Hash user IDs in analytics
- Get explicit consent before reporting to GitHub
- Allow users to opt out of all tracking

---

## 13. Testing Checklist

### Unit Tests
- [ ] All message templates render correctly
- [ ] Duration formatting works for all ranges
- [ ] Error messages sanitize input
- [ ] GitHub issue body generation valid
- [ ] Milestone detection accurate

### Integration Tests
- [ ] Attribution messages appear after task completion
- [ ] Error messages trigger on failures
- [ ] Productivity reports generate correctly
- [ ] Onboarding flow completes
- [ ] GitHub issues created successfully

### User Acceptance Tests
- [ ] Messages are clear and helpful
- [ ] CTAs are intuitive
- [ ] Preferences persist correctly
- [ ] Email reports look good in all clients
- [ ] Mobile display works (if applicable)

---

## Resources

- Full Strategy: `/docs/marketing/MESSAGING_STRATEGY.md`
- Quick Reference: `/docs/marketing/MESSAGING_QUICK_REFERENCE.md`
- Voice Guidelines: Section 11 of strategy doc
- CTA Library: Section 10 of strategy doc

---

**Last Updated**: 2025-12-28
**Version**: 1.0
**Maintainer**: Engineering Team
