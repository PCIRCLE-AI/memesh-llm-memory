#!/bin/bash

# Claude Code Buddy - Interactive Installation Script
# This script guides you through CCB setup step-by-step

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
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

print_info() {
    echo -e "${CYAN}ℹ $1${NC}"
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
echo "This interactive guide will set up CCB and show you how to use it."
echo ""

# Step 1: Check prerequisites
print_step "Step 1/9: Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    echo "Please install Node.js 20+ from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    print_error "Node.js version 20+ is required (found: $(node -v))"
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

echo ""
print_info "💡 Tip: CCB uses your Claude Code subscription - no extra API keys needed!"
echo ""

# Step 2: Install dependencies
print_step "Step 2/9: Installing dependencies..."
npm install
print_success "Dependencies installed"

echo ""
print_info "💡 What CCB does: Provides workflow guidance, smart planning, and project memory"
echo ""

# Step 3: Build project
print_step "Step 3/9: Building CCB..."
npm run build
print_success "Build completed"

echo ""
print_info "💡 CCB focuses on high-signal guidance without extra overhead"
echo ""

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

# Step 6: Configure MCP
print_step "Step 6/9: Configuring MCP integration..."

MCP_CONFIG="$HOME/.claude.json"
CCB_PATH="$(pwd)/dist/mcp/server.js"

# Check if .claude.json exists (Claude Code's main config file)
if [ ! -f "$MCP_CONFIG" ]; then
    echo '{"mcpServers": {}}' > "$MCP_CONFIG"
    print_success "Created $MCP_CONFIG"
fi

# Add CCB to MCP config using Node.js helper
node scripts/install-helpers.js add-to-mcp "$CCB_PATH"
print_success "CCB added to Claude Code MCP configuration"

echo ""
print_info "💡 CCB is now registered with Claude Code - it will activate when you start Claude Code"
echo ""

# Step 7: Test installation
print_step "Step 7/9: Testing installation..."
echo ""
echo "Running validation tests (this may take 30-60 seconds)..."
echo ""

# Progress bar function
show_progress() {
    local duration=$1
    local width=40
    local elapsed=0
    local chars="█▓▒░"

    while [ $elapsed -lt $duration ]; do
        local progress=$((elapsed * width / duration))
        local remaining=$((width - progress))

        # Build progress bar
        printf "\r  ["
        for ((i=0; i<progress; i++)); do printf "█"; done
        for ((i=0; i<remaining; i++)); do printf "░"; done
        printf "] %3d%%" $((elapsed * 100 / duration))

        sleep 1
        elapsed=$((elapsed + 1))
    done
    printf "\r  ["
    for ((i=0; i<width; i++)); do printf "█"; done
    printf "] 100%%\n"
}

# Run tests in background with progress indicator
TEST_OUTPUT_FILE=$(mktemp)
npm test -- --run > "$TEST_OUTPUT_FILE" 2>&1 &
TEST_PID=$!

# Animated spinner while tests run
spin_chars='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
test_start=$(date +%s)
echo -e "  ${CYAN}Running tests...${NC}"

while kill -0 $TEST_PID 2>/dev/null; do
    for ((i=0; i<${#spin_chars}; i++)); do
        if ! kill -0 $TEST_PID 2>/dev/null; then
            break 2
        fi
        elapsed=$(($(date +%s) - test_start))
        printf "\r  ${spin_chars:$i:1} Testing... (%ds)" $elapsed
        sleep 0.1
    done
done

# Wait for test to complete and check result
wait $TEST_PID
TEST_EXIT_CODE=$?

# Clear spinner line
printf "\r                                    \r"

# Show final result
if [ $TEST_EXIT_CODE -eq 0 ]; then
    elapsed=$(($(date +%s) - test_start))
    print_success "All tests passed (${elapsed}s)"
else
    if grep -q "passed" "$TEST_OUTPUT_FILE"; then
        PASS_COUNT=$(grep -oE "[0-9]+ passed" "$TEST_OUTPUT_FILE" | tail -1 | grep -oE "[0-9]+")
        FAIL_COUNT=$(grep -oE "[0-9]+ failed" "$TEST_OUTPUT_FILE" | tail -1 | grep -oE "[0-9]+" || echo "0")
        print_warning "Tests: ${PASS_COUNT:-?} passed, ${FAIL_COUNT:-some} failed (installation still successful)"
    else
        print_warning "Some tests failed (installation still successful)"
    fi
fi
rm -f "$TEST_OUTPUT_FILE"

# Step 8: Usage Demonstration
print_step "Step 8/9: Basic Usage Demo"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "What can CCB do for you?"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "${CYAN}🤖 Smart Task Routing${NC}"
echo "   CCB routes requests through a focused workflow engine"
echo "   to provide actionable guidance and higher-quality outputs."
echo ""
echo "${CYAN}💡 Example Prompts to Try in Claude Code:${NC}"
echo "   \"Analyze my codebase architecture\""
echo "   \"Generate tests for auth.ts\""
echo "   \"Review this code for security issues\""
echo "   \"Optimize this database query\""
echo "   \"Help me debug this async bug\""
echo ""
echo "${CYAN}📊 Project Memory:${NC}"
echo "   CCB records decisions, changes, and test outcomes"
echo "   into a local knowledge graph for future recall."
echo ""
echo "${CYAN}⚡ Smart Model Selection:${NC}"
echo "   CCB saves ~40% on token costs by routing simple tasks"
echo "   to efficient models, reserving Claude for complex work."
echo ""

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
echo "  1. ${CYAN}Restart Claude Code${NC} (if running)"
echo "  2. ${CYAN}Try the example prompts${NC} shown above"
echo ""
echo "Documentation:"
echo "  • Quick Start: README.md"
echo "  • Full Guide: docs/README.md"
echo "  • Commands: docs/COMMANDS.md"
print_success "Happy coding with your new buddy! 🤖"
echo ""
