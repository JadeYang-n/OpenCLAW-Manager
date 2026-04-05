# OpenCLAW Manager 数据库检查脚本
param(
    [string]$dbPath = "data\ocm.db"
)

Write-Host "=== OpenCLAW Manager 数据库检查 ===" -ForegroundColor Cyan
Write-Host "数据库路径：$dbPath" -ForegroundColor Gray
Write-Host ""

if (!(Test-Path $dbPath)) {
    Write-Host "[✗] 数据库文件不存在" -ForegroundColor Red
    exit 1
}

Write-Host "[✓] 数据库文件存在" -ForegroundColor Green
Write-Host ""

# 使用 System.Data.SQLite 检查（如果可用）
try {
    Add-Type -AssemblyName "System.Data"
    
    $connectionString = "Data Source=$dbPath;Version=3;"
    $connection = New-Object System.Data.SQLite.SQLiteConnection($connectionString)
    $connection.Open()
    
    Write-Host "[✓] 数据库连接成功" -ForegroundColor Green
    Write-Host ""
    
    # 检查 api_keys 表
    Write-Host "1. 检查 api_keys 表..." -ForegroundColor Yellow
    $cmd = $connection.CreateCommand()
    $cmd.CommandText = "SELECT name FROM sqlite_master WHERE type='table' AND name='api_keys';"
    $result = $cmd.ExecuteScalar()
    
    if ($result) {
        Write-Host "   [✓] api_keys 表存在" -ForegroundColor Green
        
        # 显示表结构
        Write-Host "   表结构:" -ForegroundColor Gray
        $cmd.CommandText = "PRAGMA table_info(api_keys);"
        $reader = $cmd.ExecuteReader()
        while ($reader.Read()) {
            Write-Host "     - $($reader['name']) ($($reader['type']))" -ForegroundColor Gray
        }
        $reader.Close()
    } else {
        Write-Host "   [✗] api_keys 表不存在" -ForegroundColor Red
    }
    
    Write-Host ""
    
    # 列出所有表
    Write-Host "2. 所有数据表:" -ForegroundColor Yellow
    $cmd.CommandText = "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
    $reader = $cmd.ExecuteReader()
    while ($reader.Read()) {
        Write-Host "   - $($reader['name'])" -ForegroundColor Gray
    }
    $reader.Close()
    
    Write-Host ""
    
    # 检查最近的审计日志
    Write-Host "3. 最近的审计日志:" -ForegroundColor Yellow
    $cmd.CommandText = "SELECT username, resource, operation, risk_level, result, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 5;"
    $reader = $cmd.ExecuteReader()
    $hasLogs = $false
    while ($reader.Read()) {
        $hasLogs = $true
        Write-Host "   [$($reader['created_at'])] $($reader['username']) - $($reader['operation']) ($($reader['risk_level']))" -ForegroundColor Gray
    }
    $reader.Close()
    
    if (!$hasLogs) {
        Write-Host "   (无审计日志)" -ForegroundColor Gray
    }
    
    $connection.Close()
    
    Write-Host ""
    Write-Host "=== 检查完成 ===" -ForegroundColor Cyan
}
catch {
    Write-Host "[!] 无法使用 SQLite 连接：$($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "提示：可以使用 DB Browser for SQLite 或其他工具手动检查" -ForegroundColor Gray
}
