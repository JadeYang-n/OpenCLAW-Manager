# GitHub 发布脚本 - 推送到远程仓库
# 使用方法：.\push-to-github.ps1 -Username "你的 GitHub 用户名"

param(
    [Parameter(Mandatory=$true)]
    [string]$Username
)

$repoPath = "C:\Users\vip\.openclaw-autoclaw\workspace\OpenCLAW Manager\ocm-manager"
$remoteUrl = "https://github.com/$Username/ocm-manager.git"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  OpenCLAW Manager GitHub 发布脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Git 是否已安装
Write-Host "[1/5] 检查 Git 安装..." -ForegroundColor Yellow
try {
    $gitVersion = git --version
    Write-Host "✓ Git 已安装：$gitVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ 错误：Git 未安装" -ForegroundColor Red
    Write-Host "请先安装 Git: https://git-scm.com/download/win" -ForegroundColor Yellow
    exit 1
}

# 切换到项目目录
Write-Host ""
Write-Host "[2/5] 切换到项目目录..." -ForegroundColor Yellow
Set-Location $repoPath
Write-Host "✓ 当前目录：$PWD" -ForegroundColor Green

# 添加远程仓库
Write-Host ""
Write-Host "[3/5] 添加远程仓库..." -ForegroundColor Yellow
Write-Host "  远程地址：$remoteUrl" -ForegroundColor Gray

# 检查是否已存在 remote
$existingRemote = git remote get-url origin 2>$null
if ($existingRemote) {
    Write-Host "⚠ 已存在 remote: $existingRemote" -ForegroundColor Yellow
    $choice = Read-Host "是否覆盖？(y/n)"
    if ($choice -eq 'y') {
        git remote set-url origin $remoteUrl
        Write-Host "✓ 已更新 remote" -ForegroundColor Green
    } else {
        Write-Host "✗ 操作已取消" -ForegroundColor Red
        exit 1
    }
} else {
    git remote add origin $remoteUrl
    Write-Host "✓ 已添加 remote" -ForegroundColor Green
}

# 推送代码
Write-Host ""
Write-Host "[4/5] 推送代码到 GitHub..." -ForegroundColor Yellow
Write-Host "  这可能需要几分钟，请耐心等待..." -ForegroundColor Gray

try {
    git push -u origin master
    Write-Host ""
    Write-Host "✓ 推送成功！" -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "✗ 推送失败：$_" -ForegroundColor Red
    Write-Host ""
    Write-Host "可能的原因：" -ForegroundColor Yellow
    Write-Host "1. GitHub 账号未登录" -ForegroundColor Gray
    Write-Host "2. 仓库不存在，请先在 GitHub 创建仓库" -ForegroundColor Gray
    Write-Host "3. 网络连接问题" -ForegroundColor Gray
    Write-Host ""
    Write-Host "请查看 GITHUB_RELEASE_GUIDE.md 获取详细指南" -ForegroundColor Cyan
    exit 1
}

# 显示成功信息
Write-Host ""
Write-Host "[5/5] 完成！" -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  发布成功！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📦 仓库地址:" -ForegroundColor Cyan
Write-Host "  https://github.com/$Username/ocm-manager" -ForegroundColor White
Write-Host ""
Write-Host "📝 下一步:" -ForegroundColor Cyan
Write-Host "1. 访问上面的仓库地址，确认代码已上传" -ForegroundColor Gray
Write-Host "2. 在 GitHub 创建 Release (参考 GITHUB_RELEASE_GUIDE.md)" -ForegroundColor Gray
Write-Host "3. Tag 版本：v1.6.0-alpha" -ForegroundColor Gray
Write-Host ""

# 打开浏览器
$openBrowser = Read-Host "是否现在打开 GitHub 仓库页面？(y/n)"
if ($openBrowser -eq 'y') {
    Start-Process "https://github.com/$Username/ocm-manager"
    Write-Host "✓ 已打开浏览器" -ForegroundColor Green
}

Write-Host ""
Write-Host "祝发布顺利！🎉" -ForegroundColor Green
Write-Host ""
