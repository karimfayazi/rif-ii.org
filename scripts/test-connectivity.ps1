# test-connectivity.ps1
# Test connectivity to Next.js dev server from local and network

param(
    [string]$ServerIP = "10.81.234.72",
    [int]$Port = 3000
)

Write-Host "=== Connectivity Tests ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Localhost
Write-Host "1. Testing localhost connection..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:$Port/api/health" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    Write-Host "   ✓ Localhost: OK (Status: $($response.StatusCode))" -ForegroundColor Green
    $response.Content | ConvertFrom-Json | Format-List | Out-String | Write-Host
} catch {
    Write-Host "   ✗ Localhost: FAILED - $_" -ForegroundColor Red
}

Write-Host ""

# Test 2: Network IP
Write-Host "2. Testing network IP connection ($ServerIP)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://${ServerIP}:${Port}/api/health" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    Write-Host "   ✓ Network IP: OK (Status: $($response.StatusCode))" -ForegroundColor Green
    $response.Content | ConvertFrom-Json | Format-List | Out-String | Write-Host
} catch {
    Write-Host "   ✗ Network IP: FAILED - $_" -ForegroundColor Red
    Write-Host "   Possible issues:" -ForegroundColor Yellow
    Write-Host "     - Firewall blocking port $Port" -ForegroundColor Yellow
    Write-Host "     - IP $ServerIP not assigned to this machine" -ForegroundColor Yellow
    Write-Host "     - Server not running" -ForegroundColor Yellow
}

Write-Host ""

# Test 3: Port check
Write-Host "3. Checking if port $Port is listening..." -ForegroundColor Yellow
$listening = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($listening) {
    Write-Host "   ✓ Port $Port is listening on:" -ForegroundColor Green
    $listening | ForEach-Object {
        Write-Host "     - $($_.LocalAddress):$($_.LocalPort)" -ForegroundColor White
    }
} else {
    Write-Host "   ✗ Port $Port is not listening" -ForegroundColor Red
}

Write-Host ""

# Test 4: Firewall check
Write-Host "4. Checking firewall rules..." -ForegroundColor Yellow
$firewallRule = Get-NetFirewallRule -DisplayName "Next.js Dev Server" -ErrorAction SilentlyContinue
if ($firewallRule) {
    Write-Host "   ✓ Firewall rule exists" -ForegroundColor Green
    $firewallRule | Select-Object DisplayName, Enabled, Direction, Action | Format-List | Out-String | Write-Host
} else {
    Write-Host "   ⚠ No firewall rule found. Run setup-network-access.ps1 as Administrator" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Test Complete ===" -ForegroundColor Cyan
