# Quick Start: LAN Access for Next.js

## One-Time Setup (Run as Administrator)

```powershell
# 1. Setup network access (adds firewall rule)
npm run network:setup

# 2. Verify IP address
npm run network:ip
```

## Daily Usage

```powershell
# Start dev server (auto-frees port 3000)
npm run dev:free
```

## Test Connectivity

**From Server PC:**
```powershell
npm run network:test
```

**From Another PC:**
```powershell
# PowerShell
Invoke-WebRequest -Uri "http://10.81.234.72:3000/api/health" -UseBasicParsing

# Browser
http://10.81.234.72:3000
```

## If Port 3000 is Busy

```powershell
npm run port:kill
# Then
npm run dev:free
```

## Production Mode

```powershell
npm run build
npm run start:next
# Accessible at http://10.81.234.72:3000
```

---

## Troubleshooting Quick Fixes

| Problem | Solution |
|---------|----------|
| Can't access from network | Run `npm run network:setup` as Admin |
| Port 3000 in use | Run `npm run port:kill` |
| Wrong IP | Run `npm run network:ip` to see actual IP |
| Firewall blocking | `New-NetFirewallRule -DisplayName "Next.js Dev Server" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow` |
