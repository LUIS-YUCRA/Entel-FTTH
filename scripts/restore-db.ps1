param(
  [Parameter(Mandatory=$true)][string]$BackupPath,
  [Parameter(Mandatory=$true)][string]$ConfirmDatabaseName
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$environmentFile = Join-Path $projectRoot 'Backend\.env'
$resolvedBackup = (Resolve-Path -LiteralPath $BackupPath -ErrorAction Stop).Path
if ([System.IO.Path]::GetExtension($resolvedBackup) -ne '.backup') { throw 'El archivo debe tener extensión .backup' }

$configuration = @{}
foreach ($line in Get-Content -LiteralPath $environmentFile) {
  if ($line -match '^\s*([^#][^=]*)=(.*)$') { $configuration[$matches[1].Trim()] = $matches[2].Trim() }
}
foreach ($required in 'DB_HOST','DB_PORT','DB_NAME','DB_USER','DB_PASSWORD') {
  if ([string]::IsNullOrWhiteSpace($configuration[$required])) { throw "Falta $required en Backend\.env" }
}
if ($ConfirmDatabaseName -cne $configuration.DB_NAME) {
  throw 'La confirmación no coincide exactamente con DB_NAME. No se realizó ningún cambio.'
}

$pgRestore = (Get-Command pg_restore.exe -ErrorAction SilentlyContinue).Source
if (-not $pgRestore) {
  $pgRestore = Get-ChildItem -Path (Join-Path $env:ProgramFiles 'PostgreSQL') -Filter pg_restore.exe -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -match '\\bin\\pg_restore\.exe$' } |
    Sort-Object FullName -Descending |
    Select-Object -First 1 -ExpandProperty FullName
}
if (-not $pgRestore) { throw 'No se encontró pg_restore.exe. Instala las herramientas cliente de PostgreSQL.' }

$env:PGPASSWORD = $configuration.DB_PASSWORD
try {
  & $pgRestore --host=$($configuration.DB_HOST) --port=$($configuration.DB_PORT) --username=$($configuration.DB_USER) --dbname=$($configuration.DB_NAME) --clean --if-exists --no-owner $resolvedBackup
  if ($LASTEXITCODE -ne 0) { throw 'pg_restore no pudo restaurar el respaldo.' }
  Write-Output "Restauración completada en $($configuration.DB_NAME)"
} finally {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}
