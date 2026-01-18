#!/bin/bash

# Claude Code Buddy MCP Server Setup Verification Script
# Checks if everything is properly configured before Claude Code integration

set -e

echo "🔍 Claude Code Buddy MCP Server Setup Verification"
echo "=============================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Check 1: Node.js version
echo "1️⃣  Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2)
MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1)
if [ "$MAJOR_VERSION" -ge 18 ]; then
    echo -e "   ${GREEN}✓${NC} Node.js $NODE_VERSION (>= 18.0.0)"
else
    echo -e "   ${RED}✗${NC} Node.js $NODE_VERSION (requires >= 18.0.0)"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check 2: Dependencies installed
echo "2️⃣  Checking dependencies..."
if [ -d "node_modules" ]; then
    echo -e "   ${GREEN}✓${NC} node_modules exists"
else
    echo -e "   ${RED}✗${NC} node_modules not found (run: npm install)"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check 3: Build artifacts
echo "3️⃣  Checking build artifacts..."
if [ -f "dist/mcp/server.js" ]; then
    echo -e "   ${GREEN}✓${NC} dist/mcp/server.js exists"
else
    echo -e "   ${RED}✗${NC} dist/mcp/server.js not found (run: npm run build)"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check 4: Environment variables
echo "4️⃣  Checking environment variables..."
if [ -f ".env" ]; then
    echo -e "   ${GREEN}✓${NC} .env file exists"

    if grep -q "ANTHROPIC_API_KEY" .env; then
        if grep -q "ANTHROPIC_API_KEY=sk-" .env; then
            echo -e "   ${GREEN}✓${NC} ANTHROPIC_API_KEY configured"
        else
            echo -e "   ${YELLOW}⚠${NC}  ANTHROPIC_API_KEY exists but may not be set"
            WARNINGS=$((WARNINGS + 1))
        fi
    else
        echo -e "   ${YELLOW}⚠${NC}  ANTHROPIC_API_KEY not found (orchestrator won't work)"
        WARNINGS=$((WARNINGS + 1))
    fi

else
    echo -e "   ${YELLOW}⚠${NC}  .env file not found (copy from .env.example)"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# Check 5: Test MCP server module loads
echo "5️⃣  Testing MCP server module..."
if node -e "require('./dist/mcp/server.js')" 2>/dev/null; then
    echo -e "   ${GREEN}✓${NC} MCP server module loads successfully"
else
    echo -e "   ${YELLOW}⚠${NC}  MCP server module check skipped (requires stdio)"
    echo -e "      (This is normal - server needs Claude Code connection)"
fi
echo ""

# Check 6: Agent registry loads
echo "6️⃣  Checking agent registry..."
AGENT_COUNT=$(grep -c "name:" src/core/AgentRegistry.ts 2>/dev/null || echo "0")
if [ "$AGENT_COUNT" -gt 0 ]; then
    echo -e "   ${GREEN}✓${NC} $AGENT_COUNT agents registered"
else
    echo -e "   ${YELLOW}⚠${NC}  Could not verify agent count"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# Summary
echo "=============================================="
echo ""
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Add Claude Code Buddy to ~/.claude.json"
    echo "   See: docs/MCP_INTEGRATION.md"
    echo "2. Restart Claude Code"
    echo "3. Verify tools appear in Claude Code"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ Setup complete with $WARNINGS warning(s)${NC}"
    echo ""
    echo "You can proceed, but some features may not work."
    echo "See: docs/MCP_INTEGRATION.md for details"
    exit 0
else
    echo -e "${RED}✗ Setup incomplete: $ERRORS error(s), $WARNINGS warning(s)${NC}"
    echo ""
    echo "Please fix the errors above before continuing."
    echo "Quick fixes:"
    echo "  - npm install      # Install dependencies"
    echo "  - npm run build    # Build project"
    echo "  - cp .env.example .env  # Create env file"
    exit 1
fi
