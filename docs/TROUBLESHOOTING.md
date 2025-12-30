# Troubleshooting Guide

**Version**: 2.2.0
**Last Updated**: 2025-12-31

This guide helps you diagnose and resolve common issues with Smart Agents.

---

## Table of Contents

1. [General Issues](#general-issues)
2. [Agent-Specific Issues](#agent-specific-issues)
3. [MCP Server Issues](#mcp-server-issues)
4. [Performance Issues](#performance-issues)
5. [Integration Issues](#integration-issues)
6. [Getting Help](#getting-help)

---

## General Issues

### Issue: MCP Server Not Responding

**Symptoms**:
- Claude Code cannot communicate with smart-agents
- MCP tools are unavailable
- Error: "MCP server not found"

**Solutions**:

1. **Check if server is configured**:
```bash
# Check Claude Code config
cat ~/.claude/config.json | grep smart-agents
```

2. **Verify installation**:
```bash
cd /path/to/smart-agents
npm run build
node dist/mcp/server.js --version
```

3. **Check server logs**:
```bash
cat ~/.claude/logs/smart-agents.log
```

4. **Restart Claude Code**:
```bash
# Close Claude Code completely
# Reopen Claude Code
```

5. **Verify Node.js version**:
```bash
node --version  # Should be >= 18.0.0
```

---

### Issue: Module Not Found Errors

**Symptoms**:
- Error: "Cannot find module 'X'"
- Import errors in TypeScript
- Build fails

**Solutions**:

1. **Reinstall dependencies**:
```bash
cd /path/to/smart-agents
rm -rf node_modules package-lock.json
npm install
```

2. **Rebuild the project**:
```bash
npm run build
```

3. **Check Node.js/npm versions**:
```bash
node --version  # >= 18.0.0
npm --version   # >= 9.0.0
```

4. **Verify package.json integrity**:
```bash
npm audit
npm audit fix
```

---

### Issue: TypeScript Compilation Errors

**Symptoms**:
- Build fails with TypeScript errors
- Type errors in IDE
- `npm run build` fails

**Solutions**:

1. **Check TypeScript version**:
```bash
npx tsc --version  # Should match package.json
```

2. **Clean and rebuild**:
```bash
rm -rf dist
npm run build
```

3. **Verify tsconfig.json**:
```bash
cat tsconfig.json
# Ensure compilerOptions.target is ES2020 or later
```

4. **Check for conflicting types**:
```bash
rm -rf node_modules/@types
npm install
```

---

## Agent-Specific Issues

### TestWriterAgent Issues

#### Issue 1: No Tests Generated

**Symptoms**:
- TestWriterAgent runs but creates empty test file
- No functions detected in source code

**Solutions**:

1. **Verify source file has exported functions**:
```typescript
// ✅ Good: Exported function
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ❌ Bad: Not exported
function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
```

2. **Check file path**:
```bash
# Verify source file exists
ls -la src/utils/validation.ts
```

3. **Verify filesystem MCP tools available**:
```typescript
// In Claude Code
"List available MCP tools"
// Check for: filesystem, write_file, read_file
```

4. **Try with simple test file**:
```typescript
// Create simple test file
export function add(a: number, b: number): number {
  return a + b;
}

// Then use test-writer agent
```

---

#### Issue 2: Generated Tests Don't Match Code Structure

**Symptoms**:
- Tests reference wrong imports
- Function names don't match
- Test paths incorrect

**Solutions**:

1. **Verify source code syntax**:
```bash
# Check for syntax errors
npx tsc --noEmit src/utils/validation.ts
```

2. **Manual test file path verification**:
```bash
# Source: src/utils/validation.ts
# Expected test: tests/utils/validation.test.ts

# Verify directories exist
mkdir -p tests/utils
```

3. **Check for special characters in file paths**:
```bash
# ❌ Bad: Spaces or special chars
src/my utils/validation.ts

# ✅ Good: Kebab-case or camelCase
src/my-utils/validation.ts
```

---

### DevOpsEngineerAgent Issues

#### Issue 1: CI Setup Fails

**Symptoms**:
- DevOps agent runs but no CI config created
- Permission denied errors
- CI config file already exists

**Solutions**:

1. **Check write permissions**:
```bash
# For GitHub Actions
ls -la .github/workflows/
mkdir -p .github/workflows

# For GitLab CI
touch .gitlab-ci.yml  # Test write permission
```

2. **Verify existing CI config**:
```bash
# GitHub Actions
ls .github/workflows/

# GitLab CI
ls .gitlab-ci.yml

# If exists, remove or rename
mv .github/workflows/ci.yml .github/workflows/ci.yml.backup
```

3. **Check bash MCP tools available**:
```typescript
// In Claude Code
"List available MCP tools"
// Check for: bash, execute_command
```

---

#### Issue 2: Deployment Analysis Incorrect

**Symptoms**:
- Deployment analysis shows wrong status
- Tests passing but analysis says failing
- Build successful but analysis says failed

**Solutions**:

**NOTE**: Current version uses mocked checks. Real integration planned for future release.

1. **Manual verification**:
```bash
# Verify tests actually pass
npm test

# Verify build succeeds
npm run build

# Check git status
git status
```

2. **Check for test framework issues**:
```bash
# Ensure test command works
npm test -- --run

# Check exit code
echo $?  # Should be 0 for success
```

---

### RAGAgent Issues

#### Issue 1: RAG Agent Not Available

**Symptoms**:
- RAG agent not listed in available agents
- Error: "RAG features require OpenAI API key"

**Solutions**:

1. **Set OpenAI API key**:
```bash
# Option 1: Environment variable
export OPENAI_API_KEY="sk-..."

# Option 2: .env file
echo "OPENAI_API_KEY=sk-..." >> .env

# Option 3: Claude Code config
# Edit ~/.claude/config.json:
{
  "mcpServers": {
    "smart-agents": {
      "env": {
        "OPENAI_API_KEY": "sk-..."
      }
    }
  }
}
```

2. **Verify API key is valid**:
```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

3. **Check RAG agent is optional**:
```bash
# RAG is optional feature - system works without it
# Other agents remain available
```

---

#### Issue 2: Slow Indexing or Search

**Symptoms**:
- Document indexing takes too long
- Search queries time out
- High memory usage

**Solutions**:

1. **Reduce document size**:
```typescript
// Split large documents into chunks
const chunks = splitIntoChunks(largeDocument, 1000); // 1000 chars per chunk
for (const chunk of chunks) {
  await ragAgent.indexDocument({ content: chunk, metadata: {...} });
}
```

2. **Use batch indexing**:
```typescript
// Index multiple documents in batch
await Promise.all(
  documents.map(doc => ragAgent.indexDocument(doc))
);
```

3. **Adjust search parameters**:
```typescript
// Reduce topK for faster search
const results = await ragAgent.search(query, {
  topK: 3,  // Instead of default 5
  threshold: 0.8  // Higher threshold = fewer results
});
```

---

### DevelopmentButlerAgent Issues

#### Issue 1: Butler Not Triggering

**Symptoms**:
- No automatic recommendations
- Checkpoints not detected
- Butler seems inactive

**Solutions**:

1. **Verify Development Butler is enabled**:
```bash
# Check MCP tools
# Look for: get-workflow-guidance, detect-checkpoint
```

2. **Manually trigger checkpoint detection**:
```typescript
// In Claude Code
"Detect current workflow checkpoint"
"What does the development butler recommend?"
```

3. **Check git status**:
```bash
# Butler depends on git status
git status

# Ensure you're in a git repository
git rev-parse --is-inside-work-tree
```

4. **Verify hooks integration**:
```bash
# Check if hooks are installed
ls -la .git/hooks/
```

---

## MCP Server Issues

### Issue: MCP Tools Unavailable

**Symptoms**:
- Specific MCP tools missing
- Error: "Tool X not found"
- Agents cannot perform actions

**Solutions**:

1. **List available MCP tools**:
```typescript
// In Claude Code
"List all available MCP tools"
```

2. **Restart MCP server**:
```bash
# Kill existing server process
ps aux | grep smart-agents
kill <PID>

# Restart via Claude Code
# (Close and reopen Claude Code)
```

3. **Check MCP server configuration**:
```bash
cat ~/.claude/config.json
```

4. **Verify required tools**:
```typescript
// Required MCP tools for Smart Agents:
- filesystem (read, write, list)
- memory (knowledge graph operations)
- bash (command execution)
```

---

### Issue: MCP Server Crashes

**Symptoms**:
- Server suddenly stops responding
- Claude Code loses connection
- MCP server process terminates

**Solutions**:

1. **Check error logs**:
```bash
cat ~/.claude/logs/smart-agents.log
tail -100 ~/.claude/logs/smart-agents.log
```

2. **Look for common crash causes**:
- Out of memory
- Unhandled exceptions
- File system errors

3. **Restart with verbose logging**:
```bash
# In server.ts, enable debug mode
DEBUG=* node dist/mcp/server.js
```

4. **Report crash with stack trace**:
```bash
# Capture full error
node dist/mcp/server.js 2>&1 | tee error.log
```

---

## Performance Issues

### Issue: Slow Agent Response Times

**Symptoms**:
- Agents take too long to respond
- UI freezes during agent operations
- Timeout errors

**Solutions**:

1. **Check system resources**:
```bash
# CPU usage
top -l 1 | grep "CPU usage"

# Memory usage
vm_stat

# Disk space
df -h
```

2. **Reduce concurrent agent operations**:
```typescript
// ❌ Bad: Too many parallel agents
Promise.all([
  agent1.execute(),
  agent2.execute(),
  agent3.execute(),
  agent4.execute()
]);

// ✅ Good: Sequential execution
await agent1.execute();
await agent2.execute();
```

3. **Clear evolution database**:
```bash
# Evolution database can grow large
rm ~/.claude/evolution.db
# Database will be recreated automatically
```

4. **Optimize Knowledge Graph**:
```bash
# Check Knowledge Graph size
ls -lh ~/.claude/knowledge-graph/

# Clear if needed (backup first!)
cp -r ~/.claude/knowledge-graph/ ~/knowledge-graph-backup/
rm -rf ~/.claude/knowledge-graph/*
```

---

### Issue: High Memory Usage

**Symptoms**:
- Smart Agents consumes excessive memory
- System slows down
- Out of memory errors

**Solutions**:

1. **Monitor memory usage**:
```bash
# macOS
ps aux | grep "smart-agents"

# Check total memory
top -l 1 | grep PhysMem
```

2. **Reduce vector database size**:
```bash
# For RAG Agent
ls -lh ~/.claude/rag-vectors/

# Clear old vectors
rm -rf ~/.claude/rag-vectors/old-*
```

3. **Limit concurrent operations**:
```typescript
// Use queue for agent operations
const queue = new PQueue({ concurrency: 2 });
await queue.add(() => agent.execute());
```

4. **Restart MCP server periodically**:
```bash
# If running for extended periods
# Close and reopen Claude Code
```

---

## Integration Issues

### Issue: Tests Not Found After Generation

**Symptoms**:
- TestWriterAgent generates tests
- Test files not detected by test runner
- vitest doesn't find tests

**Solutions**:

1. **Verify test file location**:
```bash
# Default: tests/
ls -la tests/**/*.test.ts

# Alternative: src/__tests__/
ls -la src/__tests__/**/*.test.ts
```

2. **Check vitest configuration**:
```typescript
// vitest.config.ts
export default {
  test: {
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts']
  }
};
```

3. **Run tests with pattern**:
```bash
# Specific file
npx vitest run tests/utils/validation.test.ts

# All tests
npx vitest run
```

---

### Issue: CI Pipeline Fails After Setup

**Symptoms**:
- DevOpsEngineerAgent setup succeeds
- CI pipeline fails on first run
- Build or test errors in CI

**Solutions**:

1. **Verify CI environment**:
```yaml
# Check Node.js version in CI
- name: Setup Node.js
  uses: actions/setup-node@v3
  with:
    node-version: '18'  # Must match local version
```

2. **Check for environment-specific issues**:
```bash
# Test build in clean environment
docker run -v $(pwd):/app node:18 bash -c "cd /app && npm ci && npm test && npm run build"
```

3. **Review CI logs**:
```bash
# GitHub Actions
# Go to Actions tab → Select workflow → View logs

# GitLab CI
# Go to CI/CD → Pipelines → Select pipeline → View jobs
```

4. **Common CI failures**:
- Missing environment variables
- Different Node.js versions
- Platform-specific dependencies
- Missing build scripts

---

## Getting Help

### Check Documentation

1. **User Guide**: [USER_GUIDE.md](./USER_GUIDE.md)
2. **Agent Reference**: [AGENT_REFERENCE.md](./AGENT_REFERENCE.md)
3. **Architecture**: [docs/architecture/OVERVIEW.md](./architecture/OVERVIEW.md)

### Search Existing Issues

1. **GitHub Issues**: https://github.com/kevintseng/smart-agents/issues
2. **Search by error message or symptom**
3. **Check closed issues for solutions**

### Report a Bug

**Before reporting, collect**:
- Smart Agents version (`cat package.json | grep version`)
- Node.js version (`node --version`)
- Operating system
- Error messages and stack traces
- Steps to reproduce
- Relevant log files

**Create issue at**: https://github.com/kevintseng/smart-agents/issues/new

**Include**:
```markdown
## Bug Report

**Version**: 2.2.0
**Node.js**: 18.x.x
**OS**: macOS 14.x / Windows 11 / Ubuntu 22.04

**Describe the bug**
[Clear description of the issue]

**Steps to reproduce**
1. [First step]
2. [Second step]
3. [See error]

**Expected behavior**
[What should happen]

**Actual behavior**
[What actually happens]

**Error messages**
```
[Paste error messages and stack traces]
```

**Logs**
```
[Paste relevant logs from ~/.claude/logs/smart-agents.log]
```
```

### Community Support

1. **GitHub Discussions**: https://github.com/kevintseng/smart-agents/discussions
2. **Ask questions and share solutions**
3. **Connect with other users**

---

## Diagnostic Commands

**Quick diagnostic checklist**:
```bash
# System info
node --version
npm --version
pwd

# Smart Agents status
cd /path/to/smart-agents
npm run build
ls dist/mcp/server.js

# MCP configuration
cat ~/.claude/config.json | grep -A 10 smart-agents

# Logs
tail -50 ~/.claude/logs/smart-agents.log

# Test suite
npm test

# Database status
ls -lh ~/.claude/evolution.db
ls -lh ~/.claude/knowledge-graph/

# Git status
git status
git log --oneline -5
```

---

## Common Error Messages

### "File has not been read yet"

**Cause**: Write tool requires reading file first  
**Solution**: Read file before writing, or use filesystem MCP tool

### "Module not found"

**Cause**: Missing dependencies or incorrect import path  
**Solution**: `npm install` or fix import path

### "Permission denied"

**Cause**: Insufficient file system permissions  
**Solution**: Check file/directory permissions, use `chmod` if needed

### "API key not found"

**Cause**: OpenAI API key not set (RAG features)  
**Solution**: Set `OPENAI_API_KEY` environment variable

### "MCP server not responding"

**Cause**: Server crashed or not started  
**Solution**: Restart Claude Code, check logs, rebuild project

---

## FAQ

**Q: Do I need an OpenAI API key?**  
A: Only if you want to use RAG features. All other agents work without it.

**Q: How do I update Smart Agents?**  
A: `git pull origin main && npm install && npm run build`

**Q: Can I customize agent behavior?**  
A: Yes, see [Configuration section](./USER_GUIDE.md#configuration) in User Guide.

**Q: Why are some tests skipped?**  
A: Tests requiring external services may be skipped. Check test file comments.

**Q: How do I clear the knowledge graph?**  
A: Delete `~/.claude/knowledge-graph/` (backup first!)

**Q: What's the difference between Test Writer and manual testing?**  
A: Test Writer automates basic test generation. Manual testing needed for complex scenarios.

---

**Still need help?** Open an issue: https://github.com/kevintseng/smart-agents/issues
