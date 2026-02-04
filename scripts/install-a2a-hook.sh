#!/usr/bin/env bash
#
# install-a2a-hook.sh
#
# Install A2A collaboration hook to Claude Code session-start
# This script is idempotent and safe to run multiple times.
#
# Features:
# - Copies A2A hook to ~/.claude/hooks/
# - Updates session-start.js to integrate the hook
# - Handles existing installations gracefully
# - Makes hooks executable
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
HOOKS_SOURCE_DIR="$PROJECT_ROOT/scripts/hooks"
CLAUDE_HOOKS_DIR="$HOME/.claude/hooks"
STATE_DIR="$HOME/.claude/state"

# Files
A2A_HOOK_SOURCE="$HOOKS_SOURCE_DIR/a2a-collaboration-hook.js"
A2A_HOOK_TARGET="$CLAUDE_HOOKS_DIR/a2a-collaboration-hook.js"
SESSION_START="$CLAUDE_HOOKS_DIR/session-start.js"

# Temp file tracking for cleanup
TEMP_FILES=()

# Cleanup function for temp files
cleanup() {
    for f in "${TEMP_FILES[@]:-}"; do
        [[ -f "$f" ]] && rm -f "$f"
    done
}
trap cleanup EXIT

# ============================================
# Utility Functions
# ============================================

print_header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  A2A Collaboration Hook Installation${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# ============================================
# Pre-flight Checks
# ============================================

check_source_file() {
    if [[ ! -f "$A2A_HOOK_SOURCE" ]]; then
        print_error "Source hook not found: $A2A_HOOK_SOURCE"
        exit 1
    fi
    print_success "Source hook found"
}

create_directories() {
    mkdir -p "$CLAUDE_HOOKS_DIR"
    mkdir -p "$STATE_DIR"
    print_success "Directories created"
}

# ============================================
# Installation Functions
# ============================================

install_hook() {
    if [[ -f "$A2A_HOOK_TARGET" ]]; then
        # Check if files are different
        if cmp -s "$A2A_HOOK_SOURCE" "$A2A_HOOK_TARGET"; then
            print_info "Hook already installed and up-to-date"
        else
            cp "$A2A_HOOK_SOURCE" "$A2A_HOOK_TARGET"
            print_success "Hook updated to latest version"
        fi
    else
        cp "$A2A_HOOK_SOURCE" "$A2A_HOOK_TARGET"
        print_success "Hook installed"
    fi

    # Make executable
    chmod +x "$A2A_HOOK_TARGET"
}

update_session_start() {
    if [[ ! -f "$SESSION_START" ]]; then
        print_warning "session-start.js not found at $SESSION_START"
        print_info "Creating new session-start.js with A2A integration"

        cat > "$SESSION_START" << 'EOFJS'
#!/usr/bin/env node

/**
 * Claude Code Session Start Hook
 * Automatically runs when a new Claude Code session starts
 */

import { initA2ACollaboration } from './a2a-collaboration-hook.js';

async function sessionStart() {
  console.log('Starting Claude Code session...');

  // Initialize A2A collaboration
  const agentIdentity = initA2ACollaboration();

  console.log('Session ready!');
}

// Run session start
sessionStart().catch(error => {
  console.error('Session start error:', error);
  process.exit(1);
});
EOFJS

        chmod +x "$SESSION_START"
        print_success "Created session-start.js with A2A integration"
        return
    fi

    # Check if already integrated
    if grep -q "initA2ACollaboration" "$SESSION_START"; then
        print_info "A2A hook already integrated in session-start.js"
        return
    fi

    # Backup original
    cp "$SESSION_START" "$SESSION_START.backup"
    print_info "Backed up session-start.js"

    # Create temporary file for modification
    # Create temporary file (tracked for cleanup via EXIT trap)
    TEMP_FILE=$(mktemp)
    TEMP_FILES+=("$TEMP_FILE")

    # Add import at the top (after shebang and before other imports)
    awk '
    BEGIN { import_added = 0 }
    /^#!/ {
        print
        next
    }
    /^import/ && !import_added {
        print "import { initA2ACollaboration } from '\''./a2a-collaboration-hook.js'\'';"
        print ""
        import_added = 1
    }
    { print }
    END {
        if (!import_added) {
            print ""
            print "import { initA2ACollaboration } from '\''./a2a-collaboration-hook.js'\'';"
        }
    }
    ' "$SESSION_START" > "$TEMP_FILE"

    # Add function call in sessionStart() or main function
    # Look for common patterns: sessionStart(), main(), or just after console.log
    if grep -q "function sessionStart\|async function sessionStart" "$TEMP_FILE"; then
        # Insert after function declaration
        awk '
        /function sessionStart\(\).*{|async function sessionStart\(\).*{/ {
            print
            getline
            print
            print "  // A2A Collaboration"
            print "  const agentIdentity = initA2ACollaboration();"
            print ""
            next
        }
        { print }
        ' "$TEMP_FILE" > "$SESSION_START"
    else
        # Just append at the end before any existing process.exit
        awk '
        /process\.exit/ {
            if (!added) {
                print ""
                print "// A2A Collaboration"
                print "const agentIdentity = initA2ACollaboration();"
                print ""
                added = 1
            }
        }
        { print }
        END {
            if (!added) {
                print ""
                print "// A2A Collaboration"
                print "const agentIdentity = initA2ACollaboration();"
            }
        }
        ' "$TEMP_FILE" > "$SESSION_START"
    fi

    rm "$TEMP_FILE"
    chmod +x "$SESSION_START"
    print_success "Integrated A2A hook into session-start.js"
}

verify_installation() {
    local errors=0

    echo ""
    print_info "Verifying installation..."
    echo ""

    # Check hook file
    if [[ -f "$A2A_HOOK_TARGET" ]]; then
        print_success "Hook file exists: $A2A_HOOK_TARGET"
    else
        print_error "Hook file missing: $A2A_HOOK_TARGET"
        ((errors++))
    fi

    # Check executable permissions
    if [[ -x "$A2A_HOOK_TARGET" ]]; then
        print_success "Hook is executable"
    else
        print_error "Hook is not executable"
        ((errors++))
    fi

    # Check session-start.js exists
    if [[ -f "$SESSION_START" ]]; then
        print_success "session-start.js exists"
    else
        print_error "session-start.js missing"
        ((errors++))
    fi

    # Check integration
    if grep -q "initA2ACollaboration" "$SESSION_START"; then
        print_success "A2A hook integrated in session-start.js"
    else
        print_error "A2A hook not integrated"
        ((errors++))
    fi

    echo ""

    if [[ $errors -eq 0 ]]; then
        print_success "All checks passed!"
        return 0
    else
        print_error "$errors check(s) failed"
        return 1
    fi
}

# ============================================
# Main Installation Flow
# ============================================

main() {
    print_header

    print_info "Starting installation..."
    echo ""

    # Run installation steps
    check_source_file
    create_directories
    install_hook
    update_session_start

    # Verify
    if verify_installation; then
        echo ""
        echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
        echo -e "${GREEN}  Installation Complete!${NC}"
        echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
        echo ""
        print_info "The A2A collaboration hook will run automatically on next Claude Code session"
        print_info "Hook location: $A2A_HOOK_TARGET"
        print_info "Integration: $SESSION_START"

        if [[ -f "$SESSION_START.backup" ]]; then
            print_info "Backup: $SESSION_START.backup"
        fi

        echo ""
        print_info "Next steps:"
        echo "  1. Start a new Claude Code session"
        echo "  2. You'll see an agent check-in message with your agent name"
        echo "  3. Use a2a-send-task to delegate tasks to other agents"
        echo ""

        return 0
    else
        echo ""
        print_error "Installation verification failed"
        print_info "Please check the errors above and try again"

        if [[ -f "$SESSION_START.backup" ]]; then
            print_info "Original session-start.js backed up to: $SESSION_START.backup"
        fi

        echo ""
        return 1
    fi
}

# Run main installation
main "$@"
