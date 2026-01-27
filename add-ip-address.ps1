# Script to add IP address 10.81.234.72 to Wi-Fi adapter
# This script must be run as Administrator

Write-Host "Adding IP address 10.81.234.72 to Wi-Fi adapter..." -ForegroundColor Yellow

try {
    # Get the Wi-Fi adapter
    $adapter = Get-NetAdapter -Name "Wi-Fi" -ErrorAction Stop
    
    # Check if IP already exists
    $existingIP = Get-NetIPAddress -InterfaceAlias "Wi-Fi" -IPAddress "10.81.234.72" -ErrorAction SilentlyContinue
    
    if ($existingIP) {
        Write-Host "IP address 10.81.234.72 already exists on Wi-Fi adapter." -ForegroundColor Green
    } else {
        # Add the IP address
        New-NetIPAddress -InterfaceAlias "Wi-Fi" -IPAddress "10.81.234.72" -PrefixLength 24 -ErrorAction Stop
        Write-Host "Successfully added IP address 10.81.234.72 to Wi-Fi adapter!" -ForegroundColor Green
    }
    
    # Display current IP addresses
    Write-Host "`nCurrent IP addresses on Wi-Fi adapter:" -ForegroundColor Cyan
    Get-NetIPAddress -InterfaceAlias "Wi-Fi" | Where-Object {$_.AddressFamily -eq "IPv4"} | Format-Table IPAddress, PrefixLength, InterfaceAlias
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "`nMake sure you are running PowerShell as Administrator!" -ForegroundColor Yellow
    exit 1
}

Write-Host "`nYou can now start the server with: npm run dev" -ForegroundColor Green
