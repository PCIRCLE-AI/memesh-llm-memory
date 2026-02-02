#!/bin/bash

# Quick Install Script for Claude Code Buddy
# This script installs CCB as a Claude Code plugin

set -e

echo "🚀 Claude Code Buddy - Quick Install"
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
    echo "❌ Cannot find package.json. Please run this script from the CCB directory."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
cd "$PROJECT_DIR"
npm install

# Build the project
echo "🔨 Building CCB..."
npm run build

# Check if build was successful
if [ ! -f "$PROJECT_DIR/dist/mcp/server-bootstrap.js" ]; then
    echo "❌ Build failed. Please check the error messages above."
    exit 1
fi

echo ""
echo "✅ Installation complete!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 To use CCB, run:"
echo ""
echo "   claude --plugin-dir $PROJECT_DIR"
echo ""
echo "💡 Tip: Add this to your shell alias for easier access:"
echo "   alias claude-ccb='claude --plugin-dir $PROJECT_DIR'"
echo ""
echo "📚 For team distribution, see:"
echo "   https://code.claude.com/docs/en/plugin-marketplaces"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎉 Happy coding with CCB!"
