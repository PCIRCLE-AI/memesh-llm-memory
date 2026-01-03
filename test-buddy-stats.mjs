import { spawn } from 'child_process';

const server = spawn('node', ['dist/mcp/server.js'], {
  cwd: '/Users/ktseng/Developer/Projects/claude-code-buddy',
  stdio: ['pipe', 'pipe', 'pipe']
});

let stdout = '';
let stderr = '';

server.stdout.on('data', (data) => {
  stdout += data.toString();
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

setTimeout(() => {
  console.log('=== Sending tools/call request for buddy_stats ===');

  const request = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'buddy_stats',
      arguments: {
        period: 'week'
      }
    }
  };

  server.stdin.write(JSON.stringify(request) + '\n');
}, 2000);

setTimeout(() => {
  console.log('=== TIMEOUT ===');
  server.kill();
  process.exit(1);
}, 10000);
