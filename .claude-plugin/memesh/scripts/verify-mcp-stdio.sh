#!/bin/bash
#
# MCP Stdio Verification Script
#
# Verifies that the MCP server runs cleanly in stdio mode without
# any stdout/stderr pollution that would break JSON-RPC communication.
#
# Usage: ./scripts/verify-mcp-stdio.sh

set -e

echo "🔍 MCP Stdio Verification"
echo "=========================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0

# Test function
test_check() {
    local test_name="$1"
    local test_command="$2"

    echo -n "Testing: $test_name... "

    if eval "$test_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASS${NC}"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

# Check 1: Build succeeds
echo "📦 Build Check"
test_check "TypeScript compilation" "npm run build"
echo ""

# Check 2: No dotenv in source
echo "🔍 Source Code Checks"
test_check "No dotenv imports" "! grep -r \"from 'dotenv'\" src/ --include='*.ts'"
test_check "No console.log in source" "! grep -r \"console\\.log\" src/ --include='*.ts' --exclude='*.test.ts' | grep -v '//' | grep -v '\\*'"
echo ""

# Check 3: Stdio pollution test
echo "🎯 Stdio Pollution Checks"

# Create temporary file for output
TEMP_OUTPUT=$(mktemp)
POLLUTION_PID=""
POLLUTION_WATCHDOG=""

# Setup cleanup for pollution test
cleanup_pollution() {
    [ -n "$POLLUTION_PID" ] && kill "$POLLUTION_PID" 2>/dev/null || true
    [ -n "$POLLUTION_WATCHDOG" ] && kill "$POLLUTION_WATCHDOG" 2>/dev/null || true
    rm -f "$TEMP_OUTPUT" 2>/dev/null || true
}
trap cleanup_pollution EXIT ERR

# Run server for 1 second and capture output
echo "Starting MCP server in stdio mode (1 second test)..."
(
    MEMESH_DISABLE_DAEMON=1 DISABLE_MCP_WATCHDOG=1 node dist/mcp/server-bootstrap.js &
    POLLUTION_PID=$!
    (sleep 3; kill $POLLUTION_PID 2>/dev/null || true) &
    POLLUTION_WATCHDOG=$!
    sleep 1
    kill $POLLUTION_PID 2>/dev/null || true
    kill $POLLUTION_WATCHDOG 2>/dev/null || true
) > "$TEMP_OUTPUT" 2>&1 || true

# Check for pollution
if [ -s "$TEMP_OUTPUT" ]; then
    echo -e "${RED}✗ FAIL: Stdout/stderr pollution detected${NC}"
    echo ""
    echo "Output found:"
    cat "$TEMP_OUTPUT"
    echo ""
    FAILED=$((FAILED + 1))
else
    echo -e "${GREEN}✓ PASS: No stdout/stderr pollution${NC}"
    PASSED=$((PASSED + 1))
fi

# Reset trap for pollution test
trap - EXIT ERR
cleanup_pollution
echo ""

# Check 4: JSON-RPC communication
echo "📡 JSON-RPC Communication Test"

# Test JSON-RPC initialize
INIT_REQUEST='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}'

JSONRPC_OUTPUT=$(mktemp)
STDIN_FILE=$(mktemp)
SERVER_PID=""
WATCHDOG_PID=""

# Setup cleanup for JSON-RPC test
cleanup_jsonrpc() {
    [ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null || true
    [ -n "$WATCHDOG_PID" ] && kill "$WATCHDOG_PID" 2>/dev/null || true
    rm -f "$JSONRPC_OUTPUT" "$STDIN_FILE" 2>/dev/null || true
}
trap cleanup_jsonrpc EXIT ERR

# Write request to stdin file
echo "$INIT_REQUEST" > "$STDIN_FILE"

# Run server with stdin from file
MEMESH_DISABLE_DAEMON=1 DISABLE_MCP_WATCHDOG=1 node dist/mcp/server-bootstrap.js < "$STDIN_FILE" > "$JSONRPC_OUTPUT" 2>&1 &
SERVER_PID=$!

# Start timeout watchdog
(sleep 5; kill $SERVER_PID 2>/dev/null || true) &
WATCHDOG_PID=$!

sleep 2
kill $SERVER_PID 2>/dev/null || true
wait $SERVER_PID 2>/dev/null || true
kill $WATCHDOG_PID 2>/dev/null || true
wait $WATCHDOG_PID 2>/dev/null || true

# Check if output is valid JSON
if grep -q "jsonrpc" "$JSONRPC_OUTPUT" && ! grep -q "dotenv" "$JSONRPC_OUTPUT"; then
    echo -e "${GREEN}✓ PASS: Valid JSON-RPC response${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL: Invalid JSON-RPC response${NC}"
    echo ""
    echo "Output:"
    cat "$JSONRPC_OUTPUT"
    echo ""
    FAILED=$((FAILED + 1))
fi

# Reset trap for JSON-RPC test
trap - EXIT ERR
cleanup_jsonrpc
echo ""

# Summary
echo "=========================="
echo "📊 Test Summary"
echo "=========================="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! Safe to publish.${NC}"
    exit 0
else
    echo -e "${RED}❌ $FAILED check(s) failed. DO NOT publish.${NC}"
    exit 1
fi
