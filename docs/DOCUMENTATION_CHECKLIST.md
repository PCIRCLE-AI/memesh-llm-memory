# Documentation Quality Checklist

Use this checklist to verify documentation quality before releases.

## ✅ Language Consistency

- [ ] All documentation in English (no Chinese or mixed language)
- [ ] Consistent terminology across all docs
- [ ] Technical terms defined or explained on first use
- [ ] No machine-translated awkward phrasing

**Verification**:
```bash
# Check for Chinese characters
grep -r '[\u4e00-\u9fff]' docs/ README.md CHANGELOG.md
# Should return: no matches
```

## ✅ Architectural Honesty

- [ ] Agent count correct (13 agents: 5 real + 7 enhanced + 1 optional)
- [ ] Clear distinction between real and prompt-enhanced agents
- [ ] No misleading "autonomous AI" or "22 agents" claims
- [ ] Prompt enhancement pattern explained clearly
- [ ] Realistic capability descriptions (no overpromising)

**Verification**:
```bash
# Check for incorrect agent counts
grep -r "22 agents\|14 agents\|8 prompt-enhanced" docs/ README.md CHANGELOG.md
# Should return: no matches

# Verify correct count
grep -r "13 agents" docs/ README.md
# Should find multiple references
```

## ✅ User Experience

- [ ] Quick Start guide exists and takes < 15 minutes
- [ ] Automated setup script works end-to-end
- [ ] Installation steps clear, tested, and include expected outputs
- [ ] Troubleshooting section included with common issues
- [ ] Error messages are helpful and actionable
- [ ] Time estimates provided for multi-step processes

**Verification**:
```bash
# Test setup script
./scripts/setup.sh
# Should complete without errors

# Test Quick Start guide
time ./scripts/setup.sh
# Should complete in < 15 minutes
```

## ✅ Visual Aids

- [ ] Architecture diagram included and up-to-date
- [ ] System flow diagram exists
- [ ] Mermaid diagrams render correctly
- [ ] Screenshots where helpful (if applicable)
- [ ] Code examples provided for complex concepts
- [ ] Color coding used effectively (agent types)

**Verification**:
```bash
# Check diagrams exist
ls docs/diagrams/architecture.md
ls docs/architecture/OVERVIEW.md

# Verify Mermaid syntax (look for ```mermaid blocks)
grep -A 5 "\`\`\`mermaid" docs/diagrams/architecture.md
```

## ✅ Accuracy

- [ ] All file paths correct and accessible
- [ ] All commands tested and work as documented
- [ ] Version numbers updated (README, CHANGELOG, package.json)
- [ ] Links not broken (internal and external)
- [ ] API endpoints correct
- [ ] Environment variables documented accurately

**Verification**:
```bash
# Check version consistency
grep -r "v2\." README.md CHANGELOG.md package.json docs/

# Test all documented commands
npm test
npm run build
./scripts/setup.sh --help

# Verify links (requires markdown-link-check or similar)
find docs/ -name "*.md" -exec grep -o '\[.*\](.*)' {} \;
```

## ✅ Completeness

- [ ] README.md updated with latest features
- [ ] CHANGELOG.md current with all changes
- [ ] AGENT_REFERENCE.md accurate (if exists)
- [ ] ARCHITECTURE.md reflects current reality
- [ ] TESTING.md comprehensive and up-to-date
- [ ] Migration guide exists (for breaking changes)
- [ ] All new features documented
- [ ] Deprecated features marked clearly

**Key Files to Check**:
```bash
# Verify all key docs exist
ls README.md
ls CHANGELOG.md
ls docs/TESTING.md
ls docs/architecture/OVERVIEW.md
ls docs/guides/QUICK_START.md
ls docs/MIGRATION_V2.1.md
ls docs/diagrams/architecture.md
```

## ✅ Testing

- [ ] All tests pass (444-447/449 tests, 99%+ pass rate)
- [ ] Setup script tested on clean environment
- [ ] MCP server starts correctly
- [ ] Example code runs without modification
- [ ] Documentation examples can be copy-pasted and work
- [ ] No broken test suites

**Verification**:
```bash
# Run full test suite
npm test
# Expected: 444-447 passing (99%+ pass rate)

# Test MCP connection
claude mcp list
# Should show smart-agents server

# Verify setup script
./scripts/setup.sh
# Should complete successfully
```

## ✅ Accessibility

- [ ] Headings follow proper hierarchy (H1 → H2 → H3, no skips)
- [ ] Code blocks have language tags for syntax highlighting
- [ ] Tables used appropriately (not for layout)
- [ ] Alt text provided for images (if any)
- [ ] Links have descriptive text (not "click here")
- [ ] Color is not the only way to convey information

**Verification**:
```bash
# Check heading hierarchy
grep -E "^#{1,6} " docs/**/*.md

# Check code blocks have language tags
grep -B 1 "^\`\`\`$" docs/**/*.md
# Should be minimal (most should have language tags)
```

## ✅ Consistency

- [ ] File naming convention consistent (kebab-case, SCREAMING_CASE)
- [ ] Heading capitalization consistent (Title Case or sentence case)
- [ ] Code block formatting consistent (bash, typescript, etc.)
- [ ] Emoji usage consistent (not overused, meaningful)
- [ ] Date format consistent (YYYY-MM-DD preferred)

**Verification**:
```bash
# Check file naming
ls docs/
# Should follow consistent pattern

# Check date formats in CHANGELOG
grep -E "[0-9]{4}-[0-9]{2}-[0-9]{2}" CHANGELOG.md
```

## Review Process

### Before Each Release

1. **Run through this checklist** item by item
2. **Fix any unchecked items** before proceeding
3. **Have second reviewer verify** (pair review)
4. **Update version numbers** in all locations
5. **Test one more time** after version updates
6. **Create release tag** once all items checked

### Verification Commands (All-in-One)

```bash
# Quick verification script
echo "=== Documentation Quality Check ==="

# 1. Language consistency
echo "Checking for Chinese characters..."
grep -r '[\u4e00-\u9fff]' docs/ README.md CHANGELOG.md || echo "✅ No Chinese found"

# 2. Agent count accuracy
echo "Checking agent count..."
grep -r "22 agents\|14 agents\|8 prompt-enhanced" docs/ README.md CHANGELOG.md && echo "❌ Incorrect agent count found" || echo "✅ Agent count correct"

# 3. Test suite
echo "Running tests..."
npm test

# 4. Setup script
echo "Testing setup script..."
./scripts/setup.sh --help

# 5. File existence
echo "Checking key files..."
ls README.md CHANGELOG.md docs/TESTING.md docs/guides/QUICK_START.md

echo "=== Check complete ==="
```

### Quick Checklist Summary

Before release, verify:
- ✅ Language: English only
- ✅ Architecture: 13 agents (5+7+1)
- ✅ UX: Quick start < 15 min
- ✅ Visuals: Diagrams up-to-date
- ✅ Accuracy: Commands tested
- ✅ Complete: All key docs present
- ✅ Tests: 444-447 passing
- ✅ Accessible: Proper structure
- ✅ Consistent: Naming & format

---

## Troubleshooting Checklist Failures

### "Chinese characters found"
**Fix**: Remove or translate all Chinese text to English

### "Incorrect agent count found"
**Fix**: Update to "13 agents (5 real + 7 enhanced + 1 optional)"

### "Tests failing"
**Fix**: Run `npm test` and fix failing tests before release

### "Setup script fails"
**Fix**: Test `./scripts/setup.sh` on clean environment and fix issues

### "Links broken"
**Fix**: Verify all `[text](path)` links point to existing files

---

**Checklist Version**: v2.1.0
**Last Updated**: 2025-12-30
**Maintained By**: Documentation Team
