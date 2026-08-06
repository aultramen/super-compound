[CmdletBinding()]
param(
    [string]$CodexHome = $env:CODEX_HOME,
    [switch]$VerifyOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$SkillName = "super-compound"
$CanonicalDirectories = @("context", "workflows", "skills", "templates", "rules", "agents", "evals", "hooks", "tools")

function Get-NormalizedFullPath {
    param([Parameter(Mandatory = $true)][string]$Path)

    $fullPath = [System.IO.Path]::GetFullPath($Path)
    $pathRoot = [System.IO.Path]::GetPathRoot($fullPath)
    if ($fullPath.Length -eq $pathRoot.Length) {
        return $fullPath
    }

    return $fullPath.TrimEnd(
        [System.IO.Path]::DirectorySeparatorChar,
        [System.IO.Path]::AltDirectorySeparatorChar
    )
}

function Assert-ChildPath {
    param(
        [Parameter(Mandatory = $true)][string]$Parent,
        [Parameter(Mandatory = $true)][string]$Child
    )

    $parentPath = Get-NormalizedFullPath $Parent
    $childPath = Get-NormalizedFullPath $Child
    $prefix = $parentPath + [System.IO.Path]::DirectorySeparatorChar

    if (-not $childPath.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing path outside managed root: $childPath"
    }
}

function Get-RelativePath {
    param(
        [Parameter(Mandatory = $true)][string]$Root,
        [Parameter(Mandatory = $true)][string]$Path
    )

    $rootPath = Get-NormalizedFullPath $Root
    $pathValue = Get-NormalizedFullPath $Path
    Assert-ChildPath -Parent $rootPath -Child $pathValue
    return $pathValue.Substring($rootPath.Length + 1).Replace("\", "/")
}

function Assert-NotReparsePoint {
    param([Parameter(Mandatory = $true)][string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return
    }

    $item = Get-Item -LiteralPath $Path -Force
    if (($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
        throw "Path confinement failed: reparse point is not allowed at $Path"
    }
}

function Assert-TreeHasNoReparsePoint {
    param([Parameter(Mandatory = $true)][string]$Root)

    if (-not (Test-Path -LiteralPath $Root)) {
        return
    }

    $pending = New-Object System.Collections.Generic.Stack[string]
    $pending.Push((Get-NormalizedFullPath $Root))
    while ($pending.Count -gt 0) {
        $current = $pending.Pop()
        Assert-NotReparsePoint -Path $current
        $item = Get-Item -LiteralPath $current -Force
        if (-not $item.PSIsContainer) {
            continue
        }

        foreach ($child in Get-ChildItem -LiteralPath $current -Force) {
            Assert-NotReparsePoint -Path $child.FullName
            if ($child.PSIsContainer) {
                $pending.Push($child.FullName)
            }
        }
    }
}

function Get-ExpectedFiles {
    param(
        [Parameter(Mandatory = $true)][string]$RepositoryRoot,
        [Parameter(Mandatory = $true)][string[]]$Directories
    )

    $files = New-Object System.Collections.Generic.List[object]
    $adapterSkill = Join-Path $RepositoryRoot ".codex\SKILL.md"
    if (-not (Test-Path -LiteralPath $adapterSkill -PathType Leaf)) {
        throw "Missing Codex adapter skill: $adapterSkill"
    }

    $files.Add([pscustomobject]@{
        Path = "SKILL.md"
        Source = $adapterSkill
        Sha256 = (Get-FileHash -LiteralPath $adapterSkill -Algorithm SHA256).Hash.ToLowerInvariant()
    })

    foreach ($directory in $Directories) {
        $sourceRoot = Join-Path $RepositoryRoot ".agent\$directory"
        if (-not (Test-Path -LiteralPath $sourceRoot -PathType Container)) {
            throw "Missing canonical directory: $sourceRoot"
        }
        Assert-TreeHasNoReparsePoint -Root $sourceRoot

        foreach ($file in Get-ChildItem -LiteralPath $sourceRoot -File -Recurse -Force | Sort-Object FullName) {
            $relativePath = Get-RelativePath -Root $sourceRoot -Path $file.FullName
            if ($relativePath -match '(^|/)__pycache__(/|$)' -or $relativePath -match '\.(pyc|pyo)$') {
                continue
            }
            $files.Add([pscustomobject]@{
                Path = "references/$directory/$relativePath"
                Source = $file.FullName
                Sha256 = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
            })
        }
    }

    $paths = [string[]]@($files | ForEach-Object { $_.Path })
    [System.Array]::Sort($paths, [System.StringComparer]::Ordinal)
    $sortedFiles = New-Object System.Collections.Generic.List[object]
    foreach ($path in $paths) {
        foreach ($file in $files) {
            if ($file.Path -ceq $path) {
                $sortedFiles.Add($file)
                break
            }
        }
    }

    return $sortedFiles
}

function New-ManifestJson {
    param([Parameter(Mandatory = $true)][object[]]$ExpectedFiles)

    $manifestFiles = @($ExpectedFiles | ForEach-Object {
        [ordered]@{
            path = $_.Path
            sha256 = $_.Sha256
        }
    })
    $manifest = [ordered]@{
        schemaVersion = 1
        algorithm = "SHA256"
        files = $manifestFiles
    }

    return ($manifest | ConvertTo-Json -Depth 4)
}

function Assert-InstalledBundle {
    param(
        [Parameter(Mandatory = $true)][string]$Target,
        [Parameter(Mandatory = $true)][object[]]$ExpectedFiles
    )

    if (-not (Test-Path -LiteralPath $Target -PathType Container)) {
        throw "Verification failed: installed skill directory is missing."
    }

    $manifestPath = Join-Path $Target "manifest.json"
    if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
        throw "Verification failed: manifest.json is missing."
    }

    $expectedPaths = [string[]]@($ExpectedFiles | ForEach-Object { $_.Path })
    $expectedPaths += "manifest.json"
    [System.Array]::Sort($expectedPaths, [System.StringComparer]::Ordinal)

    $actualPaths = [string[]]@(
        Get-ChildItem -LiteralPath $Target -File -Recurse -Force |
            ForEach-Object { Get-RelativePath -Root $Target -Path $_.FullName }
    )
    [System.Array]::Sort($actualPaths, [System.StringComparer]::Ordinal)

    $unexpected = @($actualPaths | Where-Object { -not ($expectedPaths -ccontains $_) })
    if ($unexpected.Count -gt 0) {
        throw "Verification failed: unexpected stale files: $($unexpected -join ', ')"
    }

    $missing = @($expectedPaths | Where-Object { -not ($actualPaths -ccontains $_) })
    if ($missing.Count -gt 0) {
        throw "Verification failed: missing files: $($missing -join ', ')"
    }

    try {
        $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
    }
    catch {
        throw "Verification failed: manifest.json is invalid JSON."
    }

    if ($manifest.schemaVersion -ne 1 -or $manifest.algorithm -cne "SHA256") {
        throw "Verification failed: unsupported manifest metadata."
    }

    $manifestFiles = @($manifest.files)
    if ($manifestFiles.Count -ne $ExpectedFiles.Count) {
        throw "Verification failed: manifest file count mismatch."
    }

    for ($index = 0; $index -lt $ExpectedFiles.Count; $index++) {
        $expected = $ExpectedFiles[$index]
        $record = $manifestFiles[$index]
        if ($record.path -cne $expected.Path) {
            throw "Verification failed: manifest path mismatch at index $index."
        }
        if ($record.sha256 -cne $expected.Sha256) {
            throw "Verification failed: manifest hash mismatch for $($expected.Path)."
        }

        $installedPath = Join-Path $Target $expected.Path.Replace("/", "\")
        $actualHash = (Get-FileHash -LiteralPath $installedPath -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($actualHash -cne $expected.Sha256) {
            throw "Verification failed: hash mismatch for $($expected.Path)."
        }
    }
}

function Write-InstalledBundle {
    param(
        [Parameter(Mandatory = $true)][string]$Target,
        [Parameter(Mandatory = $true)][object[]]$ExpectedFiles,
        [Parameter(Mandatory = $true)][string]$ManifestJson
    )

    New-Item -ItemType Directory -Path $Target -Force | Out-Null
    foreach ($file in $ExpectedFiles) {
        $destination = Join-Path $Target $file.Path.Replace("/", "\")
        Assert-ChildPath -Parent $Target -Child $destination
        New-Item -ItemType Directory -Path (Split-Path -Parent $destination) -Force | Out-Null
        Copy-Item -LiteralPath $file.Source -Destination $destination -Force
    }

    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText(
        (Join-Path $Target "manifest.json"),
        $ManifestJson + [Environment]::NewLine,
        $utf8NoBom
    )
    Assert-InstalledBundle -Target $Target -ExpectedFiles $ExpectedFiles
}

if ([string]::IsNullOrWhiteSpace($CodexHome)) {
    if ([string]::IsNullOrWhiteSpace($HOME)) {
        throw "Codex home is required. Pass -CodexHome or set CODEX_HOME."
    }
    $CodexHome = Join-Path $HOME ".codex"
}

$repositoryRoot = Get-NormalizedFullPath (Join-Path $PSScriptRoot "..")
$codexRoot = Get-NormalizedFullPath $CodexHome
if ($codexRoot -ceq [System.IO.Path]::GetPathRoot($codexRoot)) {
    throw "Path confinement failed: Codex home cannot be a filesystem root."
}
$skillsRoot = Join-Path $codexRoot "skills"
$target = Join-Path $skillsRoot $SkillName
Assert-ChildPath -Parent $codexRoot -Child $skillsRoot
Assert-ChildPath -Parent $skillsRoot -Child $target
Assert-NotReparsePoint -Path $codexRoot
Assert-NotReparsePoint -Path $skillsRoot
Assert-TreeHasNoReparsePoint -Root $target

if ([System.IO.Path]::GetFileName($target) -cne $SkillName) {
    throw "Refusing unexpected skill target: $target"
}

$expectedFiles = @(Get-ExpectedFiles -RepositoryRoot $repositoryRoot -Directories $CanonicalDirectories)
$manifestJson = New-ManifestJson -ExpectedFiles $expectedFiles

$verificationFailure = $null
try {
    Assert-InstalledBundle -Target $target -ExpectedFiles $expectedFiles
}
catch {
    $verificationFailure = $_.Exception.Message
}

if ($VerifyOnly) {
    if ($null -ne $verificationFailure) {
        throw $verificationFailure
    }
    Write-Output "Verified $SkillName at $target against its canonical sources and hash manifest."
    exit 0
}

if ($null -eq $verificationFailure) {
    Write-Output "$SkillName is already current at $target."
    exit 0
}

New-Item -ItemType Directory -Path $skillsRoot -Force | Out-Null
Assert-NotReparsePoint -Path $skillsRoot
$transactionId = [Guid]::NewGuid().ToString("N")
$staging = Join-Path $skillsRoot ".$SkillName.stage-$transactionId"
$backup = Join-Path $skillsRoot ".$SkillName.backup-$transactionId"
Assert-ChildPath -Parent $skillsRoot -Child $staging
Assert-ChildPath -Parent $skillsRoot -Child $backup
$targetMoved = $false
$stagePromoted = $false
$completed = $false

try {
    Write-InstalledBundle -Target $staging -ExpectedFiles $expectedFiles -ManifestJson $manifestJson
    if ($env:SUPER_COMPOUND_INSTALL_FAIL_AFTER_STAGE -ceq "1") {
        throw "Injected failure after stage verification."
    }

    if (Test-Path -LiteralPath $target) {
        Move-Item -LiteralPath $target -Destination $backup
        $targetMoved = $true
    }
    Move-Item -LiteralPath $staging -Destination $target
    $stagePromoted = $true
    Assert-InstalledBundle -Target $target -ExpectedFiles $expectedFiles
    $completed = $true
}
catch {
    $installFailure = $_
    if ($stagePromoted -and (Test-Path -LiteralPath $target)) {
        Assert-ChildPath -Parent $skillsRoot -Child $target
        Assert-TreeHasNoReparsePoint -Root $target
        Remove-Item -LiteralPath $target -Recurse -Force
    }
    if ($targetMoved -and (Test-Path -LiteralPath $backup)) {
        Move-Item -LiteralPath $backup -Destination $target
    }
    throw $installFailure
}
finally {
    if (Test-Path -LiteralPath $staging) {
        Assert-ChildPath -Parent $skillsRoot -Child $staging
        Assert-TreeHasNoReparsePoint -Root $staging
        Remove-Item -LiteralPath $staging -Recurse -Force
    }
    if ($completed -and (Test-Path -LiteralPath $backup)) {
        Assert-ChildPath -Parent $skillsRoot -Child $backup
        Assert-TreeHasNoReparsePoint -Root $backup
        Remove-Item -LiteralPath $backup -Recurse -Force
    }
}

Write-Output "Installed $SkillName into $target with $($expectedFiles.Count) hashed files."
