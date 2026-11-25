# HackMate PowerShell Launcher
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "              HACKMATE LAUNCH SYSTEM                   " -ForegroundColor Cyan
Write-Host "   College-Exclusive Hackathon Teammates Platform      " -ForegroundColor DarkCyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# Verify node_modules
if (-not (Test-Path "node_modules")) {
    Write-Host "[1/3] Installing root dependencies..." -ForegroundColor Yellow
    npm install
}
if (-not (Test-Path "server\node_modules")) {
    Write-Host "[2/3] Installing server dependencies..." -ForegroundColor Yellow
    npm --prefix server install
}
if (-not (Test-Path "client\node_modules")) {
    Write-Host "[3/3] Installing client dependencies..." -ForegroundColor Yellow
    npm --prefix client install
}

Write-Host "`n[OK] Dependencies verified." -ForegroundColor Green
Write-Host "Backend:  http://localhost:5000" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Green
Write-Host "`nLaunching servers (Press Ctrl+C to stop)...`n" -ForegroundColor Gray

Start-Process "http://localhost:3000"
npm run dev
