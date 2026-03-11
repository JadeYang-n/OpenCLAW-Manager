import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useAuthStore } from '../../stores/authStore'
import { useLanguageStore } from '../../stores/languageStore'

interface Skill {
  id: string
  name: string
  description?: string
  version: string
  author?: string
  installed: boolean
  enabled: boolean
  source: string
}

export default function SkillsPage() {
  const { getToken } = useAuthStore()
  const { t, language } = useLanguageStore()
  const [allSkills, setAllSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [installing, setInstalling] = useState<string | null>(null)

  useEffect(() => {
    loadSkills()
  }, [])

  async function loadSkills() {
    try {
      const token = getToken() || ''
      const skills = await invoke<Skill[]>('list_skills', { token })
      setAllSkills(skills)
    } catch (error) {
      console.error('Failed to load skills:', error)
      alert('❌ ' + t('common.error') + ': ' + error)
    } finally {
      setLoading(false)
    }
  }

  async function handleInstall(skill: Skill) {
    try {
      setInstalling(skill.id)
      const token = getToken() || ''
      
      const result = await invoke<string>('install_skill', { 
        token, 
        req: { skill_id: skill.id, version: null, source: skill.source } 
      })
      
      // 如果是提示信息（需要手动下载），直接显示
      if (result.includes('📥') || result.includes('🌐')) {
        alert(result)
      } else {
        // 成功安装，重新加载
        await loadSkills()
        alert(t('skills.hint'))
      }
    } catch (error) {
      alert('❌ ' + t('common.error') + ': ' + error)
    } finally {
      setInstalling(null)
    }
  }

  async function handleUninstall(skillId: string) {
    if (!confirm(language === 'zh' ? '确定要卸载此 Skill 吗？' : 'Are you sure to uninstall this Skill?')) {
      return
    }
    
    try {
      const token = getToken() || ''
      await invoke<string>('uninstall_skill', { token, skill_id: skillId })
      await loadSkills()
      alert(language === 'zh' ? '✅ 卸载成功' : '✅ Uninstalled successfully')
    } catch (error) {
      alert('❌ ' + t('common.error') + ': ' + error)
    }
  }

  async function handleToggle(skill: Skill, enabled: boolean) {
    try {
      const token = getToken() || ''
      await invoke('toggle_skill', { token, skill_id: skill.id, enabled })
      await loadSkills()
    } catch (error) {
      alert('❌ ' + t('common.error') + ': ' + error)
    }
  }

  // 按 source 分组
  const localSkills = allSkills.filter(s => s.source === 'local')
  const anthropicSkills = allSkills.filter(s => s.source === 'anthropic')
  const installedSkills = allSkills.filter(s => s.installed)
  const notInstalledSkills = allSkills.filter(s => !s.installed)

  const isZh = language === 'zh'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{isZh ? '加载中...' : 'Loading...'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* 获取渠道提示 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6">
        <h2 className="text-lg font-semibold mb-3">
          {isZh ? '📚 获取更多 Skills' : '📚 Get More Skills'}
        </h2>
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <span className="text-blue-600 font-bold">1.</span>
            <div>
              <p className="font-medium">
                {isZh ? '🎯 Skill-creator（强烈推荐）' : '🎯 Skill-creator (Highly Recommended)'}
              </p>
              <p className="text-gray-600 mt-1">
                {isZh 
                  ? 'Anthropic 官方出品的 Skill 创建工具，支持：评估系统、基准测试（通过率/耗时/token 用量）、多代理并行测试（A/B 盲评）、描述调优'
                  : 'Official tool from Anthropic for creating custom skills with: evaluation system, benchmarking (pass rate/time/token usage), multi-agent parallel testing (A/B blind), description optimization'
                }
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-green-600 font-bold">2.</span>
            <div>
              <p className="font-medium">
                🤖 {isZh ? 'Anthropic 官方 Skills 仓库' : 'Anthropic Official Skills Repository'}
              </p>
              <p className="text-gray-600 mt-1">
                <a 
                  href="https://github.com/anthropics/skills" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  https://github.com/anthropics/skills
                </a>
              </p>
              <p className="text-gray-600 mt-1">
                {isZh 
                  ? '下载 Skill 包到本地 Skills 目录后，即可在此页面检测并安装'
                  : 'Download Skill packages to local Skills directory, then detect and install from this page'
                }
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-purple-600 font-bold">3.</span>
            <div>
              <p className="font-medium">
                🕸️ ClawHub
              </p>
              <p className="text-gray-600 mt-1">
                <a 
                  href="https://clawhub.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  https://clawhub.com
                </a>
              </p>
              <p className="text-gray-600 mt-1">
                {isZh 
                  ? 'ClawHub API 尚未开放，敬请期待'
                  : 'ClawHub API coming soon'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 已安装 Skills */}
      {installedSkills.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="text-green-600">✅</span>
            {isZh ? '已安装 Skills' : 'Installed Skills'}
            <span className="text-sm font-normal text-gray-500">({installedSkills.length})</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {installedSkills.map(skill => (
              <div key={skill.id} className="bg-white rounded-lg border shadow-sm p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{skill.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      v{skill.version} • {skill.author || 'Unknown'}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${
                    skill.source === 'anthropic' ? 'bg-purple-100 text-purple-700' :
                    skill.source === 'local' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {skill.source}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-4 h-10 overflow-hidden">
                  {skill.description || 'No description'}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggle(skill, !skill.enabled)}
                    className={`flex-1 px-3 py-2 rounded text-sm transition-colors ${
                      skill.enabled
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {skill.enabled ? (isZh ? '✓ 已启用' : '✓ Enabled') : (isZh ? '启用' : 'Enable')}
                  </button>
                  <button
                    onClick={() => handleUninstall(skill.id)}
                    className="px-3 py-2 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 transition-colors"
                  >
                    {isZh ? '卸载' : 'Uninstall'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 可安装 Skills */}
      {notInstalledSkills.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="text-blue-600">📦</span>
            {isZh ? '可用 Skills' : 'Available Skills'}
            <span className="text-sm font-normal text-gray-500">({notInstalledSkills.length})</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {notInstalledSkills.map(skill => (
              <div key={skill.id} className="bg-white rounded-lg border shadow-sm p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{skill.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      v{skill.version} • {skill.author || 'Unknown'}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${
                    skill.source === 'anthropic' ? 'bg-purple-100 text-purple-700' :
                    skill.source === 'local' ? 'bg-blue-100 text-blue-700' :
                    skill.source === 'clawhub' ? 'bg-purple-100 text-purple-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {skill.source === 'anthropic' ? '🤖 Anthropic' :
                     skill.source === 'local' ? '💻 Local' :
                     skill.source === 'clawhub' ? '🕸️ ClawHub' : skill.source}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-4 h-10 overflow-hidden">
                  {skill.description || 'No description'}
                </p>
                <button
                  onClick={() => handleInstall(skill)}
                  disabled={installing === skill.id}
                  className={`w-full px-3 py-2 rounded text-sm transition-colors ${
                    installing === skill.id
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {installing === skill.id 
                    ? (isZh ? '安装中...' : 'Installing...')
                    : (isZh ? '安装' : 'Install')
                  }
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {allSkills.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">
            {isZh 
              ? '暂无可用 Skills。请从上方渠道获取 Skills 并下载到本地目录。'
              : 'No skills available. Get skills from above channels and download to local directory.'
            }
          </p>
        </div>
      )}
    </div>
  )
}
