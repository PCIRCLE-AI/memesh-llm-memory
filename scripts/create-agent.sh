#!/bin/bash

# create-agent.sh - Batch Agent Creation Script
# Usage: ./scripts/create-agent.sh <agent-name> "<description>" [category]
#
# Example:
# ./scripts/create-agent.sh performance-profiler "Performance profiling specialist" "operations"

set -e  # Exit on error

# Check arguments
if [ "$#" -lt 2 ]; then
    echo "Usage: ./scripts/create-agent.sh <agent-name> \"<description>\" [category]"
    echo ""
    echo "Examples:"
    echo "  ./scripts/create-agent.sh performance-profiler \"Performance profiling specialist\" \"operations\""
    echo "  ./scripts/create-agent.sh security-auditor \"Security audit specialist\" \"operations\""
    echo ""
    exit 1
fi

AGENT_NAME="$1"
DESCRIPTION="$2"
CATEGORY="${3:-development}"  # Default to 'development' if not specified

# Convert agent-name to proper formats
# Example: performance-profiler → Performance Profiler
AGENT_TITLE=$(echo "$AGENT_NAME" | sed 's/-/ /g' | awk '{for(i=1;i<=NF;i++)sub(/./,toupper(substr($i,1,1)),$i)}1')

echo "Creating agent: $AGENT_NAME"
echo "Title: $AGENT_TITLE"
echo "Description: $DESCRIPTION"
echo "Category: $CATEGORY"
echo ""

# Function to insert line before pattern in file
insert_before() {
    local file="$1"
    local pattern="$2"
    local content="$3"

    # Create temp file
    local temp_file="${file}.tmp"

    # Process file line by line
    while IFS= read -r line; do
        if echo "$line" | grep -q "$pattern"; then
            echo "$content"
        fi
        echo "$line"
    done < "$file" > "$temp_file"

    # Replace original
    mv "$temp_file" "$file"
}

# 1. Update src/orchestrator/types.ts - Add to AgentType union
echo "Step 1/5: Updating types.ts..."

TYPES_FILE="src/orchestrator/types.ts"
cp "$TYPES_FILE" "${TYPES_FILE}.bak"

# Insert new agent type before 'general-agent'
insert_before "$TYPES_FILE" "| 'general-agent'" "  | '$AGENT_NAME'"

echo "  ✓ Added '$AGENT_NAME' to AgentType union"

# 2. Update src/core/PromptEnhancer.ts - Add AGENT_PERSONAS, AGENT_TOOLS, MODEL_SUGGESTIONS, and instructions
echo "Step 2/5: Updating PromptEnhancer.ts..."

ENHANCER_FILE="src/core/PromptEnhancer.ts"
cp "$ENHANCER_FILE" "${ENHANCER_FILE}.bak"

# Insert persona before 'general-agent' (using multi-line template literal)
# Note: We use a proper multi-line string instead of escaped \n
PERSONA_LINE="  '$AGENT_NAME': \`You are an expert $AGENT_TITLE.

Your expertise includes:
- [Add specific expertise areas here]
- [Add more expertise areas]

When working on tasks, you:
1. [Add working principle 1]
2. [Add working principle 2]
3. [Add working principle 3]
4. [Add working principle 4]
5. [Add working principle 5]\`,"

insert_before "$ENHANCER_FILE" "  'general-agent': \`You are" "$PERSONA_LINE"

# Insert tools before 'general-agent' in AGENT_TOOLS
TOOLS_LINE="  '$AGENT_NAME': [], // Add specific tools here"
insert_before "$ENHANCER_FILE" "  'general-agent': \[\]," "$TOOLS_LINE"

# Insert model suggestions before 'general-agent' in MODEL_SUGGESTIONS
MODEL_LINE="  '$AGENT_NAME': { simple: 'claude-3-5-haiku-20241022', medium: 'claude-sonnet-4-5-20250929', complex: 'claude-sonnet-4-5-20250929' },"
insert_before "$ENHANCER_FILE" "  'general-agent': {" "$MODEL_LINE"

# Insert instructions before 'general-agent' in getAgentSpecificInstructions
INSTRUCTIONS_LINE="      '$AGENT_NAME': '',"
insert_before "$ENHANCER_FILE" "      'general-agent': ''," "$INSTRUCTIONS_LINE"

echo "  ✓ Added persona, tools, model suggestions, and instructions to PromptEnhancer"

# 3. Update src/orchestrator/AgentRouter.ts - Add to agentCapabilities, fallbackMap, agentDescriptions
echo "Step 3/5: Updating AgentRouter.ts..."

ROUTER_FILE="src/orchestrator/AgentRouter.ts"
cp "$ROUTER_FILE" "${ROUTER_FILE}.bak"

# Insert capabilities before 'general-agent' in agentCapabilities
CAPABILITIES_LINE="      '$AGENT_NAME': ['general'],"
insert_before "$ROUTER_FILE" "      'general-agent': \['general'\]," "$CAPABILITIES_LINE"

# Insert fallback before 'general-agent' in fallbackMap
FALLBACK_LINE="      '$AGENT_NAME': 'general-agent',"
insert_before "$ROUTER_FILE" "      // general-agent 沒有 fallback" "$FALLBACK_LINE"

# Insert description before 'general-agent' in agentDescriptions
DESCRIPTION_LINE="      '$AGENT_NAME': '$DESCRIPTION',"
insert_before "$ROUTER_FILE" "      'general-agent': 'Versatile AI assistant for general tasks'," "$DESCRIPTION_LINE"

echo "  ✓ Added to AgentRouter (capabilities, fallback, description)"

# 4. Update src/core/AgentRegistry.ts - Add to agent list
echo "Step 4/5: Updating AgentRegistry.ts..."

REGISTRY_FILE="src/core/AgentRegistry.ts"
cp "$REGISTRY_FILE" "${REGISTRY_FILE}.bak"

# Create agent metadata content
AGENT_METADATA="      {
        name: '$AGENT_NAME',
        description: '$DESCRIPTION',
        category: '$CATEGORY',
      },"

# Insert before '// General Agent' comment
insert_before "$REGISTRY_FILE" "      // General Agent" "$AGENT_METADATA"

echo "  ✓ Added to AgentRegistry"

# 5. Build and verify
echo "Step 5/5: Building and verifying..."

if npm run build > /dev/null 2>&1; then
    echo "  ✓ Build successful"
    # Clean up backups
    rm -f "${TYPES_FILE}.bak" "${ENHANCER_FILE}.bak" "${ROUTER_FILE}.bak" "${REGISTRY_FILE}.bak"
else
    echo "  ✗ Build failed - restoring backups..."
    mv "${TYPES_FILE}.bak" "$TYPES_FILE"
    mv "${ENHANCER_FILE}.bak" "$ENHANCER_FILE"
    mv "${ROUTER_FILE}.bak" "$ROUTER_FILE"
    mv "${REGISTRY_FILE}.bak" "$REGISTRY_FILE"
    exit 1
fi

echo ""
echo "✅ Agent '$AGENT_NAME' created successfully!"
echo ""
echo "Next steps:"
echo "1. Edit $ENHANCER_FILE to complete the persona description"
echo "2. Add specific tools to AGENT_TOOLS['$AGENT_NAME'] array in $ENHANCER_FILE"
echo "3. Add specific instructions to getAgentSpecificInstructions()['$AGENT_NAME'] in $ENHANCER_FILE"
echo "4. Adjust capabilities in $ROUTER_FILE if needed"
echo "5. Adjust model suggestions in $ENHANCER_FILE if needed"
echo "6. Agent is now registered in $REGISTRY_FILE"
echo "7. Run 'npm run build' to verify"
echo "8. Run 'npm test' to ensure tests pass"
echo ""
