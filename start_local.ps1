
# AI-RadarX Local Launcher (Hybrid Mode)
# Uses services and Python environment from AI-THink to power AI-RadarX

$ErrorActionPreference = "Continue"
$Root = $PSScriptRoot
$thinkRoot = "g:\AI-THink"
$vendorsDir = Join-Path $thinkRoot "vendors"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "       AI-RadarX Hybrid Launcher        " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Check AI-THink Resources
if (-not (Test-Path $vendorsDir)) {
    Write-Host "ERROR: AI-THink vendors directory not found at $vendorsDir" -ForegroundColor Red
    Write-Host "This script requires AI-THink to be installed locally to reuse its resources." -ForegroundColor Red
    exit 1
}

# 2. Start Services (Mongo & Redis) from AI-THink
Write-Host "[1/4] Checking Database Services..." -ForegroundColor Yellow

# MongoDB
$mongoExe = Join-Path $vendorsDir "mongodb\bin\mongod.exe"
if (Get-Process -Name "mongod" -ErrorAction SilentlyContinue) {
    Write-Host "  MongoDB is already running." -ForegroundColor Gray
} elseif (Test-Path $mongoExe) {
    Write-Host "  Starting MongoDB..." -ForegroundColor Gray
    $mongoData = Join-Path $Root ".data\mongo"
    if (-not (Test-Path $mongoData)) { New-Item -ItemType Directory -Path $mongoData -Force | Out-Null }
    Start-Process -FilePath $mongoExe -ArgumentList "--dbpath `"$mongoData`" --port 27017" -WindowStyle Hidden
    Write-Host "  MongoDB started." -ForegroundColor Green
} else {
    Write-Host "  WARNING: MongoDB executable not found at $mongoExe" -ForegroundColor Yellow
}

# Redis
$redisExe = Join-Path $vendorsDir "redis\redis-server.exe"
if (Get-Process -Name "redis-server" -ErrorAction SilentlyContinue) {
    Write-Host "  Redis is already running." -ForegroundColor Gray
} elseif (Test-Path $redisExe) {
    Write-Host "  Starting Redis..." -ForegroundColor Gray
    Start-Process -FilePath $redisExe -WindowStyle Hidden
    Write-Host "  Redis started." -ForegroundColor Green
} else {
    Write-Host "  WARNING: Redis executable not found at $redisExe" -ForegroundColor Yellow
}

# 3. Start Backend (Using AI-THink's Python)
Write-Host "[2/4] Starting AI Backend Engine..." -ForegroundColor Yellow

$pythonExe = Join-Path $vendorsDir "python\python.exe"
# Fallback to system python if vendor python missing
if (-not (Test-Path $pythonExe)) { 
    $pythonExe = "python" # Hope it's in PATH and has deps
    Write-Host "  Using system Python (Vendor python not found)" -ForegroundColor Yellow
} else {
    Write-Host "  Using AI-THink Python Environment: $pythonExe" -ForegroundColor Green
}

# Environment variables for Backend
$env:MONGO_URI = "mongodb://localhost:27017/stock_db"
$env:REDIS_HOST = "localhost"
$env:REDIS_PORT = "6379"
$env:PYTHONPATH = "$Root\backend;$Root\backend\lib"

# Start Backend in new window
$backendScript = Join-Path $Root "backend\app\main.py"
# We run via uvicorn module
$backendArgs = "-m uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload --app-dir `"$Root\backend`""

Start-Process -FilePath $pythonExe -ArgumentList $backendArgs -WorkingDirectory "$Root\backend"
Write-Host "  Backend running on http://localhost:8080" -ForegroundColor Green

# 4. Start Frontend
Write-Host "[3/4] Starting Frontend (Next.js)..." -ForegroundColor Yellow

# Check dependency installation
if (-not (Test-Path "$Root\node_modules")) {
    Write-Host "  Installing frontend dependencies..." -ForegroundColor Gray
    npm install
}

Write-Host "  Launching Next.js..." -ForegroundColor Green
Start-Process -FilePath "npm" -ArgumentList "run dev" -WorkingDirectory $Root

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   System Launch Sequence Initiated     " -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:3000      " -ForegroundColor Cyan
Write-Host "   Backend:  http://localhost:8080      " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
