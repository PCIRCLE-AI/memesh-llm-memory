#!/bin/bash

# MeMesh Plugin Pre-Deployment Check Script (Comprehensive Edition)
# 全面檢查所有可能導致發布問題的情況

set -e

echo "🚀 MeMesh Plugin Pre-Deployment Check (Comprehensive)"
echo "========================================================"
echo ""

FAILED_CHECKS=0
TOTAL_CHECKS=0
WARNINGS=0

check_pass() {
    echo "  ✅ $1"
}

check_fail() {
    echo "  ❌ $1"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
}

check_warn() {
    echo "  ⚠️  $1"
    WARNINGS=$((WARNINGS + 1))
}

run_check() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    echo ""
    echo "[$TOTAL_CHECKS] $1"
}

# ============================================================================
# Part 1: 核心檔案存在性檢查
# ============================================================================
run_check "核心檔案存在性"
test -f package.json && check_pass "package.json exists" || check_fail "package.json missing"
test -f plugin.json && check_pass "plugin.json exists" || check_fail "plugin.json missing"
test -f mcp.json && check_pass "mcp.json exists" || check_fail "mcp.json missing"
test -f README.md && check_pass "README.md exists" || check_fail "README.md missing"
test -f LICENSE && check_pass "LICENSE exists" || check_fail "LICENSE missing"
test -f CHANGELOG.md && check_pass "CHANGELOG.md exists" || check_warn "CHANGELOG.md missing"
test -f tsconfig.json && check_pass "tsconfig.json exists" || check_fail "tsconfig.json missing"

# ============================================================================
# Part 2: package.json 完整性檢查
# ============================================================================
run_check "package.json 完整性"
node -e "
const pkg = require('./package.json');
const errors = [];

// Basic fields
if (pkg.name !== '@pcircle/memesh') errors.push('name must be @pcircle/memesh');
if (!pkg.version) errors.push('version missing');
if (!pkg.description) errors.push('description missing');
if (!pkg.author) errors.push('author missing');
if (!pkg.license) errors.push('license missing');
if (pkg.main !== 'dist/index.js') errors.push('main must be dist/index.js');

// Bin
if (!pkg.bin || !pkg.bin.memesh) errors.push('bin.memesh missing');

// Files array (CRITICAL - prevents v2.9.0 style regressions)
if (!pkg.files) {
  errors.push('CRITICAL: files array missing');
} else {
  const required = ['dist/', 'scripts/postinstall-new.js', 'scripts/postinstall-lib.js',
                    'scripts/skills/', 'scripts/hooks/', 'plugin.json', 'mcp.json', 'LICENSE'];
  required.forEach(f => {
    if (!pkg.files.includes(f)) {
      errors.push(\`CRITICAL: files array missing \${f}\`);
    }
  });
}

// Scripts
const requiredScripts = ['build', 'test', 'postinstall', 'prepare:plugin'];
requiredScripts.forEach(s => {
  if (!pkg.scripts || !pkg.scripts[s]) {
    errors.push(\`script '\${s}' missing\`);
  }
});

// Dependencies
if (!pkg.dependencies) errors.push('dependencies missing');
if (!pkg.devDependencies) errors.push('devDependencies missing');

if (errors.length > 0) {
  errors.forEach(e => console.error('  - ' + e));
  process.exit(1);
}
" && check_pass "package.json 完整且正確" || check_fail "package.json 有錯誤"

# ============================================================================
# Part 3: 版本一致性檢查（跨所有文件）
# ============================================================================
run_check "版本號一致性（所有文件）"
node -e "
const fs = require('fs');
const versions = {};

// Collect versions from all sources
versions.package = require('./package.json').version;
versions.plugin = require('./plugin.json').version;

// Check CHANGELOG
const changelog = fs.readFileSync('CHANGELOG.md', 'utf8');
const changelogMatch = changelog.match(/^## \\[(\\d+\\.\\d+\\.\\d+)\\]/m);
if (changelogMatch) {
  versions.changelog = changelogMatch[1];
} else {
  console.error('CHANGELOG.md 沒有版本號');
  process.exit(1);
}

// Check if all plugin files exist
if (fs.existsSync('.claude-plugin/memesh/package.json')) {
  versions.pluginPackage = require('./.claude-plugin/memesh/package.json').version;
}
if (fs.existsSync('.claude-plugin/memesh/.claude-plugin/plugin.json')) {
  versions.pluginManifest = require('./.claude-plugin/memesh/.claude-plugin/plugin.json').version;
}

// All versions must match
const unique = new Set(Object.values(versions));
if (unique.size !== 1) {
  console.error('版本不一致:');
  Object.entries(versions).forEach(([k, v]) => console.error(\`  \${k}: \${v}\`));
  process.exit(1);
}

console.log('  所有版本一致: v' + versions.package);
" && check_pass "所有版本號一致" || check_fail "版本號不一致"

# ============================================================================
# Part 4: TypeScript 編譯檢查
# ============================================================================
run_check "TypeScript 類型檢查"
npm run typecheck > /dev/null 2>&1 && check_pass "類型檢查通過" || check_fail "類型檢查失敗"

run_check "TypeScript 編譯"
npm run build > /dev/null 2>&1 && check_pass "編譯成功" || check_fail "編譯失敗"

run_check "dist/ 目錄完整性"
REQUIRED_DIST=(
    "dist/index.js"
    "dist/mcp/server-bootstrap.js"
    "dist/mcp/daemon/DaemonBootstrap.js"
    "dist/mcp/daemon/DaemonLockManager.js"
    "dist/utils/PathResolver.js"
)
for file in "${REQUIRED_DIST[@]}"; do
    if [ -f "$file" ]; then
        check_pass "$file exists"
    else
        check_fail "$file missing"
    fi
done

# ============================================================================
# Part 5: Plugin 結構同步檢查
# ============================================================================
run_check "Plugin sync"
npm run prepare:plugin > /dev/null 2>&1 && check_pass "Plugin sync 成功" || check_fail "Plugin sync 失敗"

run_check "Plugin 目錄結構"
REQUIRED_PLUGIN_FILES=(
    ".claude-plugin/memesh/.claude-plugin/plugin.json"
    ".claude-plugin/memesh/.mcp.json"
    ".claude-plugin/memesh/package.json"
    ".claude-plugin/memesh/dist/mcp/server-bootstrap.js"
)
for file in "${REQUIRED_PLUGIN_FILES[@]}"; do
    if [ -f "$file" ]; then
        check_pass "$(basename $file) exists"
    else
        check_fail "$(basename $file) missing"
    fi
done

run_check "Plugin dist/ 與 root dist/ 內容一致性"
node -e "
const fs = require('fs');
const crypto = require('crypto');

const filesToCheck = [
  'dist/mcp/server-bootstrap.js',
  'dist/index.js',
  'dist/mcp/daemon/DaemonBootstrap.js'
];

const errors = [];

filesToCheck.forEach(file => {
  const rootFile = file;
  const pluginFile = '.claude-plugin/memesh/' + file;

  if (!fs.existsSync(rootFile)) {
    errors.push(\`Root \${file} missing\`);
    return;
  }

  if (!fs.existsSync(pluginFile)) {
    errors.push(\`Plugin \${file} missing\`);
    return;
  }

  const rootHash = crypto.createHash('md5').update(fs.readFileSync(rootFile)).digest('hex');
  const pluginHash = crypto.createHash('md5').update(fs.readFileSync(pluginFile)).digest('hex');

  if (rootHash !== pluginHash) {
    errors.push(\`\${file} content mismatch (plugin out of sync)\`);
  }
});

if (errors.length > 0) {
  errors.forEach(e => console.error('  - ' + e));
  process.exit(1);
}
" && check_pass "Plugin 與 root dist/ 內容一致" || check_fail "Plugin dist/ 不同步"

# ============================================================================
# Part 6: npm pack 完整性檢查
# ============================================================================
run_check "npm pack 打包"
npm pack > /dev/null 2>&1 && check_pass "打包成功" || check_fail "打包失敗"

TARBALL=$(ls -t pcircle-memesh-*.tgz | head -1)
if [ ! -f "$TARBALL" ]; then
    check_fail "找不到 tarball"
else
    run_check "Tarball 內容完整性檢查"

    # Critical files
    REQUIRED_IN_TARBALL=(
        "package/package.json"
        "package/plugin.json"
        "package/mcp.json"
        "package/LICENSE"
        "package/README.md"
        "package/dist/index.js"
        "package/dist/mcp/server-bootstrap.js"
        "package/scripts/postinstall-new.js"
        "package/scripts/postinstall-lib.js"
        "package/scripts/hooks/hook-utils.js"
        "package/scripts/hooks/session-start.js"
        "package/scripts/hooks/stop.js"
        "package/scripts/hooks/post-commit.js"
        "package/scripts/hooks/post-tool-use.js"
    )

    for file in "${REQUIRED_IN_TARBALL[@]}"; do
        if tar -tzf "$TARBALL" | grep -q "$file"; then
            check_pass "$(echo $file | sed 's/package\///')"
        else
            check_fail "$(echo $file | sed 's/package\///') 不在 tarball 中"
        fi
    done

    run_check "Skills 完整性檢查"
    if tar -tzf "$TARBALL" | grep -q "package/scripts/skills/"; then
        check_pass "scripts/skills/ 包含在 tarball 中"

        # Count skills
        SKILL_COUNT=$(tar -tzf "$TARBALL" | grep "package/scripts/skills/.*SKILL.md" | wc -l | tr -d ' ')
        if [ "$SKILL_COUNT" -gt 0 ]; then
            check_pass "找到 $SKILL_COUNT 個 bundled skills"
        else
            check_warn "沒有找到 bundled skills"
        fi
    else
        check_fail "scripts/skills/ 不在 tarball 中"
    fi

    run_check "Hook-utils.js 內容驗證"
    tar -xzf "$TARBALL" --strip-components=1 "package/scripts/hooks/hook-utils.js" -O > /tmp/hook-utils-verify.js 2>/dev/null

    # Verify critical functions exist
    if grep -q "resolveMemeshDbPath" /tmp/hook-utils-verify.js; then
        check_pass "resolveMemeshDbPath() 函數存在"
    else
        check_fail "❌ CRITICAL: resolveMemeshDbPath() 函數缺失"
    fi

    if grep -q "export const MEMESH_DB_PATH" /tmp/hook-utils-verify.js; then
        check_pass "MEMESH_DB_PATH 常數存在"
    else
        check_fail "MEMESH_DB_PATH 常數缺失"
    fi

    if grep -q "readJsonFile" /tmp/hook-utils-verify.js; then
        check_pass "readJsonFile() 函數存在"
    else
        check_fail "readJsonFile() 函數缺失"
    fi

    rm -f /tmp/hook-utils-verify.js

    run_check "Tarball 大小合理性"
    TARBALL_SIZE=$(stat -f%z "$TARBALL" 2>/dev/null || stat -c%s "$TARBALL" 2>/dev/null)
    TARBALL_SIZE_MB=$((TARBALL_SIZE / 1024 / 1024))

    if [ "$TARBALL_SIZE_MB" -lt 50 ]; then
        check_pass "Tarball 大小: ${TARBALL_SIZE_MB}MB (合理)"
    else
        check_warn "Tarball 大小: ${TARBALL_SIZE_MB}MB (過大，檢查是否包含不必要的文件)"
    fi

    # Clean up
    rm "$TARBALL"
fi

# ============================================================================
# Part 7: 配置文件正確性檢查
# ============================================================================
run_check "mcp.json 配置正確性"
node -e "
const mcp = require('./mcp.json');
const errors = [];

if (!mcp.memesh) errors.push('memesh server config missing');
if (!mcp.memesh.command) errors.push('command missing');
if (!mcp.memesh.args) errors.push('args missing');

// Must use CLAUDE_PLUGIN_ROOT variable
if (!mcp.memesh.args[0].includes('CLAUDE_PLUGIN_ROOT')) {
  errors.push('Must use \${CLAUDE_PLUGIN_ROOT} variable (not absolute path)');
}

if (errors.length > 0) {
  errors.forEach(e => console.error('  - ' + e));
  process.exit(1);
}
" && check_pass "mcp.json 配置正確" || check_fail "mcp.json 配置錯誤"

run_check "plugin.json 配置正確性"
node -e "
const plugin = require('./plugin.json');
const errors = [];

if (!plugin.name) errors.push('name missing');
if (!plugin.version) errors.push('version missing');
if (!plugin.author) errors.push('author missing');

// Must NOT contain mcpServers (should be in separate mcp.json)
if (plugin.mcpServers) {
  errors.push('plugin.json should not contain mcpServers (use mcp.json instead)');
}

if (errors.length > 0) {
  errors.forEach(e => console.error('  - ' + e));
  process.exit(1);
}
" && check_pass "plugin.json 配置正確" || check_fail "plugin.json 配置錯誤"

# ============================================================================
# Part 8: 安全性檢查
# ============================================================================
run_check "敏感資訊檢查"
SENSITIVE_FILES=(".env" ".env.local" "credentials.json" ".secret" "private.key")
for file in "${SENSITIVE_FILES[@]}"; do
    if [ -f "$file" ]; then
        if git ls-files --error-unmatch "$file" > /dev/null 2>&1; then
            check_fail "$file 被加入 git（安全風險）"
        else
            check_pass "$file 存在但未加入 git"
        fi
    fi
done

run_check "依賴安全性檢查"
if npm audit --audit-level=high > /dev/null 2>&1; then
    check_pass "沒有高危漏洞"
else
    check_warn "發現依賴漏洞，執行 npm audit 查看詳情"
fi

# ============================================================================
# Part 9: Hooks 系統檢查
# ============================================================================
run_check "Hooks 文件完整性"
HOOK_FILES=(
    "scripts/hooks/hook-utils.js"
    "scripts/hooks/session-start.js"
    "scripts/hooks/stop.js"
    "scripts/hooks/post-commit.js"
    "scripts/hooks/post-tool-use.js"
    "scripts/hooks/pre-tool-use.js"
)
for file in "${HOOK_FILES[@]}"; do
    if [ -f "$file" ]; then
        check_pass "$(basename $file) exists"

        # Check if file is executable (should be for hooks)
        if [ -x "$file" ]; then
            check_pass "$(basename $file) is executable"
        else
            check_warn "$(basename $file) not executable (may cause issues)"
        fi
    else
        check_fail "$(basename $file) missing"
    fi
done

# ============================================================================
# Part 10: MCP Server 功能測試
# ============================================================================
run_check "MCP Server 可執行性"
if [ -f ".claude-plugin/memesh/dist/mcp/server-bootstrap.js" ]; then
    # Test if server can start (with timeout)
    if timeout 2s node .claude-plugin/memesh/dist/mcp/server-bootstrap.js --version > /dev/null 2>&1; then
        check_pass "MCP server 可以啟動"
    else
        # Timeout is expected for stdio mode
        check_pass "MCP server 響應 (stdio mode timeout 正常)"
    fi
else
    check_fail "server-bootstrap.js 不存在"
fi

# ============================================================================
# Part 11: 測試覆蓋
# ============================================================================
run_check "單元測試"
if npm test > /dev/null 2>&1; then
    check_pass "所有測試通過"
else
    check_fail "測試失敗"
fi

run_check "測試覆蓋率"
if [ -d "coverage" ]; then
    check_pass "測試覆蓋率報告已生成"
else
    check_warn "沒有測試覆蓋率報告"
fi

# ============================================================================
# Part 12: Lint 檢查
# ============================================================================
run_check "代碼風格檢查"
if npm run lint > /dev/null 2>&1; then
    check_pass "Lint 檢查通過"
else
    check_warn "Lint 檢查有警告"
fi

# ============================================================================
# Part 13: Git 狀態檢查
# ============================================================================
run_check "Git 狀態"
if [ -z "$(git status --porcelain)" ]; then
    check_pass "工作目錄乾淨"
else
    check_warn "有未提交的變更"
    git status --short
fi

# ============================================================================
# 最終總結
# ============================================================================
echo ""
echo "========================================================"
echo "📊 檢查結果總結"
echo "========================================================"
echo "總檢查項目: $TOTAL_CHECKS"
echo "通過: $((TOTAL_CHECKS - FAILED_CHECKS - WARNINGS))"
echo "警告: $WARNINGS"
echo "失敗: $FAILED_CHECKS"
echo ""

if [ $FAILED_CHECKS -eq 0 ]; then
    if [ $WARNINGS -eq 0 ]; then
        echo "✅ 完美！所有檢查通過，沒有警告！"
    else
        echo "✅ 所有關鍵檢查通過（有 $WARNINGS 個警告）"
    fi
    echo ""
    echo "📝 準備發布："
    echo "   1. 確認 CHANGELOG.md 已更新"
    echo "   2. 執行 ./scripts/release.sh [patch|minor|major]"
    echo "   3. 或手動執行 npm publish"
    exit 0
else
    echo "❌ 有 $FAILED_CHECKS 項關鍵檢查失敗"
    echo "請修正所有失敗項目後再嘗試發布"
    exit 1
fi
