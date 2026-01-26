# Network Connectivity Diagnostics for GIS Map

## Problem
`ERR_CONNECTION_TIMED_OUT` when accessing `http://172.16.171.62:3000/gis-map`

## STEP 1: Server Reachability Checklist

### On Server (172.16.171.62) - Run These Commands:

#### 1. Check if Node.js process is running on port 3000

**Windows:**
```powershell
netstat -ano | findstr :3000
```

**Expected Output:**
```
TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING       12345
```

**If no output:** Server is not running. Start it with `npm start` or `node server.js`

**If shows `127.0.0.1:3000` instead of `0.0.0.0:3000`:** Server is only listening on localhost. Fix: Set `HOSTNAME=0.0.0.0` or use updated `server.js`

#### 2. Check if process is bound to correct interface

**Windows:**
```powershell
netstat -ano | findstr :3000 | findstr LISTENING
```

**Linux:**
```bash
sudo ss -ltnp | grep :3000
```

**Check:** Should show `0.0.0.0:3000` or `*:3000`, NOT `127.0.0.1:3000`

#### 3. Test local server response

**On the server itself:**
```powershell
# Test localhost
curl http://localhost:3000/api/health

# Test 127.0.0.1
curl http://127.0.0.1:3000/api/health

# Test 0.0.0.0
curl http://0.0.0.0:3000/api/health
```

**Expected Output:**
```json
{"status":"ok","timestamp":"2026-01-26T...","service":"RIF-II MIS","version":"1.0.0"}
```

**If fails:** Server is not running or crashed. Check logs.

#### 4. Test from another machine on the network

**From client machine (not the server):**

**Ping test:**
```powershell
ping 172.16.171.62
```

**Traceroute (Windows):**
```powershell
tracert 172.16.171.62
```

**Traceroute (Linux/Mac):**
```bash
traceroute 172.16.171.62
```

**Port connectivity test (Windows PowerShell):**
```powershell
Test-NetConnection -ComputerName 172.16.171.62 -Port 3000
```

**Expected Output:**
```
ComputerName     : 172.16.171.62
RemoteAddress    : 172.16.171.62
RemotePort       : 3000
InterfaceAlias   : Ethernet
SourceAddress    : 172.16.x.x
TcpTestSucceeded : True
```

**If `TcpTestSucceeded : False`:** Firewall is blocking port 3000 (see Step 2B)

**Port connectivity test (Linux/Mac):**
```bash
nc -zv 172.16.171.62 3000
# or
telnet 172.16.171.62 3000
```

**HTTP test from client:**
```powershell
curl http://172.16.171.62:3000/api/health
```

---

## STEP 2: Fix Common Causes

### A) Server Only Listening on Localhost

**Problem:** Server bound to `127.0.0.1` instead of `0.0.0.0`

**Solution:** Use the updated `server.js` which binds to `0.0.0.0`

**Or set environment variable:**
```powershell
$env:HOSTNAME="0.0.0.0"
npm start
```

**Or for development:**
```powershell
npm run dev
# This now uses: next dev -H 0.0.0.0 -p 3000
```

### B) Windows Firewall Blocking Port 3000

**Create Inbound Rule (Run as Administrator):**

**Option 1: PowerShell (Run as Admin)**
```powershell
New-NetFirewallRule -DisplayName "Next.js Port 3000" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

**Option 2: GUI Method**
1. Open **Windows Defender Firewall with Advanced Security**
2. Click **Inbound Rules** → **New Rule**
3. Select **Port** → **Next**
4. Select **TCP** and enter **3000** → **Next**
5. Select **Allow the connection** → **Next**
6. Check all profiles (Domain, Private, Public) → **Next**
7. Name: "Next.js Port 3000" → **Finish**

**Verify rule was created:**
```powershell
Get-NetFirewallRule -DisplayName "Next.js Port 3000"
```

### C) Corporate/Network Firewall

If behind corporate firewall, contact IT to:
- Allow outbound TCP port 3000 from client machines
- Allow inbound TCP port 3000 to server 172.16.171.62

### D) Server Process Crashed or Not Running

**Check if process is running:**
```powershell
# Windows
Get-Process node -ErrorAction SilentlyContinue

# Find process using port 3000
netstat -ano | findstr :3000
```

**If not running, start it:**
```powershell
cd "D:\PERSONAL\NextJS\NextJS\rif-mis-web"
npm start
# or
node server.js
```

**Check logs for errors:**
- Look at console output where server was started
- Check Windows Event Viewer for Node.js errors
- If using PM2: `pm2 logs`

**Recommended: Use PM2 for Production**

Install PM2:
```powershell
npm install -g pm2
```

Start with PM2:
```powershell
pm2 start server.js --name "rif-mis-web"
pm2 save
pm2 startup
```

---

## STEP 3: GIS Map Rendering Checks

### 1. Verify Client Component

✅ **Already fixed:** `src/app/gis-map/page.tsx` has `'use client'` directive

### 2. Verify CSS Loading

✅ **Already handled:** Leaflet CSS is loaded dynamically in `GisMap.tsx` component

### 3. Verify Map Container Height

The map container should have explicit height. Current implementation uses:
```tsx
<div className="flex h-[calc(100vh-12rem)] ...">
```

This should work, but if map doesn't render, check browser console for errors.

### 4. Test API Endpoints

**From client browser or server:**
```powershell
# Health check
curl http://172.16.171.62:3000/api/health

# GIS layers list
curl http://172.16.171.62:3000/api/gis/list

# GIS layer data (replace LAYERNAME with actual layer)
curl http://172.16.171.62:3000/api/gis/layers?name=LAYERNAME
```

---

## STEP 4: Quick Test Commands

### On Server (172.16.171.62):

```powershell
# 1. Check if port is listening
netstat -ano | findstr :3000

# 2. Test local health endpoint
curl http://localhost:3000/api/health

# 3. Test local GIS map page
curl http://localhost:3000/gis-map

# 4. Check Node.js process
Get-Process node
```

### From Client Machine:

```powershell
# 1. Test network connectivity
ping 172.16.171.62

# 2. Test port connectivity
Test-NetConnection -ComputerName 172.16.171.62 -Port 3000

# 3. Test health endpoint
curl http://172.16.171.62:3000/api/health

# 4. Test GIS map page
curl http://172.16.171.62:3000/gis-map
```

---

## Expected Diagnosis Results

### ✅ Server Running Correctly:
- `netstat` shows `0.0.0.0:3000 LISTENING`
- `curl localhost:3000/api/health` returns JSON
- `Test-NetConnection` shows `TcpTestSucceeded : True`
- Browser can access `http://172.16.171.62:3000/gis-map`

### ❌ Common Issues:

1. **Port not listening:**
   - **Fix:** Start server with `npm start` or `node server.js`

2. **Listening on 127.0.0.1 only:**
   - **Fix:** Use updated `server.js` or set `HOSTNAME=0.0.0.0`

3. **Firewall blocking:**
   - **Fix:** Create Windows Firewall rule (see Step 2B)

4. **Process crashed:**
   - **Fix:** Check logs, restart server, consider PM2

5. **Network routing issue:**
   - **Fix:** Check network configuration, contact IT

---

## Production Deployment Command

After fixing issues, restart server:

```powershell
# Stop existing process (if any)
Get-Process node | Where-Object {$_.Path -like "*node.exe"} | Stop-Process -Force

# Navigate to project
cd "D:\PERSONAL\NextJS\NextJS\rif-mis-web"

# Start server
npm start

# OR with PM2 (recommended)
pm2 start server.js --name "rif-mis-web"
pm2 save
```

---

## Verification Checklist

- [ ] Server process is running
- [ ] Port 3000 is listening on `0.0.0.0` (not `127.0.0.1`)
- [ ] Windows Firewall allows port 3000
- [ ] `curl localhost:3000/api/health` returns `{"status":"ok"}`
- [ ] `Test-NetConnection 172.16.171.62 -Port 3000` succeeds
- [ ] `curl http://172.16.171.62:3000/api/health` works from client
- [ ] Browser can access `http://172.16.171.62:3000/gis-map`
- [ ] Map renders correctly in browser
