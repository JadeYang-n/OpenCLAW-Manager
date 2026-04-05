# 测试密钥管理功能
param(
    [string]$dbPath = "$env:APPDATA\ocm-manager\ocm.db"
)

Write-Host "=== 测试密钥管理功能 ===" -ForegroundColor Cyan
Write-Host ""

# 检查数据库文件
if (Test-Path $dbPath) {
    Write-Host "[✓] 数据库文件存在：$dbPath" -ForegroundColor Green
} else {
    Write-Host "[✗] 数据库文件不存在：$dbPath" -ForegroundColor Red
    exit 1
}

# 使用 SQLite 检查表结构
Write-Host ""
Write-Host "检查 api_keys 表结构..." -ForegroundColor Yellow

$sql = @"
SELECT name FROM sqlite_master WHERE type='table' AND name='api_keys';
"@

try {
    # 使用 dotnet 工具或 sqlite3 检查
    $result = sqlite3 $dbPath $sql 2>&1
    
    if ($result -eq "api_keys") {
        Write-Host "[✓] api_keys 表存在" -ForegroundColor Green
    } else {
        Write-Host "[✗] api_keys 表不存在" -ForegroundColor Red
    }
} catch {
    Write-Host "[!] 无法执行 SQLite 查询，请手动检查" -ForegroundColor Yellow
}

# 显示表结构
Write-Host ""
Write-Host "api_keys 表结构:" -ForegroundColor Yellow
sqlite3 $dbPath "PRAGMA table_info(api_keys);" 2>&1 | ForEach-Object {
    Write-Host "  $_" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== 测试完成 ===" -ForegroundColor Cyan
