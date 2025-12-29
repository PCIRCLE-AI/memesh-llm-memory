# Contributing to Smart-Agents

Thank you for your interest in contributing to Smart-Agents! We welcome contributions from the community.

## 🚀 Getting Started

1. **Fork the Repository**
   ```bash
   git clone https://github.com/kevintseng/smart-agents.git
   cd smart-agents
   ```

2. **Install Dependencies**
   ```bash
   npm install
   npm run build
   ```

3. **Run Tests**
   ```bash
   npm test
   ```

## 📝 Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 2. Make Your Changes

- Write clear, concise commit messages
- Follow the existing code style
- Add tests for new features
- Update documentation as needed

### 3. Commit Your Changes

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```bash
git commit -m "feat: add new agent for X"
git commit -m "fix: resolve issue with Y"
git commit -m "docs: update README for Z"
```

**Commit Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Adding or updating tests
- `refactor`: Code refactoring
- `chore`: Maintenance tasks
- `ci`: CI/CD changes

### 4. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub with:
- Clear description of changes
- Reference to related issues (if applicable)
- Screenshots (for UI changes)

## 🧪 Testing Guidelines

- **Unit Tests**: All new code should have unit tests
- **Integration Tests**: Add integration tests for new agents
- **E2E Tests**: Use safe mode for E2E tests (`npm run test:e2e:safe`)

## 📖 Documentation

Please update documentation when:
- Adding new features
- Changing existing behavior
- Adding new configuration options
- Fixing bugs that affect documented behavior

## 🎯 Code Style

- Use TypeScript for all new code
- Follow existing formatting (run `npm run format`)
- Pass linting checks (`npm run lint`)
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

## 🐛 Reporting Bugs

When reporting bugs, please include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details (Node version, OS, etc.)
- Error messages and stack traces

## 💡 Feature Requests

We welcome feature requests! Please:
- Check existing issues first
- Provide clear use cases
- Explain why this feature would be valuable
- Suggest possible implementation approaches

## 📜 Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what's best for the community
- Help others learn and grow

## ✅ Pull Request Checklist

Before submitting a PR, ensure:
- [ ] Tests pass (`npm test`)
- [ ] Code is formatted (`npm run format`)
- [ ] Linting passes (`npm run lint`)
- [ ] Documentation is updated
- [ ] Commit messages follow conventions
- [ ] PR description is clear and complete

## 🙏 Questions?

- Check the [User Guide](./docs/USER_GUIDE.md)
- Search [existing issues](https://github.com/kevintseng/smart-agents/issues)
- Ask in [Discussions](https://github.com/kevintseng/smart-agents/discussions)

Thank you for contributing to Smart-Agents! 🎉
