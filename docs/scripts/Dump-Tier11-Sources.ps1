<#
D-Eagle Hub — Tier 11 Source Dump
Prints the full content of every file needed to work on Tier 11
(Today screen + the design-token files it depends on) straight to
the console, with clear markers around each file, so you can select
all the output and paste it back into chat in one go.

Usage:
  cd C:\Dev\d-eagle-hub
  powershell -ExecutionPolicy Bypass -File .\Dump-Tier11-Sources.ps1
#>

$ErrorActionPreference = "Stop"
Set-Location "C:\Dev\d-eagle-hub"
$projectRoot = Get-Location

# Every file that might matter for Tier 11 (Today screen audit,
# form validation, destructive-action confirm, placeholder contrast,
# Today-screen decluttering). Listed generously on purpose -- "leave
# nothing behind" means over-include rather than guess wrong.
$targets = @(
    "app\(tabs)\index.tsx",
    "app\(tabs)\_layout.tsx",
    "app\(tabs)\review.tsx",
    "app\(tabs)\dashboard.tsx",
    "app\(tabs)\settings.tsx",
    "constants\radii.ts",
    "constants\spacing.ts",
    "constants\typography.ts",
    "constants\colors.ts",
    "hooks\use-colors.ts",
    "lib\local-data.ts",
    "package.json"
)

Write-Host "================================================================"
Write-Host "D-EAGLE HUB -- TIER 11 SOURCE DUMP"
Write-Host "Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
Write-Host "Project root: $projectRoot"
Write-Host "================================================================"
Write-Host ""

foreach ($rel in $targets) {
    $full = Join-Path $projectRoot $rel

    Write-Host "----------------------------------------------------------------"
    Write-Host "FILE: $rel"
    Write-Host "----------------------------------------------------------------"

    if (Test-Path $full) {
        $lineCount = (Get-Content $full).Count
        Write-Host "($lineCount lines)"
        Write-Host ""
        Get-Content $full -Raw | Write-Host
    } else {
        Write-Host "*** NOT FOUND at this path -- skipped ***"
    }

    Write-Host ""
    Write-Host "----------------------------------------------------------------"
    Write-Host "END: $rel"
    Write-Host "----------------------------------------------------------------"
    Write-Host ""
}

# Also list the actual folder structure of app/ and constants/ so any
# file I guessed wrong on (renamed, moved, or missing from the list
# above) shows up here instead of silently vanishing.
Write-Host "----------------------------------------------------------------"
Write-Host "FOLDER LISTING: app\ (recursive)"
Write-Host "----------------------------------------------------------------"
Get-ChildItem -Path (Join-Path $projectRoot "app") -Recurse -File |
    ForEach-Object { Write-Host $_.FullName.Replace("$projectRoot\", "") }

Write-Host ""
Write-Host "----------------------------------------------------------------"
Write-Host "FOLDER LISTING: constants\ (recursive)"
Write-Host "----------------------------------------------------------------"
if (Test-Path (Join-Path $projectRoot "constants")) {
    Get-ChildItem -Path (Join-Path $projectRoot "constants") -Recurse -File |
        ForEach-Object { Write-Host $_.FullName.Replace("$projectRoot\", "") }
} else {
    Write-Host "*** constants\ folder not found ***"
}

Write-Host ""
Write-Host "================================================================"
Write-Host "END OF DUMP -- select all console output above and paste it back."
Write-Host "================================================================"
