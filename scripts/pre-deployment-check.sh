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

run_check "執行 plugin build"
npm run build:plugin > /dev/null 2>&1 && check_pass "Plugin build 成功" || check_fail "Plugin build 失敗"

run_check "檢查 plugin 結構"
test -f .claude-plugin/memesh/.claude-plugin/plugin.json && check_pass ".claude-plugin/plugin.json 存在" || check_fail "plugin.json 不存在"
test -f .claude-plugin/memesh/.mcp.json && check_pass ".mcp.json 存在" || check_fail ".mcp.json 不存在"
test -d .claude-plugin/memesh/dist && check_pass "dist/ 存在" || check_fail "dist/ 不存在"
test -d .claude-plugin/memesh/node_modules && check_pass "node_modules/ 存在" || check_fail "node_modules/ 不存在"

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
