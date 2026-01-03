import { spawn } from 'child_process';

// Spawn the CCB MCP server
const server = spawn('node', ['dist/mcp/server.js'], {
  cwd: '/Users/ktseng/Developer/Projects/claude-code-buddy',
  stdio: ['pipe', 'pipe', 'pipe']
});

let stdout = '';
let stderr = '';

server.stdout.on('data', (data) => {
  stdout += data.toString();
  // Check if we got a JSON-RPC response
  if (stdout.includes('"result"')) {
    console.log('=== RESPONSE ===');
    console.log(stdout);
    server.kill();
  }
});

server.stderr.on('data', (data) => {
  stderr += data.toString();
});

server.on('close', (code) => {
  if (stderr) {
    console.log('=== STDERR (server logs) ===');
    console.log(stderr);
  }
  process.exit(code || 0);
});

// Wait for server to initialize
setTimeout(() => {
  console.log('=== Sending tools/call request for buddy_help ===');

  const request = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'buddy_help',
      arguments: {}
    }
  };

  server.stdin.write(JSON.stringify(request) + '\n');
}, 2000);

// Timeout after 10 seconds
setTimeout(() => {
  console.log('=== TIMEOUT ===');
  server.kill();
  process.exit(1);
}, 10000);
