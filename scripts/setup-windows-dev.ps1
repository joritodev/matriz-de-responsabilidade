# Setup local no Windows: clona o repo, sobe Postgres e inicia npm run dev.
# Uso (PowerShell):
#   Set-ExecutionPolicy -Scope Process Bypass
#   .\scripts\setup-windows-dev.ps1

$ErrorActionPreference = "Stop"

$RepoRoot = "C:\Users\Jorito\Desktop\Jorito\Repos"
$RepoName = "matriz-de-responsabilidade"
$Target = Join-Path $RepoRoot $RepoName
$Branch = "main"
$RepoUrl = "https://github.com/joritodev/matriz-de-responsabilidade.git"

function Require-Command($name) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        throw "Comando obrigatório não encontrado: $name"
    }
}

Require-Command git
Require-Command node
Require-Command npm
Require-Command docker

Write-Host ">> Pasta destino: $Target"
New-Item -ItemType Directory -Force -Path $RepoRoot | Out-Null

if (Test-Path (Join-Path $Target ".git")) {
    Write-Host ">> Repositório já existe — atualizando..."
    Set-Location $Target
    git fetch origin
    git checkout $Branch
    git pull origin $Branch
} else {
    Write-Host ">> Clonando $RepoUrl (branch $Branch)..."
    Set-Location $RepoRoot
    git clone -b $Branch $RepoUrl $RepoName
    Set-Location $Target
}

if (-not (Test-Path ".env")) {
    Write-Host ">> Criando .env a partir de .env.example"
    Copy-Item ".env.example" ".env"
}

Write-Host ">> Subindo Postgres (Docker)..."
docker compose up postgres -d

Write-Host ">> Aguardando Postgres..."
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    $null = docker compose exec -T postgres pg_isready -U matriz -d matriz 2>$null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 2
}
if (-not $ready) { throw "Postgres não ficou pronto a tempo." }

Write-Host ">> Instalando dependências..."
npm install

Write-Host ">> Migrando e seed..."
npm run db:migrate
npm run db:seed

Write-Host ""
Write-Host "========================================"
Write-Host " Pronto! Iniciando dev em http://localhost:3000"
Write-Host " Login: admin@local.test / change-me-local-only"
Write-Host "========================================"
Write-Host ""

npm run dev
