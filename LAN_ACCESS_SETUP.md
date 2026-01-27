# Next.js LAN Access Setup Guide

Complete guide to access your Next.js dev server from other PCs on your network at `http://10.81.234.72:3000`

---

## Quick Start Checklist

- [ ] **Step 1:** Verify IP address matches `10.81.234.72`
- [ ] **Step 2:** Free port 3000 if busy
- [ ] **Step 3:** Configure Windows Firewall
- [ ] **Step 4:** Start dev server
- [ ] **Step 5:** Test connectivity
- [ ] **Step 6:** Access from another PC

---

## Step 1: Verify IP Address

### Check Current IP Addresses

```powershell
# Quick check
npm run network:ip

# Or manually
ipconfig

# Or PowerShell native
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" }
```

### If IP Doesn't Match (10.81.234.72)

**Option A: Add as Secondary IP (Recommended)**
```powershell
# Run PowerShell as Administrator
.\add-ip-address.ps1

# Or manually
New-NetIPAddress -InterfaceAlias "Wi-Fi" -IPAddress "10.81.234.72" -PrefixLength 24
```

**Option B: Use Your Actual IP**
```powershell
# Get your actual IP
npm run network:ip

# Then use that IP instead of 10.81.234.72
# Update the IP in test commands below
```

---

## Step 2: Free Port 3000 (If Busy)

### Check Port Status

```powershell
# Quick check
npm run port:check

# Or PowerShell
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
```

### Free Port Automatically

```powershell
# Auto-kill Node.js process on port 3000
npm run port:kill

# Or use the free-port script
node scripts/free-port.js 3000
```

### Free Port Manually

```powershell
# Find PID
netstat -ano | findstr :3000

# Kill process (replace 12345 with actual PID)
taskkill /F /PID 12345

# Or one-liner (safe - only Node.js)
$pid = (Get-NetTCPConnection -LocalPort 3000).OwningProcess; if ($pid) { $proc = Get-Process -Id $pid; if ($proc.ProcessName -like "*node*") { Stop-Process -Id $pid -Force; Write-Host "Killed $pid" } }
```

---

## Step 3: Configure Windows Firewall

### Automatic Setup (Recommended)

```powershell
# Run PowerShell as Administrator, then:
npm run network:setup

# Or directly:
powershell -ExecutionPolicy Bypass -File scripts/setup-network-access.ps1
```

### Manual Firewall Rule

```powershell
# Run PowerShell as Administrator
New-NetFirewallRule -DisplayName "Next.js Dev Server" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

### Verify Firewall Rule

```powershell
Get-NetFirewallRule -DisplayName "Next.js Dev Server"
```

### Remove Firewall Rule (if needed)

```powershell
Remove-NetFirewallRule -DisplayName "Next.js Dev Server"
```

---

## Step 4: Start Dev Server

### Recommended: Auto-free Port and Start

```powershell
npm run dev:free
```

### Standard Start

```powershell
npm run dev
```

**Expected Output:**
```
▲ Next.js 16.0.8 (Turbopack)
 - Local:        http://localhost:3000
 - Network:      http://0.0.0.0:3000
```

**Note:** Next.js shows `0.0.0.0` but it's accessible via your actual IP (`10.81.234.72:3000`)

---

## Step 5: Test Connectivity

### From Same PC

```powershell
# Test localhost
Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing

# Test network IP
Invoke-WebRequest -Uri "http://10.81.234.72:3000/api/health" -UseBasicParsing

# Or use the test script
npm run network:test
```

### From Another PC on Network

**PowerShell (Windows):**
```powershell
# Test connectivity
Invoke-WebRequest -Uri "http://10.81.234.72:3000/api/health" -UseBasicParsing

# Or test with curl
curl http://10.81.234.72:3000/api/health
```

**Browser:**
```
http://10.81.234.72:3000
http://10.81.234.72:3000/api/health
```

**Command Prompt (Windows):**
```cmd
curl http://10.81.234.72:3000/api/health
```

**Linux/Mac:**
```bash
curl http://10.81.234.72:3000/api/health
```

---

## Step 6: Production Mode (next start)

### Build and Start Production Server

```powershell
# Build the app
npm run build

# Start production server (binds to 0.0.0.0:3000)
npm run start:next

# Or use custom server
npm start
```

### Production Server Configuration

The `start:next` script uses:
```json
"start:next": "next start -H 0.0.0.0 -p 3000"
```

This binds to `0.0.0.0` (all interfaces) just like dev mode.

### Custom Server (server.js)

The `server.js` already binds to `0.0.0.0`:
```javascript
server.listen(port, '0.0.0.0', (err) => {
  // Server accessible on all network interfaces
})
```

---

## Troubleshooting

### Issue: Can't Access from Another PC

**Checklist:**
1. ✅ IP address is correct: `npm run network:ip`
2. ✅ Port 3000 is listening: `npm run port:check`
3. ✅ Firewall rule exists: `Get-NetFirewallRule -DisplayName "Next.js Dev Server"`
4. ✅ Server is running: Check terminal output
5. ✅ Both PCs on same network/subnet

**Test from server PC:**
```powershell
# Should work
Invoke-WebRequest -Uri "http://10.81.234.72:3000/api/health" -UseBasicParsing
```

**Test from client PC:**
```powershell
# Ping first
Test-Connection -ComputerName 10.81.234.72 -Count 2

# Then test HTTP
Invoke-WebRequest -Uri "http://10.81.234.72:3000/api/health" -UseBasicParsing
```

### Issue: Firewall Blocking

```powershell
# Check if rule exists and is enabled
Get-NetFirewallRule -DisplayName "Next.js Dev Server" | Select-Object DisplayName, Enabled, Action

# If disabled, enable it
Enable-NetFirewallRule -DisplayName "Next.js Dev Server"

# Temporarily disable firewall for testing (NOT RECOMMENDED)
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled False
```

### Issue: Port Still in Use

```powershell
# Find all processes on port 3000
Get-NetTCPConnection -LocalPort 3000 | Select-Object OwningProcess, State

# Kill all Node.js processes (use with caution)
Get-Process | Where-Object { $_.ProcessName -like "*node*" } | Stop-Process -Force

# Or use different port
npm run dev:3001
```

### Issue: Wrong IP Address

```powershell
# Get actual IP
npm run network:ip

# Update target IP in commands
# Or add the IP you need
.\add-ip-address.ps1
```

---

## Complete PowerShell Commands Reference

### Setup Commands

```powershell
# 1. Check IP
npm run network:ip

# 2. Setup network access (run as Admin)
npm run network:setup

# 3. Free port if busy
npm run port:kill

# 4. Start server
npm run dev:free

# 5. Test connectivity
npm run network:test
```

### Testing Commands

```powershell
# From same PC - localhost
curl http://localhost:3000/api/health

# From same PC - network IP
curl http://10.81.234.72:3000/api/health

# From another PC (replace with server IP)
curl http://10.81.234.72:3000/api/health

# Check if port is listening
Get-NetTCPConnection -LocalPort 3000 -State Listen

# Check firewall rules
Get-NetFirewallRule -DisplayName "Next.js Dev Server"
```

### Production Commands

```powershell
# Build
npm run build

# Start production (0.0.0.0:3000)
npm run start:next

# Or use custom server
npm start
```

---

## Verification Checklist

Run through this checklist to verify everything works:

- [ ] **IP Address:** `npm run network:ip` shows `10.81.234.72` (or your target IP)
- [ ] **Port Free:** `npm run port:check` shows port 3000 is free
- [ ] **Firewall:** `Get-NetFirewallRule -DisplayName "Next.js Dev Server"` exists and is enabled
- [ ] **Server Running:** `npm run dev:free` starts without errors
- [ ] **Local Test:** `curl http://localhost:3000/api/health` returns JSON
- [ ] **Network Test (Same PC):** `curl http://10.81.234.72:3000/api/health` returns JSON
- [ ] **Network Test (Other PC):** Browser/curl can access `http://10.81.234.72:3000`
- [ ] **Production Test:** `npm run build && npm run start:next` works and is accessible

---

## Quick Reference

| Task | Command |
|------|---------|
| Check IP | `npm run network:ip` |
| Setup network | `npm run network:setup` (as Admin) |
| Free port | `npm run port:kill` |
| Start dev | `npm run dev:free` |
| Test connectivity | `npm run network:test` |
| Start production | `npm run build && npm run start:next` |

**Access URLs:**
- Local: `http://localhost:3000`
- Network: `http://10.81.234.72:3000`
- Health: `http://10.81.234.72:3000/api/health`

---

## Security Notes

⚠️ **Development Server:**
- Only use `0.0.0.0` binding in trusted networks
- Don't expose dev server to the internet
- Use production mode (`next start`) for production

✅ **Best Practices:**
- Use firewall rules to restrict access
- Consider using VPN for remote access
- Use HTTPS in production
- Don't commit `.env.local` with sensitive data
