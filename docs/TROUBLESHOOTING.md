# Troubleshooting Guide

**Version**: 2.2.0
**Last Updated**: 2025-12-31

This guide helps you diagnose and resolve common issues with Claude Code Buddy.

---

## Table of Contents

1. [General Issues](#general-issues)
2. [Capability-Specific Issues](#capability-specific-issues)
3. [MCP Server Issues](#mcp-server-issues)
4. [Performance Issues](#performance-issues)
5. [Integration Issues](#integration-issues)
6. [Getting Help](#getting-help)

---

## General Issues

### Issue: MCP Server Not Responding

**Symptoms**:
- Claude Code cannot communicate with claude-code-buddy
- MCP tools are unavailable
- Error: "MCP server not found"

**Solutions**:

1. **Check if server is configured**:
```bash
# Check Claude Code config
cat ~/.claude.json | grep claude-code-buddy
```

2. **Verify installation**:
```bash
cd /path/to/claude-code-buddy
npm run build
node dist/mcp/server.js --version
```

3. **Check server logs**:
```bash
cat ~/.claude/logs/claude-code-buddy.log
```

4. **Restart Claude Code**:
```bash
# Close Claude Code completely
# Reopen Claude Code
```

5. **Verify Node.js version**:
```bash
node --version  # Should be >= 20.0.0
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
cd /path/to/claude-code-buddy
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

## Capability-Specific Issues

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

// Then use testing capability
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
ps aux | grep claude-code-buddy
kill <PID>

# Restart via Claude Code
# (Close and reopen Claude Code)
```

3. **Check MCP server configuration**:
```bash
cat ~/.claude.json
```

4. **Verify required tools**:
```typescript
// Required MCP tools for Claude Code Buddy:
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
cat ~/.claude/logs/claude-code-buddy.log
tail -100 ~/.claude/logs/claude-code-buddy.log
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
- UI freezes during capability operations
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

2. **Reduce concurrent capability operations**:
```typescript
// ❌ Bad: Too many parallel tasks
Promise.all([
  task1.run(),
  task2.run(),
  task3.run(),
  task4.run()
]);

// ✅ Good: Sequential execution
await task1.run();
await task2.run();
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
- Claude Code Buddy consumes excessive memory
- System slows down
- Out of memory errors

**Solutions**:

1. **Monitor memory usage**:
```bash
# macOS
ps aux | grep "claude-code-buddy"

# Check total memory
top -l 1 | grep PhysMem
```

2. **Limit concurrent operations**:
```typescript
// Use queue for capability operations
const queue = new PQueue({ concurrency: 2 });
await queue.add(() => task.run());
```

3. **Restart MCP server periodically**:
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
- Setup succeeds
- CI pipeline fails on first run
- Build or test errors in CI

**Solutions**:

1. **Verify CI environment**:
```yaml
# Check Node.js version in CI
- name: Setup Node.js
  uses: actions/setup-node@v3
  with:
    node-version: '20'  # Must match local version
```

2. **Check for environment-specific issues**:
```bash
# Test build in clean environment
docker run -v $(pwd):/app node:20 bash -c "cd /app && npm ci && npm test && npm run build"
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

1. **GitHub Issues**: https://github.com/PCIRCLE-AI/claude-code-buddy/issues
2. **Search by error message or symptom**
3. **Check closed issues for solutions**

### Report a Bug

**Before reporting, collect**:
- Claude Code Buddy version (`cat package.json | grep version`)
- Node.js version (`node --version`)
- Operating system
- Error messages and stack traces
- Steps to reproduce
- Relevant log files

**Create issue at**: https://github.com/PCIRCLE-AI/claude-code-buddy/issues/new

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
[Paste relevant logs from ~/.claude/logs/claude-code-buddy.log]
```
```

### Community Support

1. **GitHub Discussions**: https://github.com/PCIRCLE-AI/claude-code-buddy/discussions
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

# Claude Code Buddy status
cd /path/to/claude-code-buddy
npm run build
ls dist/mcp/server.js

# MCP configuration
cat ~/.claude.json | grep -A 10 claude-code-buddy

# Logs
tail -50 ~/.claude/logs/claude-code-buddy.log

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

**Cause**: Anthropic API key not set in standalone mode  
**Solution**: Set `ANTHROPIC_API_KEY` or enable `MCP_SERVER_MODE=true`

### "MCP server not responding"

**Cause**: Server crashed or not started  
**Solution**: Restart Claude Code, check logs, rebuild project

---

## FAQ

**Q: Do I need an API key?**  
A: Only for standalone orchestrator usage. MCP Server Mode uses Claude Code's access.

**Q: How do I update Claude Code Buddy?**  
A: `git pull origin main && npm install && npm run build`

**Q: Can I customize capability behavior?**  
A: Yes, see [Configuration section](./USER_GUIDE.md#configuration) in User Guide.

**Q: Why are some tests skipped?**  
A: Tests requiring external services may be skipped. Check test file comments.

**Q: How do I clear the knowledge graph?**  
A: Delete `~/.claude/knowledge-graph/` (backup first!)

**Q: What's the difference between Test Writer and manual testing?**  
A: Test Writer automates basic test generation. Manual testing needed for complex scenarios.

---

**Still need help?** Open an issue: https://github.com/PCIRCLE-AI/claude-code-buddy/issues
