#!/bin/bash
set -e

echo "🚀 Smart Agents - Automated Setup"
echo "=================================="
echo ""

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Error: Node.js 18+ required (current: $(node -v))"
  exit 1
fi
echo "✅ Node.js version: $(node -v)"

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
  echo "⚠️  IMPORTANT: Edit .env and add your ANTHROPIC_API_KEY"
  echo "   Get your key from: https://console.anthropic.com/"
else
  echo "✅ .env file already exists"
fi

# Run tests
echo ""
echo "🧪 Running tests..."
npm test
echo "✅ All tests passed"

# Build project
echo ""
echo "🔨 Building project..."
npm run build
echo "✅ Build complete"

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env and add your ANTHROPIC_API_KEY"
echo "2. Start MCP server: npm run mcp:start"
echo "3. Configure Claude Code to use this MCP server"
echo ""
echo "Documentation: README.md"
echo "Setup time: < 15 minutes"
