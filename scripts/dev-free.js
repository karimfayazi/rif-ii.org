/**
 * dev-free.js
 * Wrapper script that frees port 3000 (or specified port) and starts Next.js dev server
 * Fixed: Removed shell:true to avoid DEP0190 warning
 */

const { spawn } = require('child_process');
const { freePort } = require('./free-port');
const path = require('path');

const PORT = process.env.PORT || process.argv[2] || '3000';
const HOST = process.env.HOST || '0.0.0.0';

async function main() {
  console.log('[SETUP] Freeing port and starting dev server...\n');
  
  const portFreed = await freePort(PORT);
  
  if (!portFreed) {
    console.error(`\n[ERROR] Could not free port ${PORT}. Please manually kill the process or use a different port.`);
    console.log(`\nTo manually kill the process:`);
    console.log(`  1. Find PID: netstat -ano | findstr :${PORT}`);
    console.log(`  2. Kill it: taskkill /F /PID <PID>`);
    console.log(`\nOr use a different port: npm run dev:3001`);
    process.exit(1);
  }

  // Wait a moment for port to be fully released
  await new Promise(resolve => setTimeout(resolve, 500));

  console.log(`\n[START] Starting Next.js dev server on ${HOST}:${PORT}...\n`);
  
  // Determine the correct command based on OS
  const isWindows = process.platform === 'win32';
  const npxCommand = isWindows ? 'npx.cmd' : 'npx';
  
  // Force webpack in dev because Next.js 16 defaults to Turbopack, which triggers the warning here.
  const nextProcess = spawn(npxCommand, ['next', 'dev', '--webpack', '-H', HOST, '-p', PORT], {
    stdio: 'inherit',
    cwd: process.cwd(),
    windowsHide: false
  });

  nextProcess.on('error', (error) => {
    console.error('[ERROR] Failed to start Next.js:', error);
    process.exit(1);
  });

  nextProcess.on('exit', (code) => {
    process.exit(code || 0);
  });

  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    console.log('\n\n[SHUTDOWN] Shutting down...');
    nextProcess.kill('SIGINT');
    setTimeout(() => process.exit(0), 1000);
  });

  process.on('SIGTERM', () => {
    nextProcess.kill('SIGTERM');
    setTimeout(() => process.exit(0), 1000);
  });
}

main().catch(error => {
  console.error('[ERROR]', error);
  process.exit(1);
});
