# MeMesh Dashboard - Real-time Session Health Monitoring

The MeMesh Dashboard provides a beautiful terminal-based interface for monitoring your MeMesh session in real-time.

## Features

### System Health Monitoring
- **Database Status**: Connection status, accessibility, and performance
- **Filesystem Health**: Data directory access and permissions
- **Memory Usage**: Process memory consumption with visual indicators

### Memory Statistics
- **Total Memory Entries**: Count of stored memories in the knowledge graph
- **Database Size**: Storage space used by the database
- **Process Memory**: Real-time heap usage with color-coded progress bar

### Recent Activities
- Display last 10 memory operations
- Shows memory type and content preview
- Automatically updates every 5 seconds

### Error Log Summary
- Shows recent error logs from the system
- Displays error count and timestamps
- Helps identify issues quickly

### Real-time Updates
- Auto-refresh every 5 seconds
- Manual refresh with 'r' key
- Keyboard controls for easy navigation

## Usage

### Basic Command

```bash
# Run the dashboard
memesh dashboard
```

### From Package Root

```bash
# Using npm script
npm run dashboard

# Direct node execution
node dist/mcp/server-bootstrap.js dashboard
```

### Keyboard Controls

- **q**: Quit the dashboard
- **r**: Manual refresh (force update)

The dashboard will automatically refresh every 5 seconds to show the latest system status.

## Display Sections

### 1. System Health Status

Shows the health of core components:

```
🏥 System Health ✓ All 3 components healthy

┌──────────────┬──────────┬───────────────────────────┬──────────┐
│ Component    │ Status   │ Message                   │ Duration │
├──────────────┼──────────┼───────────────────────────┼──────────┤
│ database     │ ✓ Healthy│ Database accessible       │ 2ms      │
│ filesystem   │ ✓ Healthy│ Filesystem accessible     │ 1ms      │
│ memory       │ ✓ Healthy│ Memory usage: 45MB/80MB   │ 0ms      │
└──────────────┴──────────┴───────────────────────────┴──────────┘
```

### 2. Memory Statistics

Displays memory usage and database information:

```
🧠 Memory Statistics

┌─────────────────────┬─────────────────────────────────┐
│ Metric              │ Value                           │
├─────────────────────┼─────────────────────────────────┤
│ Total Memory Entries│ 42                              │
│ Database Size       │ 2.5 MB                          │
│ Process Memory      │ 47MB / 80MB (58%) ████████░░░░  │
└─────────────────────┴─────────────────────────────────┘
```

Memory bar colors:
- **Green**: < 75% usage (healthy)
- **Yellow**: 75-90% usage (elevated)
- **Red**: > 90% usage (critical)

### 3. Recent Activities

Shows the last 10 memory operations:

```
📝 Recent Activities (Last 10)

  1. [mistake] Fixed authentication bug in API handler
  2. [knowledge] React best practices for component design
  3. [decision] Chose PostgreSQL over MongoDB for data layer
  4. [conversation] Discussion about API rate limiting strategy
  ...
```

### 4. Error Summary

Displays recent errors if any exist:

```
⚠️  Error Summary (5 total errors)

  ✗ [3:45:23 PM] Database connection timeout
  ✗ [3:44:10 PM] Failed to fetch external API
  ✗ [3:42:05 PM] Memory allocation warning
```

### 5. Footer

Shows controls and system uptime:

```
╭───────────────────────────────────────────────╮
│  Press r to refresh | q to quit              │
│  Auto-refresh every 5 seconds | Uptime: 1h 5m │
╰───────────────────────────────────────────────╯
```

## Status Indicators

### Health Status Icons

- **✓** (Green): Component is healthy
- **⚠** (Yellow): Component is degraded but operational
- **✗** (Red): Component is unhealthy
- **?** (Gray): Status unknown

### Overall System Status

- **Healthy**: All components are operating normally
- **Degraded**: Some components have warnings but system is operational
- **Unhealthy**: Critical components are failing

## Technical Details

### Data Sources

1. **System Health**: `HealthChecker` from `src/core/HealthCheck.ts`
2. **Memory Data**: `UnifiedMemoryStore` from `src/memory/UnifiedMemoryStore.ts`
3. **Error Logs**: `logs/error.log` file
4. **Process Metrics**: Node.js `process.memoryUsage()` and `process.uptime()`

### Refresh Interval

Default: 5 seconds (5000ms)

Can be modified in `src/cli/dashboard.ts`:
```typescript
const REFRESH_INTERVAL = 5000; // milliseconds
```

### Display Limits

- **Recent Activities**: Last 10 entries (configurable via `MAX_RECENT_ACTIVITIES`)
- **Error Logs**: Last 5 entries (configurable via `MAX_ERROR_LOGS`)

## Integration

### Adding to Your Workflow

The dashboard is useful for:

1. **Development**: Monitor system health during development
2. **Debugging**: Quick access to recent errors and activities
3. **Performance Monitoring**: Track memory usage and system responsiveness
4. **Health Checks**: Verify all components are operational

### CI/CD Integration

The dashboard can be used in CI/CD pipelines for health verification:

```bash
# Run dashboard briefly to check system health
timeout 3 memesh dashboard || true
```

## Troubleshooting

### Dashboard Won't Start

**Issue**: Command not found
```bash
memesh: command not found
```

**Solution**: Install MeMesh globally or use npx
```bash
npm install -g @pcircle/memesh
# or
npx @pcircle/memesh dashboard
```

### No Data Displayed

**Issue**: All metrics show "N/A" or zero

**Solution**: Ensure MeMesh is properly initialized
```bash
memesh setup
```

### High Memory Usage

**Issue**: Process memory bar shows red (> 90%)

**Solution**:
1. Restart the MCP server
2. Check for memory leaks in long-running sessions
3. Clear old error logs: `rm logs/error.log`

### Errors Not Clearing

**Issue**: Old errors persist in the summary

**Solution**: Error logs are cumulative. To clear:
```bash
rm logs/error.log
```

## Development

### Running Tests

```bash
npm test -- src/cli/__tests__/dashboard.test.ts
```

### Building

```bash
npm run build
```

### Demo

```bash
npm run demo:cli-dashboard
```

## Future Enhancements

Potential improvements:

1. **Configurable refresh interval** via CLI flag
2. **Export functionality** to save metrics snapshot
3. **Alert thresholds** for memory and error counts
4. **Historical graphs** using ASCII charts
5. **Network status** for A2A protocol connections
6. **Task queue status** showing pending operations

## Related Commands

- `memesh setup`: Configure MeMesh
- `memesh config show`: View configuration
- `memesh config validate`: Validate MCP setup
- `memesh stats`: View usage statistics (coming soon)

## API Reference

### Main Function

```typescript
import { runDashboard } from './cli/dashboard.js';

// Start dashboard with default settings
await runDashboard();
```

### Metrics Collection

```typescript
interface DashboardMetrics {
  systemHealth: SystemHealth;
  memoryStats: {
    totalEntities: number;
    recentActivities: string[];
    storageSize: string;
  };
  errorSummary: {
    recent: string[];
    count: number;
  };
  uptime: number;
}
```

## License

AGPL-3.0 - See LICENSE file for details

## Support

- GitHub Issues: https://github.com/PCIRCLE-AI/claude-code-buddy/issues
- Documentation: https://memesh.pcircle.ai
