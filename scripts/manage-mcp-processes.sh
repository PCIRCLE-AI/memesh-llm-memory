#!/bin/bash

# CCB MCP Process Management Script
# Helps users manage CCB MCP server processes

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Function to list all CCB MCP processes
list_processes() {
    print_info "Listing all CCB MCP server processes..."
    echo ""

    # Find all CCB processes
    PROCESSES=$(ps aux | grep -E "claude-code-buddy|server-bootstrap" | grep -v grep | grep -v "manage-mcp-processes")

    if [ -z "$PROCESSES" ]; then
        print_success "No CCB MCP server processes found"
        return 0
    fi

    echo "$PROCESSES" | while read -r line; do
        PID=$(echo "$line" | awk '{print $2}')
        PARENT_PID=$(ps -p "$PID" -o ppid= 2>/dev/null | tr -d ' ')
        ELAPSED=$(ps -p "$PID" -o etime= 2>/dev/null | tr -d ' ')
        COMMAND=$(echo "$line" | awk '{for(i=11;i<=NF;i++) printf $i" "; print ""}')

        echo -e "${BLUE}PID${NC}: $PID | ${BLUE}PPID${NC}: $PARENT_PID | ${BLUE}Uptime${NC}: $ELAPSED"
        echo -e "  ${BLUE}Command${NC}: $COMMAND"

        # Check if parent process exists or is init (orphaned)
        if ! ps -p "$PARENT_PID" > /dev/null 2>&1 || [ "$PARENT_PID" -eq 1 ]; then
            print_warning "  ⚠ Orphaned process (parent process no longer exists)"
        fi

        echo ""
    done

    # Count processes
    COUNT=$(echo "$PROCESSES" | wc -l | tr -d ' ')
    print_info "Found $COUNT CCB MCP server process(es)"
}

# Function to kill all CCB MCP processes
kill_all_processes() {
    print_warning "Preparing to terminate all CCB MCP server processes..."

    # Find all CCB processes
    PIDS=$(ps aux | grep -E "claude-code-buddy|server-bootstrap" | grep -v grep | grep -v "manage-mcp-processes" | awk '{print $2}')

    if [ -z "$PIDS" ]; then
        print_success "No CCB MCP server processes found"
        return 0
    fi

    # Ask for confirmation
    echo -e "${YELLOW}The following processes will be terminated:${NC}"
    echo "$PIDS"
    echo ""
    read -p "Are you sure you want to terminate these processes? (y/N): " -n 1 -r
    echo ""

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Operation cancelled"
        return 0
    fi

    # Kill processes
    for PID in $PIDS; do
        if kill -15 "$PID" 2>/dev/null; then
            print_success "Terminated process $PID"
        else
            print_error "Failed to terminate process $PID (may require sudo)"
        fi
    done

    # Wait a bit and check if any processes are still running
    sleep 1

    REMAINING=$(ps aux | grep -E "claude-code-buddy|server-bootstrap" | grep -v grep | grep -v "manage-mcp-processes" | wc -l | tr -d ' ')

    if [ "$REMAINING" -eq 0 ]; then
        print_success "All CCB MCP server processes terminated"
    else
        print_warning "Still $REMAINING process(es) running, attempting force termination..."
        PIDS=$(ps aux | grep -E "claude-code-buddy|server-bootstrap" | grep -v grep | grep -v "manage-mcp-processes" | awk '{print $2}')
        for PID in $PIDS; do
            if kill -9 "$PID" 2>/dev/null; then
                print_success "Force-terminated process $PID"
            fi
        done
    fi
}

# Function to check CCB MCP configuration
check_config() {
    print_info "Checking CCB MCP configuration..."
    echo ""

    CONFIG_PATH="$HOME/.claude/config.json"

    if [ ! -f "$CONFIG_PATH" ]; then
        print_error "Configuration file not found: $CONFIG_PATH"
        return 1
    fi

    print_success "Configuration file exists: $CONFIG_PATH"

    # Check if CCB is configured
    if grep -q "claude-code-buddy" "$CONFIG_PATH"; then
        print_success "CCB MCP server is configured"

        # Extract CCB config
        echo ""
        print_info "CCB Configuration:"
        # Use jq if available, otherwise use grep
        if command -v jq > /dev/null 2>&1; then
            jq '.mcpServers["claude-code-buddy"]' "$CONFIG_PATH"
        else
            grep -A 10 "claude-code-buddy" "$CONFIG_PATH"
        fi
    else
        print_warning "CCB MCP server not configured in $CONFIG_PATH"
        print_info "Please run: npm run setup"
    fi
}

# Function to restart CCB MCP server
restart_server() {
    print_info "Restarting CCB MCP server..."
    echo ""

    # Kill existing processes
    kill_all_processes

    echo ""
    print_info "CCB MCP server stopped"
    print_info "MCP server will automatically restart when you launch Claude Code CLI"
}

# Function to show orphaned processes
show_orphaned() {
    print_info "Listing orphaned processes (parent process no longer exists)..."
    echo ""

    PROCESSES=$(ps aux | grep -E "claude-code-buddy|server-bootstrap" | grep -v grep | grep -v "manage-mcp-processes")

    if [ -z "$PROCESSES" ]; then
        print_success "No CCB MCP server processes found"
        return 0
    fi

    ORPHAN_COUNT=0

    while read -r line; do
        PID=$(echo "$line" | awk '{print $2}')
        PARENT_PID=$(ps -p "$PID" -o ppid= 2>/dev/null | tr -d ' ')

        # Check if parent process exists
        if ! ps -p "$PARENT_PID" > /dev/null 2>&1 || [ "$PARENT_PID" -eq 1 ]; then
            ORPHAN_COUNT=$((ORPHAN_COUNT + 1))
            ELAPSED=$(ps -p "$PID" -o etime= 2>/dev/null | tr -d ' ')
            print_warning "Orphaned process found - PID: $PID, Uptime: $ELAPSED"
        fi
    done <<< "$PROCESSES"

    if [ $ORPHAN_COUNT -eq 0 ]; then
        print_success "No orphaned processes found"
    else
        echo ""
        print_info "Found $ORPHAN_COUNT orphaned process(es)"
        print_info "Use 'npm run processes:kill' to clean up these processes"
    fi
}

# Function to show help
show_help() {
    cat << EOF
${BLUE}CCB MCP Process Management Script${NC}

Usage: $0 [COMMAND]

${YELLOW}Available commands:${NC}
  ${GREEN}list${NC}        List all CCB MCP server processes
  ${GREEN}kill${NC}        Terminate all CCB MCP server processes
  ${GREEN}restart${NC}     Restart CCB MCP server (terminate all processes)
  ${GREEN}config${NC}      Check CCB MCP configuration
  ${GREEN}orphaned${NC}    List orphaned processes (parent process no longer exists)
  ${GREEN}help${NC}        Show this help message

${YELLOW}Examples:${NC}
  $0 list          # List all processes
  $0 kill          # Terminate all processes
  $0 restart       # Restart MCP server
  $0 config        # Check configuration
  $0 orphaned      # List orphaned processes

${YELLOW}Notes:${NC}
- Claude Code CLI automatically starts an MCP server when a session begins
- Normally, each Claude Code CLI session has 1 MCP server process
- If you find multiple orphaned processes, use the 'kill' command to clean up
- After cleanup, the MCP server will automatically restart when you launch Claude Code CLI
EOF
}

# Main script
case "${1:-help}" in
    list)
        list_processes
        ;;
    kill)
        kill_all_processes
        ;;
    restart)
        restart_server
        ;;
    config)
        check_config
        ;;
    orphaned)
        show_orphaned
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
