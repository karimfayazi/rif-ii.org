# Exact PowerShell Commands for LAN Access

## Complete Command Reference

### 1. Verify IP Address Matches 10.81.234.72

```powershell
# Quick check
npm run network:ip

# Detailed check
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } | Format-Table IPAddress, InterfaceAlias
```

**If IP doesn't match, add it:**
```powershell
# Run PowerShell as Administrator
.\add-ip-address.ps1

# Or manually
New-NetIPAddress -InterfaceAlias "Wi-Fi" -IPAddress "10.81.234.72" -PrefixLength 24
```

---

### 2. Free Port 3000 (If Busy)

```powershell
# Automatic (recommended)
npm run port:kill

# Manual - Find PID
netstat -ano | findstr :3000

# Manual - Kill process (replace 12345 with actual PID)
taskkill /F /PID 12345

# One-liner (safe - only Node.js)
$pid = (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue).OwningProcess; if ($pid) { $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue; if ($proc -and ($proc.ProcessName -like "*node*")) { Stop-Process -Id $pid -Force; Write-Host "Killed process $pid" -ForegroundColor Green } else { Write-Host "Process $pid is not Node.js. Use: taskkill /F /PID $pid" -ForegroundColor Yellow } } else { Write-Host "Port 3000 is free" -ForegroundColor Green }
```

---

### 3. Configure Windows Firewall

```powershell
# Run PowerShell as Administrator, then:

# Automatic setup
npm run network:setup

# Or manually add rule
New-NetFirewallRule -DisplayName "Next.js Dev Server" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow

# Verify rule exists
Get-NetFirewallRule -DisplayName "Next.js Dev Server" | Select-Object DisplayName, Enabled, Action
```

---

### 4. Start Dev Server

```powershell
# Recommended: Auto-free port and start
npm run dev:free

# Standard start (may fail if port busy)
npm run dev
```

**Expected Output:**
```
▲ Next.js 16.0.8 (Turbopack)
 - Local:        http://localhost:3000
 - Network:      http://0.0.0.0:3000
```

**Note:** Shows `0.0.0.0` but accessible at `http://10.81.234.72:3000`

---

### 5. Test Connectivity

#### From Same PC (Server)

```powershell
# Test localhost
Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing

# Test network IP
Invoke-WebRequest -Uri "http://10.81.234.72:3000/api/health" -UseBasicParsing

# Or use test script
npm run network:test

# Quick curl test
curl http://localhost:3000/api/health
curl http://10.81.234.72:3000/api/health
```

#### From Another PC on Network

**PowerShell (Windows):**
```powershell
# Test connectivity
Invoke-WebRequest -Uri "http://10.81.234.72:3000/api/health" -UseBasicParsing

# Or with curl
curl http://10.81.234.72:3000/api/health
```

**Browser:**
```
http://10.81.234.72:3000
http://10.81.234.72:3000/api/health
```

**Command Prompt:**
```cmd
curl http://10.81.234.72:3000/api/health
```

**Linux/Mac Terminal:**
```bash
curl http://10.81.234.72:3000/api/health
```

---

### 6. Production Mode (next start)

```powershell
# Build the application
npm run build

# Start production server (binds to 0.0.0.0:3000)
npm run start:next

# Or use custom server
npm start
```

**Production server is accessible at:**
- `http://localhost:3000` (local)
- `http://10.81.234.72:3000` (network)

---

## Complete Setup Sequence

### First Time Setup (Run as Administrator)

```powershell
# 1. Check IP
npm run network:ip

# 2. Add IP if needed (if not 10.81.234.72)
.\add-ip-address.ps1

# 3. Setup firewall
npm run network:setup

# 4. Free port if needed
npm run port:kill

# 5. Start server
npm run dev:free

# 6. Test
npm run network:test
```

### Daily Usage

```powershell
# Start server (auto-frees port)
npm run dev:free
```

---

## Troubleshooting Commands

### Check Port Status

```powershell
# Check if port is listening
Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue

# Check what's using port
netstat -ano | findstr :3000
```

### Check Firewall

```powershell
# List firewall rules
Get-NetFirewallRule -DisplayName "Next.js Dev Server"

# Check if enabled
Get-NetFirewallRule -DisplayName "Next.js Dev Server" | Select-Object DisplayName, Enabled

# Enable if disabled
Enable-NetFirewallRule -DisplayName "Next.js Dev Server"
```

### Check Network Connectivity

```powershell
# Ping test
Test-Connection -ComputerName 10.81.234.72 -Count 2

# Port test (from another PC)
Test-NetConnection -ComputerName 10.81.234.72 -Port 3000
```

### Kill All Node Processes (Use with Caution)

```powershell
Get-Process | Where-Object { $_.ProcessName -like "*node*" } | Stop-Process -Force
```

---

## Quick Reference Table

| Task | Command |
|------|---------|
| Check IP | `npm run network:ip` |
| Setup network | `npm run network:setup` (as Admin) |
| Free port | `npm run port:kill` |
| Start dev | `npm run dev:free` |
| Test connectivity | `npm run network:test` |
| Start production | `npm run build && npm run start:next` |

---

## Access URLs

- **Local:** `http://localhost:3000`
- **Network:** `http://10.81.234.72:3000`
- **Health Check:** `http://10.81.234.72:3000/api/health`

---

## Verification Checklist

Run these commands to verify everything works:

```powershell
# 1. IP check
npm run network:ip
# Should show 10.81.234.72 (or your target IP)

# 2. Port check
npm run port:check
# Should show port 3000 is free or in use by Node.js

# 3. Firewall check
Get-NetFirewallRule -DisplayName "Next.js Dev Server"
# Should show rule exists and Enabled = True

# 4. Start server
npm run dev:free
# Should start without errors

# 5. Local test
Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing
# Should return JSON with status: "ok"

# 6. Network test (same PC)
Invoke-WebRequest -Uri "http://10.81.234.72:3000/api/health" -UseBasicParsing
# Should return JSON with status: "ok"

# 7. Network test (another PC)
# From another PC, open browser: http://10.81.234.72:3000
# Or PowerShell: Invoke-WebRequest -Uri "http://10.81.234.72:3000/api/health" -UseBasicParsing
```

---

## All npm Scripts Added

```json
{
  "dev": "next dev --turbopack -H 0.0.0.0 -p 3000",
  "dev:free": "node scripts/dev-free.js 3000",
  "start:next": "next start -H 0.0.0.0 -p 3000",
  "port:kill": "node scripts/free-port.js 3000",
  "network:setup": "powershell -ExecutionPolicy Bypass -File scripts/setup-network-access.ps1",
  "network:test": "powershell -ExecutionPolicy Bypass -File scripts/test-connectivity.ps1",
  "network:ip": "powershell -ExecutionPolicy Bypass -File scripts/get-network-ip.ps1"
}
```
