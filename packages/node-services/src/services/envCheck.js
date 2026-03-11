import { execSync } from 'child_process';
import { platform } from 'os';

class EnvCheck {
  /**
   * 执行命令并返回输出
   * @param {string} command - 要执行的命令
   * @param {boolean} powershell - 是否使用 PowerShell
   * @returns {string|null} 命令输出或 null
   */
  exec(command, powershell = false) {
    try {
      const cmd = powershell ? `powershell -Command "${command}"` : command;
      const output = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
      return output.trim();
    } catch (error) {
      return null;
    }
  }

  /**
   * 检查 Node.js 版本
   * @returns {string|null} Node.js 版本或 null
   */
  checkNodeJs() {
    const version = this.exec('node --version');
    if (!version) return null;
    const match = version.match(/v(\d+)\.(\d+)\.(\d+)/);
    if (!match) return null;
    const major = parseInt(match[1]);
    return major >= 20 ? version : null;
  }

  /**
   * 获取 Node.js 详细信息
   * @returns {Object} Node.js 详细信息
   */
  getNodeDetails() {
    const npmVersion = this.exec('npm --version');
    const nodePath = this.exec('where node', false);
    return {
      npm: npmVersion,
      path: nodePath ? nodePath.split('\r\n')[0] : '未知',
      platform: process.platform,
      arch: process.arch
    };
  }

  /**
   * 检查 Git 版本
   * @returns {string|null} Git 版本或 null
   */
  checkGit() {
    const version = this.exec('git --version');
    if (!version) return null;
    const match = version.match(/git version (\d+\.\d+\.\d+)/);
    return match ? match[1] : null;
  }

  /**
   * 检查 Docker Desktop（Windows 专属）
   * @returns {Object} Docker Desktop 状态
   */
  checkDockerDesktop() {
    // 检查 Docker Desktop 安装
    const dockerPath = this.exec('where docker', false);
    if (!dockerPath) {
      return {
        installed: false,
        version: null,
        details: '未找到 Docker Desktop'
      };
    }

    // 检查 Docker Desktop 是否运行
    const dockerVersion = this.exec('docker --version');
    if (!dockerVersion) {
      return {
        installed: false,
        version: null,
        details: 'Docker Desktop 未运行'
      };
    }

    // 检查 Docker Desktop 后端（WSL2 或 Hyper-V）
    const dockerInfo = this.exec('docker info', false);
    let backend = '未知';
    if (dockerInfo) {
      if (dockerInfo.includes('WSL2')) {
        backend = 'WSL2';
      } else if (dockerInfo.includes('Hyper-V')) {
        backend = 'Hyper-V';
      } else if (dockerInfo.includes('Linux')) {
        backend = 'Linux';
      }
    }

    const versionMatch = dockerVersion.match(/Docker version (\d+\.\d+\.\d+)/);
    return {
      installed: true,
      version: versionMatch ? versionMatch[1] : '未知',
      details: `后端：${backend}`
    };
  }

  /**
   * 检查 WSL2（Windows 专属）
   * @returns {Object} WSL2 状态
   */
  checkWSL2() {
    // 检查 WSL 是否安装
    const wslCheck = this.exec('wsl --version', false);
    if (!wslCheck) {
      return {
        installed: false,
        version: null,
        details: 'WSL 未安装'
      };
    }

    // 检查 WSL2 默认版本
    const wslDefault = this.exec('(Get-ComputerInfo).WsdlInstallationDefaultVersion', true);
    const wsl2Default = wslDefault === '2';

    // 获取已安装的发行版
    const wslList = this.exec('wsl --list --verbose', false);
    const distros = [];
    if (wslList) {
      const lines = wslList.split('\r\n').slice(1); // 跳过标题行
      lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 3) {
          distros.push({
            name: parts[0],
            version: parts[1],
            state: parts[2]
          });
        }
      });
    }

    const versionMatch = wslCheck.match(/WSL 版本：(\d+\.\d+\.\d+)/);
    return {
      installed: true,
      version: versionMatch ? versionMatch[1] : '未知',
      details: `默认版本：WSL${wsl2Default ? '2' : '1'} | 发行版：${distros.length} 个`,
      distros: distros
    };
  }

  /**
   * 检查端口 18789 是否可用
   * @returns {Object} 端口状态
   */
  checkPort18789() {
    const result = this.exec('netstat -ano | findstr ":18789"', false);
    if (result && result.trim()) {
      // 端口被占用，获取进程信息
      const lines = result.trim().split('\r\n');
      const pid = lines[0].split(/\s+/).pop();
      const processName = this.exec(`(Get-Process -Id ${pid}).ProcessName`, true);
      return {
        available: false,
        details: `被 ${processName || '未知进程'} (PID: ${pid}) 占用`
      };
    }
    return {
      available: true,
      details: '端口可用'
    };
  }

  /**
   * 检查 UAC 管理员权限
   * @returns {Object} 权限状态
   */
  checkUAC() {
    const isAdmin = this.exec('(New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)', true);
    return {
      isAdmin: isAdmin === 'True',
      details: isAdmin === 'True' ? '管理员权限' : '标准用户权限'
    };
  }

  /**
   * 主环境检测函数
   * @returns {Object} 环境检测结果
   */
  checkEnvironment() {
    try {
      // Windows 专属环境检测
      const nodeVersion = this.checkNodeJs();
      const gitVersion = this.checkGit();
      const wslStatus = this.checkWSL2();
      const dockerStatus = this.checkDockerDesktop();
      const portStatus = this.checkPort18789();
      const uacStatus = this.checkUAC();

      // 构建前端期望的结构
      const items = [
        {
          name: "Node.js",
          description: "需要 Node.js 20+",
          required: true,
          installed: !!nodeVersion,
          version: nodeVersion,
          auto_fix: "install_nodejs",
          details: nodeVersion ? this.getNodeDetails() : null
        },
        {
          name: "Git",
          description: "用于克隆 OpenCLAW 仓库",
          required: true,
          installed: !!gitVersion,
          version: gitVersion,
          auto_fix: "install_git"
        },
        {
          name: "Docker Desktop",
          description: "Windows 容器部署（可选）",
          required: false,
          installed: dockerStatus.installed,
          version: dockerStatus.version,
          auto_fix: "install_docker",
          details: dockerStatus.details
        },
        {
          name: "WSL2",
          description: "Windows 子系统部署（可选）",
          required: false,
          installed: wslStatus.installed,
          version: wslStatus.version,
          auto_fix: "install_wsl2",
          details: wslStatus.details
        },
        {
          name: "端口 18789",
          description: "OpenCLAW Web 界面端口",
          required: true,
          installed: portStatus.available,
          version: portStatus.available ? "可用" : "被占用",
          auto_fix: portStatus.available ? null : "kill_process",
          details: portStatus.details
        },
        {
          name: "管理员权限",
          description: "部分功能需要管理员权限",
          required: false,
          installed: uacStatus.isAdmin,
          version: uacStatus.isAdmin ? "已提升" : "标准用户",
          auto_fix: "run_as_admin",
          details: uacStatus.details
        }
      ];

      // 计算整体状态
      const requiredItems = items.filter(item => item.required);
      const allRequiredInstalled = requiredItems.every(item => item.installed);
      const overall_status = allRequiredInstalled ? "ready" : "warning";

      return {
        items: items,
        overall_status: overall_status,
        platform: "windows",
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error checking environment:', error);
      return {
        items: [
          {
            name: "环境检测",
            description: "检测过程出错",
            required: true,
            installed: false,
            version: null,
            auto_fix: "retry",
            details: error.message
          }
        ],
        overall_status: "error",
        platform: "windows",
        timestamp: new Date().toISOString()
      };
    }
  }
}

export default new EnvCheck();
