# Import the sanitized LGN Horizons source into a clean checkout.
# Windows PowerShell 5.1+ / PowerShell 7+
# Example:
#   .\scripts\Import-LGN.ps1 -ArchivePath "C:\Users\you\Downloads\LGN-Sanitized-Horizons-Import.zip" -Push
# Requires Git configured with access to push to the Lorum-Ipsa repository.
[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)][string]$ArchivePath,
    [string]$Workspace = (Join-Path (Get-Location).Path "LGN-Import-Checkout"),
    [switch]$Push
)
$ErrorActionPreference = 'Stop'
$repo = 'https://github.com/Lorum-Ipsa/Laughing-Ghost-Network.git'
$branch = 'feature/horizons-source-import'
$expectedSha256 = '10a40a55a699ea679cfe5b9dd51f01623b4215dfc83e006ca762a70046a8dbd8'
$archive = (Resolve-Path -LiteralPath $ArchivePath).Path

if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLower() -ne $expectedSha256) {
    throw 'ZIP SHA256 does not match the reviewed sanitized package. Do not import unreviewed bytes.'
}
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'Git is required. Install Git for Windows first.' }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js is required for repository checks.' }
if (Test-Path -LiteralPath $Workspace) { throw "Workspace already exists: $Workspace. Use a new empty directory." }

$staging = Join-Path ([System.IO.Path]::GetTempPath()) ("lgn-import-" + [System.Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $staging | Out-Null
try {
    Expand-Archive -LiteralPath $archive -DestinationPath $staging
    foreach ($required in @('apps','package.json','bun.lock','bunfig.toml','IMPORT_NOTES.md')) {
        if (-not (Test-Path -LiteralPath (Join-Path $staging $required))) {
            throw "Archive is missing required item: $required"
        }
    }

    & git clone $repo $Workspace
    if ($LASTEXITCODE -ne 0) { throw 'Could not clone GitHub repository.' }
    & git -C $Workspace fetch origin $branch
    if ($LASTEXITCODE -ne 0) { throw 'Could not fetch the import branch.' }
    & git -C $Workspace checkout -b $branch "origin/$branch"
    if ($LASTEXITCODE -ne 0) { throw 'Could not check out import branch.' }

    foreach ($item in @('apps','package.json','bun.lock','bunfig.toml','knip.json','IMPORT_NOTES.md')) {
        $source = Join-Path $staging $item
        if (Test-Path -LiteralPath $source) {
            Copy-Item -LiteralPath $source -Destination $Workspace -Recurse -Force
        }
    }

    Push-Location $Workspace
    try {
        & node scripts/check-repository.mjs
        if ($LASTEXITCODE -ne 0) { throw 'Safety check failed. Nothing was pushed.' }
        & git add -- apps package.json bun.lock bunfig.toml knip.json IMPORT_NOTES.md
        if ($LASTEXITCODE -ne 0) { throw 'Could not stage the import.' }
        & git diff --cached --check
        if ($LASTEXITCODE -ne 0) { throw 'Git whitespace or patch validation failed.' }

        Write-Host 'Files prepared on the import branch. Review with: git diff --cached --stat'
        if ($Push) {
            & git commit -m 'feat: import sanitized LGN Horizons application'
            if ($LASTEXITCODE -ne 0) { throw 'Commit failed; verify Git author configuration.' }
            & git push -u origin $branch
            if ($LASTEXITCODE -ne 0) { throw 'Push failed; verify GitHub access.' }
            Write-Host 'Pushed source to existing draft PR #2.'
        } else {
            Write-Host 'No commit or push performed. Rerun with -Push once you approve the staged files.'
        }
    } finally { Pop-Location }
} finally {
    Remove-Item -LiteralPath $staging -Recurse -Force -ErrorAction SilentlyContinue
}
