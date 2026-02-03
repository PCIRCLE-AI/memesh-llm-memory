#!/bin/bash
# MeMesh Installation Verification Script
# Verifies that MeMesh MCP Server is properly installed and working

set -e

echo "======================================"
echo "MeMesh Installation Verification"
echo "======================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check if dist/mcp/server-bootstrap.js exists
echo "Step 1: Checking compiled MCP server..."
if [ -f "dist/mcp/server-bootstrap.js" ]; then
    echo -e "${GREEN}✓${NC} dist/mcp/server-bootstrap.js exists"
else
    echo -e "${RED}✗${NC} dist/mcp/server-bootstrap.js not found"
    echo "Please run: npm run build"
    exit 1
fi

# Step 2: Check if MeMesh is in MCP server list
echo ""
echo "Step 2: Checking MCP server registration..."
if claude mcp list | grep -E -q "memesh-mcp|memesh|claude-code-buddy"; then
    echo -e "${GREEN}✓${NC} MeMesh is registered in MCP server list"
else
    echo -e "${RED}✗${NC} MeMesh is not registered"
    echo "Please run: claude mcp add memesh-mcp --scope user -e NODE_ENV=production -e MEMESH_DATA_DIR=\$HOME/.memesh -e LOG_LEVEL=info -e DISABLE_MCP_WATCHDOG=1 -- node $(pwd)/dist/mcp/server-bootstrap.js"
    exit 1
fi

# Step 3: Check connection status
echo ""
echo "Step 3: Checking MCP server connection..."
if claude mcp list | grep -E "memesh-mcp|memesh|claude-code-buddy" | grep -q "✓ Connected"; then
    echo -e "${GREEN}✓${NC} MeMesh MCP server is connected"
else
    echo -e "${RED}✗${NC} MeMesh MCP server failed to connect"
    echo "Please check logs and verify the build is up to date"
    echo "Make sure DISABLE_MCP_WATCHDOG=1 is set in the MCP server environment"
    exit 1
fi

# Step 4: Test manual execution
echo ""
echo "Step 4: Testing manual execution (3 second test)..."
NODE_ENV=production MEMESH_DATA_DIR=$HOME/.memesh LOG_LEVEL=info DISABLE_MCP_WATCHDOG=1 node dist/mcp/server-bootstrap.js 2>&1 &
NODE_PID=$!
sleep 3
if kill -0 $NODE_PID 2>/dev/null; then
    echo -e "${GREEN}✓${NC} MeMesh MCP server runs successfully"
    kill -SIGTERM $NODE_PID 2>/dev/null || true
    wait $NODE_PID 2>/dev/null || true
else
    echo -e "${RED}✗${NC} MeMesh MCP server crashed during startup"
    exit 1
fi

echo ""
echo "======================================"
echo -e "${GREEN}✓ All checks passed!${NC}"
echo "======================================"
echo ""
echo "MeMesh v2.6.0 is successfully installed and working."
echo ""
echo "Next steps:"
echo "1. Restart your Claude Code session to load the new MCP server"
echo "2. Use MeMesh MCP tools in Claude Code"
echo ""
echo "Available MeMesh tools:"
echo "  - buddy-do: Execute tasks with intelligent routing"
echo "  - buddy-remember: Store and retrieve knowledge"
echo "  - buddy-plan: Generate implementation plans"
echo "  - And more..."
echo ""
