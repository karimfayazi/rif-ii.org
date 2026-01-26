# Fix Connection Timeout for /gis-map

## Root Cause Diagnosis

The `ERR_CONNECTION_TIMED_OUT` error when accessing `http://172.16.171.62:3000/gis-map` is most likely caused by:

**PRIMARY ISSUE:** Server binding to `localhost` (127.0.0.1) instead of `0.0.0.0`, making it inaccessible from the network.

## ✅ FIXES APPLIED

### 1. Fixed Server Binding (`server.js`)

**Changed:**
- Default `hostname` from `'localhost'` to `'0.0.0.0'`
- Explicitly bind server to `0.0.0.0` in `.listen()` call
- Added health check endpoint at `/api/health`
- Added graceful shutdown handling

**File:** `server.js`

### 2. Updated Package Scripts (`package.json`)

**Changed:**
- `dev` script now uses `-H 0.0.0.0 -p 3000` for network access
- `start` script uses `node server.js` (which binds to 0.0.0.0)
- Added `start:next` for Next.js standalone with network binding

**File:** `package.json`

### 3. Added Health Check Endpoint

**New file:** `src/app/api/health/route.ts`

Quick connectivity test: `http://172.16.171.62:3000/api/health`

### 4. Improved Map Container

**File:** `src/components/gis/GisMap.tsx`

- Added explicit height constraints
- Added loading indicator
- Ensured proper container sizing

## 🚀 DEPLOYMENT STEPS

### Step 1: Restart Server with New Configuration

**On server (172.16.171.62):**

```powershell
# Stop existing server (if running)
Get-Process node | Where-Object {$_.Path -like "*node.exe"} | Stop-Process -Force

# Navigate to project directory
cd "D:\PERSONAL\NextJS\NextJS\rif-mis-web"

# Start server
npm start
```

**Expected output:**
```
> Server ready on http://0.0.0.0:3000
> Local access: http://localhost:3000
> Network access: http://172.16.171.62:3000
> Health check: http://0.0.0.0:3000/api/health
```

### Step 2: Verify Server is Listening on All Interfaces

**On server, run:**
```powershell
netstat -ano | findstr :3000
```

**Should show:**
```
TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING       <PID>
```

**NOT:**
```
TCP    127.0.0.1:3000         0.0.0.0:0              LISTENING       <PID>
```

### Step 3: Configure Windows Firewall (If Needed)

**Run as Administrator:**
```powershell
New-NetFirewallRule -DisplayName "Next.js Port 3000" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

### Step 4: Test Connectivity

**From client machine:**

```powershell
# Test health endpoint
curl http://172.16.171.62:3000/api/health

# Test port connectivity
Test-NetConnection -ComputerName 172.16.171.62 -Port 3000

# Open in browser
# http://172.16.171.62:3000/gis-map
```

## 📋 VERIFICATION CHECKLIST

Run these commands to verify everything works:

### On Server:
- [ ] `netstat -ano | findstr :3000` shows `0.0.0.0:3000`
- [ ] `curl http://localhost:3000/api/health` returns `{"status":"ok"}`
- [ ] Server logs show "Server ready on http://0.0.0.0:3000"

### From Client:
- [ ] `ping 172.16.171.62` succeeds
- [ ] `Test-NetConnection 172.16.171.62 -Port 3000` shows `TcpTestSucceeded : True`
- [ ] `curl http://172.16.171.62:3000/api/health` returns JSON
- [ ] Browser can access `http://172.16.171.62:3000/gis-map`
- [ ] Map renders correctly

## 🔧 TROUBLESHOOTING

### If still getting timeout:

1. **Check firewall:**
   ```powershell
   Get-NetFirewallRule -DisplayName "Next.js Port 3000"
   ```

2. **Check if server is actually running:**
   ```powershell
   Get-Process node
   ```

3. **Check server logs** for errors

4. **Verify environment variable:**
   ```powershell
   $env:HOSTNAME
   # Should be empty or "0.0.0.0", NOT "localhost"
   ```

5. **Try accessing from server itself:**
   ```powershell
   curl http://172.16.171.62:3000/api/health
   ```

### If map doesn't render (but page loads):

1. Check browser console for JavaScript errors
2. Verify API endpoints are accessible:
   - `http://172.16.171.62:3000/api/gis/list`
   - `http://172.16.171.62:3000/api/gis/layers?name=<layerName>`
3. Check if `GIS_SHAPEFILES_DIR` environment variable is set
4. Verify shapefiles exist in the configured directory

## 📝 PRODUCTION RECOMMENDATIONS

### Use PM2 for Process Management:

```powershell
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start server.js --name "rif-mis-web"

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### Environment Variables:

Create `.env.local` or set in Plesk:
```
HOSTNAME=0.0.0.0
PORT=3000
NODE_ENV=production
GIS_SHAPEFILES_DIR=D:\PERSONAL\AHT GROUP\GIS-Map\Jan-2026\26-Jan2026\Final shapefiles\Final shapefiles
```

## 📞 SUPPORT

If issues persist:
1. Check `NETWORK_DIAGNOSTICS.md` for detailed diagnostic steps
2. Review server logs
3. Verify network configuration with IT department
