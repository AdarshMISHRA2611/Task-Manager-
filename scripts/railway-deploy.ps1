# Ethara Workboard — one-shot Railway deploy (run from repo root)
# Prerequisite: railway login  (once per machine)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

function Require-Railway {
    if (-not (Get-Command railway -ErrorAction SilentlyContinue)) {
        Write-Host "Installing Railway CLI..." -ForegroundColor Yellow
        npm install -g @railway/cli
    }
    railway whoami 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Not logged in. Run:  railway login" -ForegroundColor Red
        exit 1
    }
}

function New-SecretKey {
    $bytes = New-Object byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    [Convert]::ToBase64String($bytes) -replace '[+/=]', 'x'
}

Require-Railway

if (-not (Test-Path ".railway")) {
    Write-Host "Creating Railway project..." -ForegroundColor Cyan
    railway init --name "ethara-workboard"
}

Write-Host "Ensuring PostgreSQL..." -ForegroundColor Cyan
railway add --database postgres 2>$null

$secret = New-SecretKey
if ($secret.Length -lt 32) { $secret = $secret + ("x" * (32 - $secret.Length)) }

Write-Host "Setting production variables..." -ForegroundColor Cyan
railway variable set ENVIRONMENT=production --skip-deploys
railway variable set "SECRET_KEY=$secret" --skip-deploys
railway variable set CORS_ORIGINS= --skip-deploys
railway variable set VITE_API_URL= --skip-deploys

Write-Host "Linking Postgres DATABASE_URL..." -ForegroundColor Cyan
$vars = railway variable list --json 2>$null | ConvertFrom-Json
$hasDb = $vars | Where-Object { $_.name -eq "DATABASE_URL" -or $_.key -eq "DATABASE_URL" }
if (-not $hasDb) {
    Write-Host "In Railway dashboard: Variables -> New -> DATABASE_URL -> Reference -> PostgreSQL -> DATABASE_URL" -ForegroundColor Yellow
    Write-Host "(App auto-converts postgresql:// to postgresql+psycopg://)" -ForegroundColor Yellow
}

Write-Host "Deploying (Dockerfile)..." -ForegroundColor Cyan
railway up --detach

Write-Host "Generating public domain..." -ForegroundColor Cyan
railway domain 2>$null

$url = (railway status --json 2>$null | ConvertFrom-Json).url
if (-not $url) {
    $url = railway open --print 2>$null
}

Write-Host ""
Write-Host "Done. Open your app:" -ForegroundColor Green
railway open 2>$null
Write-Host "Health: append /health and /ready to your Railway URL." -ForegroundColor Green
