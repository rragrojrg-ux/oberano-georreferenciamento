<#
  Backup do SOBERANO: banco PostgreSQL (pg_dump, formato custom) + pasta de documentos.
  Uso (na pasta do projeto):  powershell -ExecutionPolicy Bypass -File scripts\backup.ps1
  Agendamento diário: Agendador de Tarefas do Windows apontando para este script.
  Copie a pasta "backups" para um local EXTERNO (HD externo/nuvem com criptografia).
#>
param(
  [string]$Destino = (Join-Path $PSScriptRoot "..\backups"),
  [int]$ManterDias = 30,
  [string]$PgBin = "C:\Program Files\PostgreSQL\16\bin"
)
$ErrorActionPreference = "Stop"
$raiz = Resolve-Path (Join-Path $PSScriptRoot "..")
$envFile = Join-Path $raiz ".env"
if (-not (Test-Path $envFile)) { throw "Arquivo .env não encontrado em $raiz" }

$url = (Get-Content $envFile | Where-Object { $_ -match '^DATABASE_URL=' }) -replace '^DATABASE_URL="?([^"]*)"?$', '$1'
if ($url -notmatch '^postgres(ql)?://([^:]+):([^@]+)@([^:/]+):?(\d+)?/([^?]+)') { throw "DATABASE_URL inválida." }
$usuario = $Matches[2]; $senha = [Uri]::UnescapeDataString($Matches[3]); $servidor = $Matches[4]
$porta = if ($Matches[5]) { $Matches[5] } else { "5432" }; $banco = $Matches[6]

New-Item -ItemType Directory -Force $Destino | Out-Null
$carimbo = Get-Date -Format "yyyy-MM-dd_HHmm"
$arqBanco = Join-Path $Destino "soberano_banco_$carimbo.dump"

$env:PGPASSWORD = $senha
try {
  & (Join-Path $PgBin "pg_dump.exe") -h $servidor -p $porta -U $usuario -d $banco -Fc -f $arqBanco
  if ($LASTEXITCODE -ne 0) { throw "pg_dump falhou (código $LASTEXITCODE)." }
} finally { Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue }
Write-Host "Banco salvo em $arqBanco"

$storage = Join-Path $raiz "storage"
$arquivos = if (Test-Path $storage) { @(Get-ChildItem $storage -Recurse -File) } else { @() }
if ($arquivos.Count -gt 0) {
  $arqDocs = Join-Path $Destino "soberano_documentos_$carimbo.zip"
  Compress-Archive -Path (Join-Path $storage "*") -DestinationPath $arqDocs -Force
  Write-Host "Documentos ($($arquivos.Count) arquivo(s)) salvos em $arqDocs"
} else {
  Write-Host "Nenhum documento enviado ainda - nada a compactar."
}

Get-ChildItem $Destino -File | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$ManterDias) } | Remove-Item
Write-Host "Backups com mais de $ManterDias dias removidos. Concluído."
