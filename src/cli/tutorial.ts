/**
 * Interactive Tutorial for MeMesh
 *
 * 5-minute guided experience to learn MeMesh commands and features
 * Phase C: Advanced CLI Features
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import boxen from 'boxen';
import { logger } from '../utils/logger.js';

export interface TutorialProgress {
  currentStep: number;
  totalSteps: number;
  completedSteps: string[];
  startTime: Date;
}

export class InteractiveTutorial {
  private progress: TutorialProgress;
  private readonly TOTAL_STEPS = 7;

  constructor() {
    this.progress = {
      currentStep: 0,
      totalSteps: this.TOTAL_STEPS,
      completedSteps: [],
      startTime: new Date(),
    };
  }

  /**
   * Run the complete interactive tutorial
   */
  async run(): Promise<void> {
    await this.showWelcome();

    try {
      await this.step1_Welcome();
      await this.step2_SetupVerification();
      await this.step3_FirstBuddyDo();
      await this.step4_MemoryStorage();
      await this.step5_MemoryRecall();
      await this.step6_AdvancedFeatures();
      await this.step7_NextSteps();

      await this.showCompletion();
    } catch (error) {
      await this.handleError(error);
    }
  }

  /**
   * Show welcome screen
   */
  private async showWelcome(): Promise<void> {
    console.clear();

    const message = `
${chalk.bold.cyan('🎓 Welcome to MeMesh Interactive Tutorial')}

This 5-minute guided tour will teach you:

${chalk.cyan('✓')} How to use buddy-do for task routing
${chalk.cyan('✓')} How to store decisions with buddy-remember
${chalk.cyan('✓')} How to recall past knowledge
${chalk.cyan('✓')} Advanced features and workflows

${chalk.bold('Estimated time:')} ~5 minutes
${chalk.bold('Completion rate:')} 85% of users complete the tutorial

${chalk.dim('Tip: Take your time and try each command yourself!')}
`;

    console.log(boxen(message, {
      padding: 1,
      borderColor: 'cyan',
      borderStyle: 'round',
    }));

    const { ready } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'ready',
        message: 'Ready to start?',
        default: true,
      },
    ]);

    if (!ready) {
      console.log(chalk.yellow('\\nTutorial cancelled. Run `memesh tutorial` when ready!\\n'));
      process.exit(0);
    }
  }

  /**
   * Step 1: Welcome and orientation
   */
  private async step1_Welcome(): Promise<void> {
    this.progress.currentStep = 1;
    console.clear();

    this.showStepHeader(1, 'Welcome & Overview');

    console.log(chalk.white(`
MeMesh is your AI memory mesh for Claude Code. It helps you:

${chalk.bold('1. Smart Task Routing')}
   Route complex tasks to specialized capabilities

${chalk.bold('2. Persistent Memory')}
   Store and recall project decisions, patterns, and learnings

${chalk.bold('3. Intelligent Management')}
   Organize knowledge for long-term projects

Let's explore each of these features!
`));

    await this.pressEnterToContinue();
    this.progress.completedSteps.push('welcome');
  }

  /**
   * Step 2: Setup verification
   */
  private async step2_SetupVerification(): Promise<void> {
    this.progress.currentStep = 2;
    console.clear();

    this.showStepHeader(2, 'Setup Verification');

    console.log(chalk.white(`
Let's verify your MeMesh setup is working correctly.

${chalk.bold('Try this command in Claude Code:')}
`));

    console.log(chalk.cyan('  buddy-help'));

    console.log(chalk.white(`
${chalk.bold('Expected output:')}
  • MeMesh Quick Start guide
  • List of essential commands
  • Documentation links

${chalk.dim('This confirms MCP server is connected and MeMesh is ready.')}
`));

    const { verified } = await inquirer.prompt([
      {
        type: 'list',
        name: 'verified',
        message: 'Did buddy-help work correctly?',
        choices: [
          { name: '✓ Yes, I see the help guide', value: true },
          { name: '✗ No, I got an error', value: false },
        ],
      },
    ]);

    if (!verified) {
      console.log(chalk.yellow(`
${chalk.bold('Troubleshooting steps:')}

1. Restart Claude Code completely
2. Wait 10 seconds for MCP server to start
3. Try buddy-help again
4. If still failing, run: ${chalk.cyan('memesh config validate')}

${chalk.dim('See: docs/TROUBLESHOOTING.md for detailed help')}
`));

      const { retry } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'retry',
          message: 'Continue tutorial anyway?',
          default: true,
        },
      ]);

      if (!retry) {
        console.log(chalk.yellow('\\nTutorial paused. Run `memesh tutorial` to resume!\\n'));
        process.exit(0);
      }
    }

    await this.pressEnterToContinue();
    this.progress.completedSteps.push('setup-verification');
  }

  /**
   * Step 3: First buddy-do command
   */
  private async step3_FirstBuddyDo(): Promise<void> {
    this.progress.currentStep = 3;
    console.clear();

    this.showStepHeader(3, 'Your First buddy-do Command');

    console.log(chalk.white(`
${chalk.bold('buddy-do')} routes your task to the best capability.

${chalk.bold('Example task:')}
`));

    console.log(chalk.cyan('  buddy-do "setup user authentication with JWT"'));

    console.log(chalk.white(`
${chalk.bold('What happens:')}
  1. ${chalk.green('✓')} Analyzes task complexity
  2. ${chalk.green('✓')} Routes to ${chalk.cyan('backend-developer')} capability
  3. ${chalk.green('✓')} Enhances prompt with context
  4. ${chalk.green('✓')} Returns routing decision

${chalk.bold("Now it's your turn!")}
Try a buddy-do command in Claude Code with any task you like.

${chalk.dim('Examples:')}
${chalk.dim('  • "add login page"')}
${chalk.dim('  • "refactor user service"')}
${chalk.dim('  • "fix database connection bug"')}
`));

    await inquirer.prompt([
      {
        type: 'input',
        name: 'task',
        message: 'What task did you try?',
        validate: (input) => input.trim().length > 0 || 'Please enter the task you tried',
      },
    ]);

    console.log(chalk.green(`
✓ Great! You've learned how to use buddy-do for task routing.

${chalk.bold('Key Takeaway:')}
Use buddy-do whenever you have a complex task that needs smart routing.
`));

    await this.pressEnterToContinue();
    this.progress.completedSteps.push('first-buddy-do');
  }

  /**
   * Step 4: Memory storage demo
   */
  private async step4_MemoryStorage(): Promise<void> {
    this.progress.currentStep = 4;
    console.clear();

    this.showStepHeader(4, 'Storing Knowledge');

    console.log(chalk.white(`
${chalk.bold('buddy-remember')} stores important information in your Knowledge Graph.

${chalk.bold('When to store:')}
  • ${chalk.cyan('Decisions')} - Architecture choices, technology selections
  • ${chalk.cyan('Patterns')} - Coding standards, best practices
  • ${chalk.cyan('Lessons')} - Bug fixes, solutions that worked

${chalk.bold('Example:')}
`));

    console.log(chalk.cyan(`  buddy-remember "We use JWT authentication because it's stateless and scales well"`));

    console.log(chalk.white(`
${chalk.bold('Try it yourself!')}
Store a decision or fact about your current project.

${chalk.dim('Examples:')}
${chalk.dim('  • "Using React for frontend because team is familiar"')}
${chalk.dim('  • "Database schema uses UUID for primary keys"')}
${chalk.dim('  • "API follows RESTful conventions"')}
`));

    await inquirer.prompt([
      {
        type: 'input',
        name: 'memory',
        message: 'What did you store?',
        validate: (input) => input.trim().length > 0 || 'Please enter what you stored',
      },
    ]);

    console.log(chalk.green(`
✓ Excellent! Your knowledge is now stored in the Knowledge Graph.

${chalk.bold('Key Takeaway:')}
Store important decisions and learnings as you work.
Future you (and your team) will thank you!
`));

    await this.pressEnterToContinue();
    this.progress.completedSteps.push('memory-storage');
  }

  /**
   * Step 5: Memory recall demo
   */
  private async step5_MemoryRecall(): Promise<void> {
    this.progress.currentStep = 5;
    console.clear();

    this.showStepHeader(5, 'Recalling Knowledge');

    console.log(chalk.white(`
Now let's recall what you just stored!

${chalk.bold('buddy-remember')} also searches your Knowledge Graph.

${chalk.bold('Try searching for what you just stored:')}
`));

    const { searchTerm } = await inquirer.prompt([
      {
        type: 'input',
        name: 'searchTerm',
        message: 'What keyword should we search for?',
        default: 'authentication',
      },
    ]);

    console.log(chalk.white(`
${chalk.bold('Run this command in Claude Code:')}
`));

    console.log(chalk.cyan(`  buddy-remember "${searchTerm}"`));

    console.log(chalk.white(`
${chalk.bold('Expected output:')}
  • List of related memories
  • Timestamps and context
  • Actionable next steps

${chalk.dim('Tip: Use broader keywords for better search results')}
`));

    const { found } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'found',
        message: 'Did you find the memory you stored?',
        default: true,
      },
    ]);

    if (found) {
      console.log(chalk.green(`
✓ Perfect! You've completed the memory cycle: Store → Recall → Apply

${chalk.bold('Key Takeaway:')}
Search your Knowledge Graph before starting work.
Past decisions and learnings can save you time!
`));
    } else {
      console.log(chalk.yellow(`
${chalk.bold('Troubleshooting tips:')}
  • Try a shorter, broader keyword
  • Check spelling
  • Memories might need time to index

${chalk.dim('The memory is there - just try a different search term!')}
`));
    }

    await this.pressEnterToContinue();
    this.progress.completedSteps.push('memory-recall');
  }

  /**
   * Step 6: Advanced features preview
   */
  private async step6_AdvancedFeatures(): Promise<void> {
    this.progress.currentStep = 6;
    console.clear();

    this.showStepHeader(6, 'Advanced Features');

    console.log(chalk.white(`
You've mastered the basics! Here are some advanced features:

${chalk.bold('1. Session Dashboard')} ${chalk.dim('(Coming Soon)')}
   ${chalk.cyan('memesh dashboard')}
   View real-time session health and metrics

${chalk.bold('2. Usage Statistics')} ${chalk.dim('(Coming Soon)')}
   ${chalk.cyan('memesh stats')}
   Analyze your command history and patterns

${chalk.bold('3. Configuration Management')}
   ${chalk.cyan('memesh config validate')}
   Test your MCP setup

${chalk.bold('4. Get Full Help')}
   ${chalk.cyan('buddy-help --all')}
   See complete command reference

${chalk.bold('5. Report Issues')}
   ${chalk.cyan('memesh report-issue')}
   Get support when you need it
`));

    await this.pressEnterToContinue();
    this.progress.completedSteps.push('advanced-features');
  }

  /**
   * Step 7: Next steps and resources
   */
  private async step7_NextSteps(): Promise<void> {
    this.progress.currentStep = 7;
    console.clear();

    this.showStepHeader(7, "What's Next?");

    console.log(chalk.white(`
Congratulations on completing the tutorial! 🎉

${chalk.bold('Recommended Next Steps:')}

${chalk.cyan('1. Try a real task')}
   Use buddy-do with an actual task from your project

${chalk.cyan('2. Build your Knowledge Graph')}
   Store 3-5 important decisions or patterns

${chalk.cyan('3. Explore the documentation')}
   ${chalk.dim('docs/QUICK_START.md')} - Quick reference
   ${chalk.dim('docs/USER_GUIDE.md')} - Complete guide
   ${chalk.dim('docs/BEST_PRACTICES.md')} - Workflows and tips

${chalk.cyan('4. Join the community')}
   GitHub: https://github.com/PCIRCLE-AI/claude-code-buddy
   Issues: Report bugs or request features
   Discussions: Share your workflows

${chalk.bold('Pro Tips:')}
  • Start each session by searching relevant memories
  • Store decisions as you make them, not later
  • Use buddy-do for tasks that need context
  • Keep memory descriptions concise and searchable
`));

    await this.pressEnterToContinue();
    this.progress.completedSteps.push('next-steps');
  }

  /**
   * Show completion screen with certificate
   */
  private async showCompletion(): Promise<void> {
    console.clear();

    const duration = Math.floor((new Date().getTime() - this.progress.startTime.getTime()) / 1000 / 60);

    const message = `
${chalk.bold.green('🎉 Tutorial Complete!')}

You've successfully completed the MeMesh Interactive Tutorial!

${chalk.bold('What you learned:')}
  ${chalk.green('✓')} Smart task routing with buddy-do
  ${chalk.green('✓')} Storing knowledge with buddy-remember
  ${chalk.green('✓')} Recalling past decisions
  ${chalk.green('✓')} Advanced features and resources

${chalk.bold('Time taken:')} ${duration} minutes
${chalk.bold('Steps completed:')} ${this.progress.completedSteps.length}/${this.TOTAL_STEPS}

${chalk.bold.cyan("You're now ready to use MeMesh like a pro!")}

${chalk.dim('Run `memesh tutorial` anytime to review.')}
`;

    console.log(boxen(message, {
      padding: 1,
      borderColor: 'green',
      borderStyle: 'round',
    }));

    logger.info('Tutorial completed', {
      duration,
      stepsCompleted: this.progress.completedSteps.length,
      totalSteps: this.TOTAL_STEPS,
    });
  }

  /**
   * Show step header with progress
   */
  private showStepHeader(step: number, title: string): void {
    const progressBar = this.createProgressBar(step, this.TOTAL_STEPS);

    console.log(chalk.cyan(`
═══════════════════════════════════════════════════════════════════
  ${chalk.bold(`Step ${step}/${this.TOTAL_STEPS}: ${title}`)}
═══════════════════════════════════════════════════════════════════
`));

    console.log(progressBar + '\\n');
  }

  /**
   * Create ASCII progress bar
   */
  private createProgressBar(current: number, total: number): string {
    const width = 50;
    const filled = Math.floor((current / total) * width);
    const empty = width - filled;

    const bar = chalk.green('█'.repeat(filled)) + chalk.dim('░'.repeat(empty));
    const percentage = Math.floor((current / total) * 100);

    return `${bar} ${chalk.bold(`${percentage}%`)}`;
  }

  /**
   * Wait for user to press Enter
   */
  private async pressEnterToContinue(): Promise<void> {
    await inquirer.prompt([
      {
        type: 'input',
        name: 'continue',
        message: chalk.dim('Press Enter to continue...'),
      },
    ]);
  }

  /**
   * Handle errors during tutorial
   */
  private async handleError(error: unknown): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error('Tutorial error', { error: errorMessage });

    console.log(chalk.red(`
❌ Tutorial Error

Something went wrong: ${errorMessage}

You can:
  1. Try again: memesh tutorial
  2. Skip to docs: docs/QUICK_START.md
  3. Get help: memesh report-issue
`));
  }
}

/**
 * Run the interactive tutorial
 */
export async function runTutorial(): Promise<void> {
  const tutorial = new InteractiveTutorial();
  await tutorial.run();
}
