<#
.SYNOPSIS
    OCM Token Collector - Lightweight token usage collection script
.DESCRIPTION
    Scans OpenCLAW session JSONL files for token usage data and reports
    to OCM Manager via POST /api/v1/agent/usage. Designed for deployment
    on employee machines where the Manager server is remote.
.NOTES
    Requires: PowerShell 5.1+ (Windows built-in)
    Config:   collector-config.json (same directory)
    Auto-install: install-collector.ps1 (creates scheduled task)
#>

param(
    [string]$ConfigPath = "",
    [switch]$Once = $false
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition

# --- Config Loading ---
if (-not $ConfigPath) {
    $ConfigPath = Join-Path $ScriptDir "collector-config.json"
}
if (-not (Test-Path $ConfigPath)) {
    Write-Host "ERROR: Config not found at $ConfigPath" -ForegroundColor Red
    Write-Host "Edit collector-config.json with your Manager URL and instance token." -ForegroundColor Yellow
    exit 1
}

$Config = Get-Content $ConfigPath | ConvertFrom-Json
$ManagerUrl = $Config.manager_url.TrimEnd('/')
$InstanceToken = $Config.instance_token
$Interval = if ($Config.collection_interval_seconds -gt 0) { $Config.collection_interval_seconds } else { 60 }
$StateFile = if ($Config.state_file) { Join-Path $ScriptDir $Config.state_file } else { Join-Path $ScriptDir "collector-state.json" }
$LogFile = if ($Config.log_file) { Join-Path $ScriptDir $Config.log_file } else { Join-Path $ScriptDir "collector.log" }

# --- Logging ---
function Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$timestamp] [$Level] $Message"
    Add-Content -Path $LogFile -Value $line -Encoding UTF8
    if ($Level -eq "ERROR") {
        Write-Host $line -ForegroundColor Red
    } elseif ($Level -eq "WARN") {
        Write-Host $line -ForegroundColor Yellow
    } else {
        Write-Host $line
    }
}

# --- State Management (dedup) ---
function Load-State {
    if (Test-Path $StateFile) {
        try {
            return (Get-Content $StateFile -Raw | ConvertFrom-Json).reported_ids -as [System.Collections.ArrayList]
        } catch {
            return [System.Collections.ArrayList]::new()
        }
    }
    return [System.Collections.ArrayList]::new()
}

function Save-State {
    param([System.Collections.ArrayList]$Ids)
    # Cap at 10000 entries to prevent unbounded growth
    if ($Ids.Count -gt 10000) {
        $Ids.RemoveRange(0, $Ids.Count - 10000)
    }
    $state = @{ reported_ids = @($Ids) }
    $state | ConvertTo-Json -Depth 1 | Set-Content -Path $StateFile -Encoding UTF8
}

# --- Session File Discovery ---
function Find-SessionFiles {
    $baseDirs = @(
        "$env:USERPROFILE\.openclaw\agents",
        "$env:USERPROFILE\.openclaw-autoclaw\agents"
    )
    $files = [System.Collections.ArrayList]::new()
    foreach ($baseDir in $baseDirs) {
        if (Test-Path $baseDir) {
            $found = Get-ChildItem -Path $baseDir -Recurse -Filter "*.jsonl" -ErrorAction SilentlyContinue |
                Where-Object {
                    $name = $_.Name.ToLower()
                    -not $name.Contains(".trajectory") -and
                    -not $name.Contains(".reset.") -and
                    -not $name.Contains(".trajectory-path.")
                }
            foreach ($f in $found) {
                $files.Add($f.FullName) | Out-Null
            }
        }
    }
    return ,$files
}

# --- JSONL Parsing ---
function Parse-SessionEntries {
    param([string]$FilePath, [System.Collections.ArrayList]$KnownIds)

    $results = [System.Collections.ArrayList]::new()
    try {
        $lines = Get-Content $FilePath -ErrorAction SilentlyContinue
        if (-not $lines) { return ,$results }

        foreach ($line in $lines) {
            if (-not $line.Trim()) { continue }
            try {
                $obj = $line | ConvertFrom-Json -ErrorAction SilentlyContinue
                if (-not $obj) { continue }

                # Navigate the JSON structure
                $msg = $obj.message
                if (-not $msg) { continue }

                $responseId = $msg.responseId
                if (-not $responseId -or $KnownIds.Contains($responseId)) { continue }

                $usage = $msg.usage
                if (-not $usage) { continue }

                $totalTokens = [int]$usage.totalTokens
                if ($totalTokens -le 0) { continue }

                $entry = @{
                    responseId      = $responseId
                    model           = if ($msg.model) { $msg.model } else { "unknown" }
                    provider        = if ($msg.provider) { $msg.provider } else { "unknown" }
                    prompt_tokens   = [int]($usage.input -or 0)
                    completion_tokens = [int]($usage.output -or 0)
                    total_tokens    = $totalTokens
                    timestamp       = if ($obj.timestamp) { $obj.timestamp } else { (Get-Date).ToUniversalTime().ToString("o") }
                    file            = $FilePath
                }
                $results.Add($entry) | Out-Null
                $KnownIds.Add($responseId) | Out-Null
            } catch {
                # Skip malformed lines
            }
        }
    } catch {
        Log "Failed to read $FilePath`: $_" "WARN"
    }
    return ,$results
}

# --- Report to Manager ---
function Report-Usage {
    param([System.Collections.ArrayList]$Entries)
    if ($Entries.Count -eq 0) { return }

    $payload = [System.Collections.ArrayList]::new()
    foreach ($e in $Entries) {
        $item = @{
            instance_id       = "collector-local"
            model             = "$($e.provider)/$($e.model)"
            prompt_tokens     = $e.prompt_tokens
            completion_tokens = $e.completion_tokens
            total_tokens      = $e.total_tokens
            cost              = 0
            session_key       = $e.responseId
            reported_at       = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        }
        $payload.Add($item) | Out-Null
    }

    $json = $payload | ConvertTo-Json -Depth 2
    $headers = @{
        "Content-Type"   = "application/json"
        "X-Instance-Token" = $InstanceToken
    }

    try {
        $response = Invoke-RestMethod -Uri "$ManagerUrl/api/v1/agent/usage" -Method POST -Headers $headers -Body $json -TimeoutSec 30
        Log "Reported $($Entries.Count) entries. Server response: $($response | ConvertTo-Json -Compress)"
    } catch {
        Log "Failed to report to Manager: $($_.Exception.Message)" "ERROR"
    }
}

# --- Main Loop ---
Log "OCM Token Collector started"
Log "Manager: $ManagerUrl | Interval: ${Interval}s | State: $StateFile"

$reportedIds = Load-State
Log "Loaded $($reportedIds.Count) previously reported responseIds"

if ($Once) {
    Log "Running in one-shot mode"
    $files = Find-SessionFiles
    Log "Found $($files.Count) session files"

    $allEntries = [System.Collections.ArrayList]::new()
    foreach ($f in $files) {
        $entries = Parse-SessionEntries -FilePath $f -KnownIds $reportedIds
        foreach ($e in $entries) {
            $allEntries.Add($e) | Out-Null
        }
    }

    if ($allEntries.Count -gt 0) {
        Log "Found $($allEntries.Count) new usage entries"
        Report-Usage -Entries $allEntries
        Save-State -Ids $reportedIds
    } else {
        Log "No new usage entries found"
    }
    exit 0
}

Log "Entering collection loop (Ctrl+C to stop)"
while ($true) {
    try {
        $files = Find-SessionFiles
        $newEntries = [System.Collections.ArrayList]::new()
        foreach ($f in $files) {
            $entries = Parse-SessionEntries -FilePath $f -KnownIds $reportedIds
            foreach ($e in $entries) {
                $newEntries.Add($e) | Out-Null
            }
        }

        if ($newEntries.Count -gt 0) {
            Log "Found $($newEntries.Count) new usage entries from $($files.Count) files"
            Report-Usage -Entries $newEntries
            Save-State -Ids $reportedIds
        }
    } catch {
        Log "Collection cycle error: $_" "ERROR"
    }

    Start-Sleep -Seconds $Interval
}
