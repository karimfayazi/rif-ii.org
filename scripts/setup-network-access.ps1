# setup-network-access.ps1
# Complete network setup for Next.js dev server LAN access
# Run as Administrator for firewall rules

param(
    [int]$Port = 3000
)

Write-Host "=== Next.js Network Access Setup ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Auto-detect active network IP
Write-Host "1. Detecting active network interfaces..." -ForegroundColor Yellow

$allAdapters = Get-NetIPAddress -AddressFamily IPv4 | 
    Where-Object { 
        $_.IPAddress -notlike "127.*" -and 
        $_.IPAddress -notlike "169.254.*"
    }

$activeAdapters = $allAdapters | Where-Object {
    $adapter = Get-NetAdapter -InterfaceIndex $_.InterfaceIndex -ErrorAction SilentlyContinue
    $adapter -and $adapter.Status -eq "Up"
} | Sort-Object IPAddress

if ($activeAdapters) {
    Write-Host "   [OK] Active IPv4 addresses:" -ForegroundColor Green
    $activeAdapters | ForEach-Object {
        $adapter = Get-NetAdapter -InterfaceIndex $_.InterfaceIndex -ErrorAction SilentlyContinue
        $adapterName = if ($adapter) { $adapter.Name } else { "Unknown" }
        Write-Host "   - ${($_.IPAddress)} on $adapterName" -ForegroundColor White
    }
    
    $TargetIP = $activeAdapters[0].IPAddress
    Write-Host ""
    Write-Host "   [OK] Using primary IP: $TargetIP" -ForegroundColor Green
} else {
    Write-Host "   [ERROR] No active network interfaces found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "   Available IPs (may be inactive):" -ForegroundColor Yellow
    $allAdapters | ForEach-Object {
        Write-Host "     - ${($_.IPAddress)}" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "   [TIP] Check your network connection and try again." -ForegroundColor Cyan
    exit 1
}

# Step 2: Check if port is in use
Write-Host ""
Write-Host "2. Checking port $Port..." -ForegroundColor Yellow
$portInUse = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
if ($portInUse) {
    $pid = $portInUse.OwningProcess
    $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
    Write-Host "   [WARNING] Port $Port is in use by PID $pid ($($proc.ProcessName))" -ForegroundColor Yellow
    Write-Host "   Run: npm run port:kill" -ForegroundColor Cyan
} else {
    Write-Host "   [OK] Port $Port is free" -ForegroundColor Green
}

# Step 3: Windows Firewall rules
Write-Host ""
Write-Host "3. Configuring Windows Firewall..." -ForegroundColor Yellow

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "   [WARNING] Not running as Administrator. Firewall rules require admin privileges." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   To add firewall rule, run PowerShell as Administrator and execute:" -ForegroundColor Cyan
    Write-Host "     New-NetFirewallRule -DisplayName 'Next.js Dev Server (Port $Port)' -Direction Inbound -LocalPort $Port -Protocol TCP -Action Allow" -ForegroundColor White
    Write-Host ""
    Write-Host "   To remove firewall rule later:" -ForegroundColor Cyan
    Write-Host "     Remove-NetFirewallRule -DisplayName 'Next.js Dev Server (Port $Port)'" -ForegroundColor White
} else {
    # Check if rule exists
    $ruleName = "Next.js Dev Server (Port $Port)"
    $existingRule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
    
    if ($existingRule) {
        Write-Host "   [OK] Firewall rule already exists" -ForegroundColor Green
    } else {
        try {
            New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -LocalPort $Port -Protocol TCP -Action Allow -ErrorAction Stop | Out-Null
            Write-Host "   [OK] Firewall rule added successfully" -ForegroundColor Green
        } catch {
            Write-Host "   [ERROR] Failed to add firewall rule: $_" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "   To remove this firewall rule:" -ForegroundColor Cyan
    Write-Host "     Remove-NetFirewallRule -DisplayName '$ruleName'" -ForegroundColor White
}

# Step 4: Test connectivity
Write-Host ""
Write-Host "4. Testing server connectivity..." -ForegroundColor Yellow

# Check if Next.js is running
$nextRunning = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
    $_.MainWindowTitle -like "*Next*" -or 
    (Get-NetTCPConnection -OwningProcess $_.Id -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -eq $Port })
}

if ($nextRunning) {
    Write-Host "   [OK] Next.js process detected on port $Port" -ForegroundColor Green
    Write-Host "   Testing health endpoint..." -ForegroundColor Yellow
    
    try {
        $response = Invoke-WebRequest -Uri "http://${TargetIP}:${Port}/api/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        $body = $response.Content | ConvertFrom-Json
        
        if ($body.ok -eq $true) {
            Write-Host "   [OK] Health check passed!" -ForegroundColor Green
            Write-Host "   Server time: $($body.time)" -ForegroundColor White
        } else {
            Write-Host "   [WARNING] Health check returned unexpected response" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "   [WARNING] Could not reach health endpoint: $_" -ForegroundColor Yellow
        Write-Host "   This is normal if the server isn't running yet." -ForegroundColor Gray
    }
} else {
    Write-Host "   [INFO] Next.js is not running yet" -ForegroundColor Gray
    Write-Host "   Start the server first, then test connectivity" -ForegroundColor Gray
}

# Step 5: Summary
Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Network Information:" -ForegroundColor Yellow
Write-Host "  Local IP: $TargetIP" -ForegroundColor White
Write-Host "  Port: $Port" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Start dev server: npm run dev" -ForegroundColor White
Write-Host "     (binds to 0.0.0.0:$Port - accessible from network)" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Access locally:" -ForegroundColor White
Write-Host "     http://localhost:${Port}" -ForegroundColor Cyan
Write-Host ""
Write-Host "  3. Access from network:" -ForegroundColor White
Write-Host "     http://${TargetIP}:${Port}" -ForegroundColor Cyan
Write-Host ""
Write-Host "  4. Test health endpoint:" -ForegroundColor White
Write-Host "     http://${TargetIP}:${Port}/api/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "Troubleshooting:" -ForegroundColor Yellow
Write-Host "  - Port in use? npm run port:kill" -ForegroundColor White
Write-Host "  - Check network IP: npm run network:ip" -ForegroundColor White
Write-Host "  - Reset network (requires restart):" -ForegroundColor White
Write-Host "      ipconfig /release" -ForegroundColor Gray
Write-Host "      ipconfig /renew" -ForegroundColor Gray
Write-Host "      ipconfig /flushdns" -ForegroundColor Gray
Write-Host "      netsh winsock reset" -ForegroundColor Gray
Write-Host "      netsh int ip reset" -ForegroundColor Gray
Write-Host ""
