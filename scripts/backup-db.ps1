param(
  [string]$OutputDirectory = (Join-Path $PSScriptRoot '..\backups')
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$environmentFile = Join-Path $projectRoot 'Backend\.env'
if (-not (Test-Path -LiteralPath $environmentFile -PathType Leaf)) {
  throw 'No existe Backend\.env. Configura el proyecto antes de respaldar.'
}

$configuration = @{}
foreach ($line in Get-Content -LiteralPath $environmentFile) {
  if ($line -match '^\s*([^#][^=]*)=(.*)$') {
    $configuration[$matches[1].Trim()] = $matches[2].Trim()
  }
}
foreach ($required in 'DB_HOST','DB_PORT','DB_NAME','DB_USER','DB_PASSWORD') {
  if ([string]::IsNullOrWhiteSpace($configuration[$required])) { throw "Falta $required en Backend\.env" }
}

$resolvedOutput = [System.IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Path $resolvedOutput -Force | Out-Null
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupPath = Join-Path $resolvedOutput "$($configuration.DB_NAME)-$timestamp.backup"
$pgDump = (Get-Command pg_dump.exe -ErrorAction SilentlyContinue).Source
if (-not $pgDump) {
  $pgDump = Get-ChildItem -Path (Join-Path $env:ProgramFiles 'PostgreSQL') -Filter pg_dump.exe -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -match '\\bin\\pg_dump\.exe$' } |
    Sort-Object FullName -Descending |
    Select-Object -First 1 -ExpandProperty FullName
}
if (-not $pgDump) { throw 'No se encontró pg_dump.exe. Instala las herramientas cliente de PostgreSQL.' }
$env:PGPASSWORD = $configuration.DB_PASSWORD
try {
  & $pgDump --host=$($configuration.DB_HOST) --port=$($configuration.DB_PORT) --username=$($configuration.DB_USER) --format=custom --file=$backupPath $configuration.DB_NAME
  if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $backupPath -PathType Leaf)) { throw 'pg_dump no pudo generar el respaldo.' }
  Write-Output $backupPath
} finally {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}
