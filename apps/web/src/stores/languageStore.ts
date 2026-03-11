import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Language = 'zh' | 'en'

interface LanguageState {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

// 翻译字典
const translations = {
  zh: {
    // 通用
    'common.loading': '加载中...',
    'common.save': '保存',
    'common.cancel': '取消',
    'common.delete': '删除',
    'common.edit': '编辑',
    'common.create': '创建',
    'common.success': '成功',
    'common.error': '错误',
    'common.confirm': '确认',
    'common.yes': '是',
    'common.no': '否',
    
    // 导航
    'nav.workbench': '工作台',
    'nav.dashboard': '仪表盘',
    'nav.instances': '实例管理',
    'nav.operations': '运维中心',
    'nav.config': '配置管理',
    'nav.skills': 'Skills',
    'nav.departments': '部门管理',
    'nav.users': '用户管理',
    'nav.token': 'Token 分析',
    'nav.audit': '审计日志',
    'nav.settings': '系统设置',
    'nav.setup': '部署向导',
    'nav.security': '安全与设置',
    'nav.myUsage': '我的使用',
    
    // 登录
    'login.title': 'OpenCLAW Manager',
    'login.subtitle': '企业版 v1.5',
    'login.username': '用户名',
    'login.password': '密码',
    'login.button': '登录',
    'login.remember': '记住我',
    'login.forgotPassword': '忘记密码？',
    
    // 实例管理
    'instances.title': '实例管理',
    'instances.create': '新建实例',
    'instances.name': '实例名称',
    'instances.endpoint': 'API 端点',
    'instances.apiKey': 'API Key',
    'instances.department': '所属部门',
    'instances.config': '关联配置',
    'instances.skills': '安装 Skills',
    'instances.status': '状态',
    'instances.version': '版本',
    'instances.operations': '操作',
    'instances.batchRestart': '批量重启',
    'instances.noDepartment': '未绑定',
    'instances.selectDepartment': '选择部门',
    'instances.noConfig': '不关联配置',
    'instances.selectConfig': '选择配置',
    'instances.noSkills': '暂无已安装的 Skills',
    
    // 部门管理
    'departments.title': '部门管理',
    'departments.create': '创建部门',
    'departments.name': '部门名称',
    'departments.description': '描述',
    'departments.createdAt': '创建时间',
    'departments.default': '默认部门',
    'departments.deleteConfirm': '确定要删除部门 "{name}" 吗？',
    
    // 配置管理
    'config.title': '配置管理',
    'config.create': '新建配置',
    'config.name': '配置名称',
    'config.description': '描述',
    'config.content': '配置内容（JSON）',
    'config.versionRange': 'OpenCLAW 版本范围',
    'config.updatedAt': '更新时间',
    
    // Skills 管理
    'skills.title': 'Skills 管理',
    'skills.store': '📦 Skill 商店',
    'skills.installed': '✅ 已安装 Skills',
    'skills.install': '安装',
    'skills.installing': '安装中...',
    'skills.uninstall': '卸载',
    'skills.enable': '启用',
    'skills.disable': '禁用',
    'skills.enabled': '已启用',
    'skills.disabled': '已禁用',
    'skills.hint': '💡 已展示 OpenCLAW 官方 Skills。更多社区 Skills 请访问 ClawHub.com，或使用命令行安装：openclaw skill install <skill-id>',
    'skills.allInstalled': '所有官方 Skills 已安装',
    
    // Token 分析
    'token.title': 'Token 分析',
    'token.totalCost': '💰 总成本',
    'token.totalTokens': '🔢 Token 总量',
    'token.totalRequests': '📊 请求次数',
    'token.dailyTrend': '📈 每日趋势',
    'token.byDepartment': '🏢 部门成本统计',
    'token.department': '部门',
    'token.instanceCount': '实例数',
    'token.requestCount': '请求数',
    'token.tokenTotal': 'Token 总量',
    'token.costTotal': '总成本',
    'token.percentage': '占比',
    'token.viewByTime': '按时间',
    'token.viewByDepartment': '按部门',
    
    // 审计日志
    'audit.title': '审计日志',
    'audit.timestamp': '时间',
    'audit.user': '用户',
    'audit.resource': '资源',
    'audit.operation': '操作',
    'audit.result': '结果',
    'audit.riskLevel': '风险等级',
    
    // 部署向导
    'setup.title': '部署向导',
    'setup.subtitle': '选择部署方式并检测环境，一键完成 OpenCLAW 安装',
    'setup.step1': '选择部署方式',
    'setup.step2': '环境检测',
    'setup.step3': '一键部署',
    'setup.checkEnv': '开始检测环境',
    'setup.checking': '检测中...',
    'setup.deploy': '一键部署',
    'setup.deploying': '部署中...',
    'setup.back': '返回重选',
    'setup.completed': '✅ 环境检测完成',
    'setup.required': '必需项',
    'setup.requiredHint': '* 标记的项目为必需项，所有必需项通过后才能部署',
    'setup.passed': '已通过',
    'setup.fix': '一键修复',
    'setup.fixing': '修复中...',
    
    // 部署方式
    'deploy.windows': '本地直接安装',
    'deploy.windows.desc': '在 Windows 系统中直接安装 OpenCLAW，最简单快捷',
    'deploy.wsl2': 'WSL2 部署',
    'deploy.wsl2.desc': '通过 Windows Subsystem for Linux 2 运行，接近 Linux 生产环境',
    'deploy.docker': 'Docker 部署',
    'deploy.docker.desc': '使用 Docker 容器运行，环境隔离最好，便于迁移',
    'deploy.recommended': '推荐',
    'deploy.howToChoose': '💡 如何选择？',
    'deploy.choose.windows': '第一次使用 或 只想简单快捷 → 选择「本地直接安装」',
    'deploy.choose.wsl2': '有 Linux 经验 或计划后续部署到服务器 → 选择「WSL2 部署」',
    'deploy.choose.docker': '有 Docker 经验 或需要环境隔离 → 选择「Docker 部署」',
    'deploy.pros': '优点',
    'deploy.cons': '缺点',
    'deploy.suitableFor': '适合',
    'deploy.notSuitableFor': '不适合',
    'deploy.confirm': '确认选择，继续下一步',
    'deploy.selected': '已选择',
    
    // 用户管理
    'users.title': '用户管理',
    'users.create': '新建用户',
    'users.username': '用户名',
    'users.password': '密码',
    'users.role': '角色',
    'users.createdAt': '创建时间',
    'users.lastLogin': '最后登录',
    'users.operations': '操作',
    'users.cannotDeleteSelf': '不能删除自己',
    
    // 角色
    'role.admin': '👑 超级管理员',
    'role.operator': '🔧 运维管理员',
    'role.deptAdmin': '📋 部门管理员',
    'role.employee': '👤 普通员工',
    'role.auditor': '📊 审计员',
    
    // 设置
    'settings.title': '系统设置',
    'settings.language': '语言',
    'settings.language.zh': '简体中文',
    'settings.language.en': 'English',
    'settings.theme': '主题',
    'settings.theme.light': '浅色',
    'settings.theme.dark': '深色',
    'settings.theme.auto': '自动',
    
    // 权限不足
    'error.permissionDenied': '🔒 权限不足',
    'error.permissionMessage': '只有超级管理员可以访问用户管理页面',
    'error.back': '返回上一页',
    
    // 提示
    'hint.noData': '暂无数据',
    'hint.noItems': '暂无项目，点击右上角创建',
  },
  en: {
    // Common
    'common.loading': 'Loading...',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.create': 'Create',
    'common.success': 'Success',
    'common.error': 'Error',
    'common.confirm': 'Confirm',
    'common.yes': 'Yes',
    'common.no': 'No',
    
    // Navigation
    'nav.workbench': 'Workbench',
    'nav.dashboard': 'Dashboard',
    'nav.instances': 'Instances',
    'nav.operations': 'Operations',
    'nav.config': 'Configuration',
    'nav.skills': 'Skills',
    'nav.departments': 'Departments',
    'nav.users': 'Users',
    'nav.token': 'Token Analysis',
    'nav.audit': 'Audit Logs',
    'nav.settings': 'Settings',
    'nav.setup': 'Deployment',
    'nav.security': 'Security',
    'nav.myUsage': 'My Usage',
    
    // Login
    'login.title': 'OpenCLAW Manager',
    'login.subtitle': 'Enterprise v1.5',
    'login.username': 'Username',
    'login.password': 'Password',
    'login.button': 'Sign In',
    'login.remember': 'Remember Me',
    'login.forgotPassword': 'Forgot Password?',
    
    // Instances
    'instances.title': 'Instance Management',
    'instances.create': 'New Instance',
    'instances.name': 'Instance Name',
    'instances.endpoint': 'API Endpoint',
    'instances.apiKey': 'API Key',
    'instances.department': 'Department',
    'instances.config': 'Configuration',
    'instances.skills': 'Install Skills',
    'instances.status': 'Status',
    'instances.version': 'Version',
    'instances.operations': 'Actions',
    'instances.batchRestart': 'Batch Restart',
    'instances.noDepartment': 'Not Bound',
    'instances.selectDepartment': 'Select Department',
    'instances.noConfig': 'No Configuration',
    'instances.selectConfig': 'Select Configuration',
    'instances.noSkills': 'No Skills Installed',
    
    // Departments
    'departments.title': 'Department Management',
    'departments.create': 'Create Department',
    'departments.name': 'Department Name',
    'departments.description': 'Description',
    'departments.createdAt': 'Created At',
    'departments.default': 'Default',
    'departments.deleteConfirm': 'Are you sure to delete department "{name}"?',
    
    // Configuration
    'config.title': 'Configuration',
    'config.create': 'New Configuration',
    'config.name': 'Name',
    'config.description': 'Description',
    'config.content': 'Configuration (JSON)',
    'config.versionRange': 'OpenCLAW Version Range',
    'config.updatedAt': 'Updated At',
    
    // Skills
    'skills.title': 'Skills Management',
    'skills.store': '📦 Skill Store',
    'skills.installed': '✅ Installed Skills',
    'skills.install': 'Install',
    'skills.installing': 'Installing...',
    'skills.uninstall': 'Uninstall',
    'skills.enable': 'Enable',
    'skills.disable': 'Disable',
    'skills.enabled': 'Enabled',
    'skills.disabled': 'Disabled',
    'skills.hint': '💡 Showing OpenCLAW official Skills. For more community Skills, visit ClawHub.com or use CLI: openclaw skill install <skill-id>',
    'skills.allInstalled': 'All official Skills installed',
    
    // Token Analysis
    'token.title': 'Token Analysis',
    'token.totalCost': '💰 Total Cost',
    'token.totalTokens': '🔢 Total Tokens',
    'token.totalRequests': '📊 Total Requests',
    'token.dailyTrend': '📈 Daily Trend',
    'token.byDepartment': '🏢 Department Costs',
    'token.department': 'Department',
    'token.instanceCount': 'Instances',
    'token.requestCount': 'Requests',
    'token.tokenTotal': 'Total Tokens',
    'token.costTotal': 'Total Cost',
    'token.percentage': 'Percentage',
    'token.viewByTime': 'By Time',
    'token.viewByDepartment': 'By Department',
    
    // Audit Logs
    'audit.title': 'Audit Logs',
    'audit.timestamp': 'Timestamp',
    'audit.user': 'User',
    'audit.resource': 'Resource',
    'audit.operation': 'Operation',
    'audit.result': 'Result',
    'audit.riskLevel': 'Risk Level',
    
    // Deployment
    'setup.title': 'Deployment Wizard',
    'setup.subtitle': 'Select deployment method, check environment, and deploy OpenCLAW with one click',
    'setup.step1': 'Select Method',
    'setup.step2': 'Environment Check',
    'setup.step3': 'Deploy',
    'setup.checkEnv': 'Check Environment',
    'setup.checking': 'Checking...',
    'setup.deploy': 'Deploy Now',
    'setup.deploying': 'Deploying...',
    'setup.back': 'Back',
    'setup.completed': '✅ Environment Check Complete',
    'setup.required': 'Required',
    'setup.requiredHint': '* Required items must pass before deployment',
    'setup.passed': 'Passed',
    'setup.fix': 'Fix',
    'setup.fixing': 'Fixing...',
    
    // Deployment Methods
    'deploy.windows': 'Native Windows',
    'deploy.windows.desc': 'Install OpenCLAW directly on Windows, simplest and fastest',
    'deploy.wsl2': 'WSL2 Deployment',
    'deploy.wsl2.desc': 'Run via Windows Subsystem for Linux 2, close to Linux production',
    'deploy.docker': 'Docker Deployment',
    'deploy.docker.desc': 'Run in Docker container, best isolation, easy migration',
    'deploy.recommended': 'Recommended',
    'deploy.howToChoose': '💡 How to Choose?',
    'deploy.choose.windows': 'First time or want simplicity → Choose "Native Windows"',
    'deploy.choose.wsl2': 'Have Linux experience or plan server deployment → Choose "WSL2"',
    'deploy.choose.docker': 'Have Docker experience or need isolation → Choose "Docker"',
    'deploy.pros': 'Pros',
    'deploy.cons': 'Cons',
    'deploy.suitableFor': 'Suitable For',
    'deploy.notSuitableFor': 'Not Suitable For',
    'deploy.confirm': 'Confirm & Continue',
    'deploy.selected': 'Selected',
    
    // Users
    'users.title': 'User Management',
    'users.create': 'New User',
    'users.username': 'Username',
    'users.password': 'Password',
    'users.role': 'Role',
    'users.createdAt': 'Created At',
    'users.lastLogin': 'Last Login',
    'users.operations': 'Actions',
    'users.cannotDeleteSelf': 'Cannot delete self',
    
    // Roles
    'role.admin': '👑 Admin',
    'role.operator': '🔧 Operator',
    'role.deptAdmin': '📋 Dept Admin',
    'role.employee': '👤 Employee',
    'role.auditor': '📊 Auditor',
    
    // Settings
    'settings.title': 'Settings',
    'settings.language': 'Language',
    'settings.language.zh': '简体中文',
    'settings.language.en': 'English',
    'settings.theme': 'Theme',
    'settings.theme.light': 'Light',
    'settings.theme.dark': 'Dark',
    'settings.theme.auto': 'Auto',
    
    // Permission Error
    'error.permissionDenied': '🔒 Permission Denied',
    'error.permissionMessage': 'Only administrators can access user management',
    'error.back': 'Go Back',
    
    // Hints
    'hint.noData': 'No Data',
    'hint.noItems': 'No items, click create to add',
  },
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      language: 'zh',
      
      setLanguage: (lang: Language) => {
        set({ language: lang })
      },
      
      t: (key: string) => {
        const { language } = get()
        return translations[language][key as keyof typeof translations.zh] || key
      },
    }),
    {
      name: 'language-storage',
    }
  )
)
