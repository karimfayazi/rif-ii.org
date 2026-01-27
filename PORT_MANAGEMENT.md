# Port Management Guide for Next.js Dev Server

## A) Why EADDRINUSE Happens

**EADDRINUSE (Error: Address Already In Use)** occurs when:

1. **Previous dev server didn't shut down properly**
   - You closed the terminal without stopping the server (Ctrl+C)
   - The process crashed but didn't release the port
   - Windows kept the port in TIME_WAIT state

2. **Multiple dev servers running**
   - You have another terminal/IDE running `npm run dev`
   - Background processes from previous sessions

3. **Other applications using port 3000**
   - Another Node.js app
   - Different development server
   - System service

4. **When it repeats:**
   - Every time you start dev without killing the previous process
   - After system sleep/hibernate (sometimes ports don't release)
   - When switching between projects that use port 3000

---

## B) PowerShell Commands to Find and Kill Processes

### Find Process Using Port 3000

```powershell
# Method 1: Using netstat (most reliable)
netstat -ano | findstr :3000

# Method 2: Using Get-NetTCPConnection (PowerShell native)
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object LocalAddress, LocalPort, State, OwningProcess

# Method 3: One-liner to get PID
$pid = (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue).OwningProcess; if ($pid) { Get-Process -Id $pid } else { Write-Host "Port 3000 is free" }
```

### Kill Process Safely

```powershell
# Method 1: Using taskkill (replace 12345 with actual PID)
taskkill /F /PID 12345

# Method 2: Using PowerShell Stop-Process
Stop-Process -Id 12345 -Force

# Method 3: One-liner to find and kill
$pid = (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue).OwningProcess; if ($pid) { Stop-Process -Id $pid -Force; Write-Host "Killed process $pid" } else { Write-Host "Port 3000 is free" }
```

### Complete One-Liner Solution

```powershell
# Find and kill process on port 3000 (safe - only kills Node.js processes)
$conn = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($conn) {
    $pid = $conn.OwningProcess
    $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
    if ($proc -and ($proc.ProcessName -like "*node*")) {
        Stop-Process -Id $pid -Force
        Write-Host "Killed Node.js process $pid on port 3000" -ForegroundColor Green
    } else {
        Write-Host "Port 3000 is used by non-Node process. PID: $pid" -ForegroundColor Yellow
    }
} else {
    Write-Host "Port 3000 is free" -ForegroundColor Green
}
```

---

## C) Updated package.json Scripts

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Standard dev server on port 3000 |
| `npm run dev:3001` | Dev server on port 3001 (alternative port) |
| `npm run dev:free` | **Auto-kills port 3000, then starts dev server** |
| `npm run port:check` | Check what's using port 3000 |
| `npm run port:kill` | Kill process on port 3000 (Node.js only) |

### Usage Examples

```bash
# Standard (may fail if port in use)
npm run dev

# Use alternative port
npm run dev:3001

# Auto-fix port conflict (recommended)
npm run dev:free

# Check port status
npm run port:check

# Manually free port
npm run port:kill
```

---

## D) Automatic Port Management

### Node.js Script: `scripts/free-port.js`

This script automatically:
1. Checks if port 3000 is in use
2. Identifies if it's a Node.js process
3. Kills it safely (only Node.js processes)
4. Starts Next.js dev server

**Usage:**
```bash
# Free port 3000 and start dev server
npm run dev:free

# Free custom port
node scripts/free-port.js 3001
PORT=3001 node scripts/free-port.js
```

### PowerShell Script: `scripts/free-port.ps1`

Manual port management script:

```powershell
# Free port 3000 (default)
.\scripts\free-port.ps1

# Free custom port
.\scripts\free-port.ps1 -Port 3001

# Force kill any process (not just Node.js)
.\scripts\free-port.ps1 -Port 3000 -Force
```

---

## Quick Reference

### Daily Workflow

**Recommended:** Always use `npm run dev:free` to avoid port conflicts:

```bash
npm run dev:free
```

**If you get EADDRINUSE error:**

1. **Quick fix:**
   ```bash
   npm run dev:free
   ```

2. **Manual fix:**
   ```powershell
   # Find PID
   netstat -ano | findstr :3000
   
   # Kill it (replace 12345 with actual PID)
   taskkill /F /PID 12345
   
   # Then start dev
   npm run dev
   ```

3. **Use different port:**
   ```bash
   npm run dev:3001
   ```

### Troubleshooting

**Port still in use after killing?**
- Wait 2-3 seconds (Windows needs time to release port)
- Check if process restarted: `netstat -ano | findstr :3000`
- Use `npm run dev:3001` as temporary workaround

**Can't kill process?**
- Run PowerShell as Administrator
- Check if it's a system service: `Get-Process -Id <PID>`
- Restart your computer if necessary

**Multiple ports needed?**
- Use `npm run dev:3001` for second instance
- Or modify scripts to use different ports

---

## Safety Notes

⚠️ **The scripts only kill Node.js processes for safety:**
- Prevents accidentally killing system services
- Only targets `node.exe` and `next` processes
- Use `-Force` flag in PowerShell script to kill any process (use with caution)

✅ **Best Practice:**
Always use `npm run dev:free` instead of `npm run dev` to avoid conflicts automatically.
