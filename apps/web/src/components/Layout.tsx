import React from 'react'
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useLanguageStore } from '../stores/languageStore'

interface NavItem {
  key: string
  path: string
  roles?: string[]
}

interface NavGroup {
  key: string
  icon: string
  items: NavItem[]
}

const Layout: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { t } = useLanguageStore()

  // 菜单结构（使用翻译 key）
  const navGroups: NavGroup[] = [
    {
      key: 'nav.workbench',
      icon: '📊',
      items: [
        { key: 'nav.instances', path: '/instances', roles: ['admin', 'operator', 'dept_admin', 'employee', 'auditor'] },
        { key: 'nav.dashboard', path: '/dashboard', roles: ['admin', 'operator'] },
      ],
    },
    {
      key: 'nav.skillCenter',
      icon: '🧩',
      items: [
        { key: 'nav.skills', path: '/skills', roles: ['admin', 'operator', 'dept_admin', 'employee', 'auditor'] },
        { key: 'nav.skillStore', path: '/skills/store', roles: ['admin', 'operator', 'dept_admin', 'employee', 'auditor'] },
        { key: 'nav.feedback', path: '/skills/feedback', roles: ['admin', 'operator', 'dept_admin', 'employee', 'auditor'] },
        { key: 'nav.skillsSubmit', path: '/skills/submit', roles: ['admin', 'operator', 'dept_admin', 'employee', 'auditor'] },
        { key: 'nav.skillReview', path: '/skills/review', roles: ['admin', 'operator', 'dept_admin'] },
      ],
    },
    {
      key: 'nav.operations',
      icon: '⚙️',
      items: [
        { key: 'nav.setup', path: '/setup', roles: ['operator'] },
        { key: 'nav.config', path: '/config', roles: ['admin', 'operator'] },
        { key: 'nav.token', path: '/token', roles: ['admin', 'operator', 'dept_admin', 'employee', 'auditor'] },
      ],
    },
    {
      key: 'nav.notifications',
      icon: '🔔',
      items: [
        { key: 'nav.myNotifications', path: '/notifications', roles: ['admin', 'operator', 'dept_admin', 'employee', 'auditor'] },
      ],
    },
    {
      key: 'nav.security',
      icon: '🔐',
      items: [
        { key: 'nav.audit', path: '/audit', roles: ['admin', 'operator', 'auditor'] },
        { key: 'nav.departments', path: '/departments', roles: ['admin', 'dept_admin'] },
        { key: 'nav.users', path: '/users', roles: ['admin', 'operator'] },
        { key: 'nav.myUsage', path: '/my-usage', roles: ['employee'] },
        { key: 'nav.security', path: '/security', roles: ['admin', 'operator'] },
        { key: 'nav.settings', path: '/settings', roles: ['admin', 'operator', 'dept_admin', 'employee', 'auditor'] },
      ],
    },
  ]

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 侧边栏 */}
      <div className="w-64 border-r bg-white flex flex-col">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold">OpenClaw Manager</h1>
          <p className="text-xs text-gray-500 mt-1">Enterprise v1.5</p>
        </div>
        
        <nav className="flex-1 p-4 overflow-auto">
          {navGroups.map((group) => (
            <div key={group.key} className="mb-6">
              <div className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-gray-600">
                <span>{group.icon}</span>
                <span>{t(group.key)}</span>
              </div>
              <ul className="mt-2 space-y-1">
                {group.items.map((item) => {
                  const isActive = location.pathname === item.path
                  
                  // 检查角色权限
                  if (item.roles && user && !item.roles.includes(user.role)) {
                    return null
                  }
                  
                  return (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm ${
                          isActive
                            ? 'bg-blue-600 text-white'
                            : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        <span>{t(item.key)}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* 底部用户信息 */}
        <div className="p-4 border-t">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.username || 'User'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.role === 'admin' && '👑 Admin'}
                  {user?.role === 'operator' && '🔧 Operator'}
                  {user?.role === 'dept_admin' && '📋 Dept Admin'}
                  {user?.role === 'employee' && '👤 Employee'}
                  {user?.role === 'auditor' && '📊 Auditor'}
                </p>
              </div>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-left"
          >
            🚪 {t('login.button')}
          </button>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  )
}

export default Layout
