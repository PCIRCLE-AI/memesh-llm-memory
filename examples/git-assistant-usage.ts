/**
 * Git Assistant Usage Examples
 *
 * Demonstrates how to use Git Assistant in smart-agents
 */

import { MCPToolInterface } from '../src/core/MCPToolInterface';
import { createGitAssistant, GitAssistantIntegration } from '../src/integrations/GitAssistantIntegration';

/**
 * Example 1: Basic Setup - Initialize Git for New Project
 */
async function example1_setupNewProject() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Example 1: Setup Git for New Project');
  console.log('═══════════════════════════════════════════════════════════\n');

  const mcp = new MCPToolInterface();
  const gitAssistant = await createGitAssistant(mcp, '/path/to/new/project');

  // Check if project has Git
  const hasGit = await gitAssistant.hasGit();
  console.log(`Has Git: ${hasGit}`);

  if (!hasGit) {
    // Run full setup wizard
    await gitAssistant.setupNewProject();
    // This will:
    // 1. Show educational content about version control
    // 2. Ask for name and email
    // 3. Ask for automation level preference
    // 4. Initialize Git
    // 5. Create first commit
    // 6. Show tutorial if requested
  }

  console.log('\n✅ Example 1 complete\n');
}

/**
 * Example 2: Configure Existing Project
 */
async function example2_configureExisting() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Example 2: Configure Git Assistant for Existing Project');
  console.log('═══════════════════════════════════════════════════════════\n');

  const mcp = new MCPToolInterface();
  const gitAssistant = await createGitAssistant(mcp, '/path/to/existing/project');

  // Configure for existing Git project
  await gitAssistant.configureExistingProject();
  // This will:
  // 1. Detect existing Git
  // 2. Offer to configure automation level
  // 3. Optionally set up GitHub integration

  console.log('\n✅ Example 2 complete\n');
}

/**
 * Example 3: Use Friendly Commands
 */
async function example3_friendlyCommands() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Example 3: User-Friendly Git Commands');
  console.log('═══════════════════════════════════════════════════════════\n');

  const mcp = new MCPToolInterface();
  const gitAssistant = await createGitAssistant(mcp);

  // Save work
  await gitAssistant.saveWork('完成登入功能');

  // List versions
  console.log('\n📚 Recent versions:');
  const versions = await gitAssistant.listVersions(5);

  // Check status
  console.log('\n📝 Current status:');
  await gitAssistant.status();

  // Show changes
  console.log('\n📊 Changes since last version:');
  const changes = await gitAssistant.showChanges();

  // Create backup
  console.log('\n💾 Creating backup:');
  const backupPath = await gitAssistant.createBackup();
  console.log(`Backup created at: ${backupPath}`);

  console.log('\n✅ Example 3 complete\n');
}

/**
 * Example 4: Hook Integration - File Change Tracking
 */
async function example4_fileChangeHooks() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Example 4: Automatic File Change Tracking');
  console.log('═══════════════════════════════════════════════════════════\n');

  const mcp = new MCPToolInterface();
  const gitAssistant = await createGitAssistant(mcp);

  // Set automation level to Smart Reminders (Level 1)
  await gitAssistant.setAutomationLevel(1);

  // Simulate file changes
  console.log('Simulating file modifications...');
  await gitAssistant.onFilesChanged([
    'src/login.ts',
    'src/auth.ts',
    'src/components/LoginForm.tsx',
  ]);

  // After enough changes accumulate, Git Assistant will suggest commit
  // (based on thresholds: file count, line count, time interval)

  console.log('\n✅ Example 4 complete\n');
}

/**
 * Example 5: AI Feature Detection
 */
async function example5_featureDetection() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Example 5: AI-Powered Feature Completion Detection');
  console.log('═══════════════════════════════════════════════════════════\n');

  const mcp = new MCPToolInterface();
  const gitAssistant = await createGitAssistant(mcp);

  // Claude Code detects that a feature is complete
  await gitAssistant.onFeatureComplete('User Authentication', [
    'src/auth/login.ts',
    'src/auth/register.ts',
    'src/auth/middleware.ts',
    'tests/auth.test.ts',
  ]);

  // Git Assistant will suggest commit with high confidence
  // Message: "feat: User Authentication"

  console.log('\n✅ Example 5 complete\n');
}

/**
 * Example 6: Automation Levels
 */
async function example6_automationLevels() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Example 6: Different Automation Levels');
  console.log('═══════════════════════════════════════════════════════════\n');

  const mcp = new MCPToolInterface();
  const gitAssistant = await createGitAssistant(mcp);

  // Level 0: Manual
  console.log('Setting Level 0 (Manual)...');
  await gitAssistant.setAutomationLevel(0);
  // No automatic suggestions, user controls everything

  // Level 1: Smart Reminders (RECOMMENDED)
  console.log('\nSetting Level 1 (Smart Reminders)...');
  await gitAssistant.setAutomationLevel(1);
  // System suggests, user approves
  // Example notification:
  // 💡 建議儲存版本
  // 已修改 10 個檔案
  // [s] 儲存  [x] 稍後

  // Level 2: Semi-Auto
  console.log('\nSetting Level 2 (Semi-Auto)...');
  await gitAssistant.setAutomationLevel(2);
  // System prepares commit, user quick-approves
  // Example: [Enter] to confirm, [e] to edit

  // Level 3: Full-Auto
  console.log('\nSetting Level 3 (Full-Auto)...');
  await gitAssistant.setAutomationLevel(3);
  // System auto-commits, notifies after
  // ⚠️ Requires explicit enable

  console.log('\n✅ Example 6 complete\n');
}

/**
 * Example 7: GitHub Integration (Optional)
 */
async function example7_githubIntegration() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Example 7: Optional GitHub Integration');
  console.log('═══════════════════════════════════════════════════════════\n');

  const mcp = new MCPToolInterface();
  const gitAssistant = await createGitAssistant(mcp);

  // Initially, GitHub is disabled (local Git only)
  console.log('Initial state: Local Git only');

  // User provides GitHub token (from RAG-like config)
  const githubToken = process.env.GITHUB_TOKEN || 'ghp_...';

  if (githubToken && githubToken !== 'ghp_...') {
    // Set token - GitHub integration auto-enables!
    await gitAssistant.setGitHubToken(githubToken);
    console.log('✅ GitHub integration auto-enabled!');

    // Now Git Assistant can:
    // - Auto-sync to GitHub (if enabled)
    // - Create remote backups
    // - Enable collaboration features
  } else {
    console.log('ℹ️  No GitHub token provided - staying local only');
    console.log('   This is perfectly fine! Local Git is sufficient.');
  }

  console.log('\n✅ Example 7 complete\n');
}

/**
 * Example 8: Periodic Timer Checks
 */
async function example8_timerChecks() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Example 8: Periodic Background Checks');
  console.log('═══════════════════════════════════════════════════════════\n');

  const mcp = new MCPToolInterface();
  const gitAssistant = await createGitAssistant(mcp);

  // In real application, this would run every N minutes
  // For example, using setInterval:
  //
  // setInterval(async () => {
  //   await gitAssistant.onTimerInterval();
  // }, 30 * 60 * 1000); // Every 30 minutes

  // Simulate timer check
  console.log('Running periodic check...');
  await gitAssistant.onTimerInterval();

  // This checks if:
  // - Enough time has passed since last commit
  // - There are unsaved changes
  // If both true, suggests commit (based on automation level)

  console.log('\n✅ Example 8 complete\n');
}

/**
 * Example 9: Complete Workflow
 */
async function example9_completeWorkflow() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Example 9: Complete User Workflow');
  console.log('═══════════════════════════════════════════════════════════\n');

  const mcp = new MCPToolInterface();

  // Step 1: User starts working on a project
  console.log('Step 1: Initialize Git Assistant');
  const gitAssistant = await createGitAssistant(mcp, '/path/to/project');

  // Step 2: Check if Git exists
  const hasGit = await gitAssistant.hasGit();

  if (!hasGit) {
    // Scenario A: No Git - Setup wizard
    console.log('Step 2: No Git detected - Running setup wizard');
    await gitAssistant.setupNewProject();
  } else {
    // Scenario B: Has Git - Configure if needed
    console.log('Step 2: Git detected - Offering configuration');
    await gitAssistant.configureExistingProject();
  }

  // Step 3: User works on code
  console.log('\nStep 3: User modifies files...');
  await gitAssistant.onFilesChanged(['src/file1.ts', 'src/file2.ts']);

  // Step 4: Git Assistant suggests commit (if Level 1+)
  console.log('\nStep 4: System suggests commit (based on thresholds)');
  // User sees notification based on automation level

  // Step 5: User saves work (manual or auto)
  console.log('\nStep 5: Save work');
  await gitAssistant.saveWork('完成功能 X');

  // Step 6: User wants to see history
  console.log('\nStep 6: View history');
  await gitAssistant.listVersions(10);

  // Step 7: User wants to go back to previous version
  console.log('\nStep 7: Go back to previous version');
  await gitAssistant.goBackTo('2');

  // Step 8: User creates backup before major change
  console.log('\nStep 8: Create backup');
  const backupPath = await gitAssistant.createBackup();
  console.log(`Backup: ${backupPath}`);

  console.log('\n✅ Example 9 complete\n');
}

/**
 * Example 10: Help and Documentation
 */
async function example10_helpSystem() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Example 10: Help and Documentation');
  console.log('═══════════════════════════════════════════════════════════\n');

  const mcp = new MCPToolInterface();
  const gitAssistant = await createGitAssistant(mcp);

  // Show comprehensive help
  await gitAssistant.showHelp();

  // Help includes:
  // - Basic commands
  // - Setup commands
  // - Tutorial commands
  // - Common Q&A
  // - All friendly command references

  console.log('\n✅ Example 10 complete\n');
}

/**
 * Run all examples
 */
async function runAllExamples() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  Git Assistant Usage Examples for Smart-Agents           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('\n');

  // Note: In production, these would be run based on actual scenarios
  // For demonstration, we show each example in sequence

  // await example1_setupNewProject();
  // await example2_configureExisting();
  // await example3_friendlyCommands();
  // await example4_fileChangeHooks();
  // await example5_featureDetection();
  // await example6_automationLevels();
  // await example7_githubIntegration();
  // await example8_timerChecks();
  // await example9_completeWorkflow();
  // await example10_helpSystem();

  console.log('All examples demonstrated!');
  console.log('Uncomment the examples above to run them.');
}

// Export for use in other modules
export {
  example1_setupNewProject,
  example2_configureExisting,
  example3_friendlyCommands,
  example4_fileChangeHooks,
  example5_featureDetection,
  example6_automationLevels,
  example7_githubIntegration,
  example8_timerChecks,
  example9_completeWorkflow,
  example10_helpSystem,
};

// Run if executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}
