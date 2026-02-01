## Description

<!-- Briefly describe what this PR does -->

## Type of Change

<!-- Mark with an [x] -->

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to change)
- [ ] Refactoring (code change that neither fixes a bug nor adds a feature)
- [ ] Documentation update
- [ ] Test improvement
- [ ] CI/CD changes

## Component Affected

<!-- Mark all that apply -->

- [ ] MCP Server (`src/mcp/`)
- [ ] A2A Protocol (`src/a2a/`)
- [ ] Memory System (`src/memory/`, `src/knowledge-graph/`)
- [ ] Agents (`src/agents/`)
- [ ] Orchestrator (`src/orchestrator/`)
- [ ] Core (`src/core/`)
- [ ] Evolution System (`src/evolution/`)

## Checklist

<!-- Mark completed items with [x] -->

### Code Quality
- [ ] Code follows the project's coding style (ESLint + Prettier)
- [ ] TypeScript strict mode passes (`npm run typecheck`)
- [ ] No new `any` types introduced (or documented exceptions)

### Testing
- [ ] All existing tests pass (`npm test`)
- [ ] New tests added for new functionality
- [ ] E2E tests pass if A2A/MCP components changed (`npm run test:e2e:safe`)

### npm Package Specific
- [ ] Installation test passes (`npm run test:install`)
- [ ] No new runtime dependencies added (or justified)
- [ ] Changes are backward compatible (or version bump planned)

### Documentation
- [ ] CHANGELOG.md updated (for user-facing changes)
- [ ] README.md updated (if needed)
- [ ] Code comments added for complex logic

### MCP Compliance
- [ ] MCP tool definitions follow spec
- [ ] Tool annotations are accurate
- [ ] Resource URIs follow conventions

## Testing Done

<!-- Describe testing performed -->

```bash
# Commands run to verify changes
npm run lint
npm run typecheck
npm test
npm run test:install
```

## Breaking Changes

<!-- If this is a breaking change, describe migration path -->

N/A

## Related Issues

<!-- Link related issues: Fixes #123, Relates to #456 -->

