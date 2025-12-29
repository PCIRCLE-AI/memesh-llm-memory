# Troubleshooting Guide

## Common Issues

### 1. Butler Not Triggering

**Symptom**: Development Butler doesn't activate at checkpoints

**Causes**:
- Smart-agents not built
- Hooks not updated
- Butler integration disabled

**Solutions**:
```bash
# Rebuild smart-agents
npm run build

# Check if hooks have butler integration
cat ~/.claude/hooks/post-tool-use.js | grep -A 5 "integrateWithButler"
```

---

### 2. MCP Tools Not Found

**Symptom**: "Cannot find module" errors when using agents

**Causes**:
- MCP tools not installed
- Incorrect import paths

**Solutions**:
```bash
# Check if MCP tools are available
ls ~/.claude/mcp-servers/

# Reinstall smart-agents
npm install
npm run build
```

---

### 3. Test Generation Fails

**Symptom**: TestWriterAgent throws errors

**Causes**:
- Invalid source file path
- Unsupported code patterns
- File system permissions

**Solutions**:
```typescript
// Check file exists before generating tests
const fs = await import('fs/promises');
const exists = await fs.stat('src/utils.ts').catch(() => false);
if (!exists) {
  console.error('Source file not found');
}

// Use absolute paths
await testWriter.writeTestFile('/absolute/path/to/src/utils.ts');
```

---

### 4. CI Config Generation Issues

**Symptom**: DevOpsEngineerAgent generates invalid CI config

**Causes**:
- Unsupported CI platform
- Invalid test/build commands

**Solutions**:
```typescript
// Use supported platforms
await devops.setupCI({
  platform: 'github-actions', // Only 'github-actions' supported currently
  testCommand: 'npm test',
  buildCommand: 'npm run build'
});
```

---

## Getting Help

1. Check the [USER_GUIDE.md](./USER_GUIDE.md)
2. Review [AGENT_REFERENCE.md](./AGENT_REFERENCE.md)
3. Open an issue on GitHub
4. Check Knowledge Graph for similar past issues:
   ```bash
   # Use MCP memory tool
   mcp__MCP_DOCKER__search_nodes "query: [your issue]"
   ```
