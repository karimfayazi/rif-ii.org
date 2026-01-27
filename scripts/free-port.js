/**
 * free-port.js
 * Automatically finds and kills Node.js processes using port 3000 (or specified port)
 * Then starts Next.js dev server
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const PORT = process.env.PORT || process.argv[2] || '3000';
const HOST = process.env.HOST || '0.0.0.0';

async function findProcessOnPort(port) {
  try {
    // Windows: netstat -ano | findstr :PORT
    const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
    const lines = stdout.trim().split('\n').filter(line => line.includes('LISTENING'));
    
    if (lines.length === 0) {
      return null;
    }

    // Parse PID from netstat output
    // Format: TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING       12345
    const match = lines[0].match(/\s+(\d+)$/);
    if (match) {
      return parseInt(match[1], 10);
    }
    return null;
  } catch (error) {
    // Port not in use
    return null;
  }
}

async function getProcessName(pid) {
  try {
    // Windows: tasklist /FI "PID eq PID" /FO CSV /NH
    const { stdout } = await execAsync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`);
    if (stdout && stdout.includes('node.exe')) {
      return 'node.exe';
    }
    // Check for other Node processes
    if (stdout && (stdout.includes('node') || stdout.includes('next'))) {
      return 'node';
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function killProcess(pid) {
  try {
    console.log(`Attempting to kill process ${pid}...`);
    await execAsync(`taskkill /F /PID ${pid}`);
    console.log(`✓ Successfully killed process ${pid}`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to kill process ${pid}:`, error.message);
    return false;
  }
}

async function freePort(port) {
  console.log(`Checking if port ${port} is in use...`);
  
  const pid = await findProcessOnPort(port);
  
  if (!pid) {
    console.log(`✓ Port ${port} is free`);
    return true;
  }

  console.log(`⚠ Port ${port} is in use by process ${pid}`);
  
  const processName = await getProcessName(pid);
  
  if (processName && (processName.includes('node') || processName.includes('next'))) {
    console.log(`Detected Node.js process (${processName}), attempting to free port...`);
    const killed = await killProcess(pid);
    
    if (killed) {
      // Wait a moment for port to be released
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log(`✓ Port ${port} should now be free`);
      return true;
    }
  } else {
    console.log(`⚠ Process ${pid} is not a Node.js process. Skipping auto-kill for safety.`);
    console.log(`  You may need to manually kill it or use a different port.`);
    return false;
  }
  
  return false;
}

async function main() {
  const portFreed = await freePort(PORT);
  
  if (!portFreed) {
    console.error(`\n✗ Could not free port ${PORT}. Please manually kill the process or use a different port.`);
    console.log(`\nTo manually kill the process:`);
    console.log(`  1. Find PID: netstat -ano | findstr :${PORT}`);
    console.log(`  2. Kill it: taskkill /F /PID <PID>`);
    console.log(`\nOr use a different port: PORT=3001 node scripts/free-port.js`);
    process.exit(1);
  }

  // Port is free, exit successfully so package.json script can continue
  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}

module.exports = { freePort, findProcessOnPort, killProcess };
