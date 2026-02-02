#!/bin/bash
set -e

# Trap errors and provide helpful context
trap 'echo ""; echo "❌ Setup failed at line $LINENO"; echo "   You can run the script again or see README.md for manual setup"; exit 1' ERR

echo "🚀 MeMesh - Automated Setup"
echo "=================================="
echo ""

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "❌ Error: Node.js 20+ required (current: $(node -v))"
  exit 1
fi
echo "✅ Node.js version: $(node -v)"

# Check npm is installed
if ! command -v npm &> /dev/null; then
  echo "❌ Error: npm is not installed"
  echo "   Please install Node.js and npm from https://nodejs.org/"
  exit 1
fi
echo "✅ npm is installed"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install
echo "✅ Dependencies installed"

# Setup environment
echo ""
if [ ! -f .env ]; then
  echo "📝 Creating .env file..."
  cp .env.example .env
  echo "✅ .env created from template"
  echo ""
  # Check if MCP_SERVER_MODE is true
  if grep -q "MCP_SERVER_MODE=true" .env 2>/dev/null; then
    echo "ℹ️  MCP Server mode enabled - Claude Code will manage API access"
  else
    echo "⚠️  IMPORTANT: Edit .env and add your ANTHROPIC_API_KEY"
    echo "   Get your key from: https://console.anthropic.com/"
  fi
else
  echo "✅ .env file already exists"
fi

# Run tests
echo ""
echo "🧪 Running tests..."
if npm test; then
  echo "✅ All tests passed"
else
  echo "⚠️  Some tests failed, but you can continue setup"
  echo "   Fix test issues later by running: npm test"
fi

# Build project
echo ""
echo "🔨 Building project..."
npm run build
echo "✅ Build complete"

# Optional MCP Server Setup
echo ""
echo "📡 MCP Server Setup (Optional)"
read -p "Would you like to configure MCP server integration? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "🔧 Starting MCP server configuration..."
  npm run mcp || {
    echo "⚠️  MCP server setup failed. You can configure it later with: npm run mcp"
  }
else
  echo "⏭  Skipping MCP server setup. You can configure it later with: npm run mcp"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
if grep -q "MCP_SERVER_MODE=false" .env 2>/dev/null; then
  echo "1. Edit .env and add your ANTHROPIC_API_KEY"
  echo "   Get your key from: https://console.anthropic.com/"
else
  echo "1. ✅ MCP Server mode is configured - Claude Code will handle API access"
fi
echo "2. Configure Claude Code to use this MCP server (if not already done)"
echo ""
echo "Documentation: README.md"
echo "Setup time: < 15 minutes"
