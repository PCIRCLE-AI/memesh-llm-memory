#!/bin/bash

# Quick Install Script for MeMesh
# This script installs MeMesh as a Claude Code plugin

set -e

echo "🚀 MeMesh - Quick Install"
echo "===================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 20+ first."
    exit 1
fi

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Node.js version must be 20 or higher. Current: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"
echo ""

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Check if we're in the right directory
if [ ! -f "$PROJECT_DIR/package.json" ]; then
    echo "❌ Cannot find package.json. Please run this script from the MeMesh directory."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
cd "$PROJECT_DIR"
npm install

# Build the project
echo "🔨 Building MeMesh..."
npm run build

# Prepare plugin directory structure
echo "📦 Preparing plugin directory..."
npm run build:plugin

# Check if plugin was successfully prepared
if [ ! -f "$PROJECT_DIR/.claude-plugin/memesh/.claude-plugin/plugin.json" ]; then
    echo "❌ Plugin preparation failed. Please check the error messages above."
    exit 1
fi

if [ ! -f "$PROJECT_DIR/.claude-plugin/memesh/dist/mcp/server-bootstrap.js" ]; then
    echo "❌ MCP server build failed. Please check the error messages above."
    exit 1
fi

# Configure environment
echo "🔧 Configuring environment..."

# Create .env if it doesn't exist
if [ ! -f "$PROJECT_DIR/.env" ]; then
    if [ -f "$PROJECT_DIR/.env.example" ]; then
        cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
        echo "✅ Created .env from template"
    else
        touch "$PROJECT_DIR/.env"
        echo "✅ Created .env file"
    fi
fi

# Generate A2A token if not exists
if ! grep -q "^MEMESH_A2A_TOKEN=.\+$" "$PROJECT_DIR/.env" 2>/dev/null; then
    if [ -f "$PROJECT_DIR/scripts/generate-a2a-token.sh" ]; then
        echo "🔐 Generating A2A authentication token..."
        if bash "$PROJECT_DIR/scripts/generate-a2a-token.sh" > /dev/null 2>&1; then
            echo "✅ A2A token generated successfully"
        else
            echo "⚠️  Failed to generate A2A token (run manually: bash scripts/generate-a2a-token.sh)"
        fi
    else
        echo "⚠️  A2A token generator not found (run: bash scripts/generate-a2a-token.sh)"
    fi
else
    echo "✅ A2A token already configured"
fi

echo ""

# Check if claude CLI is available
if command -v claude &> /dev/null; then
    echo ""
    echo "✅ Claude CLI detected"
    echo "📝 Registering MCP server 'memesh-mcp'..."

    # Register MCP server with all required environment variables
    if claude mcp add memesh-mcp --scope user \
        -e NODE_ENV=production \
        -e MEMESH_DATA_DIR=$HOME/.memesh \
        -e LOG_LEVEL=info \
        -e DISABLE_MCP_WATCHDOG=1 \
        -- node "$PROJECT_DIR/.claude-plugin/memesh/dist/mcp/server-bootstrap.js"; then
        echo "✅ MCP server registered successfully"
    else
        echo "⚠️  MCP server registration failed"
        echo "   Try manual registration (see below)"
    fi

    echo ""
    echo "   To verify, run:"
    echo "   claude mcp list | grep memesh-mcp"
else
    echo ""
    echo "⚠️  Claude CLI not found"
    echo "   Plugin prepared successfully but not registered"
    echo ""
    echo "   Manual registration:"
    echo "   claude mcp add memesh-mcp --scope user \\"
    echo "     -e NODE_ENV=production \\"
    echo "     -e MEMESH_DATA_DIR=\$HOME/.memesh \\"
    echo "     -e LOG_LEVEL=info \\"
    echo "     -e DISABLE_MCP_WATCHDOG=1 \\"
    echo "     -- node \"$PROJECT_DIR/.claude-plugin/memesh/dist/mcp/server-bootstrap.js\""
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Installation complete!"
echo ""
echo "📁 Plugin structure:"
echo "   .claude-plugin/memesh/"
echo "   ├── .claude-plugin/"
echo "   │   └── plugin.json"
echo "   ├── dist/"
echo "   │   └── mcp/server-bootstrap.js"
echo "   ├── node_modules/"
echo "   └── scripts/"
echo ""
echo "🔄 Next steps:"
echo "   1. Restart Claude Code (completely quit and reopen)"
echo "   2. Check MCP server: claude mcp list | grep memesh-mcp"
echo "   3. Start using A2A Protocol features!"
echo ""
echo "📚 Documentation:"
echo "   - Setup guide: docs/DEV_SETUP_GUIDE.md"
echo "   - A2A features: docs/A2A_SETUP_GUIDE.md"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎉 Happy coding with MeMesh!"
