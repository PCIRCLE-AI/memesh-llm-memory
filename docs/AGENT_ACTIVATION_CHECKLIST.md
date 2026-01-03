# Agent Activation Checklist

This comprehensive checklist ensures proper activation and integration of new agents in Claude Code Buddy. Follow all steps in order to avoid TypeScript compilation errors and runtime issues.

## Overview

Activating a new agent involves:
1. Creating the agent class
2. Registering in AgentRegistry
3. Creating MCP tools (if needed)
4. Adding handlers and routing
5. Updating type definitions
6. Updating all Record<AgentType, ...> mappings
7. Building and testing

**⚠️ IMPORTANT:** The TypeScript compiler will enforce exhaustiveness checks via `Record<AgentType, T>` patterns. If you skip any mapping, you will get compilation errors.

---

## Phase 1: Agent Class Creation

### ☐ 1.1 Create Agent Class File

**Location:** `src/agents/[AgentName]Agent.ts`

**Template:**
```typescript
/**
 * [Agent Name] Agent
 *
 * [Description of what this agent does]
 *
 * Capabilities:
 * - [Capability 1]
 * - [Capability 2]
 * - [Capability 3]
 */

import { MCPToolInterface } from '../core/MCPToolInterface.js';
import { logger } from '../utils/logger.js';

export class [AgentName]Agent {
  constructor(private toolInterface: MCPToolInterface) {}

  /**
   * Agent methods here
   */
}
```

**Examples:**
- `src/agents/DevOpsEngineerAgent.ts`
- `src/agents/WorkflowOrchestrator.ts`
- `src/agents/E2EHealingAgent.ts`

---

## Phase 2: AgentRegistry Registration

### ☐ 2.1 Register Agent in AgentRegistry

**File:** `src/core/AgentRegistry.ts`

**Location:** Add to `registerAllAgents()` method

**Template:**
```typescript
this.register({
  type: '[agent-type-name]',  // Must match AgentType union
  name: '[Agent Display Name]',
  description: '[Description of agent capabilities]',
  capabilities: ['[capability1]', '[capability2]'],  // Must match TaskCapability union
  complexity: ['simple', 'medium', 'complex'],  // Which complexities can this agent handle
  metadata: {
    // Optional: Additional agent-specific metadata
    category: '[category]',
    status: 'active',
  },
});
```

**Example:**
```typescript
// Workflow Orchestrator
this.register({
  type: 'workflow-orchestrator',
  name: 'Workflow Orchestrator',
  description: 'Intelligent workflow platform selector, delegates to Opal and n8n based on requirements',
  capabilities: ['workflow-automation'],
  complexity: ['simple', 'medium', 'complex'],
  metadata: {
    category: 'workflow-automation',
    status: 'active',
  },
});
```

---

## Phase 3: MCP Tool Creation (if needed)

### ☐ 3.1 Create MCP Tool Definition Files

**Location:** `src/mcp/tools/[tool-name].ts`

**Template:**
```typescript
/**
 * [Tool Name] MCP Tool
 *
 * [Description of what this tool does]
 */

import { z } from 'zod';

// Input schema validation
const inputSchema = z.object({
  // Define input parameters
  param1: z.string().describe('Description of param1'),
  param2: z.number().optional().describe('Optional param2'),
});

export const [toolName]Tool = {
  name: '[tool-name]',
  description: '[Tool description for Claude Code]',
  inputSchema: {
    type: 'object' as const,
    properties: {
      param1: {
        type: 'string',
        description: 'Description of param1',
      },
      param2: {
        type: 'number',
        description: 'Optional param2',
      },
    },
    required: ['param1'],
  },
  handler: async (input: z.infer<typeof inputSchema>, agent: [AgentType]) => {
    // Validate input
    const validated = inputSchema.parse(input);

    // Execute agent functionality
    const result = await agent.someMethod(validated.param1, validated.param2);

    return result;
  },
};
```

**Examples:**
- `src/mcp/tools/workflow-create.ts`
- `src/mcp/tools/workflow-list.ts`
- `src/mcp/tools/deploy-infrastructure.ts`

---

## Phase 4: ServerInitializer Integration

### ☐ 4.1 Initialize Agent in ServerInitializer

**File:** `src/mcp/ServerInitializer.ts`

**Step 1:** Add agent to `ServerComponents` interface:
```typescript
export interface ServerComponents {
  // ... existing components ...

  // [Your new agent]
  [agentName]: [AgentType];
}
```

**Step 2:** Initialize agent in `initialize()` method:
```typescript
// Initialize [Agent Name]
const [agentName] = new [AgentType](toolInterface);
```

**Step 3:** Pass agent to ToolHandlers (if it has MCP tools):
```typescript
const toolHandlers = new ToolHandlers(
  router,
  agentRegistry,
  feedbackCollector,
  performanceTracker,
  learningManager,
  evolutionMonitor,
  skillManager,
  uninstallManager,
  developmentButler,
  checkpointDetector,
  planningEngine,
  projectMemoryManager,
  knowledgeGraph,
  ui,
  devopsEngineer,
  workflowOrchestrator,
  [agentName]  // ← ADD HERE
);
```

**Step 4:** Add to return statement:
```typescript
return {
  // ... existing components ...
  [agentName],
};
```

**Example:**
```typescript
// Initialize Workflow Orchestrator (Opal + n8n)
const workflowOrchestrator = new WorkflowOrchestrator(toolInterface);

// Pass to ToolHandlers
const toolHandlers = new ToolHandlers(
  // ... 15 existing parameters ...
  workflowOrchestrator  // ← 16th parameter
);

// Return
return {
  // ... existing components ...
  workflowOrchestrator,
};
```

---

## Phase 5: Handler Methods (if MCP tools exist)

### ☐ 5.1 Update ToolHandlers Constructor

**File:** `src/mcp/handlers/ToolHandlers.ts`

**Add parameter to constructor:**
```typescript
constructor(
  private router: Router,
  private agentRegistry: AgentRegistry,
  // ... existing parameters ...
  private [agentName]: [AgentType]
) {}
```

### ☐ 5.2 Add Handler Methods

**Add handler methods for each MCP tool:**
```typescript
/**
 * Handle [tool name]
 */
async handle[ToolName](input: {
  param1: string;
  param2?: number;
}): Promise<CallToolResult> {
  try {
    const result = await [toolName]Tool.handler(
      input,
      this.[agentName]
    );

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    logError(error, {
      component: 'ToolHandlers',
      method: 'handle[ToolName]',
      operation: '[operation description]',
      data: { param1: input.param1 },
    });

    const handled = handleError(error, {
      component: 'ToolHandlers',
      method: 'handle[ToolName]',
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: `❌ Failed to [operation]: ${handled.message}`,
        },
      ],
    };
  }
}
```

**Example:**
```typescript
async handleCreateWorkflow(input: {
  description: string;
  platform?: 'opal' | 'n8n' | 'auto';
}): Promise<CallToolResult> {
  try {
    const result = await createWorkflowTool.handler(
      input,
      this.workflowOrchestrator
    );

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    // Error handling...
  }
}
```

---

## Phase 6: Tool Routing

### ☐ 6.1 Add Routing in ToolRouter

**File:** `src/mcp/ToolRouter.ts`

**Location:** Add to `dispatch()` method after existing tool routes

**Template:**
```typescript
// [Agent Name] tools
if (toolName === '[tool-name]') {
  return await this.toolHandlers.handle[ToolName](args);
}

if (toolName === '[another-tool]') {
  return await this.toolHandlers.handle[AnotherTool](args);
}
```

**Example:**
```typescript
// Workflow Automation tools
if (toolName === 'workflow-create') {
  return await this.toolHandlers.handleCreateWorkflow(args);
}

if (toolName === 'workflow-list') {
  return await this.toolHandlers.handleListWorkflows(args);
}
```

---

## Phase 7: Tool Definitions

### ☐ 7.1 Add Tool Definitions to ToolDefinitions

**File:** `src/mcp/ToolDefinitions.ts`

**Step 1:** Import tool definitions:
```typescript
import { [toolName]Tool } from './tools/[tool-name].js';
```

**Step 2:** Create MCPToolDefinition objects:
```typescript
const [toolName]ToolDef: MCPToolDefinition = {
  name: [toolName]Tool.name,
  description: [toolName]Tool.description,
  inputSchema: [toolName]Tool.inputSchema,
};
```

**Step 3:** Add to return array in `getAllToolDefinitions()`:
```typescript
export function getAllToolDefinitions(): MCPToolDefinition[] {
  return [
    // ... existing tools ...

    // [Agent Name] tools
    [toolName]ToolDef,
    [anotherTool]ToolDef,
  ];
}
```

**Example:**
```typescript
// Step 1: Import
import { createWorkflowTool } from './tools/workflow-create.js';
import { listWorkflowsTool } from './tools/workflow-list.js';

// Step 2: Create definitions
const workflowCreateToolDef: MCPToolDefinition = {
  name: createWorkflowTool.name,
  description: createWorkflowTool.description,
  inputSchema: createWorkflowTool.inputSchema,
};

const workflowListToolDef: MCPToolDefinition = {
  name: listWorkflowsTool.name,
  description: listWorkflowsTool.description,
  inputSchema: listWorkflowsTool.inputSchema,
};

// Step 3: Add to return array
export function getAllToolDefinitions(): MCPToolDefinition[] {
  return [
    // ... existing tools ...

    // Workflow Automation tools
    workflowCreateToolDef,
    workflowListToolDef,
  ];
}
```

---

## Phase 8: Type Definitions

### ☐ 8.1 Add Agent Type to AgentType Union

**File:** `src/orchestrator/types.ts`

**Location:** Add to `AgentType` union type

**Template:**
```typescript
export type AgentType =
  // ... existing types ...

  // [Category] Agents
  | '[agent-type-name]'
  | '[another-agent]';
```

**Example:**
```typescript
export type AgentType =
  // ... existing types ...

  // Workflow Automation Agents
  | 'workflow-orchestrator'
  | 'opal-automation'
  | 'n8n-workflow'

  // General Agent (fallback)
  | 'general-agent';
```

### ☐ 8.2 Add Capability to TaskCapability Union (if new capability)

**File:** `src/orchestrator/types.ts`

**Location:** Add to `TaskCapability` union type

**Template:**
```typescript
export type TaskCapability =
  // ... existing capabilities ...
  | '[new-capability]'
  | 'general';
```

**Example:**
```typescript
export type TaskCapability =
  // ... existing capabilities ...
  | 'workflow-automation'
  | 'general';
```

---

## Phase 9: AgentRouter Mappings

### ☐ 9.1 Update agentCapabilities Mapping

**File:** `src/orchestrator/AgentRouter.ts`

**Location:** `getCapabilitiesForAgent()` method

**Add entries:**
```typescript
private getCapabilitiesForAgent(agent: AgentType): TaskCapability[] {
  const agentCapabilities: Record<AgentType, TaskCapability[]> = {
    // ... existing mappings ...

    '[agent-type]': ['[capability]'],
    '[another-agent]': ['[capability]'],
  };

  return agentCapabilities[agent] || ['general'];
}
```

**Example:**
```typescript
'workflow-orchestrator': ['workflow-automation'],
'opal-automation': ['workflow-automation'],
'n8n-workflow': ['workflow-automation'],
```

### ☐ 9.2 Update fallbackMap Mapping

**File:** `src/orchestrator/AgentRouter.ts`

**Location:** `getFallbackAgent()` method

**Add entries:**
```typescript
private getFallbackAgent(primaryAgent: AgentType): AgentType | undefined {
  const fallbackMap: Record<AgentType, AgentType | undefined> = {
    // ... existing mappings ...

    '[agent-type]': 'general-agent',
    '[another-agent]': 'general-agent',
  };

  return fallbackMap[primaryAgent];
}
```

**Example:**
```typescript
// Workflow Automation Agents
'workflow-orchestrator': 'general-agent',
'opal-automation': 'general-agent',
'n8n-workflow': 'general-agent',
```

### ☐ 9.3 Update agentDescriptions Mapping

**File:** `src/orchestrator/AgentRouter.ts`

**Location:** `generateRoutingReasoning()` method

**Add entries:**
```typescript
const agentDescriptions: Record<AgentType, string> = {
  // ... existing descriptions ...

  '[agent-type]': '[Agent description]',
  '[another-agent]': '[Agent description]',
};
```

**Example:**
```typescript
'workflow-orchestrator': 'Intelligent workflow platform selector, delegates to Opal and n8n based on requirements',
'opal-automation': 'Google Opal browser automation using Playwright, workflow recording and execution',
'n8n-workflow': 'n8n workflow API integration, workflow creation and management via CLI',
```

---

## Phase 10: PromptTemplates Mappings

### ☐ 10.1 Update AGENT_PERSONAS Mapping

**File:** `src/prompts/templates/PromptTemplates.ts`

**Location:** `AGENT_PERSONAS` constant (line ~20)

**Add entries:**
```typescript
export const AGENT_PERSONAS: Record<AgentType, string> = {
  // ... existing personas ...

  '[agent-type]': `You are an expert [Agent Name] specializing in [domain].

Your expertise includes:
- [Expertise area 1]
- [Expertise area 2]
- [Expertise area 3]

When [performing tasks], you:
1. [Step 1]
2. [Step 2]
3. [Step 3]
4. [Step 4]
5. [Step 5]`,
};
```

**Example:**
```typescript
'workflow-orchestrator': `You are an expert Workflow Orchestrator specializing in intelligent platform selection and workflow automation.

Your expertise includes:
- Google Opal browser automation evaluation
- n8n workflow platform evaluation
- Workflow requirement analysis
- Platform selection optimization
- Workflow execution coordination

When orchestrating workflows, you:
1. Analyze workflow requirements (speed vs production)
2. Select optimal platform (Opal for speed, n8n for production)
3. Delegate to specialized agents (OpalAutomationAgent or N8nWorkflowAgent)
4. Coordinate workflow execution
5. Monitor and optimize workflow performance`,
```

### ☐ 10.2 Update AGENT_TOOLS Mapping

**File:** `src/prompts/templates/PromptTemplates.ts`

**Location:** `AGENT_TOOLS` constant (line ~807)

**Add entries:**
```typescript
const AGENT_TOOLS: Record<AgentType, string[]> = {
  // ... existing tools ...

  '[agent-type]': ['[tool1]', '[tool2]', '[tool3]'],
  '[another-agent]': ['[tool1]', '[tool2]'],
};
```

**Example:**
```typescript
'workflow-orchestrator': ['workflow_selector', 'platform_evaluator', 'requirement_analyzer'],
'opal-automation': ['playwright', 'opal_recorder', 'workflow_player', 'screenshot'],
'n8n-workflow': ['n8n_cli', 'workflow_api', 'bash', 'curl'],
```

### ☐ 10.3 Update MODEL_SUGGESTIONS Mapping

**File:** `src/prompts/templates/PromptTemplates.ts`

**Location:** `MODEL_SUGGESTIONS` constant (line ~865)

**Add entries:**
```typescript
const MODEL_SUGGESTIONS: Record<AgentType, ModelSuggestion> = {
  // ... existing suggestions ...

  '[agent-type]': {
    simple: 'claude-3-5-haiku-20241022',
    medium: 'claude-sonnet-4-5-20250929',
    complex: 'claude-sonnet-4-5-20250929',
  },
};
```

**Example:**
```typescript
'workflow-orchestrator': {
  simple: 'claude-3-5-haiku-20241022',
  medium: 'claude-sonnet-4-5-20250929',
  complex: 'claude-sonnet-4-5-20250929',
},
'opal-automation': {
  simple: 'claude-3-5-haiku-20241022',
  medium: 'claude-3-5-haiku-20241022',
  complex: 'claude-sonnet-4-5-20250929',
},
```

### ☐ 10.4 Update AGENT_INSTRUCTIONS Mapping

**File:** `src/prompts/templates/PromptTemplates.ts`

**Location:** `AGENT_INSTRUCTIONS` constant (line ~1037)

**Add entries:**
```typescript
const AGENT_INSTRUCTIONS: Record<AgentType, string> = {
  // ... existing instructions ...

  '[agent-type]': 'Please provide:\n1. [Instruction 1]\n2. [Instruction 2]\n3. [Instruction 3]',
};
```

**Example:**
```typescript
'workflow-orchestrator': 'Please provide:\n1. Workflow requirement analysis (speed vs production)\n2. Platform recommendation (Opal vs n8n) with reasoning\n3. Workflow creation plan and execution strategy',
'opal-automation': 'Please provide:\n1. Opal workflow recording steps\n2. Workflow URL and playback instructions\n3. Visual verification results',
'n8n-workflow': 'Please provide:\n1. n8n workflow creation command\n2. Workflow structure and node configuration\n3. Production deployment checklist',
```

---

## Phase 11: Build and Test

### ☐ 11.1 Build TypeScript

**Command:**
```bash
npm run build
```

**Expected Output:**
```
✓ TypeScript compilation completed with 0 errors
```

**Common Errors:**
- `Type 'X' is not assignable to type 'AgentType'` → Add to AgentType union
- `Type '...' is missing the following properties from type 'Record<AgentType, ...>'` → Add to Record mapping
- `Type 'X' is not assignable to type 'TaskCapability'` → Add to TaskCapability union

### ☐ 11.2 Run Test Suite

**Command:**
```bash
npm test
```

**Expected Output:**
```
✓ All existing tests pass
✓ No regressions
```

### ☐ 11.3 Run Validation Test Suite

**Command:**
```bash
npm test tests/validation/agent-activation-validation.test.ts
```

**Expected Output:**
```
✓ Agent Activation Validation
  ✓ AgentRegistry Validation
    ✓ should have all agents registered in AgentRegistry
    ✓ should have complete metadata for all registered agents
  ✓ Type Definitions Validation
    ✓ should have all TaskCapability values defined
  ✓ AgentRouter Mapping Validation
    ✓ should have agentCapabilities mapping for all agents
  ✓ MCP Integration Validation
    ✓ should have MCP tool definitions for workflow agents
    ✓ should have valid tool schemas
  ✓ ServerInitializer Validation
    ✓ should initialize all components without errors
    ✓ should pass all required dependencies to ToolHandlers
  ✓ Activation Completeness Check
    ✓ should have all agents in all required mappings
    ✓ should have no orphaned agent types in type definitions
  ✓ [Your Agent] Validation
    ✓ should have [YourAgent] registered
```

---

## Phase 12: Documentation

### ☐ 12.1 Update README.md

**File:** `README.md`

**Add agent to features list:**
```markdown
## Features

- **[Agent Name]**: [Description of what it does]
```

### ☐ 12.2 Create Agent Documentation

**File:** `docs/agents/[AgentName].md`

**Template:**
```markdown
# [Agent Name]

[Brief description]

## Capabilities

- [Capability 1]
- [Capability 2]
- [Capability 3]

## MCP Tools

### [tool-name]

[Tool description]

**Parameters:**
- `param1` (string, required): [Description]
- `param2` (number, optional): [Description]

**Example:**
\`\`\`typescript
// Example usage
\`\`\`

## Usage

[How to use this agent]

## Architecture

[Architecture diagram or explanation]
```

### ☐ 12.3 Update CHANGELOG.md

**File:** `CHANGELOG.md`

**Add entry:**
```markdown
## [Version] - [Date]

### Added

- **[Agent Name]**: [Description of what was added]
  - MCP tools: `[tool-1]`, `[tool-2]`
  - Capabilities: [capability-1], [capability-2]
  - [Additional details]
```

---

## Validation Checklist

After completing all phases, verify:

- ☐ **TypeScript Compilation**: `npm run build` succeeds with 0 errors
- ☐ **Test Suite**: `npm test` shows all tests passing
- ☐ **Validation Suite**: Agent validation tests pass
- ☐ **AgentRegistry**: Agent is registered with correct metadata
- ☐ **ServerComponents**: Agent is initialized and returned
- ☐ **ToolHandlers**: Handler methods exist for all MCP tools
- ☐ **ToolRouter**: Routing exists for all MCP tools
- ☐ **ToolDefinitions**: All MCP tools are defined and exported
- ☐ **Type Definitions**: AgentType and TaskCapability unions include new types
- ☐ **AgentRouter Mappings**: All 3 mappings include new agent (capabilities, fallback, descriptions)
- ☐ **PromptTemplates Mappings**: All 4 mappings include new agent (personas, tools, models, instructions)
- ☐ **Documentation**: README, agent docs, and CHANGELOG updated

---

## Common Issues and Solutions

### Issue: TypeScript error - "Type 'X' is not assignable to type 'AgentType'"

**Solution:** Add the agent type to the `AgentType` union in `src/orchestrator/types.ts`

### Issue: TypeScript error - "Property 'X' is missing in type 'Record<AgentType, ...>'"

**Solution:** Add the agent to the specific Record mapping that's missing it. Check all 7 mappings:
1. AgentRouter.agentCapabilities
2. AgentRouter.fallbackMap
3. AgentRouter.agentDescriptions
4. PromptTemplates.AGENT_PERSONAS
5. PromptTemplates.AGENT_TOOLS
6. PromptTemplates.MODEL_SUGGESTIONS
7. PromptTemplates.AGENT_INSTRUCTIONS

### Issue: TypeScript error - "Type 'X' is not assignable to type 'TaskCapability'"

**Solution:** Add the capability to the `TaskCapability` union in `src/orchestrator/types.ts`

### Issue: Runtime error - "Cannot read property 'X' of undefined"

**Solution:** Check that the agent is properly initialized in ServerInitializer and passed to ToolHandlers

### Issue: MCP tool not available in Claude Code

**Solution:** Verify:
1. Tool definition exists in `ToolDefinitions.ts`
2. Tool is imported and added to return array
3. Handler method exists in `ToolHandlers.ts`
4. Routing exists in `ToolRouter.ts`

---

## Reference Examples

For complete working examples, refer to:

1. **DevOps Engineer Agent** (Simple agent with MCP tools)
   - Agent: `src/agents/DevOpsEngineerAgent.ts`
   - Tools: `src/mcp/tools/deploy-infrastructure.ts`, `src/mcp/tools/setup-cicd.ts`
   - Commit: [DevOps activation commit]

2. **Workflow Automation Suite** (Multi-agent system)
   - Orchestrator: `src/agents/WorkflowOrchestrator.ts`
   - Sub-agents: `src/agents/OpalAutomationAgent.ts`, `src/agents/N8nWorkflowAgent.ts`
   - Tools: `src/mcp/tools/workflow-create.ts`, `src/mcp/tools/workflow-list.ts`
   - Commit: [Workflow activation commit]

3. **E2E Healing Agent** (Complex agent with Claude SDK integration)
   - Agent: `src/agents/E2EHealingAgent.ts`
   - Integration: Claude Agent SDK, Playwright
   - Commit: [E2E agent commit]

---

## Automated Validation

Run the automated validation test suite to verify proper activation:

```bash
npm test tests/validation/agent-activation-validation.test.ts
```

This test suite validates:
- ✅ All agents registered in AgentRegistry
- ✅ Complete metadata for all agents
- ✅ TaskCapability union completeness
- ✅ AgentRouter mapping completeness
- ✅ MCP tool definitions
- ✅ ServerInitializer integration
- ✅ No orphaned types

---

**Last Updated:** 2026-01-03
**Version:** 1.0.0
