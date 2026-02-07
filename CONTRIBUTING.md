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

MeMesh uses an automated release process triggered by GitHub Releases:

1. **Update Version**
   ```bash
   # Bump version (patch/minor/major)
   npm version patch --no-git-tag-version
   ```

2. **Update CHANGELOG.md**
   - Add entry for the new version
   - Document all user-facing changes
   - Follow [Keep a Changelog](https://keepachangelog.com/) format

3. **Commit and Push**
   ```bash
   git add package.json CHANGELOG.md
   git commit -m "chore(release): bump version to X.Y.Z"
   git push origin main
   ```

4. **Create GitHub Release**
   ```bash
   # Create release (triggers automated npm publish)
   gh release create vX.Y.Z \
     --title "vX.Y.Z - Release Title" \
     --notes "Release notes..."
   ```

5. **Automated Publishing**
   - GitHub Actions workflow automatically:
     - Builds the project
     - Runs tests
     - Publishes to npm registry
     - Logs success

6. **Verify**
   ```bash
   # Check npm package
   npm view @pcircle/memesh version

   # Verify workflow
   gh run list --workflow=publish-npm.yml --limit 1
   ```

### GitHub Actions Workflow

The `.github/workflows/publish-npm.yml` workflow:
- **Trigger**: On GitHub release publication
- **Steps**: Checkout → Build → Test → Publish → Log
- **Provenance**: Publishes with npm provenance
- **Access**: Public package with NPM_TOKEN authentication

See [docs/RELEASE_PROCESS.md](docs/RELEASE_PROCESS.md) for detailed instructions.

## Questions?

- Open a [Discussion](https://github.com/PCIRCLE-AI/claude-code-buddy/discussions)
- Check existing [Issues](https://github.com/PCIRCLE-AI/claude-code-buddy/issues)

## License

By contributing, you agree that your contributions will be licensed under the AGPL-3.0 License.
