# Complete EADDRINUSE Solution - Implementation Summary

## Problem Explanation

**EADDRINUSE (Error: Address Already In Use)** happens when:
- Previous dev server didn't shut down properly (closed terminal without Ctrl+C)
- Multiple dev servers running simultaneously
- Port stuck in TIME_WAIT state after process termination
- Other applications using port 3000

**When it repeats:** Every time you start dev without killing the previous process, after system sleep/hibernate, or when switching between projects.

---

## Exact PowerShell Commands

### Find Process Using Port 3000

```powershell
# Method 1: netstat (most reliable)
netstat -ano | findstr :3000

# Method 2: PowerShell native
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object LocalAddress, LocalPort, State, OwningProcess

# Method 3: One-liner to get PID
$pid = (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue).OwningProcess; if ($pid) { Get-Process -Id $pid } else { Write-Host "Port 3000 is free" }
```

### Kill Process Safely

```powershell
# Method 1: taskkill (replace 12345 with actual PID from above)
taskkill /F /PID 12345

# Method 2: PowerShell Stop-Process
Stop-Process -Id 12345 -Force

# Method 3: Complete one-liner (safe - only kills Node.js)
$conn = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($conn) {
    $pid = $conn.OwningProcess
    $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
    if ($proc -and ($proc.ProcessName -like "*node*")) {
        Stop-Process -Id $pid -Force
        Write-Host "Killed Node.js process $pid on port 3000" -ForegroundColor Green
    }
}
```

---

## File Changes Summary

### 1. Updated `package.json`

**Added scripts:**
- `dev:3001` - Run on port 3001
- `dev:free` - Auto-kill port 3000, then start dev server
- `port:check` - Check what's using port 3000
- `port:kill` - Kill process on port 3000

### 2. Created `scripts/free-port.js`

Node.js script that:
- Finds process using specified port
- Checks if it's a Node.js process
- Kills it safely (only Node.js)
- Can be used standalone or imported

### 3. Created `scripts/dev-free.js`

Wrapper script that:
- Frees the port using free-port.js
- Starts Next.js dev server automatically
- Handles graceful shutdown (Ctrl+C)

### 4. Created `scripts/free-port.ps1`

PowerShell script for manual port management

---

## Usage

### Recommended Daily Workflow

```bash
# Always use this to avoid port conflicts
npm run dev:free
```

### Alternative Options

```bash
# Standard (may fail if port in use)
npm run dev

# Use different port
npm run dev:3001

# Check port status
npm run port:check

# Manually free port only
npm run port:kill
```

### PowerShell Script Usage

```powershell
# Free port 3000 (default)
.\scripts\free-port.ps1

# Free custom port
.\scripts\free-port.ps1 -Port 3001

# Force kill any process (use with caution)
.\scripts\free-port.ps1 -Port 3000 -Force
```

---

## Complete File Contents

All files have been created/updated. See:
- `package.json` - Updated scripts section
- `scripts/free-port.js` - Port management Node.js script
- `scripts/dev-free.js` - Wrapper to free port and start dev
- `scripts/free-port.ps1` - PowerShell port management script
- `PORT_MANAGEMENT.md` - Complete documentation

---

## Testing

1. **Test port check:**
   ```bash
   npm run port:check
   ```

2. **Test port kill:**
   ```bash
   npm run port:kill
   ```

3. **Test auto-free and start:**
   ```bash
   npm run dev:free
   ```

4. **Test alternative port:**
   ```bash
   npm run dev:3001
   ```

---

## Safety Features

✅ **Only kills Node.js processes** - Prevents accidentally killing system services  
✅ **Error handling** - Graceful failures with helpful messages  
✅ **Port verification** - Checks if port is actually free before starting  
✅ **Cross-platform** - Works on Windows (primary), can be adapted for Linux/Mac  

---

## Quick Reference Card

| Command | Action |
|---------|--------|
| `npm run dev:free` | ⭐ **Recommended** - Auto-fix and start |
| `npm run dev` | Standard start (may fail) |
| `npm run dev:3001` | Use port 3001 instead |
| `npm run port:check` | See what's using port 3000 |
| `npm run port:kill` | Kill process on port 3000 |

**PowerShell one-liner:**
```powershell
$pid = (Get-NetTCPConnection -LocalPort 3000).OwningProcess; Stop-Process -Id $pid -Force
```
