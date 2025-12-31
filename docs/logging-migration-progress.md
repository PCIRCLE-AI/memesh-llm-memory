# Logging Migration Progress

## Status: 0/616 console.* calls replaced (0 files completed)

**Infrastructure:** ✅ Complete (Winston logger + tests)
**Migration:** 🔄 In Progress

## High Priority Files (migrate first)
- [ ] src/orchestrator/AgentRouter.ts
- [ ] src/orchestrator/router.ts
- [ ] src/orchestrator/GlobalResourcePool.ts
- [ ] src/orchestrator/CostTracker.ts
- [ ] src/orchestrator/index.ts
- [ ] src/orchestrator/example.ts
- [ ] src/mcp/server.ts

## Medium Priority Files
- [ ] src/agents/DevOpsEngineerAgent.ts
- [ ] src/agents/knowledge/index.ts
- [ ] src/agents/knowledge/KnowledgeGraphSQLite.ts
- [ ] src/agents/N8nWorkflowAgent.ts
- [ ] src/agents/OpalAutomationAgent.ts
- [ ] src/agents/rag/index.ts
- [ ] src/agents/rag/vectorstore.ts
- [ ] src/agents/rag/embedding-provider.ts
- [ ] src/agents/rag/reranker.ts
- [ ] src/agents/WorkflowOrchestrator.ts

## Low Priority Files
- [ ] src/agents/rag/demo.ts
- [ ] src/agents/rag/FileWatcher.ts
- [ ] src/agents/rag/watch.ts
- [ ] src/config/simple-config.ts
- [ ] src/evolution/ContextMatcher.ts
- [ ] src/evolution/instrumentation/withEvolutionTracking.ts
- [ ] src/evolution/MultiObjectiveOptimizer.ts
- [ ] src/evolution/storage/migrations/MigrationManager.ts
- [ ] src/evolution/storage/SQLiteStore.enhanced.ts
- [ ] src/hooks/FriendlyGitCommands.ts
- [ ] src/hooks/GitAssistantHook.ts
- [ ] src/hooks/GitSetupWizard.ts
- [ ] src/knowledge-graph/index.ts
- [ ] src/memory/ProjectMemoryManager.ts
- [ ] src/planning/PlanningEngine.ts
- [ ] src/ui/index.ts
- [ ] src/utils/json.ts
- [ ] src/utils/lru-cache.ts
- [ ] src/utils/retry.ts
- [ ] src/utils/SystemResources.ts
- [ ] src/utils/toonify-adapter.ts

## Completed Files
(none yet)

## Migration Guidelines

### Import Pattern
```typescript
import { logger } from '../utils/logger.js';
```

### Replacement Patterns
```typescript
// Pattern 1: Simple message
console.log('message') → logger.info('message')

// Pattern 2: Message with data
console.log('message', data) → logger.info('message', { data })

// Pattern 3: Error logging
console.error('message', error) → logger.error('message', { error })

// Pattern 4: Warning
console.warn('message') → logger.warn('message')

// Pattern 5: Debug
console.debug('message') → logger.debug('message')
```

### Process
1. Open file
2. Add logger import at top
3. Replace console.* calls with logger.* (context-aware)
4. Run tests for that module
5. Commit: `refactor(filename): migrate console.log to structured logging`
6. Mark file as completed in this document
7. Update status count at top

### Testing After Migration
```bash
# Run all tests
npm test

# Run specific module tests
npm test -- path/to/file.test.ts
```

## Notes
- Total files to migrate: 38
- Total console.* calls: 616
- Migration script: `scripts/migrate-to-logger.sh`
- Created: 2026-01-01
- Target: Complete high priority files first, then medium, then low
