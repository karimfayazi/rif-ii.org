# free-port.ps1
# PowerShell script to find and kill processes using a specific port
# Usage: .\scripts\free-port.ps1 [PORT] [FORCE]

param(
    [int]$Port = 3000,
    [switch]$Force
)

Write-Host "Checking port $Port..." -ForegroundColor Cyan

# Find process using the port
$connections = netstat -ano | Select-String ":$Port" | Select-String "LISTENING"

if (-not $connections) {
    Write-Host "✓ Port $Port is free" -ForegroundColor Green
    exit 0
}

# Extract PID
$pid = ($connections -split '\s+')[-1]
Write-Host "⚠ Port $Port is in use by process $pid" -ForegroundColor Yellow

# Get process info
try {
    $process = Get-Process -Id $pid -ErrorAction Stop
    Write-Host "Process: $($process.ProcessName) (PID: $pid)" -ForegroundColor Yellow
    
    # Check if it's a Node.js process
    if ($process.ProcessName -like "*node*" -or $process.ProcessName -like "*next*" -or $Force) {
        Write-Host "Killing process $pid..." -ForegroundColor Yellow
        Stop-Process -Id $pid -Force -ErrorAction Stop
        Write-Host "✓ Successfully killed process $pid" -ForegroundColor Green
        Write-Host "Port $Port is now free" -ForegroundColor Green
    } else {
        Write-Host "⚠ Process is not a Node.js process. Use -Force to kill anyway." -ForegroundColor Red
        Write-Host "  Command: .\scripts\free-port.ps1 -Port $Port -Force" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "✗ Error: $_" -ForegroundColor Red
    exit 1
}
