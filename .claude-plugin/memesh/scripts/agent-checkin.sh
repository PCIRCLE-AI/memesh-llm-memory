#!/usr/bin/env bash
# Agent Check-in System v2
# 上線自動簽到 + 廣播，專長待用戶指派

set -e

# 名字池（希臘字母）
NAME_POOL=(
  "Alpha" "Beta" "Gamma" "Delta" "Epsilon" 
  "Zeta" "Eta" "Theta" "Iota" "Kappa"
  "Lambda" "Mu" "Nu" "Xi" "Omicron"
  "Pi" "Rho" "Sigma" "Tau" "Upsilon"
)

KG_DB="$HOME/.claude-code-buddy/knowledge-graph.db"
REGISTRY_DB="$HOME/.claude-code-buddy/a2a-registry.db"

# 查詢已使用的名字（只看 ONLINE 狀態的）
get_used_names() {
  sqlite3 "$KG_DB" "
    SELECT name FROM entities 
    WHERE type='session_identity' 
    AND name LIKE 'Online Agent:%'
  " 2>/dev/null | sed 's/Online Agent: //' || echo ""
}

# 選擇未使用的名字
pick_available_name() {
  local used_names=$(get_used_names)
  
  for name in "${NAME_POOL[@]}"; do
    if ! echo "$used_names" | grep -qw "$name"; then
      echo "$name"
      return 0
    fi
  done
  
  # 全用完了，加時間戳
  echo "Agent-$(date +%s | tail -c 5)"
}

# 獲取在線 agents
get_online_agents() {
  sqlite3 "$REGISTRY_DB" "
    SELECT agent_id FROM agents 
    WHERE status='active' 
    ORDER BY last_heartbeat DESC
  " 2>/dev/null || echo ""
}

# Main
echo ""
echo "🚀 Agent Check-in System v2"
echo "════════════════════════════════════════"
echo ""

# 選名字
MY_NAME=$(pick_available_name)

echo "👋 Hello! I'm picking a name..."
echo ""
echo "   ✅ My name is: $MY_NAME"
echo "   ✅ Role: General Claude Code (awaiting assignment)"
echo ""

# 顯示其他在線 agents
ONLINE_AGENTS=$(get_online_agents)
AGENT_COUNT=$(echo "$ONLINE_AGENTS" | grep -c . || echo 0)

if [ "$AGENT_COUNT" -gt 0 ]; then
  echo "📋 Other online agents ($AGENT_COUNT):"
  echo "$ONLINE_AGENTS" | while read agent; do
    [ -n "$agent" ] && echo "   - $agent"
  done
  echo ""
fi

echo "════════════════════════════════════════"
echo "📢 BROADCAST: $MY_NAME is now online!"
echo "════════════════════════════════════════"
echo ""
echo "💡 Awaiting user assignment..."
echo "   User can say: \"$MY_NAME，你負責前端\" to assign specialization"
echo "   Or use as general Claude Code session"
echo ""

# 輸出給 Claude Code 使用的指令
echo "--- For Claude Code to execute ---"
echo "MY_AGENT_NAME=$MY_NAME"
