/**
 * Self-Improvement Experiment Script
 *
 * Demonstrates the evolution system's learning capabilities:
 * 1. Routes multiple tasks to agents
 * 2. Tracks performance metrics
 * 3. Demonstrates learning and improvement over time
 * 4. Generates evolution progress report
 *
 * Run: npx tsx experiments/self-improvement-demo.ts
 */

import { Router } from '../src/orchestrator/router.js';
import { Task } from '../src/orchestrator/types.js';
import { EvolutionMonitor } from '../src/evolution/EvolutionMonitor.js';

interface ExperimentResult {
  taskId: string;
  agentId: string;
  success: boolean;
  duration: number;
  appliedPatterns: number;
}

/**
 * Self-Improvement Experiment
 *
 * Runs controlled experiments to demonstrate evolution capabilities
 */
class SelfImprovementExperiment {
  private router: Router;
  private monitor: EvolutionMonitor;
  private results: ExperimentResult[] = [];

  constructor() {
    this.router = new Router();
    this.monitor = new EvolutionMonitor(
      this.router.getPerformanceTracker(),
      this.router.getLearningManager(),
      this.router.getAdaptationEngine()
    );
  }

  /**
   * Run experiment with multiple rounds of similar tasks
   */
  async runExperiment(): Promise<void> {
    console.log('🧪 Starting Self-Improvement Experiment\n');
    console.log('=' .repeat(60));
    console.log('\n📋 Experiment Plan:');
    console.log('- Round 1: 10 code review tasks (baseline)');
    console.log('- Round 2: 10 code review tasks (learning phase)');
    console.log('- Round 3: 10 code review tasks (improved performance)');
    console.log('\n' + '='.repeat(60) + '\n');

    // Round 1: Baseline performance
    console.log('🔵 Round 1: Baseline Performance');
    await this.runRound('code-review', 10, 'Round 1');

    // Round 2: Learning phase
    console.log('\n🟡 Round 2: Learning Phase');
    await this.runRound('code-review', 10, 'Round 2');

    // Round 3: Improved performance
    console.log('\n🟢 Round 3: Improved Performance');
    await this.runRound('code-review', 10, 'Round 3');

    // Generate report
    this.generateReport();
  }

  /**
   * Run a single round of tasks
   */
  private async runRound(
    taskType: string,
    count: number,
    roundName: string
  ): Promise<void> {
    const roundStart = Date.now();

    for (let i = 0; i < count; i++) {
      const task: Task = {
        id: `${roundName}-task-${i + 1}`,
        description: `Review code quality for module ${i + 1}`,
        priority: 5,
      };

      try {
        const result = await this.router.routeTask(task);

        this.results.push({
          taskId: task.id,
          agentId: result.routing.selectedAgent,
          success: result.approved,
          duration: Date.now() - roundStart,
          appliedPatterns: result.adaptedExecution?.appliedPatterns.length || 0,
        });

        process.stdout.write('.');
      } catch (error) {
        console.error(`\n❌ Task ${task.id} failed:`, error);
      }
    }

    const roundDuration = Date.now() - roundStart;
    console.log(`\n✅ ${roundName} complete (${roundDuration}ms)\n`);
  }

  /**
   * Generate evolution progress report
   */
  private generateReport(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 EXPERIMENT RESULTS');
    console.log('='.repeat(60) + '\n');

    // Overall statistics
    const round1 = this.results.slice(0, 10);
    const round2 = this.results.slice(10, 20);
    const round3 = this.results.slice(20, 30);

    console.log('📈 Performance Comparison:\n');

    console.log('Round 1 (Baseline):');
    this.printRoundStats(round1);

    console.log('\nRound 2 (Learning):');
    this.printRoundStats(round2);

    console.log('\nRound 3 (Improved):');
    this.printRoundStats(round3);

    // Evolution dashboard
    console.log('\n' + '='.repeat(60));
    console.log('🧠 Evolution Dashboard');
    console.log('='.repeat(60) + '\n');

    const dashboard = this.monitor.formatDashboard();
    console.log(dashboard);

    // Learning progress
    console.log('\n' + '='.repeat(60));
    console.log('📚 Learning Progress');
    console.log('='.repeat(60) + '\n');

    const progress = this.monitor.getLearningProgress();
    const activeAgents = progress.filter(p => p.learnedPatterns > 0);

    if (activeAgents.length > 0) {
      activeAgents.forEach(agent => {
        console.log(`\n${agent.agentId}:`);
        console.log(`  Executions: ${agent.totalExecutions}`);
        console.log(`  Patterns: ${agent.learnedPatterns}`);
        console.log(`  Adaptations: ${agent.appliedAdaptations}`);
        console.log(
          `  Improvement: ${agent.successRateImprovement >= 0 ? '+' : ''}${(agent.successRateImprovement * 100).toFixed(1)}%`
        );
      });
    } else {
      console.log('No agents have learned patterns yet.');
      console.log('Note: Learning requires more observations (minObservations threshold).');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Experiment Complete');
    console.log('='.repeat(60) + '\n');
  }

  /**
   * Print statistics for a round
   */
  private printRoundStats(round: ExperimentResult[]): void {
    const successRate = round.filter(r => r.success).length / round.length;
    const avgPatterns =
      round.reduce((sum, r) => sum + r.appliedPatterns, 0) / round.length;
    const avgDuration = round.reduce((sum, r) => sum + r.duration, 0) / round.length;

    console.log(`  Success Rate: ${(successRate * 100).toFixed(1)}%`);
    console.log(`  Avg Patterns Applied: ${avgPatterns.toFixed(1)}`);
    console.log(`  Avg Duration: ${avgDuration.toFixed(0)}ms`);
  }
}

/**
 * Main execution
 */
async function main() {
  const experiment = new SelfImprovementExperiment();
  await experiment.runExperiment();
}

// Run experiment
main().catch(error => {
  console.error('❌ Experiment failed:', error);
  process.exit(1);
});
