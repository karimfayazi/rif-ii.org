# Quick Reference - Next.js LAN Access (FIXED)

## 🎯 Your Network Info
- **Active IP:** `192.168.100.28` (Wi-Fi)
- **Port:** `3000`
- **Access URL:** `http://192.168.100.28:3000`

---

## 🚀 Quick Start (3 Steps)

### 1. Check IP
```bash
npm run network:ip
```

### 2. Setup Network (Run Once)
```bash
npm run network:setup
```
*Run as Administrator for firewall rules*

### 3. Start Server
```bash
npm run dev:free
```
*Auto-kills port 3000 and starts server*

**OR** standard start:
```bash
npm run dev
```

---

## 📋 Common Commands

| Command | What It Does |
|---------|--------------|
| `npm run dev` | Start on 0.0.0.0:3000 |
| `npm run dev:free` | Kill port 3000 + start |
| `npm run dev:3001` | Start on port 3001 |
| `npm run port:kill` | Kill process on port 3000 |
| `npm run network:ip` | Show your IP addresses |
| `npm run network:setup` | Complete setup + test |

---

## ✅ What Was Fixed

| Issue | Status | Solution |
|-------|--------|----------|
| EADDRNOTAVAIL (10.81.234.72 doesn't exist) | ✅ FIXED | Use `-H 0.0.0.0` |
| EADDRINUSE (port in use) | ✅ FIXED | `npm run port:kill` |
| PowerShell parser errors | ✅ FIXED | ASCII output, proper `${var}` syntax |
| Wrong LAN IP | ✅ FIXED | Auto-detect 192.168.100.28 |
| npm scripts | ✅ UPDATED | All use 0.0.0.0 |
| DEP0190 warning | ✅ FIXED | Removed shell:true |
| Health API | ✅ UPDATED | Returns `{ ok: true, time }` |
| Firewall rules | ✅ AUTOMATED | Auto-add in setup script |
| IP reset commands | ✅ DOCUMENTED | In setup script output |

---

## 🌐 Access URLs

**From your PC:**
```
http://localhost:3000
```

**From other devices (phone, tablet, etc.):**
```
http://192.168.100.28:3000
```

**Health check:**
```
http://192.168.100.28:3000/api/health
```

---

## 🔧 Troubleshooting

### Port Already in Use?
```bash
npm run port:kill
```

### Can't Access from Network?
1. Run as admin: `npm run network:setup`
2. Check Windows Firewall allows port 3000
3. Verify server shows: `Local: http://0.0.0.0:3000`

### IP Changed?
```bash
npm run network:ip
```

### Nuclear Option (Network Reset)
Run as Administrator, then **restart computer**:
```powershell
ipconfig /release
ipconfig /renew
ipconfig /flushdns
netsh winsock reset
netsh int ip reset
```

---

## 🔒 Firewall Management

**Check if rule exists:**
```powershell
Get-NetFirewallRule -DisplayName "Next.js Dev Server*"
```

**Remove rule:**
```powershell
Remove-NetFirewallRule -DisplayName "Next.js Dev Server (Port 3000)"
```

---

## 📁 Modified Files

- ✅ `scripts/setup-network-access.ps1` - Auto-detect IP, ASCII output
- ✅ `scripts/get-network-ip.ps1` - Filter by Status=Up
- ✅ `scripts/dev-free.js` - No shell:true
- ✅ `src/app/api/health/route.ts` - Returns `{ ok, time }`
- ✅ `package.json` - Updated scripts

---

## 💡 Key Concepts

### Why 0.0.0.0?
Binds to **all network interfaces**. Accessible via:
- `localhost` (127.0.0.1)
- LAN IP (192.168.100.28)
- Any other interfaces

### Why Not Bind to Specific IP?
```bash
# ❌ FAILS if IP doesn't exist locally
next dev -H 10.81.234.72 -p 3000

# ✅ WORKS - binds to all interfaces
next dev -H 0.0.0.0 -p 3000
```

Then access via your actual IP: `http://192.168.100.28:3000`

---

## 📚 Full Documentation

- `DELIVERABLES.md` - Complete file contents
- `NETWORK_SETUP_GUIDE.md` - Detailed guide
- `QUICK_REFERENCE.md` - This file

---

**Status: All issues fixed and tested ✅**

**Your IP: 192.168.100.28**  
**Access from network: http://192.168.100.28:3000**
