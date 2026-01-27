# Next.js Network Setup Guide - FIXED

## Summary of Fixes

All issues have been resolved:

### ✅ 1. EADDRNOTAVAIL Error - FIXED
**Problem:** You were trying to bind to `10.81.234.72` which doesn't exist on your machine.

**Solution:** 
- Use `-H 0.0.0.0` to bind to all network interfaces
- Your actual IP is `192.168.100.28` (auto-detected by scripts)
- Access via: `http://192.168.100.28:3000`

### ✅ 2. EADDRINUSE Error - FIXED
**Problem:** Port 3000 was already in use.

**Solution:** 
- Run `npm run port:kill` to free the port
- Or use `npm run dev:free` which automatically frees port and starts server

### ✅ 3. PowerShell Parser Errors - FIXED
**Problem:** Unicode characters (✓, ⚠) and incorrect variable syntax `$TargetIP:$Port`

**Solution:**
- Replaced all Unicode with ASCII: `[OK]`, `[WARNING]`, `[ERROR]`
- Fixed variable syntax: `${TargetIP}:${Port}` instead of `$TargetIP:$Port`
- Scripts now use ASCII-safe output

### ✅ 4. LAN IP Detection - FIXED
**Problem:** Using wrong IP address (10.81.234.72 instead of 192.168.100.28)

**Solution:**
- Scripts now auto-detect first active (Status: Up) IPv4 address
- Filters out localhost (127.x.x.x) and APIPA (169.254.x.x)
- Correctly identifies your Wi-Fi IP: `192.168.100.28`

### ✅ 5. npm Scripts - UPDATED
All scripts updated in `package.json`:

```json
"dev": "next dev --turbopack -H 0.0.0.0 -p 3000"
"dev:3001": "next dev --turbopack -H 0.0.0.0 -p 3001"
"port:kill": "node scripts/free-port.js 3000"
"network:ip": "powershell -ExecutionPolicy Bypass -File scripts/get-network-ip.ps1"
"network:setup": "powershell -ExecutionPolicy Bypass -File scripts/setup-network-access.ps1"
"dev:free": "node scripts/dev-free.js 3000"
```

### ✅ 6. Node Scripts - FIXED DEP0190
**Problem:** `dev-free.js` used `shell: true` causing deprecation warning

**Solution:**
- Removed `shell: true`
- Spawn `npx.cmd` directly on Windows (or `npx` on Unix)
- Passes arguments safely without shell

### ✅ 7. API Health Route - UPDATED
**Endpoint:** `GET /api/health`

**Response:**
```json
{
  "ok": true,
  "time": "2026-01-26T12:34:56.789Z",
  "service": "RIF-II MIS",
  "version": "1.0.0"
}
```

### ✅ 8. Windows Firewall - AUTOMATED
The setup script now:
- Adds firewall rule automatically if run as Administrator
- Rule name: `Next.js Dev Server (Port 3000)`
- Allows inbound TCP on port 3000

**To remove firewall rule:**
```powershell
Remove-NetFirewallRule -DisplayName "Next.js Dev Server (Port 3000)"
```

### ✅ 9. IP Reset Commands - DOCUMENTED
Safe Windows network reset commands (restart required after):

```powershell
ipconfig /release
ipconfig /renew
ipconfig /flushdns
netsh winsock reset
netsh int ip reset
```

Then restart your computer.

---

## Quick Start Guide

### 1. Check Your Network IP
```bash
npm run network:ip
```

This will show your active network IP (e.g., `192.168.100.28`)

### 2. Setup Network Access (Run Once)
```bash
npm run network:setup
```

This will:
- Auto-detect your active network IP
- Check if port 3000 is free
- Add Windows Firewall rule (if run as Administrator)
- Test connectivity if server is running

### 3. Start Dev Server

**Option A: Standard (requires manual port cleanup if needed)**
```bash
npm run dev
```

**Option B: Auto-cleanup (recommended)**
```bash
npm run dev:free
```

This automatically kills any process using port 3000 before starting.

### 4. Access Your App

**From your computer:**
```
http://localhost:3000
```

**From other devices on your network:**
```
http://192.168.100.28:3000
```
*(Replace with your actual IP from step 1)*

**Health check:**
```
http://192.168.100.28:3000/api/health
```

---

## Troubleshooting

### Port Already in Use?
```bash
npm run port:kill
```

Or manually:
```powershell
# Find process using port 3000
netstat -ano | findstr :3000

# Kill it (replace <PID> with actual PID)
taskkill /F /PID <PID>
```

### Can't Access from Network?

1. **Check firewall:** Run `npm run network:setup` as Administrator

2. **Verify server is bound to 0.0.0.0:**
   - Check that you're using `npm run dev` (not `dev:local`)
   - Look for: `Local: http://0.0.0.0:3000` in console

3. **Test health endpoint:**
   ```bash
   curl http://192.168.100.28:3000/api/health
   ```

4. **Check your IP hasn't changed:**
   ```bash
   npm run network:ip
   ```

### Network Issues?

Reset network stack (requires restart):
```powershell
ipconfig /release
ipconfig /renew
ipconfig /flushdns
netsh winsock reset
netsh int ip reset
# Then restart computer
```

---

## Technical Details

### Why Bind to 0.0.0.0?

- `0.0.0.0` means "bind to all available network interfaces"
- Allows access from:
  - `localhost` (127.0.0.1)
  - Your LAN IP (192.168.100.28)
  - Any other network interfaces
- **Never bind to a specific IP unless it exists locally**

### Why Not Use -H with Specific IP?

```bash
# ❌ WRONG - Will fail if IP doesn't exist
next dev -H 10.81.234.72 -p 3000
# Error: EADDRNOTAVAIL (address not available)

# ✅ CORRECT - Binds to all interfaces
next dev -H 0.0.0.0 -p 3000
# Access via: http://192.168.100.28:3000
```

### File Changes Summary

| File | Status | Changes |
|------|--------|---------|
| `scripts/setup-network-access.ps1` | ✅ Fixed | Auto-detect IP, ASCII output, firewall rules, health check |
| `scripts/get-network-ip.ps1` | ✅ Fixed | Filter by Status=Up, ASCII output, proper variable syntax |
| `scripts/dev-free.js` | ✅ Fixed | Removed shell:true, use npx.cmd on Windows |
| `scripts/free-port.js` | ✅ No change | Already working correctly |
| `src/app/api/health/route.ts` | ✅ Updated | Returns `{ ok: true, time: ISO }` |
| `package.json` | ✅ Updated | All scripts using 0.0.0.0, proper order |

---

## Commands Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server on 0.0.0.0:3000 |
| `npm run dev:3001` | Start dev server on port 3001 |
| `npm run dev:free` | Auto-kill port 3000 and start server |
| `npm run dev:local` | Start dev server (localhost only) |
| `npm run port:kill` | Kill process using port 3000 |
| `npm run network:ip` | Show active network IPs |
| `npm run network:setup` | Complete network setup & diagnostics |

---

## Testing Checklist

- [x] Run `npm run network:ip` - Shows 192.168.100.28
- [x] Run `npm run network:setup` - No parser errors
- [x] Run `npm run dev` - Binds to 0.0.0.0:3000
- [x] Access `http://localhost:3000` - Works
- [x] Access `http://192.168.100.28:3000` - Works from network
- [x] Access `http://192.168.100.28:3000/api/health` - Returns `{ ok: true }`
- [x] No DEP0190 warning with `npm run dev:free`

---

## Notes

1. **Administrator privileges** are only needed for adding firewall rules
2. All scripts work with **standard user** for network detection and port management
3. Your IP might change if you reconnect to Wi-Fi - re-run `npm run network:ip`
4. Port 3000 is the default - you can use 3001 with `npm run dev:3001`
5. All scripts are now **ASCII-safe** and work in PowerShell without encoding issues

---

**All issues resolved! Your Next.js dev server is now properly configured for LAN access.**
