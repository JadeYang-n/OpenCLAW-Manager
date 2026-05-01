<#
.SYNOPSIS
    OCM Token Collector - Installer
.DESCRIPTION
    Installs the token collector as a Windows Scheduled Task that:
    1. Runs at system startup (boot)
    2. Repeats every 60 seconds
    Requires: Run as Administrator
.NOTES
    Before running: Edit collector-config.json with your Manager URL and instance token
#>

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition

Write-Host "=== OCM Token Collector Installer ===" -ForegroundColor Cyan

# --- Check Admin ---
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator." -ForegroundColor Red
    Write-Host "Right-click PowerShell -> 'Run as Administrator', then run this script." -ForegroundColor Yellow
    exit 1
}

# --- Validate Config ---
$ConfigPath = Join-Path $ScriptDir "collector-config.json"
if (-not (Test-Path $ConfigPath)) {
    Write-Host "ERROR: collector-config.json not found in $ScriptDir" -ForegroundColor Red
    exit 1
}

$Config = Get-Content $ConfigPath | ConvertFrom-Json
if ($Config.manager_url -eq "http://MANAGER_IP:8080" -or $Config.instance_token -eq "YOUR_INSTANCE_TOKEN") {
    Write-Host "ERROR: collector-config.json contains placeholder values." -ForegroundColor Red
    Write-Host "Please edit it and set manager_url and instance_token to real values." -ForegroundColor Yellow
    exit 1
}

Write-Host "Config OK: Manager=$($Config.manager_url)" -ForegroundColor Green

# --- Test Connectivity ---
Write-Host "Testing connection to Manager..." -NoNewline
try {
    $resp = Invoke-WebRequest -Uri "$($Config.manager_url.TrimEnd('/'))/health" -TimeoutSec 10 -UseBasicParsing
    if ($resp.StatusCode -eq 200) {
        Write-Host " OK" -ForegroundColor Green
    }
} catch {
    Write-Host " FAILED" -ForegroundColor Red
    Write-Host "  Could not reach $($Config.manager_url). Check network/firewall." -ForegroundColor Yellow
    $confirm = Read-Host "Continue anyway? (y/N)"
    if ($confirm -ne "y") { exit 1 }
}

# --- Test Auth ---
Write-Host "Testing instance token..." -NoNewline
try {
    $resp = Invoke-WebRequest -Uri "$($Config.manager_url.TrimEnd('/'))/api/v1/instances" -Headers @{ "X-Instance-Token" = $Config.instance_token } -TimeoutSec 10 -UseBasicParsing
    Write-Host " OK" -ForegroundColor Green
} catch {
    Write-Host " FAILED" -ForegroundColor Red
    Write-Host "  Token rejected. Check collector-config.json instance_token." -ForegroundColor Yellow
    $confirm = Read-Host "Continue anyway? (y/N)"
    if ($confirm -ne "y") { exit 1 }
}

# --- Install as Scheduled Task ---
$TaskName = "OCM-TokenCollector"
$CollectorScript = Join-Path $ScriptDir "token-collector.ps1"

if (-not (Test-Path $CollectorScript)) {
    Write-Host "ERROR: token-collector.ps1 not found at $CollectorScript" -ForegroundColor Red
    exit 1
}

# Remove existing task if present
try {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
} catch {}

# Create action: run collector in loop mode
$Action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$CollectorScript`" -ConfigPath `"$ConfigPath`"" `
    -WorkingDirectory $ScriptDir

# Create trigger: at startup, then repeat every 60 seconds indefinitely
$Trigger = New-ScheduledTaskTrigger `
    -AtStartup `
    -RepetitionInterval (New-TimeSpan -Seconds $Config.collection_interval_seconds) `
    -RepetitionDuration ([TimeSpan]::MaxValue)

# Settings: allow on battery, wake to run, don't stop if idle
$Settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -ExecutionTimeLimit ([TimeSpan]::Zero)

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $Action `
    -Trigger $Trigger `
    -Settings $Settings `
    -Description "OCM Manager Token Usage Collector - scans session files and reports to Manager" `
    -RunLevel Highest `
    -Force

Write-Host ""
Write-Host "=== Installation Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Scheduled Task: $TaskName"
Write-Host "Collector Script: $CollectorScript"
Write-Host "Config: $ConfigPath"
Write-Host "State file: $(Join-Path $ScriptDir collector-state.json)"
Write-Host "Log file: $(Join-Path $ScriptDir collector.log)"
Write-Host ""
Write-Host "The collector will start at next system boot and run continuously." -ForegroundColor Cyan
Write-Host "To start immediately:" -ForegroundColor Yellow
Write-Host "  Start-ScheduledTask -TaskName '$TaskName'" -ForegroundColor White
Write-Host ""
Write-Host "To uninstall:" -ForegroundColor Yellow
Write-Host "  Unregister-ScheduledTask -TaskName '$TaskName' -Confirm:`$false" -ForegroundColor White
Write-Host "  Then delete this directory: $ScriptDir" -ForegroundColor White
