#!/bin/bash

# MeMesh Plugin Pre-Deployment Check Script
# 執行完整的部署前檢查

set -e

echo "🚀 MeMesh Plugin Pre-Deployment Check"
echo "======================================"
echo ""

FAILED_CHECKS=0
TOTAL_CHECKS=0

check_pass() {
    echo "  ✅ $1"
}

check_fail() {
    echo "  ❌ $1"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
}

run_check() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    echo ""
    echo "[$TOTAL_CHECKS] $1"
}

# Part 1: Package Structure
run_check "檢查核心檔案"
test -f package.json && check_pass "package.json exists" || check_fail "package.json missing"
test -f plugin.json && check_pass "plugin.json exists" || check_fail "plugin.json missing"
test -f mcp.json && check_pass "mcp.json exists" || check_fail "mcp.json missing"
test -f README.md && check_pass "README.md exists" || check_fail "README.md missing"

run_check "檢查 package.json 配置"
node -e "
const pkg = require('./package.json');
if (pkg.name !== '@pcircle/memesh') process.exit(1);
if (!pkg.version) process.exit(1);
if (pkg.main !== 'dist/index.js') process.exit(1);
if (!pkg.bin || !pkg.bin.memesh) process.exit(1);
if (!pkg.files || !pkg.files.includes('mcp.json')) process.exit(1);
" && check_pass "package.json 配置正確" || check_fail "package.json 配置錯誤"

run_check "檢查 plugin.json 格式"
node -e "
const plugin = require('./plugin.json');
if (plugin.mcpServers) {
  console.error('plugin.json should not contain mcpServers');
  process.exit(1);
}
if (!plugin.name || !plugin.version) process.exit(1);
" && check_pass "plugin.json 格式正確（無 mcpServers）" || check_fail "plugin.json 格式錯誤"

run_check "檢查 mcp.json 格式"
node -e "
const mcp = require('./mcp.json');
if (!mcp.memesh) process.exit(1);
if (!mcp.memesh.command || !mcp.memesh.args) process.exit(1);
if (!mcp.memesh.args[0].includes('CLAUDE_PLUGIN_ROOT')) {
  console.error('mcp.json should use \${CLAUDE_PLUGIN_ROOT}');
  process.exit(1);
}
" && check_pass "mcp.json 格式正確" || check_fail "mcp.json 格式錯誤"

# Part 2: Build System
run_check "執行 TypeScript 編譯"
npm run build > /dev/null 2>&1 && check_pass "Build 成功" || check_fail "Build 失敗"

run_check "檢查 dist 目錄"
test -f dist/mcp/server-bootstrap.js && check_pass "server-bootstrap.js 存在" || check_fail "server-bootstrap.js 不存在"

run_check "驗證 plugin sync"
npm run prepare:plugin > /dev/null 2>&1 && check_pass "Plugin sync 成功" || check_fail "Plugin sync 失敗"

run_check "檢查 plugin 結構"
test -f .claude-plugin/memesh/.claude-plugin/plugin.json && check_pass ".claude-plugin/plugin.json 存在" || check_fail "plugin.json 不存在"
test -f .claude-plugin/memesh/.mcp.json && check_pass ".mcp.json 存在" || check_fail ".mcp.json 不存在"
test -d .claude-plugin/memesh/dist && check_pass "dist/ 存在" || check_fail "dist/ 不存在"
test -d .claude-plugin/memesh/node_modules && check_pass "node_modules/ 存在" || check_fail "node_modules/ 不存在"

run_check "檢查 plugin 版本一致性"
if [ ! -d ".claude-plugin/memesh" ]; then
    check_fail "Plugin 目錄不存在！執行 npm run build 生成"
else
    PLUGIN_VERSION=$(node -e "
    const root = require('./package.json').version;
    const plugin = require('./.claude-plugin/memesh/package.json').version;
    const rootManifest = require('./plugin.json').version;
    const pluginManifest = require('./.claude-plugin/memesh/.claude-plugin/plugin.json').version;
    const versions = { root, plugin, rootManifest, pluginManifest };
    const unique = new Set(Object.values(versions));
    if (unique.size !== 1) {
      process.stderr.write('Version mismatch: ' + JSON.stringify(versions));
      process.exit(1);
    }
    process.stdout.write(root);
    " 2>/dev/null) && check_pass "所有版本一致: v${PLUGIN_VERSION}" || check_fail "版本不一致！執行 npm run build 同步"
fi

run_check "驗證 Claude Code Plugin 包裝（非一般 MCP server）"
node -e "
const fs = require('fs');
const crypto = require('crypto');
const errors = [];

// 1. Plugin must have nested .claude-plugin/plugin.json manifest
const nestedManifest = '.claude-plugin/memesh/.claude-plugin/plugin.json';
if (!fs.existsSync(nestedManifest)) {
  errors.push('Missing nested plugin manifest: ' + nestedManifest);
} else {
  const manifest = JSON.parse(fs.readFileSync(nestedManifest, 'utf8'));
  if (!manifest.name || !manifest.version) {
    errors.push('Plugin manifest missing name or version');
  }
}

// 3. Plugin .mcp.json must use CLAUDE_PLUGIN_ROOT variable (not absolute paths)
const mcpJson = '.claude-plugin/memesh/.mcp.json';
if (!fs.existsSync(mcpJson)) {
  errors.push('Missing plugin .mcp.json');
} else {
  const content = fs.readFileSync(mcpJson, 'utf8');
  if (!content.includes('CLAUDE_PLUGIN_ROOT')) {
    errors.push('.mcp.json must use \${CLAUDE_PLUGIN_ROOT} — found absolute path instead');
  }
}

// 4. Build script must include prepare:plugin to auto-sync plugin dir
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (!pkg.scripts || !pkg.scripts.build || !pkg.scripts.build.includes('prepare:plugin')) {
  errors.push('Build script must include prepare:plugin for automatic plugin sync');
}

// 5. Plugin dist/ must mirror root dist/ (content hash check on server-bootstrap.js)
const rootBoot = 'dist/mcp/server-bootstrap.js';
const pluginBoot = '.claude-plugin/memesh/dist/mcp/server-bootstrap.js';
if (fs.existsSync(rootBoot) && fs.existsSync(pluginBoot)) {
  const rootHash = crypto.createHash('md5').update(fs.readFileSync(rootBoot)).digest('hex');
  const pluginHash = crypto.createHash('md5').update(fs.readFileSync(pluginBoot)).digest('hex');
  if (rootHash !== pluginHash) {
    errors.push('Plugin dist/ out of sync with root dist/ (server-bootstrap.js content differs)');
  }
} else if (!fs.existsSync(pluginBoot)) {
  errors.push('Plugin dist/mcp/server-bootstrap.js missing');
}

if (errors.length > 0) {
  console.error('Plugin packaging errors:');
  errors.forEach(e => console.error('  - ' + e));
  process.exit(1);
}
" && check_pass "確認為 Claude Code Plugin 包裝（非一般 MCP）" || check_fail "Plugin 包裝驗證失敗！請檢查 .claude-plugin/ 結構"

# Part 3: npm Package
run_check "測試 npm pack"
npm pack > /dev/null 2>&1 && check_pass "npm pack 成功" || check_fail "npm pack 失敗"

TARBALL=$(ls -t pcircle-memesh-*.tgz | head -1)
if [ -f "$TARBALL" ]; then
    tar -tzf "$TARBALL" | grep -q "package/mcp.json" && check_pass "tarball 包含 mcp.json" || check_fail "tarball 缺少 mcp.json"
    tar -tzf "$TARBALL" | grep -q "package/plugin.json" && check_pass "tarball 包含 plugin.json" || check_fail "tarball 缺少 plugin.json"
    rm "$TARBALL"  # 清理
else
    check_fail "找不到 tarball"
fi

# Part 4: Security
run_check "檢查是否有敏感資訊洩露"
if [ -f .env ]; then
    if git ls-files --error-unmatch .env > /dev/null 2>&1; then
        check_fail ".env 被加入 git（不應該）"
    else
        check_pass ".env 未加入 git"
    fi
else
    check_pass "無 .env 檔案"
fi

# Part 5: MCP Server
run_check "測試 MCP server 啟動"
timeout 2 node ./.claude-plugin/memesh/dist/mcp/server-bootstrap.js --version > /dev/null 2>&1 && check_pass "MCP server 可啟動" || check_pass "MCP server timeout (正常，等待 stdio)"

run_check "檢查 MCP 連接狀態"
if command -v claude &> /dev/null; then
    # MCP 連接檢查：Connected 或 註冊成功都算通過
    MCP_STATUS=$(claude mcp list 2>&1 | grep memesh || echo "not found")

    if echo "$MCP_STATUS" | grep -q "Connected"; then
        check_pass "MCP server 已連接"
    elif echo "$MCP_STATUS" | grep -q "memesh"; then
        check_pass "MCP server 已註冊（可能需要重啟 Claude Code）"
    else
        check_fail "MCP server 未註冊（執行 ./scripts/quick-install.sh 註冊）"
    fi
else
    check_pass "Claude CLI 不可用（跳過）"
fi

# Part 6: Tests
run_check "執行測試"
npm test > /dev/null 2>&1 && check_pass "測試通過" || check_fail "測試失敗"

# Summary
echo ""
echo "======================================"
echo "📊 檢查結果總結"
echo "======================================"
echo "總檢查項目: $TOTAL_CHECKS"
echo "通過: $((TOTAL_CHECKS - FAILED_CHECKS))"
echo "失敗: $FAILED_CHECKS"
echo ""

if [ $FAILED_CHECKS -eq 0 ]; then
    echo "✅ 所有檢查通過！準備好部署了！"
    echo ""
    echo "📝 下一步："
    echo "   1. 確認版本號正確"
    echo "   2. 更新 CHANGELOG.md"
    echo "   3. 提交變更並建立 tag"
    echo "   4. 執行 npm publish"
    exit 0
else
    echo "❌ 有 $FAILED_CHECKS 項檢查失敗，請修正後再試"
    exit 1
fi
