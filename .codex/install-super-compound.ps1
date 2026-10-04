[CmdletBinding()]
param(
    [string]$CodexHome = $env:CODEX_HOME,
    [switch]$VerifyOnly,
    [switch]$DryRun
)
$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($CodexHome)) {
    $CodexHome = Join-Path ([Environment]::GetFolderPath('UserProfile')) '.codex'
}
$engine = Join-Path $PSScriptRoot '../.agent/tools/setup.mjs'
$operation = if ($VerifyOnly) { 'doctor' } else { 'install' }
$arguments = @($engine, $operation, '--codex-home', $CodexHome)
if ($DryRun) { $arguments += '--dry-run' }
& node @arguments
exit $LASTEXITCODE
