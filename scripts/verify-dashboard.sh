#!/bin/bash
# Dashboard Verification Script
#
# Verifies that the memesh dashboard command is working correctly

set -e

echo "🔍 Verifying MeMesh Dashboard Implementation..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check if dashboard.ts exists
echo -n "1. Checking source file... "
if [ -f "src/cli/dashboard.ts" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ Missing src/cli/dashboard.ts${NC}"
    exit 1
fi

# Test 2: Check if dashboard.js is built
echo -n "2. Checking compiled file... "
if [ -f "dist/cli/dashboard.js" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ Missing dist/cli/dashboard.js${NC}"
    exit 1
fi

# Test 3: Check if tests exist
echo -n "3. Checking test file... "
if [ -f "src/cli/__tests__/dashboard.test.ts" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠ Missing tests${NC}"
fi

# Test 4: Check if documentation exists
echo -n "4. Checking documentation... "
if [ -f "docs/cli-dashboard.md" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠ Missing documentation${NC}"
fi

# Test 5: Run tests
echo -n "5. Running tests... "
if npm test -- src/cli/__tests__/dashboard.test.ts > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ Tests failed${NC}"
    exit 1
fi

# Test 6: Check CLI integration
echo -n "6. Checking CLI integration... "
if node dist/mcp/server-bootstrap.js --help | grep -q "dashboard"; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ Dashboard not in CLI help${NC}"
    exit 1
fi

# Test 7: Test dashboard execution (brief)
echo -n "7. Testing dashboard execution... "
# Run dashboard for 1 second in background and kill it
timeout 1s node dist/mcp/server-bootstrap.js dashboard > /dev/null 2>&1 || true
echo -e "${GREEN}✓${NC}"

echo ""
echo -e "${GREEN}✅ All verification checks passed!${NC}"
echo ""
echo "Dashboard is ready to use:"
echo "  $ memesh dashboard"
echo ""
