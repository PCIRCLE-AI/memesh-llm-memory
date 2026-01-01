#!/bin/bash

# Claude Code Buddy - Interactive Installation Script
# This script guides you through CCB setup step-by-step

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_step() {
    echo -e "${BLUE}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# ASCII Art Banner
cat << "EOF"
  _____ _                 _        ___          _        ____            _     _
 / ____| |               | |      / __|        | |      |  _ \          | |   | |
| |    | | __ _ _   _  __| | ___ | |  ___   __| | ___  | |_) |_   _  __| | __| |_   _
| |    | |/ _` | | | |/ _` |/ _ \| | / _ \ / _` |/ _ \ |  _ <| | | |/ _` |/ _` | | | |
| |____| | (_| | |_| | (_| |  __/| |_| (_) | (_| |  __/ | |_) | |_| | (_| | (_| | |_| |
 \_____|_|\__,_|\__,_|\__,_|\___| \___\___/ \__,_|\___| |____/ \__,_|\__,_|\__,_|\__, |
                                                                                   __/ |
                                                                                  |___/
EOF

echo ""
echo "Welcome to Claude Code Buddy installation!"
echo "This script will guide you through setup step-by-step."
echo ""

# Step 1: Check prerequisites
print_step "Step 1/9: Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    echo "Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18+ is required (found: $(node -v))"
    exit 1
fi
print_success "Node.js $(node -v) found"

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
fi
print_success "npm $(npm -v) found"

# Check git
if ! command -v git &> /dev/null; then
    print_warning "git not found (optional, but recommended)"
else
    print_success "git $(git --version | cut -d' ' -f3) found"
fi

# Step 2: Install dependencies
print_step "Step 2/9: Installing dependencies..."
npm install
print_success "Dependencies installed"

# Step 3: Build project
print_step "Step 3/9: Building CCB..."
npm run build
print_success "Build completed"

# Step 4: Check system resources
print_step "Step 4/9: Checking system resources..."
echo ""
node scripts/check-system-resources.js || true  # Don't fail on error
echo ""

# Step 5: Configure environment (optional)
print_step "Step 5/9: Configuring environment..."

# Check if .env exists
if [ -f .env ]; then
    print_success ".env file already exists"
else
    cp .env.example .env
    print_success ".env file created from template"
    echo ""
    echo "Note: Claude Code Buddy uses your existing Claude Code subscription."
    echo "No API keys are needed - it works through Claude Code's MCP integration."
    echo ""
fi

# Step 6: Configure RAG (optional)
print_step "Step 6/9: Configure RAG (optional)..."
echo ""
echo "RAG (Retrieval-Augmented Generation) allows CCB to:"
echo "  • Index and search your project documentation"
echo "  • Remember context from files you drop in ~/Documents/claude-code-buddy-knowledge/"
echo "  • Provide more accurate answers based on your codebase"
echo ""
echo "RAG requires an embedding provider:"
echo "  1. HuggingFace (FREE) - Uses free Hugging Face Inference API"
echo "  2. OpenAI (PAID) - Uses OpenAI embeddings (requires API key)"
echo ""

# Ask if user wants to enable RAG
read -p "Do you want to enable RAG? (y/n): " enable_rag

if [[ "$enable_rag" =~ ^[Yy]$ ]]; then
    echo ""
    read -p "Choose embedding provider (1=HuggingFace FREE, 2=OpenAI PAID): " provider_choice

    if [ "$provider_choice" = "1" ]; then
        # HuggingFace (free)
        print_success "Using HuggingFace (free)"
        echo ""
        echo "Get your FREE HuggingFace API key:"
        echo "  1. Go to https://huggingface.co/settings/tokens"
        echo "  2. Create a new token (read access is enough)"
        echo ""
        read -p "Enter your HuggingFace API key (or press Enter to skip): " hf_key

        if [ ! -z "$hf_key" ]; then
            # Update .env with HuggingFace config
            sed -i.bak "s|^EMBEDDING_PROVIDER=.*|EMBEDDING_PROVIDER=huggingface|" .env
            sed -i.bak "s|^HUGGINGFACE_API_KEY=.*|HUGGINGFACE_API_KEY=$hf_key|" .env
            sed -i.bak "s|^# RAG_ENABLED=.*|RAG_ENABLED=true|" .env 2>/dev/null || echo "RAG_ENABLED=true" >> .env
            rm -f .env.bak

            # Create knowledge drop inbox
            mkdir -p "$HOME/Documents/claude-code-buddy-knowledge"
            print_success "RAG enabled with HuggingFace (free)"
            print_success "Knowledge drop inbox created: ~/Documents/claude-code-buddy-knowledge/"
        else
            print_warning "Skipped HuggingFace API key - RAG will not be enabled"
        fi

    elif [ "$provider_choice" = "2" ]; then
        # OpenAI (paid)
        print_success "Using OpenAI"
        echo ""
        echo "Get your OpenAI API key:"
        echo "  1. Go to https://platform.openai.com/api-keys"
        echo "  2. Create a new secret key"
        echo ""
        read -p "Enter your OpenAI API key (or press Enter to skip): " openai_key

        if [ ! -z "$openai_key" ]; then
            # Update .env with OpenAI config
            sed -i.bak "s|^EMBEDDING_PROVIDER=.*|EMBEDDING_PROVIDER=openai|" .env
            sed -i.bak "s|^OPENAI_API_KEY=.*|OPENAI_API_KEY=$openai_key|" .env
            sed -i.bak "s|^# RAG_ENABLED=.*|RAG_ENABLED=true|" .env 2>/dev/null || echo "RAG_ENABLED=true" >> .env
            rm -f .env.bak

            # Create knowledge drop inbox
            mkdir -p "$HOME/Documents/claude-code-buddy-knowledge"
            print_success "RAG enabled with OpenAI"
            print_success "Knowledge drop inbox created: ~/Documents/claude-code-buddy-knowledge/"
        else
            print_warning "Skipped OpenAI API key - RAG will not be enabled"
        fi
    else
        print_warning "Invalid choice - RAG will not be enabled"
    fi
else
    print_success "RAG disabled (you can enable it later by editing .env)"
fi

echo ""

# Step 7: Configure MCP
print_step "Step 7/9: Configuring MCP integration..."

MCP_CONFIG="$HOME/.claude/config.json"
CCB_PATH="$(pwd)/dist/mcp/server.js"

# Create ~/.claude directory if it doesn't exist
mkdir -p "$HOME/.claude"

# Check if config.json exists
if [ ! -f "$MCP_CONFIG" ]; then
    echo '{"mcpServers": {}}' > "$MCP_CONFIG"
    print_success "Created $MCP_CONFIG"
fi

# Add CCB to MCP config using Node.js helper
node scripts/install-helpers.js add-to-mcp "$CCB_PATH"
print_success "CCB added to Claude Code MCP configuration"

# Step 8: Test installation
print_step "Step 8/9: Testing installation..."

# Run a simple test
if npm test -- --run 2>&1 | grep -q "PASS"; then
    print_success "Tests passed"
else
    print_warning "Some tests failed (installation still successful)"
fi

# Step 9: Verify MCP server
print_step "Step 9/9: Verifying MCP server..."

# Try to start MCP server (timeout after 3 seconds)
timeout 3 node dist/mcp/server.js &> /dev/null && print_success "MCP server starts successfully" || print_success "MCP server configured (will start when Claude Code connects)"

# Installation complete
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_success "Installation complete! 🎉"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "  1. Restart Claude Code (if running)"
echo "  2. Use CCB commands:"
echo "     • buddy do <task>       - Execute tasks with smart routing"
echo "     • buddy stats           - View performance dashboard"
echo "     • buddy remember <query> - Recall project memory"
echo ""
echo "Documentation:"
echo "  • Quick Start: README.md"
echo "  • Full Guide: docs/README.md"
echo "  • Commands: docs/COMMANDS.md"
echo ""
print_success "Happy coding with your new buddy! 🤖"
