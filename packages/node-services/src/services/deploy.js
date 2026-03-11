import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

class Deploy {
  /**
   * 执行命令并返回输出
   * @param {string} command - 要执行的命令
   * @param {boolean} powershell - 是否使用 PowerShell
   * @returns {{success: boolean, output: string|null, error: string|null}}
   */
  exec(command, powershell = false) {
    try {
      const cmd = powershell ? `powershell -Command "${command}"` : command;
      const output = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
      return { success: true, output: output.trim(), error: null };
    } catch (error) {
      return { 
        success: false, 
        output: null, 
        error: error.stderr || error.message 
      };
    }
  }

  /**
   * 检测当前环境并推荐部署方式
   * @returns {string} 推荐的部署方式
   */
  recommendDeployMethod() {
    // 检查 Docker Desktop
    const dockerCheck = this.exec('docker --version');
    if (dockerCheck.success) {
      return 'docker';
    }

    // 检查 WSL2
    const wslCheck = this.exec('wsl --version');
    if (wslCheck.success) {
      return 'wsl';
    }

    // 默认直接部署
    return 'direct';
  }

  /**
   * 直接部署（Windows 原生）
   * @param {Object} options - 部署选项
   * @returns {Object} 部署结果
   */
  deployDirect(options = {}) {
    const { targetDir = join(process.env.USERPROFILE || '', '.openclaw') } = options;
    
    try {
      // 1. 检查 Node.js
      const nodeCheck = this.exec('node --version');
      if (!nodeCheck.success) {
        return {
          success: false,
          stage: 'prerequisite',
          message: '未检测到 Node.js，请先安装 Node.js 20+',
          details: nodeCheck.error
        };
      }

      // 2. 创建目标目录
      if (!existsSync(targetDir)) {
        mkdirSync(targetDir, { recursive: true });
      }

      // 3. 检查是否已安装 OpenCLAW
      const openclawCheck = this.exec('openclaw --version');
      if (openclawCheck.success) {
        // 已安装，执行升级
        const upgradeResult = this.exec('npm install -g openclaw@latest');
        if (!upgradeResult.success) {
          return {
            success: false,
            stage: 'upgrade',
            message: 'OpenCLAW 升级失败',
            details: upgradeResult.error
          };
        }
        return {
          success: true,
          stage: 'upgrade',
          message: 'OpenCLAW 已升级到最新版本',
          details: upgradeResult.output
        };
      }

      // 4. 首次安装
      const installResult = this.exec('npm install -g openclaw');
      if (!installResult.success) {
        return {
          success: false,
          stage: 'install',
          message: 'OpenCLAW 安装失败',
          details: installResult.error
        };
      }

      // 5. 创建开机自启计划任务
      const taskResult = this.createScheduledTask();
      
      return {
        success: true,
        stage: 'install',
        message: 'OpenCLAW 安装成功',
        details: {
          install: installResult.output,
          scheduledTask: taskResult
        }
      };
    } catch (error) {
      return {
        success: false,
        stage: 'unknown',
        message: '部署过程出错',
        details: error.message
      };
    }
  }

  /**
   * 创建 Windows 计划任务（开机自启）
   * @returns {Object} 计划任务创建结果
   */
  createScheduledTask() {
    const taskName = 'OpenClaw Gateway';
    const taskXml = `<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <Triggers>
    <LogonTrigger>
      <Enabled>true</Enabled>
      <Delay>PT5S</Delay>
    </LogonTrigger>
  </Triggers>
  <Principals>
    <Principal id="Author">
      <LogonType>InteractiveToken</LogonType>
      <RunLevel>HighestAvailable</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <AllowHardTerminate>true</AllowHardTerminate>
    <StartWhenAvailable>false</StartWhenAvailable>
    <RunOnlyIfNetworkAvailable>false</RunOnlyIfNetworkAvailable>
    <IdleSettings>
      <StopOnIdleEnd>false</StopOnIdleEnd>
      <RestartOnIdle>false</RestartOnIdle>
    </IdleSettings>
    <AllowStartOnDemand>true</AllowStartOnDemand>
    <Enabled>true</Enabled>
    <Hidden>false</Hidden>
    <RunOnlyIfIdle>false</RunOnlyIfIdle>
    <WakeToRun>false</WakeToRun>
    <ExecutionTimeLimit>PT0S</ExecutionTimeLimit>
    <Priority>7</Priority>
  </Settings>
  <Actions Context="Author">
    <Exec>
      <Command>openclaw</Command>
      <Arguments>gateway</Arguments>
    </Exec>
  </Actions>
</Task>`;

    try {
      // 删除旧任务（如果存在）
      this.exec(`schtasks /Delete /TN "${taskName}" /F`, false);

      // 创建新任务
      const tempFile = join(process.env.TEMP || '', 'openclaw_task.xml');
      writeFileSync(tempFile, taskXml, { encoding: 'utf16le' });
      
      const result = this.exec(`schtasks /Create /TN "${taskName}" /XML "${tempFile}" /F`, false);
      
      // 清理临时文件
      try {
        this.exec(`del "${tempFile}"`, false);
      } catch (e) {
        // 忽略清理失败
      }

      if (result.success) {
        return {
          success: true,
          message: '计划任务创建成功，OpenCLAW 将开机自启'
        };
      } else {
        return {
          success: false,
          message: '计划任务创建失败',
          details: result.error
        };
      }
    } catch (error) {
      return {
        success: false,
        message: '计划任务创建出错',
        details: error.message
      };
    }
  }

  /**
   * Docker Desktop 部署
   * @param {Object} options - 部署选项
   * @returns {Object} 部署结果
   */
  deployDocker(options = {}) {
    const { volumePath = join(process.env.USERPROFILE || '', '.openclaw') } = options;

    try {
      // 1. 检查 Docker Desktop
      const dockerCheck = this.exec('docker --version');
      if (!dockerCheck.success) {
        return {
          success: false,
          stage: 'prerequisite',
          message: '未检测到 Docker Desktop，请先安装 Docker Desktop for Windows',
          details: dockerCheck.error
        };
      }

      // 2. 检查 Docker 是否运行
      const dockerInfo = this.exec('docker info');
      if (!dockerInfo.success) {
        return {
          success: false,
          stage: 'docker_daemon',
          message: 'Docker Desktop 未运行，请启动 Docker Desktop',
          details: dockerInfo.error
        };
      }

      // 3. 创建数据目录
      if (!existsSync(volumePath)) {
        mkdirSync(volumePath, { recursive: true });
      }

      // 4. 检查是否已有容器
      const containerCheck = this.exec('docker ps -a --filter "name=openclaw-gateway" --format "{{.Names}}"');
      if (containerCheck.success && containerCheck.output.includes('openclaw-gateway')) {
        // 容器已存在，删除旧的
        this.exec('docker rm -f openclaw-gateway', false);
      }

      // 5. 创建并启动容器
      const dockerRun = `docker run -d ` +
        `--name openclaw-gateway ` +
        `-p 18789:18789 ` +
        `-v "${volumePath}:/root/.openclaw" ` +
        `--restart unless-stopped ` +
        `ghcr.io/openclaw/openclaw:latest`;

      const runResult = this.exec(dockerRun, false);
      if (!runResult.success) {
        return {
          success: false,
          stage: 'container',
          message: 'Docker 容器创建失败',
          details: runResult.error
        };
      }

      // 6. 验证容器运行
      setTimeout(() => {
        const verifyResult = this.exec('docker ps --filter "name=openclaw-gateway" --format "{{.Status}}"');
        if (!verifyResult.success || !verifyResult.output.includes('Up')) {
          console.error('警告：容器可能未正常启动');
        }
      }, 3000);

      return {
        success: true,
        stage: 'deploy',
        message: 'OpenCLAW Docker 容器部署成功',
        details: {
          containerId: runResult.output,
          volume: volumePath,
          url: 'http://127.0.0.1:18789'
        }
      };
    } catch (error) {
      return {
        success: false,
        stage: 'unknown',
        message: 'Docker 部署过程出错',
        details: error.message
      };
    }
  }

  /**
   * WSL2 部署
   * @param {Object} options - 部署选项
   * @returns {Object} 部署结果
   */
  deployWSL(options = {}) {
    const { distro = 'Ubuntu' } = options;

    try {
      // 1. 检查 WSL2
      const wslCheck = this.exec('wsl --version');
      if (!wslCheck.success) {
        return {
          success: false,
          stage: 'prerequisite',
          message: '未检测到 WSL，请先安装 WSL2',
          details: wslCheck.error
        };
      }

      // 2. 检查指定发行版是否存在
      const distroCheck = this.exec(`wsl --list --verbose`, false);
      if (!distroCheck.success || !distroCheck.output.includes(distro)) {
        return {
          success: false,
          stage: 'distro',
          message: `未找到 WSL 发行版：${distro}`,
          details: '请先安装 Ubuntu 或其他 Linux 发行版'
        };
      }

      // 3. 在 WSL2 中安装 OpenCLAW
      const installCmd = `curl -fsSL https://openclaw.ai/install.sh | bash`;
      const installResult = this.exec(`wsl -d ${distro} bash -c "${installCmd}"`, false);
      
      if (!installResult.success) {
        return {
          success: false,
          stage: 'install',
          message: 'WSL2 中 OpenCLAW 安装失败',
          details: installResult.error
        };
      }

      // 4. 在 WSL2 中启动 Gateway
      const startResult = this.exec(`wsl -d ${distro} bash -c "openclaw gateway"`, false);
      
      return {
        success: true,
        stage: 'deploy',
        message: `OpenCLAW 在 WSL2 (${distro}) 中部署成功`,
        details: {
          distro: distro,
          install: installResult.output,
          url: 'http://127.0.0.1:18789'
        }
      };
    } catch (error) {
      return {
        success: false,
        stage: 'unknown',
        message: 'WSL2 部署过程出错',
        details: error.message
      };
    }
  }

  /**
   * 一键部署主函数
   * @param {Object} options - 部署选项
   * @returns {Object} 部署结果
   */
  deploy(options = {}) {
    const { method = 'auto' } = options;

    // 自动选择部署方式
    let deployMethod = method;
    if (method === 'auto') {
      deployMethod = this.recommendDeployMethod();
    }

    // 执行部署
    switch (deployMethod) {
      case 'docker':
        return this.deployDocker(options);
      case 'wsl':
        return this.deployWSL(options);
      case 'direct':
      default:
        return this.deployDirect(options);
    }
  }
}

export default new Deploy();
