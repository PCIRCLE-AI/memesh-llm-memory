# Migration Guide: claude-code-buddy-mcp → memesh

**Date**: February 2026
**Status**: `@pcircle/claude-code-buddy-mcp` is now **DEPRECATED**

---

## Why the Name Change?

The package has been renamed from `@pcircle/claude-code-buddy-mcp` to `@pcircle/memesh` to:

1. **Better Brand Identity** - "MeMesh" reflects the memory mesh architecture
2. **Simplified Naming** - Shorter, more memorable package name
3. **Clearer Purpose** - Name emphasizes the memory and knowledge graph features

---

## Migration Steps

### For Global CLI Installation

```bash
# 1. Uninstall old package
npm uninstall -g @pcircle/claude-code-buddy-mcp

# 2. Install new package
npm install -g @pcircle/memesh

# 3. Verify installation
memesh --version
```

### For MCP Server Configuration

If you're using the MCP server directly, update your `~/.claude/mcp_settings.json`:

**Before:**
```json
{
  "mcpServers": {
    "claude-code-buddy-mcp": {
      "command": "npx",
      "args": ["-y", "@pcircle/claude-code-buddy-mcp"]
    }
  }
}
```

**After:**
```json
{
  "mcpServers": {
    "memesh": {
      "command": "npx",
      "args": ["-y", "@pcircle/memesh"]
    }
  }
}
```

### For Claude Code Plugin

The plugin installation remains the same - it will automatically use the new package name:

```bash
# Clone and install as before
git clone https://github.com/PCIRCLE-AI/claude-code-buddy.git
cd claude-code-buddy
npm install
npm run build
```

---

## What's Changed

### ✅ Same Features, New Name

All features remain identical:
- ✅ MCP Tools (`buddy-do`, `buddy-remember`, `buddy-help`)
- ✅ Knowledge Graph & Memory Management
- ✅ Semantic Search with ONNX Embeddings
- ✅ Cloud Sync Capabilities
- ✅ Claude Code Plugin Integration

### 📦 Package Details

| Old | New |
|-----|-----|
| `@pcircle/claude-code-buddy-mcp` | `@pcircle/memesh` |
| Last version: 2.6.3 | Current version: 2.9.0 |
| npm: [deprecated] | npm: [active] |

### 🔧 CLI Commands

All CLI commands remain the same:
- `memesh setup`
- `memesh login`
- `memesh config validate`
- `buddy-do`, `buddy-remember`, `buddy-help` (MCP tools)

---

## Compatibility

### Backward Compatibility

- ✅ **Data Migration**: All local knowledge graph data is preserved
- ✅ **Configuration**: Settings automatically migrate
- ✅ **API Compatibility**: All MCP tools have the same interface

### Breaking Changes

**None** - This is purely a package name change. All functionality remains identical.

---

## FAQ

### Q: Do I need to reinstall the plugin?

**A:** No. The plugin automatically uses the new package name. Just run `npm install` in the project directory to update.

### Q: Will my existing data be lost?

**A:** No. The new package checks `~/.memesh/` first, then falls back to `~/.claude-code-buddy/` automatically. Your existing data remains intact and accessible without manual migration.

### Q: What happens if I don't migrate?

**A:** The old package `@pcircle/claude-code-buddy-mcp` is deprecated and will no longer receive updates. We strongly recommend migrating to `@pcircle/memesh` to get the latest features and bug fixes.

### Q: Can I use both packages simultaneously?

**A:** Not recommended. Uninstall the old package before installing the new one to avoid conflicts.

---

## Need Help?

- **Documentation**: [Getting Started Guide](docs/GETTING_STARTED.md)
- **Issues**: [GitHub Issues](https://github.com/PCIRCLE-AI/claude-code-buddy/issues)
- **Discussions**: [GitHub Discussions](https://github.com/PCIRCLE-AI/claude-code-buddy/discussions)

---

**Migration Status**: ✅ Ready to migrate
**Recommended Action**: Migrate as soon as possible
**Support**: The old package is deprecated but will remain available on npm for historical purposes
