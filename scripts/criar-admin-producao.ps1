<#
  Cria o administrador no banco da NUVEM usando as conexões do arquivo .env.producao.
  Uso: powershell -ExecutionPolicy Bypass -File scripts\criar-admin-producao.ps1
#>
$ErrorActionPreference = "Stop"
$raiz = Resolve-Path (Join-Path $PSScriptRoot "..")
$arquivo = Join-Path $raiz ".env.producao"
if (-not (Test-Path $arquivo)) { throw "Arquivo .env.producao não encontrado." }

Get-Content $arquivo | ForEach-Object {
  if ($_ -match '^(DATABASE_URL|DIRECT_URL)="(.*)"$') { Set-Item "env:$($Matches[1])" $Matches[2] }
}
$env:Path = "C:\Program Files\nodejs;" + $env:Path

Write-Host ""
Write-Host "Criar administrador no banco da NUVEM (Supabase)" -ForegroundColor Cyan
$email = Read-Host "E-mail de acesso do administrador"
$nome = Read-Host "Nome completo"
Set-Location $raiz
npm run criar-admin -- $email $nome
Write-Host "Guarde a senha acima em local seguro e troque-a no primeiro acesso (Minha conta)." -ForegroundColor Yellow
