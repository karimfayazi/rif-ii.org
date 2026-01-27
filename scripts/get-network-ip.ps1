# get-network-ip.ps1
# Get the actual network IP address of this machine

Write-Host "Network IP Addresses:" -ForegroundColor Cyan
Write-Host ""

# Get all IPv4 addresses excluding localhost and APIPA addresses
$allAdapters = Get-NetIPAddress -AddressFamily IPv4 | 
    Where-Object { 
        $_.IPAddress -notlike "127.*" -and 
        $_.IPAddress -notlike "169.254.*"
    }

# Filter for UP adapters only
$activeAdapters = $allAdapters | Where-Object {
    $adapter = Get-NetAdapter -InterfaceIndex $_.InterfaceIndex -ErrorAction SilentlyContinue
    $adapter -and $adapter.Status -eq "Up"
} | Sort-Object IPAddress

if ($activeAdapters) {
    Write-Host "Active IPv4 addresses (Status: Up):" -ForegroundColor Green
    $activeAdapters | ForEach-Object {
        $adapter = Get-NetAdapter -InterfaceIndex $_.InterfaceIndex -ErrorAction SilentlyContinue
        $adapterName = if ($adapter) { $adapter.Name } else { "Unknown" }
        $status = if ($adapter) { $adapter.Status } else { "Unknown" }
        Write-Host "  [OK] ${($_.IPAddress)} - $adapterName ($status)" -ForegroundColor White
    }
    
    Write-Host ""
    Write-Host "Primary network IP (first active, non-localhost):" -ForegroundColor Yellow
    $primaryIP = $activeAdapters[0].IPAddress
    Write-Host "  $primaryIP" -ForegroundColor Green
    Write-Host ""
    Write-Host "Access your app at:" -ForegroundColor Cyan
    Write-Host "  http://${primaryIP}:3000" -ForegroundColor White
} else {
    Write-Host "[ERROR] No active network interfaces found." -ForegroundColor Red
    Write-Host ""
    Write-Host "All IPv4 addresses (including inactive):" -ForegroundColor Yellow
    $allAdapters | ForEach-Object {
        $adapter = Get-NetAdapter -InterfaceIndex $_.InterfaceIndex -ErrorAction SilentlyContinue
        $adapterName = if ($adapter) { $adapter.Name } else { "Unknown" }
        $status = if ($adapter) { $adapter.Status } else { "Unknown" }
        Write-Host "  - ${($_.IPAddress)} - $adapterName ($status)" -ForegroundColor Gray
    }
}
