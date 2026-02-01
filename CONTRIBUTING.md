# Contributing to Claude Code Buddy

Thank you for your interest in contributing to Claude Code Buddy! This document provides guidelines for contributing.

## Getting Started

### Prerequisites

- Node.js 20 or higher
- npm 9 or higher
- Git

### Setup

```bash
# Clone the repository
git clone https://github.com/PCIRCLE-AI/claude-code-buddy.git
cd claude-code-buddy

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

## Development Workflow

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test improvements

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Formatting
- `refactor` - Code refactoring
- `test` - Tests
- `chore` - Maintenance

Examples:
```
feat(mcp): add new buddy-analyze tool
fix(memory): resolve SQLite connection leak
docs(readme): update installation instructions
```

### Testing

```bash
# Run all tests (single-thread mode)
npm test

# Run with coverage
npm run test:coverage

# Run E2E tests (resource-intensive)
npm run test:e2e:safe

# Run integration tests
npm run test:integration
```

**Important**: Tests run in single-thread mode to prevent worker leaks.

### Code Quality

```bash
# Lint code
npm run lint

# Format code
npm run format

# Type check
npm run typecheck
```

## Pull Request Process

1. **Create a feature branch** from `main`
2. **Make your changes** following the coding standards
3. **Write/update tests** for your changes
4. **Run the full test suite** to ensure nothing is broken
5. **Update documentation** if needed
6. **Submit a PR** using the PR template

### PR Checklist

- [ ] Tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] TypeScript compiles (`npm run typecheck`)
- [ ] Installation test passes (`npm run test:install`)
- [ ] Documentation updated (if applicable)
- [ ] CHANGELOG.md updated (for user-facing changes)

## Project Structure

```
src/
├── mcp/           # MCP server and tools
├── a2a/           # A2A protocol implementation
├── memory/        # Memory system
├── knowledge-graph/ # Knowledge graph
├── agents/        # Expert agents
├── orchestrator/  # Task orchestration
├── core/          # Core functionality
└── evolution/     # Evolution system
```

## MCP Tool Development

When adding new MCP tools:

1. Define the tool in `src/mcp/ToolDefinitions.ts`
2. Create handler in `src/mcp/handlers/`
3. Add Zod schema in `src/mcp/schemas/`
4. Add tests in `tests/unit/mcp/`
5. Update documentation

### Tool Naming Convention

- Use `buddy-` prefix for user-facing tools
- Use `a2a-` prefix for A2A protocol tools

## Questions?

- Open a [Discussion](https://github.com/PCIRCLE-AI/claude-code-buddy/discussions)
- Check existing [Issues](https://github.com/PCIRCLE-AI/claude-code-buddy/issues)

## License

By contributing, you agree that your contributions will be licensed under the AGPL-3.0 License.
