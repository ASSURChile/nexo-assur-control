Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "Preparando entorno Windows..." -ForegroundColor Cyan

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error "Node.js no esta instalado. Instala Node.js LTS desde https://nodejs.org/ y vuelve a ejecutar este script."
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Error "npm no esta disponible. Reinstala Node.js LTS y vuelve a ejecutar este script."
}

if (-not (Test-Path ".env.local")) {
  Copy-Item ".env.example" ".env.local"
  Write-Host "Se creo .env.local desde .env.example. Completa las claves privadas antes de usar Supabase." -ForegroundColor Yellow
}

npm install
npm run build

Write-Host ""
Write-Host "Entorno listo." -ForegroundColor Green
Write-Host "Para iniciar frontend: npm run dev"
Write-Host "Para iniciar backend local: npm run backend"
