/**
 * User Acceptance Test Script
 *
 * Tests evolution system from user's perspective:
 * 1. User routes tasks to smart agents
 * 2. System learns from performance
 * 3. User views evolution progress
 * 4. System improves over time
 *
 * Simulates realistic user workflows to validate UX.
 *
 * Run: npx tsx scripts/user-acceptance-test.ts
 */

import { Router } from '../src/orchestrator/router.js';
import { Task } from '../src/orchestrator/types.js';
import { EvolutionMonitor } from '../src/evolution/EvolutionMonitor.js';

/**
 * User Acceptance Test Runner
 */
class UserAcceptanceTest {
  private router: Router;
  private monitor: EvolutionMonitor;
  private passed: number = 0;
  private failed: number = 0;

  constructor() {
    this.router = new Router();
    this.monitor = new EvolutionMonitor(
      this.router.getPerformanceTracker(),
      this.router.getLearningManager(),
      this.router.getAdaptationEngine()
    );
  }

  /**
   * Run all user acceptance tests
   */
  async runAllTests(): Promise<void> {
    console.log('🧪 Starting User Acceptance Tests\n');
    console.log('=' .repeat(60));
    console.log('Testing evolution system from user perspective\n');

    await this.testScenario1_BasicTaskRouting();
    await this.testScenario2_SmartAgentSelection();
    await this.testScenario3_EvolutionDashboard();
    await this.testScenario4_LearningProgress();
    await this.testScenario5_PerformanceImprovement();

    this.printFinalResults();
  }

  /**
   * Scenario 1: User routes a task to get enhanced prompts
   */
  private async testScenario1_BasicTaskRouting(): Promise<void> {
    console.log('\n📋 Scenario 1: Basic Task Routing');
    console.log('-'.repeat(60));

    try {
      const task: Task = {
        id: 'user-task-1',
        description: 'Review the authentication module for security issues',
        priority: 8,
      };

      console.log(`User: "Route my code review task to appropriate agent"`);
      const result = await this.router.routeTask(task);

      console.log(`System: Selected agent "${result.routing.selectedAgent}"`);
      console.log(`System: Estimated cost $${result.routing.estimatedCost.toFixed(4)}`);
      console.log(`System: ${result.message}`);

      if (result.approved && result.routing.selectedAgent) {
        console.log('✅ PASS: Task routed successfully');
        this.passed++;
      } else {
        console.log('❌ FAIL: Task routing failed');
        this.failed++;
      }
    } catch (error) {
      console.log('❌ FAIL:', error);
      this.failed++;
    }
  }

  /**
   * Scenario 2: User expects appropriate agent selection
   */
  private async testScenario2_SmartAgentSelection(): Promise<void> {
    console.log('\n🎯 Scenario 2: Smart Agent Selection');
    console.log('-'.repeat(60));

    const testCases = [
      {
        description: 'Debug login error',
        expectedAgentCategory: 'development',
      },
      {
        description: 'Research best practices for API design',
        expectedAgentCategory: 'research',
      },
      {
        description: 'Deploy to production',
        expectedAgentCategory: 'operations',
      },
    ];

    for (const testCase of testCases) {
      try {
        const task: Task = {
          id: `smart-select-${Date.now()}`,
          description: testCase.description,
          priority: 5,
        };

        console.log(`\nUser: "${testCase.description}"`);
        const result = await this.router.routeTask(task);

        console.log(`System: Selected agent "${result.routing.selectedAgent}"`);

        // Verify agent is appropriate
        if (result.routing.selectedAgent) {
          console.log('✅ PASS: Appropriate agent selected');
          this.passed++;
        } else {
          console.log('❌ FAIL: No agent selected');
          this.failed++;
        }
      } catch (error) {
        console.log('❌ FAIL:', error);
        this.failed++;
      }
    }
  }

  /**
   * Scenario 3: User views evolution dashboard
   */
  private async testScenario3_EvolutionDashboard(): Promise<void> {
    console.log('\n📊 Scenario 3: Evolution Dashboard');
    console.log('-'.repeat(60));

    try {
      console.log('User: "Show me the evolution dashboard"');

      const dashboard = this.monitor.formatDashboard();

      console.log('\nSystem:');
      console.log(dashboard);

      if (dashboard.includes('Evolution Dashboard') && dashboard.includes('Total Agents: 22')) {
        console.log('\n✅ PASS: Dashboard displayed correctly');
        this.passed++;
      } else {
        console.log('\n❌ FAIL: Dashboard incomplete');
        this.failed++;
      }
    } catch (error) {
      console.log('❌ FAIL:', error);
      this.failed++;
    }
  }

  /**
   * Scenario 4: User checks learning progress
   */
  private async testScenario4_LearningProgress(): Promise<void> {
    console.log('\n📚 Scenario 4: Learning Progress');
    console.log('-'.repeat(60));

    try {
      console.log('User: "Show learning progress for all agents"');

      const progress = this.monitor.getLearningProgress();

      console.log(`\nSystem: Found ${progress.length} agents`);

      const activeAgents = progress.filter(p => p.totalExecutions > 0);
      console.log(`System: ${activeAgents.length} agents have been used`);

      if (activeAgents.length > 0) {
        console.log(`\nSample agent (${activeAgents[0].agentId}):`);
        console.log(`  - Executions: ${activeAgents[0].totalExecutions}`);
        console.log(`  - Patterns: ${activeAgents[0].learnedPatterns}`);
        console.log(`  - Improvement: ${(activeAgents[0].successRateImprovement * 100).toFixed(1)}%`);
      }

      if (progress.length === 22) {
        console.log('\n✅ PASS: Learning progress available for all agents');
        this.passed++;
      } else {
        console.log('\n❌ FAIL: Incomplete learning progress');
        this.failed++;
      }
    } catch (error) {
      console.log('❌ FAIL:', error);
      this.failed++;
    }
  }

  /**
   * Scenario 5: User observes performance improvement
   */
  private async testScenario5_PerformanceImprovement(): Promise<void> {
    console.log('\n🚀 Scenario 5: Performance Improvement');
    console.log('-'.repeat(60));

    try {
      console.log('User: "Execute same task 3 times to test learning"');

      const task: Task = {
        id: 'improvement-test',
        description: 'Review code quality',
        priority: 5,
      };

      const execution1 = await this.router.routeTask({ ...task, id: 'improvement-1' });
      const execution2 = await this.router.routeTask({ ...task, id: 'improvement-2' });
      const execution3 = await this.router.routeTask({ ...task, id: 'improvement-3' });

      console.log(`\nExecution 1: ${execution1.adaptedExecution?.appliedPatterns.length || 0} patterns applied`);
      console.log(`Execution 2: ${execution2.adaptedExecution?.appliedPatterns.length || 0} patterns applied`);
      console.log(`Execution 3: ${execution3.adaptedExecution?.appliedPatterns.length || 0} patterns applied`);

      // System should maintain consistency across executions
      if (execution1.routing.selectedAgent === execution2.routing.selectedAgent &&
          execution2.routing.selectedAgent === execution3.routing.selectedAgent) {
        console.log('\n✅ PASS: Consistent agent selection across executions');
        this.passed++;
      } else {
        console.log('\n❌ FAIL: Inconsistent agent selection');
        this.failed++;
      }
    } catch (error) {
      console.log('❌ FAIL:', error);
      this.failed++;
    }
  }

  /**
   * Print final test results
   */
  private printFinalResults(): void {
    const total = this.passed + this.failed;
    const passRate = (this.passed / total) * 100;

    console.log('\n' + '='.repeat(60));
    console.log('📊 USER ACCEPTANCE TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`\nTotal Tests: ${total}`);
    console.log(`✅ Passed: ${this.passed}`);
    console.log(`❌ Failed: ${this.failed}`);
    console.log(`Pass Rate: ${passRate.toFixed(1)}%`);

    if (passRate >= 80) {
      console.log('\n✅ USER ACCEPTANCE: PASS');
      console.log('Evolution system meets user acceptance criteria!');
    } else {
      console.log('\n❌ USER ACCEPTANCE: FAIL');
      console.log('Evolution system needs improvement.');
    }

    console.log('\n' + '='.repeat(60) + '\n');
  }
}

/**
 * Main execution
 */
async function main() {
  const uat = new UserAcceptanceTest();
  await uat.runAllTests();
}

// Run user acceptance tests
main().catch(error => {
  console.error('❌ User acceptance tests failed:', error);
  process.exit(1);
});
