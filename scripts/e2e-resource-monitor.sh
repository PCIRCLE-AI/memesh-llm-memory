#!/bin/bash

# E2E Test Resource Monitor
# Prevents system resource exhaustion during E2E tests
# Monitors CPU and memory usage, terminates tests if thresholds exceeded

set -e

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Resource limits (matching CLAUDE.md requirements)
CPU_LIMIT=70        # CPU percentage threshold
MEMORY_LIMIT=2048   # Memory in MB (2GB minimum free)
CHECK_INTERVAL=5    # Seconds between resource checks

# Get memory usage in MB (cross-platform)
get_memory_usage() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    vm_stat | awk '/Pages free/ {free=$3} /Pages active/ {active=$3} /Pages inactive/ {inactive=$3} /Pages speculative/ {spec=$3} /Pages wired/ {wired=$3} END {print (free+inactive+spec)*4096/1024/1024}'
  else
    # Linux
    free -m | awk '/Mem:/ {print $7}'
  fi
}

# Get CPU usage percentage
get_cpu_usage() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    ps -A -o %cpu | awk '{s+=$1} END {print s}'
  else
    # Linux
    top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}'
  fi
}

# Monitor function that runs in background
monitor_resources() {
  local test_pid=$1

  while kill -0 $test_pid 2>/dev/null; do
    # Check CPU
    cpu_usage=$(get_cpu_usage | awk '{print int($1)}')

    # Check memory
    free_memory=$(get_memory_usage | awk '{print int($1)}')

    # Log current usage
    echo -e "${BLUE}Resource Check: CPU ${cpu_usage}% | Free Memory ${free_memory}MB${NC}"

    # Check if limits exceeded
    if [ "$cpu_usage" -gt "$CPU_LIMIT" ]; then
      echo -e "${RED}❌ CPU usage exceeded ${CPU_LIMIT}% (current: ${cpu_usage}%)${NC}"
      echo -e "${YELLOW}⚠️  Terminating tests to prevent system freeze...${NC}"
      kill -TERM $test_pid
      return 1
    fi

    if [ "$free_memory" -lt "$MEMORY_LIMIT" ]; then
      echo -e "${RED}❌ Free memory below ${MEMORY_LIMIT}MB (current: ${free_memory}MB)${NC}"
      echo -e "${YELLOW}⚠️  Terminating tests to prevent system freeze...${NC}"
      kill -TERM $test_pid
      return 1
    fi

    sleep $CHECK_INTERVAL
  done

  return 0
}

# Check if command provided
if [ $# -eq 0 ]; then
  echo -e "${RED}Error: No command provided${NC}"
  echo "Usage: $0 <command> [args...]"
  echo "Example: $0 vitest run --config vitest.e2e.config.ts"
  exit 1
fi

# Display initial system state
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${BLUE}E2E Test Resource Monitor${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "CPU Limit: ${CPU_LIMIT}%"
echo -e "Memory Limit: ${MEMORY_LIMIT}MB free"
echo -e "Check Interval: ${CHECK_INTERVAL}s"
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"

initial_cpu=$(get_cpu_usage | awk '{print int($1)}')
initial_memory=$(get_memory_usage | awk '{print int($1)}')

echo -e "Initial State:"
echo -e "  CPU: ${initial_cpu}%"
echo -e "  Free Memory: ${initial_memory}MB"
echo ""

# Check if we already exceed limits before starting
if [ "$initial_cpu" -gt "$CPU_LIMIT" ]; then
  echo -e "${YELLOW}⚠️  Warning: CPU usage already at ${initial_cpu}%${NC}"
  echo -e "${YELLOW}⚠️  Consider closing other applications before running tests${NC}"
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

if [ "$initial_memory" -lt "$MEMORY_LIMIT" ]; then
  echo -e "${YELLOW}⚠️  Warning: Free memory already at ${initial_memory}MB${NC}"
  echo -e "${YELLOW}⚠️  Consider closing other applications before running tests${NC}"
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

echo -e "${GREEN}Starting tests with resource monitoring...${NC}"
echo ""

# Run the test command in background
"$@" &
TEST_PID=$!

# Start resource monitoring
monitor_resources $TEST_PID &
MONITOR_PID=$!

# Wait for test to complete
wait $TEST_PID
TEST_EXIT_CODE=$?

# Kill monitor if still running
kill $MONITOR_PID 2>/dev/null || true

# Report final state
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
final_cpu=$(get_cpu_usage | awk '{print int($1)}')
final_memory=$(get_memory_usage | awk '{print int($1)}')

echo -e "Final State:"
echo -e "  CPU: ${final_cpu}%"
echo -e "  Free Memory: ${final_memory}MB"

if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}✓ Tests completed successfully${NC}"
else
  echo -e "${RED}✗ Tests failed with exit code ${TEST_EXIT_CODE}${NC}"
fi
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"

exit $TEST_EXIT_CODE
