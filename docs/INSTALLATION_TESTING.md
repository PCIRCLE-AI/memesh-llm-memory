# 🧪 Installation Testing Documentation

> **Status**: [![Installation Testing](https://github.com/PCIRCLE-AI/claude-code-buddy/actions/workflows/installation-test.yml/badge.svg)](https://github.com/PCIRCLE-AI/claude-code-buddy/actions/workflows/installation-test.yml)

## 📋 Test Coverage

MeMesh installation process is thoroughly tested with the following:

### ✅ Tested Installation Methods

1. **npm Global Install**
   - Test Environment: Ubuntu, Node 20/22
   - Test Content: `npm install -g @pcircle/memesh`
   - Verification: Tarball contents, executability

2. **Plugin Build**
   - Test Environment: Ubuntu
   - Test Content: `npm run build:plugin`
   - Verification: File structure, JSON format, MCP server

3. **MCP Server Standalone** (New)
   - Test Environment: Local/CI
   - Test Content: Standalone MCP server functionality testing
   - Verification:
     - MCP server files exist
     - Version command executable
     - MCP protocol basic response
     - Environment variable handling
     - Dependency integrity
   - Limitations: Cannot test full MCP handshake and Claude Code integration

4. **Docker Clean Install**
   - Test Environment: Docker (completely clean environment)
   - Test Content: Installation from scratch
   - Verification: Complete installation process

5. **Security Checks**
   - npm audit
   - Sensitive information scanning
   - .env file checking

---

## 🔧 Local Testing Methods

### Method 1: Run Complete Check Script

```bash
./scripts/pre-deployment-check.sh
```

### Method 2: MCP Server Standalone Test (Quick)

```bash
./scripts/test-mcp-server-standalone.sh
```

Tests MCP server functionality independently, without requiring Docker or full Claude Code environment.

### Method 3: Docker Test (Recommended)

```bash
./scripts/test-installation-docker.sh
```

This tests the installation process in a completely clean Docker container, simulating a real user environment.

### Method 4: Manual Test

```bash
# 1. Install dependencies
npm ci

# 2. Build
npm run build

# 3. Plugin build
npm run build:plugin

# 4. Verify file structure
test -f .claude-plugin/memesh/.mcp.json && echo "✅ .mcp.json exists"
test -f .claude-plugin/memesh/.claude-plugin/plugin.json && echo "✅ plugin.json exists"

# 5. Test MCP Server
./scripts/test-mcp-server-standalone.sh
```

---

## 🤖 CI/CD Automated Testing

### Trigger Conditions

**Automatic Triggers**:
- Push to `main` or `develop` branch
- Pull Request to `main` or `develop`
- When modifying the following files:
  - `package.json`
  - `plugin.json`
  - `mcp.json`
  - `scripts/**`
  - `src/**`

**Manual Trigger**:
- GitHub Actions → "Installation Testing" → "Run workflow"

### Test Stages

```
Stage 1: Basic Checks
  ├─ JSON format validation
  ├─ File structure checking
  └─ Basic syntax checking

Stage 2: npm Install Test
  ├─ Node 20 test
  ├─ Node 22 test
  ├─ npm pack verification
  └─ Tarball content checking

Stage 3: Plugin Build Test
  ├─ Build success
  ├─ Plugin structure verification
  ├─ JSON format validation
  ├─ MCP server executability
  └─ MCP Server standalone functionality test

Stage 4: Docker Clean Install
  └─ Completely clean environment test

Stage 5: Security Checks
  ├─ npm audit
  ├─ Sensitive information scanning
  └─ .env checking
```

---

## 📊 Test Reports

### How to View Test Results

1. **GitHub Actions Page**
   - https://github.com/PCIRCLE-AI/claude-code-buddy/actions
   - Select "Installation Testing" workflow
   - View latest execution results

2. **Status Checks in PRs**
   - Tests run automatically for each PR
   - View test status at the bottom of PR page
   - All tests must pass before merging

3. **README Badge**
   - Badge at top of README.md shows current test status
   - Green = passing, Red = failing

---

## 🛡️ Coverage Level (Honest Assessment)

### ✅ What We Can Guarantee (~70-80%)

**Build & Package Level**:
- ✅ JSON format correct (package.json, plugin.json, mcp.json)
- ✅ File structure meets Claude Code standards
- ✅ TypeScript compiles successfully
- ✅ npm package can be packaged normally
- ✅ Dependency integrity (npm audit passes)
- ✅ MCP server file is executable
- ✅ MCP server responds to basic protocol requests
- ✅ Multiple Node version compatibility (20, 22)
- ✅ Clean environment installation (Docker)
- ✅ Security scanning (secrets, vulnerabilities)

### ⚠️ What We CANNOT Test in CI/CD (~20-30%)

**Actual Integration Level** (Requires real Claude Code environment):
- ❌ Whether Claude Code can actually load the plugin
- ❌ Whether MCP server can successfully connect in Claude Code
- ❌ Whether plugin functions work normally in Claude Code
- ❌ Actual user experience

**Platform Coverage** (Requires different OS runners):
- ⚠️ Windows environment actual testing
- ⚠️ macOS environment actual testing (currently developed on macOS, partial coverage)

### 📊 Why Can't We Reach 100%?

**Technical Limitations**:
1. **Claude Code requires login**: Cannot auto-login in CI/CD for testing
2. **No headless mode**: Claude Code doesn't support headless automation testing
3. **MCP protocol complexity**: Full MCP handshake requires actual Claude Code environment
4. **Platform dependencies**: Limited runners available on GitHub Actions

**Realistic Assessment**:
- Our tests ensure "build won't break"
- Our tests ensure "structure is correct"
- Our tests ensure "MCP server can basically run"
- **But cannot ensure "will definitely succeed in user's Claude Code"**

### 💡 Compensating Measures

To address this 20-30% testing gap:

1. **Local manual testing**: Developers verify in local Claude Code
2. **Pre-deployment checklist**: Manual checklist before deployment
3. **Quick rollback mechanism**: npm version management, immediate rollback if issues found
4. **User reporting mechanism**: GitHub Issues to track actual problems
5. **Documentation completeness**: Detailed installation guides and troubleshooting docs

### ✅ Conclusion

**We provide "highly reliable but not 100% guaranteed" installation process**:
- Build and package level: ~95% coverage
- Actual Claude Code integration: Requires manual verification
- Overall assessment: ~70-80% automated coverage

---

## 🚨 Test Failure Handling

### If CI Tests Fail

1. **View Error Message**
   - Click on failed job
   - Expand failed step
   - View detailed error message

2. **Reproduce Locally**
   ```bash
   # Use Docker test to reproduce issue
   ./scripts/test-installation-docker.sh
   ```

3. **Fix Issue**
   - Fix code based on error message
   - Test locally before pushing

4. **Re-run CI**
   - Push fixed code
   - CI will automatically re-run

### If Local Tests Fail

1. **Check File Structure**
   ```bash
   ls -la .claude-plugin/memesh/
   ```

2. **Check JSON Format**
   ```bash
   node -e "require('./plugin.json')"
   node -e "require('./mcp.json')"
   ```

3. **Rebuild**
   ```bash
   npm run build
   npm run build:plugin
   ```

4. **Run Full Check**
   ```bash
   ./scripts/pre-deployment-check.sh
   ```

---

## 📝 Adding New Tests

If you need to add new installation method tests:

1. Update `Dockerfile.test` (if Docker test needed)
2. Update `.github/workflows/installation-test.yml`
3. Update `scripts/pre-deployment-check.sh`
4. Update this documentation

---

## ✅ Success Criteria

Standards for all tests passing:

```bash
✅ All JSON files are valid
✅ File structure is correct
✅ npm pack successful
✅ Plugin structure verified
✅ Docker clean install passed
✅ No secrets found
✅ No security vulnerabilities (high/critical)
```

**Only when all checks pass can the installation process be considered reliable.**

---

**Last Updated**: 2026-02-04
**Maintainer**: PCIRCLE AI Team
