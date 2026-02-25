# Contributing to MeMesh

Thank you for your interest in contributing to MeMesh! This document provides guidelines for contributing.

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

## Branch Strategy

**NEVER push directly to `main`.** All changes go through Pull Requests.

```
main        ← production-ready, protected, merge via PR only
develop     ← integration branch for ongoing work
feature/*   ← short-lived feature/fix branches off develop
```

## Pull Request Process

1. **Create a feature branch** from `develop` (not `main`)
2. **Make your changes** following the coding standards
3. **Write/update tests** for your changes
4. **Run the full test suite** to ensure nothing is broken
5. **Update documentation** if needed
6. **Submit a PR** to `develop` (or `main` for releases)

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

## Release Process

### For Maintainers

MeMesh uses a **branch-based release** workflow. All development happens on `develop` — **never push directly to `main`**.

1. **Prepare on `develop`**
   ```bash
   git checkout develop
   npm version patch --no-git-tag-version
   # Update CHANGELOG.md
   git add package.json CHANGELOG.md
   git commit -m "chore(release): bump version to X.Y.Z"
   git push origin develop
   ```

2. **Open PR: `develop` → `main`**
   ```bash
   gh pr create --base main --head develop \
     --title "chore(release): vX.Y.Z" \
     --body "Release X.Y.Z - see CHANGELOG.md"
   ```

3. **Review & Merge PR** — After merge, GitHub Actions auto-creates the git tag and GitHub Release.

4. **Manual npm Publish** — The auto-release workflow uses `GITHUB_TOKEN`, which cannot trigger the npm publish workflow. Publish manually:
   ```bash
   npm publish --access public
   npm view @pcircle/memesh version
   ```

See [docs/RELEASE_PROCESS.md](docs/RELEASE_PROCESS.md) for detailed instructions.

## Questions?

- Open a [Discussion](https://github.com/PCIRCLE-AI/claude-code-buddy/discussions)
- Check existing [Issues](https://github.com/PCIRCLE-AI/claude-code-buddy/issues)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
