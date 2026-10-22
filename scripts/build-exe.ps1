<#
.SYNOPSIS
    Build the Clash Verge Windows installer (NSIS .exe) from source.

.DESCRIPTION
    Runs the same steps as the release workflow: fetch the bundled cores and
    service binaries, build the web frontend, compile the Rust app and package
    it with NSIS. The first run downloads several hundred crates and usually
    takes 20-40 minutes; later runs reuse `src-tauri/target` and only take a
    couple of minutes.

.PARAMETER Target
    Rust target triple. Defaults to the host triple x86_64-pc-windows-msvc.

.PARAMETER SkipPrebuild
    Reuse the cores already present in src-tauri/sidecar and src-tauri/resources
    instead of downloading them again.

.PARAMETER Sign
    Keep updater artifacts and sign them. Requires TAURI_SIGNING_PRIVATE_KEY
    (and TAURI_SIGNING_PRIVATE_KEY_PASSWORD when the key is encrypted).

.EXAMPLE
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\build-exe.ps1
#>
[CmdletBinding()]
param(
    [string]$Target = 'x86_64-pc-windows-msvc',
    [switch]$SkipPrebuild,
    [switch]$Sign
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

function Assert-Command([string]$Name, [string]$Hint) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Missing '$Name' in PATH. $Hint"
    }
}

# The Rust toolchain is installed per-user and is not always on PATH.
$cargoBin = Join-Path $env:USERPROFILE '.cargo\bin'
if (Test-Path (Join-Path $cargoBin 'cargo.exe')) {
    $env:PATH = "$cargoBin;$env:PATH"
}

Assert-Command 'node' 'Install Node.js 22 or newer.'
Assert-Command 'pnpm' 'Install pnpm: corepack enable pnpm'
Assert-Command 'cargo' 'Install the Rust toolchain from https://rustup.rs.'
Assert-Command 'rustc' 'Install the Rust toolchain from https://rustup.rs.'

Write-Host "==> node $(node --version) / pnpm $(pnpm --version) / $(rustc --version)" -ForegroundColor Cyan
Write-Host "==> target: $Target" -ForegroundColor Cyan

if (-not (Test-Path 'node_modules')) {
    Write-Host '==> installing frontend dependencies' -ForegroundColor Cyan
    pnpm install
    if ($LASTEXITCODE -ne 0) { throw 'pnpm install failed' }
}

if ($SkipPrebuild) {
    Write-Host '==> prebuild skipped' -ForegroundColor Yellow
}
else {
    Write-Host '==> downloading bundled cores and service binaries' -ForegroundColor Cyan
    node scripts/prebuild.mjs $Target
    if ($LASTEXITCODE -ne 0) { throw 'prebuild failed' }
}

# `createUpdaterArtifacts` requires a signing key, so it is only kept when asked.
$configPath = Join-Path $env:TEMP "clash-verge-build-$PID.json"
$updater = if ($Sign) { 'true' } else { 'false' }
Set-Content -Path $configPath -Value "{`"bundle`":{`"createUpdaterArtifacts`":$updater}}" -Encoding ASCII

try {
    Write-Host '==> building app and installer' -ForegroundColor Cyan
    & node 'node_modules\@tauri-apps\cli\tauri.js' build --target $Target --config $configPath
    if ($LASTEXITCODE -ne 0) { throw 'tauri build failed' }
}
finally {
    Remove-Item $configPath -ErrorAction SilentlyContinue
}

# The root Cargo.toml declares a workspace, so cargo writes into <repo>/target.
$targetDir = Join-Path $repoRoot "target\$Target\release"
if (-not (Test-Path $targetDir)) {
    $targetDir = Join-Path $repoRoot "src-tauri\target\$Target\release"
}
$installers = Get-ChildItem (Join-Path $targetDir 'bundle\nsis') -Filter '*.exe' -ErrorAction SilentlyContinue

Write-Host ''
Write-Host '==> done' -ForegroundColor Green
foreach ($file in $installers) {
    Write-Host ("    installer: {0} ({1:N1} MB)" -f $file.FullName, ($file.Length / 1MB))
}
$exe = Join-Path $targetDir 'clash-verge.exe'
if (Test-Path $exe) {
    Write-Host ("    portable:  {0} ({1:N1} MB)" -f $exe, ((Get-Item $exe).Length / 1MB))
}
if (-not $installers -and -not (Test-Path $exe)) {
    throw 'Build finished but no artifact was found.'
}
