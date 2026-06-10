# Inicia o Solutions CRM completo: Docker (Postgres+Redis), API e Web.
$ErrorActionPreference = "Continue"
$root = $PSScriptRoot

Write-Host "Iniciando Solutions CRM..." -ForegroundColor Cyan

# 1. Garante que o Docker Desktop esta rodando
$dockerOk = $false
try { docker info *>$null; $dockerOk = ($LASTEXITCODE -eq 0) } catch {}
if (-not $dockerOk) {
    Write-Host "Abrindo Docker Desktop (aguarde)..." -ForegroundColor Yellow
    Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    $tries = 0
    while (-not $dockerOk -and $tries -lt 60) {
        Start-Sleep -Seconds 3
        try { docker info *>$null; $dockerOk = ($LASTEXITCODE -eq 0) } catch {}
        $tries++
    }
    if (-not $dockerOk) {
        Write-Host "Docker nao iniciou. Abra o Docker Desktop manualmente e tente de novo." -ForegroundColor Red
        Read-Host "Pressione Enter para sair"
        exit 1
    }
}

# 2. Sobe Postgres + Redis
Set-Location $root
docker compose up -d 2>$null
Write-Host "Banco de dados OK" -ForegroundColor Green

# 3. Inicia a API (porta 4000) se ainda nao estiver rodando
$apiUp = $false
try { $r = Invoke-WebRequest -Uri "http://localhost:4000/health" -UseBasicParsing -TimeoutSec 2; $apiUp = $true } catch {}
if (-not $apiUp) {
    Start-Process -WindowStyle Minimized powershell -ArgumentList "-NoExit", "-Command", "cd '$root\apps\server'; npm run dev"
    Write-Host "API iniciando..." -ForegroundColor Green
}

# 4. Inicia o frontend (porta 5173) se ainda nao estiver rodando
$webUp = $false
try { $r = Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing -TimeoutSec 2; $webUp = $true } catch {}
if (-not $webUp) {
    Start-Process -WindowStyle Minimized powershell -ArgumentList "-NoExit", "-Command", "cd '$root\apps\web'; npm run dev"
    Write-Host "Interface iniciando..." -ForegroundColor Green
}

# 5. Espera o frontend responder e abre o navegador
Write-Host "Aguardando o app ficar pronto..." -ForegroundColor Cyan
$tries = 0
$ready = $false
while (-not $ready -and $tries -lt 30) {
    Start-Sleep -Seconds 2
    try { Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing -TimeoutSec 2 *>$null; $ready = $true } catch {}
    $tries++
}

Start-Process "http://localhost:5173"
Write-Host "Solutions CRM aberto no navegador!" -ForegroundColor Green
Start-Sleep -Seconds 3
