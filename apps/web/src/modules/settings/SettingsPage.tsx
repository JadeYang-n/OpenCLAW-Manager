import { useLanguageStore } from '../../stores/languageStore'
import { useAuthStore } from '../../stores/authStore'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageContainer } from '../../components/ui/PageContainer'
import { RoleBadge } from '@/components/ui/role-badge'
import { Settings, Languages, Palette, LogOut } from 'lucide-react'

export default function SettingsPage() {
  const { language, setLanguage, t } = useLanguageStore()
  const { user, logout } = useAuthStore()

  return (
    <PageContainer title={t('settings.title')} description="语言和主题设置">
      <div className="space-y-6 max-w-3xl">
        {/* 语言设置 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Languages className="w-5 h-5 text-primary" />
              <div>
                <CardTitle className="text-lg">{t('settings.language')}</CardTitle>
                <CardDescription>Language / 语言设置</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {language === 'zh' ? t('settings.language.zh') : t('settings.language.en')}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {language === 'zh' ? '当前语言：简体中文' : 'Current Language: English'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={language === 'zh' ? 'primary' : 'outline'}
                  onClick={() => setLanguage('zh')}
                >
                  中文
                </Button>
                <Button
                  variant={language === 'en' ? 'primary' : 'outline'}
                  onClick={() => setLanguage('en')}
                >
                  EN
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 主题设置（暂未实现） */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Palette className="w-5 h-5 text-primary" />
              <div>
                <CardTitle className="text-lg">{t('settings.theme')}</CardTitle>
                <CardDescription>Theme / 主题设置</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {t('settings.theme.auto')}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {language === 'zh' ? '跟随系统主题' : 'Follow system theme'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="primary" disabled>
                  {t('settings.theme.auto')}
                </Button>
                <Button variant="outline" disabled>
                  {t('settings.theme.light')}
                </Button>
                <Button variant="outline" disabled>
                  {t('settings.theme.dark')}
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              💡 {language === 'zh' ? '主题功能开发中...' : 'Theme feature coming soon...'}
            </p>
          </CardContent>
        </Card>

        {/* 用户信息 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">{language === 'zh' ? '当前用户' : 'Current User'}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {user ? (
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{language === 'zh' ? '用户名' : 'Username'}</span>
                  <span className="font-medium">{user.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{language === 'zh' ? '角色' : 'Role'}</span>
                  <div className="flex items-center gap-2">
                    <RoleBadge role={user.role} />
                    <span className="font-medium">
                      {user.role === 'admin' && (language === 'zh' ? '超级管理员' : 'Admin')}
                      {user.role === 'operator' && (language === 'zh' ? '运维管理员' : 'Operator')}
                      {user.role === 'dept_admin' && (language === 'zh' ? '部门管理员' : 'Dept Admin')}
                      {user.role === 'employee' && (language === 'zh' ? '普通员工' : 'Employee')}
                      {user.role === 'auditor' && (language === 'zh' ? '审计员' : 'Auditor')}
                    </span>
                  </div>
                </div>
                <div className="pt-4 border-t border-border">
                  <Button variant="ghost" className="text-error hover:text-error/80" onClick={logout}>
                    <LogOut className="w-4 h-4 mr-2" />
                    {language === 'zh' ? '退出登录' : 'Logout'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                {language === 'zh' ? '未登录' : 'Not logged in'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
