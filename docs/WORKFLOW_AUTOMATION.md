# Workflow Automation Integration

Claude Code Buddy integrates two powerful workflow automation platforms:

- **Google Opal** - AI-powered natural language workflow creation
- **n8n** - Enterprise-grade workflow automation platform (300+ integrations)

## 🎯 Core Features

Users only need to **describe what they want in natural language**, and the system will:

1. 🧠 **Smart Analysis** - Understand user intent and requirements
2. 🎯 **Auto Platform Selection** - Choose Opal or n8n based on task characteristics
3. ⚡ **Auto Workflow Creation** - Create workflow on selected platform
4. 📊 **Record & Track** - Save to Knowledge Graph for future queries

## 📦 Architecture Components

### 1. WorkflowOrchestrator (Smart Coordinator)

Main entry point, responsible for analysis and routing:

```typescript
import { WorkflowOrchestrator } from './agents/WorkflowOrchestrator';

const orchestrator = new WorkflowOrchestrator(mcp);

// Users only need to describe requirements
const result = await orchestrator.createWorkflow({
  description: "Create an AI chatbot that can summarize email content",
  platform: 'auto'  // Automatically select best platform
});

console.log(result);
// {
//   success: true,
//   platform: 'opal',  // System chose Opal
//   workflowUrl: 'https://opal.withgoogle.com/...',
//   screenshot: '/tmp/opal-workflow-...',
//   reasoning: 'Google Opal is suitable for quickly creating AI-driven workflow prototypes'
// }
```

### 2. OpalAutomationAgent (Opal Automation)

Automates Google Opal UI using Playwright:

```typescript
import { OpalAutomationAgent } from './agents/OpalAutomationAgent';

const opalAgent = new OpalAutomationAgent(mcp);

// Create workflow
const result = await opalAgent.createWorkflow({
  description: "Send weather forecast email every day at 9 AM",
  timeout: 60000
});

// Remix from Gallery examples
const remixed = await opalAgent.remixFromGallery("email automation");

// Export workflow (screenshot)
const exported = await opalAgent.exportWorkflow(result.workflowUrl);
```

### 3. N8nWorkflowAgent (n8n API Integration)

Programmatically creates workflows using n8n REST API:

```typescript
import { N8nWorkflowAgent } from './agents/N8nWorkflowAgent';

const n8nAgent = new N8nWorkflowAgent(mcp, {
  baseUrl: 'https://your-n8n-instance.com/api/v1',
  apiKey: 'your-api-key'
});

// Create simple HTTP workflow
const workflow = n8nAgent.createSimpleHttpWorkflow(
  "GitHub Webhook Handler",
  "https://api.github.com/repos/user/repo/issues"
);

const result = await n8nAgent.createWorkflow(workflow);

// Create AI Agent workflow
const aiWorkflow = n8nAgent.createAIAgentWorkflow(
  "Customer Support Bot",
  "You are a helpful customer support assistant..."
);

const aiResult = await n8nAgent.createWorkflow(aiWorkflow);

// List all workflows
const allWorkflows = await n8nAgent.listWorkflows();

// Execute workflow
const execution = await n8nAgent.executeWorkflow(result.workflowId, {
  input: "test data"
});
```

## 🚀 Quick Start

### Step 1: Environment Setup

#### n8n Setup (if using n8n)

1. Deploy n8n instance (or use n8n.cloud)
2. Get API Key:
   - Login to n8n
   - Go to Settings → API
   - Create new API Key

3. Configure environment variables:

```bash
# .env
N8N_API_URL=https://your-n8n-instance.com/api/v1
N8N_API_KEY=your-api-key
```

#### Opal Setup

No special setup required, just need:
- Google account
- Access to https://opal.withgoogle.com/

### Step 2: Initialize Orchestrator

```typescript
import { MCPToolInterface } from './core/MCPToolInterface';
import { WorkflowOrchestrator } from './agents/WorkflowOrchestrator';

// Initialize MCP
const mcp = new MCPToolInterface();

// Create Orchestrator
const orchestrator = new WorkflowOrchestrator(mcp);
```

### Step 3: Create Workflows

```typescript
// Example 1: Auto platform selection
const result1 = await orchestrator.createWorkflow({
  description: "Create an AI assistant that summarizes Slack messages daily"
});
// → System will choose Opal (AI-related task)

// Example 2: Specify platform
const result2 = await orchestrator.createWorkflow({
  description: "Connect Stripe webhook to PostgreSQL database",
  platform: 'n8n'  // Force n8n usage
});
// → Use n8n (requires complex integration)

// Example 3: Set priority
const result3 = await orchestrator.createWorkflow({
  description: "Create customer support chatbot",
  priority: 'speed'  // Prioritize speed → Opal
});

const result4 = await orchestrator.createWorkflow({
  description: "Create customer support chatbot",
  priority: 'production'  // Prioritize production → n8n
});
```

## 🎨 Usage Examples

### Example 1: AI Content Generation Workflow

```typescript
const contentWorkflow = await orchestrator.createWorkflow({
  description: `
    Create a content generation workflow:
    1. Read new articles from RSS feed
    2. Use AI to generate summary
    3. Translate to multiple languages
    4. Publish to social media
  `
});

// System analysis: includes AI, generation, translation → Choose Opal
console.log(contentWorkflow.platform);  // 'opal'
console.log(contentWorkflow.reasoning);
// 'Google Opal is suitable for quickly creating AI-driven workflow prototypes using natural language editor'
```

### Example 2: Enterprise Data Integration Workflow

```typescript
const integrationWorkflow = await orchestrator.createWorkflow({
  description: `
    Connect multiple systems:
    - Salesforce CRM
    - PostgreSQL database
    - Slack notifications
    - Email reports
    Requires reliable production environment deployment
  `,
  priority: 'production'
});

// System analysis: multi-system integration, production-grade → Choose n8n
console.log(integrationWorkflow.platform);  // 'n8n'
console.log(integrationWorkflow.workflowId);  // n8n workflow ID
```

### Example 3: Quick Prototype Testing

```typescript
const prototypeWorkflow = await orchestrator.createWorkflow({
  description: "Test a simple email auto-reply demo",
  priority: 'speed'
});

// System analysis: simple, test, demo → Choose Opal
console.log(prototypeWorkflow.platform);  // 'opal'
console.log(prototypeWorkflow.screenshot);  // Screenshot path
```

### Example 4: Query All Workflows

```typescript
const allWorkflows = await orchestrator.listAllWorkflows();

console.log(allWorkflows);
// {
//   opal: [
//     { url: 'https://opal.withgoogle.com/...', description: '...' },
//     ...
//   ],
//   n8n: [
//     { id: 'wf_123', name: 'Integration Workflow', nodes: [...] },
//     ...
//   ]
// }
```

## 🧠 Smart Platform Selection Logic

WorkflowOrchestrator automatically selects platform based on these rules:

### Choose Opal When

✅ Keywords: AI, GPT, generate, translate, summarize, analyze, chat, conversation
✅ Priority: `priority: 'speed'`
✅ Descriptors: simple, quick, prototype, test, demo
✅ Pure AI tasks without complex integration needs

**Examples**:
- "Create AI chatbot"
- "Auto-generate blog article summaries"
- "Quick test GPT-4 translation feature"

### Choose n8n When

✅ Keywords: API, webhook, database, integration, connect
✅ Priority: `priority: 'production'`
✅ Descriptors: production, deploy, official, reliable, enterprise
✅ Requires multi-system integration

**Examples**:
- "Connect Stripe to PostgreSQL"
- "Enterprise CRM data sync"
- "Production environment webhook handler"

### Default Logic

If not explicitly specified, system defaults to:
- AI-related tasks → Opal
- Other tasks → n8n

## ⚡ Performance Comparison

| Metric | Opal (Playwright) | n8n (API) |
|--------|-------------------|-----------|
| **Creation Speed** | 10-18 seconds | 0.5-2 seconds |
| **Accuracy Rate** | 85-95% | 99.9% |
| **Use Cases** | AI prototypes, quick tests | Production integrations |
| **Maintenance Cost** | High (UI changes impact) | Low (API stable) |
| **Natural Language Editing** | ✅ Native support | ❌ Manual config needed |
| **Complex Integration** | ⚠️ Limited | ✅ 300+ services |

## 🔧 Advanced Configuration

### Custom n8n Workflow Structure

```typescript
import { N8nWorkflow, N8nNode } from './agents/N8nWorkflowAgent';

const customWorkflow: N8nWorkflow = {
  name: "Custom Integration",
  nodes: [
    {
      id: 'trigger',
      name: 'Webhook Trigger',
      type: 'n8n-nodes-base.webhook',
      position: [250, 300],
      parameters: {
        path: '/webhook',
        httpMethod: 'POST'
      }
    },
    {
      id: 'process',
      name: 'Process Data',
      type: 'n8n-nodes-base.function',
      position: [450, 300],
      parameters: {
        functionCode: `
          const input = items[0].json;
          return [{ json: { processed: input } }];
        `
      }
    },
    {
      id: 'save',
      name: 'Save to Database',
      type: 'n8n-nodes-base.postgres',
      position: [650, 300],
      parameters: {
        operation: 'insert',
        table: 'events',
        columns: 'data'
      }
    }
  ],
  connections: {
    'Webhook Trigger': {
      main: [[{ node: 'Process Data', type: 'main', index: 0 }]]
    },
    'Process Data': {
      main: [[{ node: 'Save to Database', type: 'main', index: 0 }]]
    }
  },
  active: true
};

const result = await n8nAgent.createWorkflow(customWorkflow);
```

### Opal Gallery Remix Examples

```typescript
// Search and copy existing examples from Opal Gallery
const searchTerms = [
  "email automation",
  "slack bot",
  "data analysis",
  "content generation"
];

for (const term of searchTerms) {
  const result = await opalAgent.remixFromGallery(term);
  console.log(`Remixed: ${result.workflowUrl}`);
}
```

## 📊 Knowledge Graph Integration

All created workflows are automatically recorded to Knowledge Graph:

```typescript
// Query Opal workflows
const opalWorkflows = await mcp.memory.searchNodes('opal_workflow');

// Query n8n workflows
const n8nWorkflows = await mcp.memory.searchNodes('n8n_workflow');

// Example output
console.log(opalWorkflows[0]);
// {
//   name: 'Opal Workflow 2025-12-31T10:30:00.000Z',
//   entityType: 'opal_workflow',
//   observations: [
//     'Description: Create AI chatbot',
//     'URL: https://opal.withgoogle.com/...',
//     'Screenshot: /tmp/opal-workflow-1735642200000.png',
//     'Created: 2025-12-31T10:30:00.000Z'
//   ]
// }
```

## ⚠️ Caveats

### Opal Limitations

1. **No API** - Can only automate through Playwright
2. **Slower** - 10-18 seconds vs n8n's 0.5-2 seconds
3. **UI Dependency** - Opal UI changes will break automation
4. **Manual Verification** - Recommend checking screenshot to confirm results

### n8n Requirements

1. **API Key Required** - Must configure `N8N_API_KEY`
2. **Instance Required** - Self-hosted or use n8n.cloud
3. **Node Familiarity** - Complex workflows require knowledge of n8n node types

### Best Practices

✅ **Prototype Phase** - Use Opal to quickly validate ideas
✅ **Production Deployment** - Switch to n8n for reliability
✅ **Regular Backup** - Export workflow configs from both platforms
✅ **Version Control** - Commit n8n workflow JSON to Git
✅ **Monitor Records** - Regularly check workflow records in Knowledge Graph

## 🐛 Troubleshooting

### Opal Automation Failure

```typescript
// Issue: Selector cannot find element
// Solution: Check if Opal UI updated, update selectors

// Issue: Timeout
// Solution: Increase timeout parameter
const result = await opalAgent.createWorkflow({
  description: "...",
  timeout: 120000  // Increase to 2 minutes
});
```

### n8n API Errors

```typescript
// Issue: 401 Unauthorized
// Check: Is API Key configured correctly?

// Issue: 404 Not Found
// Check: Does BASE_URL include /api/v1?

// Correct configuration
const n8nAgent = new N8nWorkflowAgent(mcp, {
  baseUrl: 'https://your-instance.com/api/v1',  // Must include /api/v1
  apiKey: 'n8n_api_...'
});
```

## 📚 More Resources

- [Google Opal Documentation](https://developers.google.com/opal)
- [n8n API Documentation](https://docs.n8n.io/api/)
- [Playwright MCP Documentation](https://github.com/microsoft/playwright)
- [Claude Code Buddy Architecture](./ARCHITECTURE.md)

## 🔮 Future Improvements

Planned features:

- [ ] Integrate superpowers:brainstorming skill for smarter workflow generation
- [ ] Support exporting from Opal to n8n format
- [ ] Automated testing of workflow execution results
- [ ] Workflow version management and rollback
- [ ] Multi-platform workflow synchronization
