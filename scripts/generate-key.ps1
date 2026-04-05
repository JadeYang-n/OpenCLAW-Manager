# 生成 32 字节随机密钥并 base64 编码
# Windows PowerShell 版本

$randomBytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($randomBytes)
$base64Key = [Convert]::ToBase64String($randomBytes)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  OpenCLAW Master Key 生成器" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "生成的密钥（32 字节 / 256 位）:" -ForegroundColor Yellow
Write-Host ""
Write-Host $base64Key -ForegroundColor Green
Write-Host ""
Write-Host "使用方法:" -ForegroundColor Cyan
Write-Host "1. 复制上面的密钥" -ForegroundColor Gray
Write-Host "2. 在项目根目录创建 .env 文件" -ForegroundColor Gray
Write-Host "3. 写入：OPENCLAW_MASTER_KEY=$base64Key" -ForegroundColor Gray
Write-Host ""
Write-Host "⚠️  重要提示:" -ForegroundColor Red
Write-Host "- 请妥善备份此密钥，丢失后无法解密已有数据" -ForegroundColor Gray
Write-Host "- 不要将 .env 文件提交到 Git" -ForegroundColor Gray
Write-Host "- 生产环境每个实例应使用不同的密钥" -ForegroundColor Gray
Write-Host ""
