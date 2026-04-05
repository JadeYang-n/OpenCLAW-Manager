import { useLanguageStore } from '../../stores/languageStore'
import { useAuthStore } from '../../stores/authStore'

export default function SettingsPage() {
  const { language, setLanguage, t } = useLanguageStore()
  const { user, logout } = useAuthStore()

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{t('settings.title')}</h1>

      {/* 语言设置 */}
      <div className="bg-white rounded-lg border shadow-sm mb-6">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">🌐 {t('settings.language')}</h2>
          <p className="text-sm text-gray-600 mt-1">
            Language / 语言设置
          </p>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium mb-1">
                {language === 'zh' ? t('settings.language.zh') : t('settings.language.en')}
              </p>
              <p className="text-sm text-gray-600">
                {language === 'zh' ? '当前语言：简体中文' : 'Current Language: English'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setLanguage('zh')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  language === 'zh'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                中文
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  language === 'en'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                EN
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 主题设置（暂未实现） */}
      <div className="bg-white rounded-lg border shadow-sm mb-6">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">🎨 {t('settings.theme')}</h2>
          <p className="text-sm text-gray-600 mt-1">
            Theme / 主题设置
          </p>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium mb-1">
                {t('settings.theme.auto')}
              </p>
              <p className="text-sm text-gray-600">
                {language === 'zh' ? '跟随系统主题' : 'Follow system theme'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                disabled
              >
                {t('settings.theme.auto')}
              </button>
              <button
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg cursor-not-allowed"
                disabled
              >
                {t('settings.theme.light')}
              </button>
              <button
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg cursor-not-allowed"
                disabled
              >
                {t('settings.theme.dark')}
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            💡 {language === 'zh' ? '主题功能开发中...' : 'Theme feature coming soon...'}
          </p>
        </div>
      </div>

      {/* 用户信息 */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">👤 {language === 'zh' ? '当前用户' : 'Current User'}</h2>
        </div>
        <div className="p-6 space-y-4">
          {user ? (
            <>
              <div className="flex justify-between">
                <span className="text-gray-600">{language === 'zh' ? '用户名' : 'Username'}</span>
                <span className="font-medium">{user.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{language === 'zh' ? '角色' : 'Role'}</span>
                <span className="font-medium">
                  {user.role === 'admin' && '👑 ' + (language === 'zh' ? '超级管理员' : 'Admin')}
                  {user.role === 'operator' && '🔧 ' + (language === 'zh' ? '运维管理员' : 'Operator')}
                  {user.role === 'dept_admin' && '📋 ' + (language === 'zh' ? '部门管理员' : 'Dept Admin')}
                  {user.role === 'employee' && '👤 ' + (language === 'zh' ? '普通员工' : 'Employee')}
                  {user.role === 'auditor' && '📊 ' + (language === 'zh' ? '审计员' : 'Auditor')}
                </span>
              </div>
              <div className="pt-4 border-t">
                <button
                  onClick={logout}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  {language === 'zh' ? '退出登录' : 'Logout'}
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-4 text-gray-500">
              {language === 'zh' ? '未登录' : 'Not logged in'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
