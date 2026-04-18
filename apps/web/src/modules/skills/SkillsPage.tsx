import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguageStore } from '../../stores/languageStore'
import { useAuthStore } from '../../stores/authStore'
import { Sparkles, Check, Settings, Store, BarChart3, Plus } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageContainer } from '../../components/ui/PageContainer'
import { skillsAPI, instancesAPI } from '@/services/api'

// Simplified skill interface (only essential fields)
interface BasicSkill {
  id: string
  skill_id: string
  name: string
  version: string
  enabled: boolean
  installed_at: string
  last_used_at?: string
}

interface SkillVersion {
  id: string
  version: string
  version_note?: string
  created_at: string
  created_by: string
  is_active: boolean
}

export default function SkillsPage() {
  const { t, language } = useLanguageStore()
  const { user, getToken } = useAuthStore()
  const navigate = useNavigate()
  const [skills, setSkills] = useState<BasicSkill[]>([])
  const [loading, setLoading] = useState(true)
  const [showStore, setShowStore] = useState(false)
  const [showVersions, setShowVersions] = useState<string | null>(null)
  const [skillVersions, setSkillVersions] = useState<SkillVersion[]>([])
  const [marketSkills, setMarketSkills] = useState<any[]>([])
  const [installing, setInstalling] = useState<string | null>(null)
  const [marketLoading, setMarketLoading] = useState(false)

  // 权限检查
  const canUpload = user?.role === 'admin' || user?.role === 'operator' || user?.role === 'dept_admin'
  const canManageSkills = user?.role === 'admin' || user?.role === 'operator' || user?.role === 'dept_admin'

  const loadSkills = useCallback(async () => {
    try {
      const skillsData = await skillsAPI.getInstalledSkills()
      // 后端返回 { data: [], success: true } 格式
      const skills = skillsData.data || []
      // 后端返回格式: [skill_id, name, description, version, installed_at, enabled, installed_version]
      const mappedSkills = skills.map((skill: any) => ({
        id: skill[0],  // skill_id
        skill_id: skill[0],
        name: skill[1],
        description: skill[2],
        version: skill[3],
        installed_at: skill[4],
        enabled: skill[5],
        installed_version: skill[6]
      }))
      setSkills(mappedSkills as BasicSkill[])
    } catch (error) {
      console.error('Failed to load skills:', error)
      alert('错误:' + t('common.error') + ': ' + error)
    } finally {
      setLoading(false)
    }
  }, [t])

  const loadVersions = useCallback(async (skillId: string) => {
    try {
      const versions = await skillsAPI.getSkillVersions(skillId)
      setSkillVersions(versions as SkillVersion[])
      setShowVersions(skillId)
    } catch (error) {
      console.error('Failed to load versions:', error)
      alert('错误:' + t('common.error') + ': ' + error)
    }
  }, [t])

  const rollbackVersion = useCallback(async (skillId: string, versionId: string) => {
    try {
      await skillsAPI.rollbackSkill(skillId, versionId)
      alert('成功:' + t('common.success'))
      setShowVersions(null)
      await loadSkills()
    } catch (error) {
      console.error('Failed to rollback:', error)
      alert('错误:' + t('common.error') + ': ' + error)
    }
  }, [t, loadSkills])



  const handleUpdateSkill = async (id: string, content: string) => {
    try {
      await skillsAPI.updateSkill(id, {
        content,
        version_note: 'New version',
        change_summary: 'Updated from web'
      })
      alert('成功:' + t('common.success'))
      await loadSkills()
    } catch (error) {
      console.error('Failed to update skill:', error)
      alert('错误:' + t('common.error') + ': ' + error)
    }
  }

  const handleDeleteSkill = async (id: string) => {
    if (!confirm(t('common.confirmDelete'))) return
    
    try {
      await skillsAPI.deleteSkill(id)
      alert('成功:' + t('common.success'))
      await loadSkills()
    } catch (error) {
      console.error('Failed to delete skill:', error)
      alert('错误:' + t('common.error') + ': ' + error)
    }
  }

  useEffect(() => {
    loadSkills()
  }, [loadSkills])



  useEffect(() => {
    loadMarketSkills()
  }, [showStore])

  const loadMarketSkills = async () => {
    if (!showStore || !canUpload) return
    
    setMarketLoading(true)
    try {
      const skills = await skillsAPI.getSkills()
      const skillsData = Array.isArray(skills) ? skills : (skills as { data?: Array<Record<string, unknown>> })?.data || []
      setMarketSkills(skillsData)
    } catch (error) {
      console.error('Failed to load market skills:', error)
      setMarketSkills([])
    } finally {
      setMarketLoading(false)
    }
  }

  const handleInstallSkill = async (skillId: string) => {
    if (installing === skillId) return
    
    setInstalling(skillId)
    try {
      await skillsAPI.installSkill(skillId)
      await loadSkills()
      alert('成功:' + t('common.success'))
    } catch (error) {
      console.error('Failed to install skill:', error)
      alert('错误:' + t('common.error') + ': ' + error)
    } finally {
      setInstalling(null)
    }
  }

  const handleUninstallSkill = async (skillId: string) => {
    if (!confirm(t('common.confirmUninstall'))) return
    
    try {
      await skillsAPI.uninstallSkill(skillId)
      await loadSkills()
      alert('成功:' + t('common.success'))
    } catch (error) {
      console.error('Failed to uninstall skill:', error)
      alert('错误:' + t('common.error') + ': ' + error)
    }
  }

  const handleToggleSkill = async (skillId: string, enabled: boolean) => {
    try {
      await skillsAPI.updateSkillStatus(skillId, { enabled })
      await loadSkills()
    } catch (error) {
      console.error('Failed to toggle skill:', error)
      alert('错误:' + t('common.error') + ': ' + error)
    }
  }

  // Calculate stats
  const totalSkills = skills.length
  const enabledSkills = skills.filter(s => s.enabled).length
  const disabledSkills = totalSkills - enabledSkills

  const isZh = language === 'zh'

  const handleBatchOperate = async (operation: 'enable' | 'disable' | 'delete') => {
    if (!canManageSkills) return
    
    try {
      let promises: Promise<any>[] = []
      
      if (operation === 'enable') {
        promises = skills.filter(s => !s.enabled).map(s => 
          skillsAPI.updateSkillStatus(s.id, { enabled: true })
        )
      } else if (operation === 'disable') {
        promises = skills.filter(s => s.enabled).map(s => 
          skillsAPI.updateSkillStatus(s.id, { enabled: false })
        )
      } else if (operation === 'delete') {
        promises = skills.map(s => skillsAPI.deleteSkill(s.id))
      }
      
      if (promises.length > 0) {
        await Promise.all(promises)
        await loadSkills()
        alert('成功:' + t('common.success'))
      }
    } catch (error) {
      console.error(`Failed to batch ${operation}:`, error)
      alert('错误:' + t('common.error') + ': ' + error)
    }
  }

  if (!canUpload) {
    return (
      <PageContainer title="技能管理" description="您的角色暂时无法上传或管理 Skills 的权限。如需上传 Skill 或管理已安装的 Skills，请联系管理员。">
        <div className="p-8 max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">{isZh ? '权限不足' : 'Permission Denied'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-6">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <Sparkles className="w-10 h-10 text-primary" />
                </div>
                <p className="text-muted-foreground">
                  {isZh 
                    ? '您的角色暂时无法上传或管理 Skills 的权限。如需上传 Skill 或管理已安装的 Skills，请联系管理员。' 
                    : 'Your role does not have permission to upload or manage Skills. Please contact an administrator.'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    )
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6 max-w-4xl mx-auto">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <PageContainer title="技能管理" description="管理和配置OpenCLAW的Skills">
      {/* Action Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">{isZh ? 'Skills 管理' : 'Skills Management'}</h2>
        {canUpload && (
          <Button onClick={() => navigate('/skills/submit')} variant="primary">
            <Plus className="w-4 h-4 mr-2" />
            {isZh ? '提交新 Skill' : 'Submit New Skill'}
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card variant="premium">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">
              {isZh ? '总安装数' : 'Total Installed'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-primary">{totalSkills}</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="premium">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">
              {isZh ? '已启用' : 'Enabled'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-success">{enabledSkills}</p>
              </div>
              <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                <Check className="w-6 h-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="premium">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">
              {isZh ? '已禁用' : 'Disabled'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-muted-foreground">{disabledSkills}</p>
              </div>
              <div className="w-12 h-12 bg-muted/10 rounded-lg flex items-center justify-center">
                <Settings className="w-6 h-6 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Bar */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>管理操作</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-3">
            {canManageSkills && (
              <Button onClick={() => setShowStore(!showStore)} variant={showStore ? 'primary' : 'default'}>
                <Store className="w-4 h-4" />
                {isZh ? (showStore ? '已安装' : '进入 Skill Store') : (showStore ? '已安装 Skills' : '进入 Skill Store')}
              </Button>
            )}
            
            {canManageSkills && (
              <div className="flex gap-3">
                <Button
                  onClick={() => handleBatchOperate('enable')}
                  disabled={disabledSkills === 0}
                  variant="success"
                >
                  {isZh ? '启用All' : 'Enable All'}
                </Button>
                <Button
                  onClick={() => handleBatchOperate('disable')}
                  disabled={enabledSkills === 0}
                  variant="warning"
                >
                  {isZh ? '禁用所有' : 'Disable All'}
                </Button>
                <Button
                  onClick={() => handleBatchOperate('delete')}
                  disabled={totalSkills === 0}
                  variant="destructive"
                >
                  {isZh ? '卸载所有' : 'Uninstall All'}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Store Section */}
      {showStore && (
        <Card>
          <CardHeader>
            <CardTitle>{isZh ? 'Skill 商店' : 'Skill Store'}</CardTitle>
          </CardHeader>
          <CardContent>
            {marketLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {marketSkills.map(skill => (
                  <Card key={skill.id} className="flex flex-col">
                    <CardHeader>
                      <CardTitle className="text-lg">{skill.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <p className="text-xs text-muted-foreground">
                          {isZh ? '作者' : 'Author:'} {skill.author || 'Unknown'} -v{skill.version}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {skill.description || (isZh ? '暂无描述' : 'No description available')}
                        </p>
                        <Button
                          onClick={() => handleInstallSkill(skill.id)}
                          disabled={installing === skill.id}
                          variant="primary"
                        >
                          {installing === skill.id 
                            ? (isZh ? '安装中...' : 'Installing...') 
                            : (isZh ? '安装' : 'Install')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Skills List */}
      {!showStore && (
        <Card>
          <CardHeader>
            <CardTitle>{`已安装 Skills (${totalSkills} 个)`}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {skills.map(skill => (
                <Card key={skill.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{skill.name}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                          v{skill.version}
                        </p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                        skill.enabled 
                          ? 'bg-success/10 text-success' 
                          : 'bg-muted/10 text-muted-foreground'
                      }`}>
                        {skill.enabled ? (isZh ? '✓ 已启用' : '✓ Enabled') : (isZh ? '✓ 已禁用' : '✓ Disabled')}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Button
                          onClick={() => loadVersions(skill.id)}
                          variant="secondary"
                          className="flex-1"
                        >
                          {isZh ? '查看版本' : 'Versions'}
                        </Button>
                        <Button
                          onClick={() => handleToggleSkill(skill.id, !skill.enabled)}
                          variant={skill.enabled ? 'success' : 'default'}
                        >
                          {skill.enabled ? (isZh ? '✓ 已启用' : '✓ Enabled') : (isZh ? '启用' : 'Enable')}
                        </Button>
                        <Button
                          onClick={() => handleDeleteSkill(skill.id)}
                          variant="destructive"
                        >
                          {isZh ? '卸载' : 'Uninstall'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Version History Modal */}
      {showVersions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">版本历史 - {skills.find(s => s.id === showVersions)?.name}</h3>
              <button onClick={() => setShowVersions(null)} className="text-gray-500 hover:text-gray-700">
                ×
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <div className="space-y-4">
                {skillVersions.map(version => (
                  <div key={version.id} className={`p-4 rounded-lg border ${version.is_active ? 'border-primary bg-primary/5' : 'border-border'}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold">{version.version}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {version.version_note}
                        </div>
                      </div>
                      {version.is_active && (
                        <span className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded">
                          {isZh ? '当前版本' : 'Current'}
                        </span>
                      )}
                    </div>
                    {!version.is_active && (
                      <Button
                        onClick={() => rollbackVersion(showVersions, version.id)}
                        size="sm"
                        className="mt-3"
                      >
                        {isZh ? '回退至此版本' : 'Rollback'}
                      </Button>
                    )}
                    <div className="text-xs text-muted-foreground mt-2">
                      {isZh ? '创建时间:' : 'Created:'} {new Date(version.created_at).toLocaleString()} - 
                      {isZh ? '创建者' : ' by '} {version.created_by}
                    </div>
                  </div>
                ))}
                {skillVersions.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    {isZh ? '暂无版本历史' : 'No version history available'}
                  </p>
                )}
              </div>
            </div>
            <div className="p-4 border-t flex justify-end">
              <Button onClick={() => setShowVersions(null)}>
                {isZh ? '关闭' : 'Close'}
              </Button>
            </div>
          </div>
        </div>
      )}


    </PageContainer>
  )
}