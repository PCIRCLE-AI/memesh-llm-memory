# MeMesh Daemon Architecture

MeMesh uses a singleton daemon architecture to efficiently share resources across multiple Claude Code sessions.

## Overview

```
Claude Code #1 ──stdio proxy──►┐
Claude Code #2 ──stdio proxy──►├─► MeMesh Daemon (single process)
Claude Code #3 ──stdio proxy──►┘      ├─ MCP Server (shared)
                                       ├─ A2A Server (shared)
                                       └─ All databases (shared)
```

### Benefits

- **Resource Efficiency**: Single process serves all Claude Code sessions
- **Shared State**: Knowledge graph, memory, and A2A state shared across sessions
- **No Port Conflicts**: Single A2A server instance, no port 3000+ conflicts
- **Graceful Upgrades**: New versions can replace running daemon without data loss
- **Orphan Prevention**: No zombie processes when Claude Code crashes

## How It Works

### Mode Detection

When MeMesh starts, it automatically determines whether to run as:

1. **Daemon Mode**: First instance becomes the daemon
2. **Proxy Mode**: Subsequent instances connect to existing daemon
3. **Standalone Mode**: When daemon is disabled via environment variable

### Startup Flow

```
┌─────────────────────────────────────────────────────────┐
│                    MeMesh Startup                        │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
                ┌─────────────────────┐
                │  Check Lock File    │
                │  ~/.memesh/daemon.lock
                └─────────────────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
       Lock Exists?              No Lock Found
              │                         │
              ▼                         ▼
       ┌─────────────┐          ┌─────────────┐
       │ Check PID   │          │ Become      │
       │ Is Alive?   │          │ Daemon      │
       └─────────────┘          └─────────────┘
              │
     ┌────────┴────────┐
     │                 │
     ▼                 ▼
  PID Dead         PID Alive
     │                 │
     ▼                 ▼
┌─────────────┐  ┌─────────────┐
│ Clear Stale │  │ Health      │
│ Lock, Become│  │ Check       │
│ Daemon      │  │ (IPC Ping)  │
└─────────────┘  └─────────────┘
                       │
              ┌────────┴────────┐
              │                 │
              ▼                 ▼
         Healthy           Unhealthy
              │                 │
              ▼                 ▼
       ┌─────────────┐  ┌─────────────┐
       │ Connect as  │  │ Clear Lock, │
       │ Proxy       │  │ Become      │
       └─────────────┘  │ Daemon      │
                        └─────────────┘
```

## CLI Commands

### Check Daemon Status

```bash
memesh daemon status
```

Shows current daemon information:
- Running state (daemon/proxy/standalone)
- PID and uptime
- Connected clients count
- Socket path
- Version information

### View Daemon Logs

```bash
# Show recent logs
memesh daemon logs

# Follow logs in real-time
memesh daemon logs -f

# Show last N lines
memesh daemon logs -n 100
```

### Stop Daemon

```bash
# Graceful stop (waits for clients to disconnect)
memesh daemon stop

# Force stop (immediate termination)
memesh daemon stop --force
```

### Restart Daemon

```bash
memesh daemon restart
```

Performs graceful restart:
1. Signals existing daemon to prepare for shutdown
2. Waits for in-flight requests to complete
3. Starts new daemon instance
4. Clients automatically reconnect

### Request Daemon Upgrade

```bash
memesh daemon upgrade
```

Used when a newer MeMesh version is installed:
1. New instance requests upgrade from running daemon
2. Daemon enters drain mode (no new requests)
3. Existing requests complete
4. Lock is released
5. New instance takes over

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MEMESH_DISABLE_DAEMON` | Disable daemon mode (`1` or `true`) | `false` |
| `MEMESH_DAEMON_IDLE_TIMEOUT` | Idle timeout before auto-shutdown (ms) | `300000` (5 min) |
| `MEMESH_DAEMON_LOG_LEVEL` | Log level (debug/info/warn/error) | `info` |

### Disable Daemon Mode

To run in standalone mode (original behavior):

```bash
export MEMESH_DISABLE_DAEMON=1
```

Or in your shell profile:

```bash
# ~/.bashrc or ~/.zshrc
export MEMESH_DISABLE_DAEMON=1
```

## File Locations

| File | Path | Purpose |
|------|------|---------|
| Lock File | `~/.memesh/daemon.lock` | Singleton coordination |
| Socket (Unix) | `~/.memesh/daemon.sock` | IPC communication |
| Socket (Windows) | `\\.\pipe\memesh-daemon` | IPC communication |
| Logs | `~/.memesh/logs/daemon.log` | Daemon logs |

### Lock File Format

```json
{
  "pid": 12345,
  "instanceId": "550e8400-e29b-41d4-a716-446655440000",
  "socketPath": "/Users/user/.memesh/daemon.sock",
  "startTime": 1706000000000,
  "version": "2.7.0",
  "clientCount": 2,
  "protocolVersion": 1,
  "minClientVersion": "2.6.0"
}
```

## Architecture Components

### DaemonLockManager

Manages the lock file for singleton coordination:
- Atomic lock acquisition using `fs.link()`
- PID reuse protection via UUID instance verification
- TOCTOU (Time-of-Check-Time-of-Use) race condition protection
- Stale lock detection and cleanup

### DaemonSocketServer

Multi-client IPC server:
- Unix domain socket (macOS/Linux) or named pipe (Windows)
- Buffer overflow protection (10MB max)
- Handshake timeout (10 seconds)
- Client tracking with unique IDs
- Heartbeat monitoring

### StdioProxyClient

Connects to daemon and proxies MCP messages:
- stdin → daemon socket
- daemon socket → stdout
- Automatic reconnection with exponential backoff
- TCP packet fragmentation handling
- Heartbeat for connection health

### GracefulShutdownCoordinator

Coordinates graceful shutdown and upgrades:
- Request tracking (in-flight requests)
- Drain mode for graceful shutdown
- Configurable idle timeout
- Shutdown metrics collection

### VersionManager

Handles version compatibility:
- Semantic versioning comparison
- Protocol version checking
- Client compatibility validation
- Upgrade recommendations

## Troubleshooting

### Daemon Won't Start

**Symptom**: "Failed to acquire daemon lock"

**Solutions**:
1. Check if another daemon is running:
   ```bash
   memesh daemon status
   ```

2. Clear stale lock file:
   ```bash
   rm ~/.memesh/daemon.lock
   rm ~/.memesh/daemon.sock
   ```

3. Check for zombie processes:
   ```bash
   ps aux | grep memesh
   ```

### Connection Refused

**Symptom**: "ECONNREFUSED" when connecting to daemon

**Solutions**:
1. Check daemon status:
   ```bash
   memesh daemon status
   ```

2. Restart daemon:
   ```bash
   memesh daemon restart
   ```

3. Check socket file exists:
   ```bash
   ls -la ~/.memesh/daemon.sock
   ```

### Version Mismatch

**Symptom**: "Protocol version mismatch" or "Client version incompatible"

**Solutions**:
1. Upgrade daemon:
   ```bash
   memesh daemon upgrade
   ```

2. Force restart with new version:
   ```bash
   memesh daemon stop --force
   # Daemon will auto-start with new version on next use
   ```

### High Memory Usage

**Symptom**: Daemon consuming excessive memory

**Solutions**:
1. Check client count:
   ```bash
   memesh daemon status
   ```

2. Restart daemon to clear state:
   ```bash
   memesh daemon restart
   ```

3. Check for memory leaks in logs:
   ```bash
   memesh daemon logs | grep -i memory
   ```

## Security Considerations

### Socket Permissions

The daemon socket is created with restrictive permissions:
- Mode: `0600` (owner read/write only)
- Location: User's home directory (`~/.memesh/`)

### IPC Security

- No authentication tokens transmitted over IPC
- Instance ID verification prevents lock hijacking
- PID verification prevents spoofing

### Process Isolation

- Each client runs in its own process
- Daemon crashes don't affect client processes
- Client crashes don't affect daemon

## Performance

### Benchmarks

| Metric | Value |
|--------|-------|
| Startup time (daemon) | ~500ms |
| Startup time (proxy) | ~100ms |
| IPC latency | <1ms |
| Max concurrent clients | 100+ |
| Memory overhead | ~50MB base |

### Optimization Tips

1. **Reduce idle timeout** for development:
   ```bash
   export MEMESH_DAEMON_IDLE_TIMEOUT=60000  # 1 minute
   ```

2. **Increase for production** to reduce restarts:
   ```bash
   export MEMESH_DAEMON_IDLE_TIMEOUT=3600000  # 1 hour
   ```

## Development

### Running Tests

```bash
# Run daemon-specific tests
npm test -- src/mcp/daemon

# Run with coverage
npm test -- --coverage src/mcp/daemon
```

### Debug Mode

Enable debug logging:

```bash
export MEMESH_DAEMON_LOG_LEVEL=debug
memesh daemon restart
memesh daemon logs -f
```

### Manual Testing

1. Start first Claude Code session (becomes daemon)
2. Check status: `memesh daemon status`
3. Start second session (becomes proxy)
4. Verify shared state works
5. Kill first session, verify daemon continues
6. Kill daemon: `memesh daemon stop`

## Rollback

If daemon mode causes issues, disable it:

```bash
# Immediate disable
export MEMESH_DISABLE_DAEMON=1

# Or add to shell profile
echo 'export MEMESH_DISABLE_DAEMON=1' >> ~/.zshrc

# Emergency cleanup
rm ~/.memesh/daemon.lock ~/.memesh/daemon.sock
pkill -f "memesh.*daemon"
```

## Version History

| Version | Changes |
|---------|---------|
| 2.6.6 | Initial daemon architecture release |

## Related Documentation

- [CLI Commands](./COMMANDS.md)
- [Troubleshooting](./TROUBLESHOOTING.md)
- [Best Practices](./BEST_PRACTICES.md)
- [A2A Setup Guide](./A2A_SETUP_GUIDE.md)
