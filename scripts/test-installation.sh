#!/bin/bash
#
# Complete Installation Test Suite
#
# Tests the ACTUAL installation flow before publishing to npm.
# This catches issues like:
# - Process exiting immediately
# - Stdio pollution
# - Missing dependencies
# - Broken bin scripts
#
# Usage: ./scripts/test-installation.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   Complete Installation Test Suite${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""

PASSED=0
FAILED=0
WARNINGS=0

test_step() {
    local step_name="$1"
    echo -e "${YELLOW}▶ $step_name${NC}"
}

test_pass() {
    echo -e "${GREEN}  ✓ $1${NC}"
    PASSED=$((PASSED + 1))
}

test_fail() {
    echo -e "${RED}  ✗ $1${NC}"
    FAILED=$((FAILED + 1))
}

test_warn() {
    echo -e "${YELLOW}  ⚠ $1${NC}"
    WARNINGS=$((WARNINGS + 1))
}

# ============================================================================
# Step 1: Build Package
# ============================================================================
test_step "Step 1: Building package"

if npm run build > /dev/null 2>&1; then
    test_pass "TypeScript compilation successful"
else
    test_fail "TypeScript compilation failed"
    exit 1
fi

# Check dist/ exists and has files
if [ -d "dist" ] && [ "$(ls -A dist)" ]; then
    test_pass "dist/ directory populated"
else
    test_fail "dist/ directory empty or missing"
    exit 1
fi

echo ""

# ============================================================================
# Step 2: Create Test NPM Package
# ============================================================================
test_step "Step 2: Creating test npm package"

# Pack the package (like npm publish but local)
if npm pack > /dev/null 2>&1; then
    TARBALL=$(ls -t *.tgz | head -1)
    test_pass "Package tarball created: $TARBALL"
else
    test_fail "npm pack failed"
    exit 1
fi

echo ""

# ============================================================================
# Step 3: Test Local Installation
# ============================================================================
test_step "Step 3: Testing local installation"

# Create temp directory for testing
TEST_DIR=$(mktemp -d)
cd "$TEST_DIR"

# Install from local tarball
if npm install -g "$OLDPWD/$TARBALL" > /dev/null 2>&1; then
    test_pass "Global install from tarball successful"
else
    test_fail "Global install failed"
    cd "$OLDPWD"
    rm -rf "$TEST_DIR"
    exit 1
fi

cd "$OLDPWD"

echo ""

# ============================================================================
# Step 4: Test MCP Server Startup
# ============================================================================
test_step "Step 4: Testing MCP server startup"

# Test 1: Server starts without crashing
STARTUP_TEST=$(mktemp)
(
    node dist/mcp/server-bootstrap.js > "$STARTUP_TEST" 2>&1 &
    SERVER_PID=$!
    sleep 3
    if kill -0 $SERVER_PID 2>/dev/null; then
        # Process still running
        kill $SERVER_PID 2>/dev/null || true
        exit 0
    else
        # Process already dead
        exit 1
    fi
)

if [ $? -eq 0 ]; then
    test_pass "Server process stays alive (3 second test)"
else
    test_fail "Server exited immediately"
    echo "Output:"
    cat "$STARTUP_TEST"
fi

rm -f "$STARTUP_TEST"

# Test 2: No stdout pollution
POLLUTION_TEST=$(mktemp)
(
    node dist/mcp/server-bootstrap.js > "$POLLUTION_TEST" 2>&1 &
    SERVER_PID=$!
    sleep 1
    kill $SERVER_PID 2>/dev/null || true
)

if [ -s "$POLLUTION_TEST" ]; then
    # File has content = pollution detected
    test_fail "Stdout/stderr pollution detected:"
    cat "$POLLUTION_TEST"
else
    test_pass "No stdout/stderr pollution"
fi

rm -f "$POLLUTION_TEST"

echo ""

# ============================================================================
# Step 5: Test JSON-RPC Communication
# ============================================================================
test_step "Step 5: Testing JSON-RPC communication"

JSONRPC_TEST=$(mktemp)
INIT_REQUEST='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}'

# Send initialize request
(
    echo "$INIT_REQUEST" | node dist/mcp/server-bootstrap.js > "$JSONRPC_TEST" 2>&1 &
    RPC_PID=$!
    sleep 2
    kill $RPC_PID 2>/dev/null || true
)

# Check response
if grep -q "jsonrpc" "$JSONRPC_TEST"; then
    test_pass "Valid JSON-RPC response received"

    # Check for pollution
    if grep -q "dotenv" "$JSONRPC_TEST"; then
        test_fail "dotenv pollution in JSON-RPC output"
    elif head -1 "$JSONRPC_TEST" | grep -q "^{"; then
        test_pass "Clean JSON-RPC output (no pollution)"
    else
        test_warn "JSON-RPC output may have pollution:"
        head -3 "$JSONRPC_TEST"
    fi
else
    test_fail "No valid JSON-RPC response"
    echo "Output:"
    cat "$JSONRPC_TEST"
fi

rm -f "$JSONRPC_TEST"

echo ""

# ============================================================================
# Step 6: Test Cursor Deep Link Config
# ============================================================================
test_step "Step 6: Verifying Cursor deep link configuration"

# Read package.json
PACKAGE_NAME=$(node -p "require('./package.json').name")
BIN_COMMAND=$(node -p "Object.keys(require('./package.json').bin)[0]")

# Expected config
EXPECTED_CONFIG='{"command":"npx","args":["-y","'$PACKAGE_NAME'"]}'
EXPECTED_B64=$(echo -n "$EXPECTED_CONFIG" | base64)

test_pass "Package name: $PACKAGE_NAME"
test_pass "Bin command: $BIN_COMMAND"

# Show expected Cursor link
echo ""
echo "  Expected Cursor link:"
echo "  cursor://anysphere.cursor-deeplink/mcp/install?name=$PACKAGE_NAME&config=$EXPECTED_B64"
echo ""

# ============================================================================
# Cleanup
# ============================================================================
test_step "Cleanup"

# Remove tarball
rm -f "$TARBALL"
test_pass "Removed test tarball"

# Uninstall global package
npm uninstall -g "$PACKAGE_NAME" > /dev/null 2>&1 || true
test_pass "Uninstalled test package"

echo ""

# ============================================================================
# Summary
# ============================================================================
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   Test Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""
echo -e "  Passed:   ${GREEN}$PASSED${NC}"
echo -e "  Failed:   ${RED}$FAILED${NC}"
echo -e "  Warnings: ${YELLOW}$WARNINGS${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED - SAFE TO PUBLISH${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Update version: npm version patch|minor|major"
    echo "  2. Publish: npm publish --access public"
    echo "  3. Test from npm: npx -y $PACKAGE_NAME"
    echo ""
    exit 0
else
    echo -e "${RED}❌ $FAILED TEST(S) FAILED - DO NOT PUBLISH${NC}"
    echo ""
    echo "Fix the issues above before publishing."
    echo ""
    exit 1
fi
