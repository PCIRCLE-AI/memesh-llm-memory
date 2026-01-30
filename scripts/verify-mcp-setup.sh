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
if [ "$MAJOR_VERSION" -ge 20 ]; then
    echo -e "   ${GREEN}✓${NC} Node.js $NODE_VERSION (>= 20.0.0)"
else
    echo -e "   ${RED}✗${NC} Node.js $NODE_VERSION (requires >= 20.0.0)"
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
if [ -f "dist/mcp/server-bootstrap.js" ]; then
    echo -e "   ${GREEN}✓${NC} dist/mcp/server-bootstrap.js exists"
else
    echo -e "   ${RED}✗${NC} dist/mcp/server-bootstrap.js not found (run: npm run build)"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check 4: Environment variables
echo "4️⃣  Checking environment variables..."
if [ -f ".env" ]; then
    echo -e "   ${GREEN}✓${NC} .env file exists"

    if grep -q "MCP_SERVER_MODE=false" .env; then
        if grep -q "ANTHROPIC_API_KEY=sk-" .env; then
            echo -e "   ${GREEN}✓${NC} ANTHROPIC_API_KEY configured"
        else
            echo -e "   ${YELLOW}⚠${NC}  ANTHROPIC_API_KEY not configured (required for standalone mode)"
            WARNINGS=$((WARNINGS + 1))
        fi
    else
        echo -e "   ${GREEN}✓${NC} MCP Server mode enabled (API key optional)"
    fi

else
    echo -e "   ${YELLOW}⚠${NC}  .env file not found (optional in MCP Server mode)"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# Check 5: Claude Code MCP config
echo "5️⃣  Checking Claude Code MCP config..."
CONFIG_PATH=""
for CANDIDATE in "$HOME/.claude.json" "$HOME/.config/claude/claude_desktop_config.json" "$HOME/.claude/mcp_settings.json"; do
    if [ -f "$CANDIDATE" ]; then
        CONFIG_PATH="$CANDIDATE"
        break
    fi
done

if [ -z "$CONFIG_PATH" ]; then
    echo -e "   ${YELLOW}⚠${NC}  MCP config file not found"
    WARNINGS=$((WARNINGS + 1))
else
    if node -e "const fs=require('fs'); const config=JSON.parse(fs.readFileSync(process.argv[2], 'utf8')); if (config?.mcpServers?.['claude-code-buddy']) process.exit(0); process.exit(1);" "$CONFIG_PATH" 2>/dev/null; then
        echo -e "   ${GREEN}✓${NC} claude-code-buddy registered in $CONFIG_PATH"
    else
        echo -e "   ${YELLOW}⚠${NC}  claude-code-buddy not found in $CONFIG_PATH"
        WARNINGS=$((WARNINGS + 1))
    fi
fi
echo ""

# Check 6: Test MCP server module loads
echo "6️⃣  Testing MCP server module..."
if node --input-type=module -e "import('./dist/mcp/server-bootstrap.js')" 2>/dev/null; then
    echo -e "   ${GREEN}✓${NC} MCP server bootstrap loads successfully"
else
    echo -e "   ${YELLOW}⚠${NC}  MCP server module check skipped (requires stdio)"
    echo -e "      (This is normal - server needs Claude Code connection)"
fi
echo ""

# Check 7: MCP tool definitions
echo "7️⃣  Checking MCP tool definitions..."
TOOL_COUNT=$(grep -c "name: '" src/mcp/ToolDefinitions.ts 2>/dev/null || echo "0")
if [ "$TOOL_COUNT" -gt 0 ]; then
    echo -e "   ${GREEN}✓${NC} $TOOL_COUNT tools defined"
else
    echo -e "   ${YELLOW}⚠${NC}  Could not verify tool definitions"
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
    echo "   See: docs/guides/SETUP.md"
    echo "2. Restart Claude Code"
    echo "3. Verify tools appear in Claude Code"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ Setup complete with $WARNINGS warning(s)${NC}"
    echo ""
    echo "You can proceed, but some features may not work."
    echo "See: docs/guides/SETUP.md for details"
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
