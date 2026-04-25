import { useState, useEffect } from 'react'
import { useLanguageStore } from '../../stores/languageStore'
import { useAuthStore } from '../../stores/authStore'
import { Sparkles, Search, X, Check, Store } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageContainer } from '../../components/ui/PageContainer'
import { skillsAPI } from '@/services/api'

interface SkillStore {
  id: string
  name: string
  description?: string
  version: string
  author: string
  category?: string
  tags?: string[]
  visibility_scope: string
  status: string
  is_published: boolean
  created_at: string
  param_schema?: any
}

export default function SkillStorePage() {
  const { t, language } = useLanguageStore()
  const { user, getToken } = useAuthStore()
  const [storeSkills, setStoreSkills] = useState<SkillStore[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [showSubmit, setShowSubmit] = useState(false)
  const [selectedSkill, setSelectedSkill] = useState<SkillStore | null>(null)
  const [invokeParams, setInvokeParams] = useState('{}')
  const [invoking, setInvoking] = useState(false)
  const [invokeResult, setInvokeResult] = useState<any>(null)
  const [showResultDialog, setShowResultDialog] = useState(false)
  const [showParamsDialog, setShowParamsDialog] = useState(false)
  const [invokingSkillId, setInvokingSkillId] = useState<string | null>(null)
  const [formValues, setFormValues] = useState<Record<string, string>>({})

  const fetchStoreSkills = async () => {
    try {
      const response = await skillsAPI.getSkillStores()
      const skills = (response && response.data && Array.isArray(response.data)) ? response.data : (Array.isArray(response) ? response : [])
      setStoreSkills(skills)

      const uniqueCategories = [...new Set(skills.map(s => s.category).filter(Boolean))]
      setCategories(uniqueCategories)
    } catch (error) {
      console.error('Failed to fetch store skills:', error)
      setStoreSkills([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStoreSkills()
  }, [])

  const filteredSkills = storeSkills.filter(skill => {
    const matchesSearch = skill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (skill.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
    const matchesCategory = !selectedCategory || skill.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const isZh = language === 'zh'

  const getDefaultParams = (skill: SkillStore): string => {
    const name = skill.name.toLowerCase()
    const desc = skill.description?.toLowerCase() || ''

    if (name.includes('weather') || desc.includes('weather')) {
      return JSON.stringify({ location: 'Beijing' }, null, 2)
    }

    if (name.includes('translat') || desc.includes('translat')) {
      return JSON.stringify({
        text: 'Hello, world!',
        source_lang: 'en',
        target_lang: 'zh'
      }, null, 2)
    }

    if (name.includes('search') || desc.includes('search')) {
      return JSON.stringify({ query: 'OpenCLAW documentation' }, null, 2)
    }

    if (name.includes('code') || name.includes('review')) {
      return JSON.stringify({ code: 'function hello() { console.log("Hello"); }' }, null, 2)
    }

    return JSON.stringify({ prompt: '请帮我完成任务' }, null, 2)
  }

  const handleInvokeSkill = async (skillId: string) => {
    const skill = storeSkills.find(s => s.id === skillId)
    setSelectedSkill(skill || null)
    setInvokingSkillId(skillId)

    // 如果 skill 有 param_schema，显示表单对话框
    if (skill?.param_schema && skill.param_schema.properties?.length > 0) {
      // 初始化表单值
      const initialValues: Record<string, string> = {}
      skill.param_schema.properties.forEach((field: any) => {
        initialValues[field.name] = field.default || ''
      })
      setFormValues(initialValues)
      setShowParamsDialog(true)
      setInvokingSkillId(null)
      return
    }

    // 没有 schema 时，使用旧的关键词判断
    const name = skill?.name.toLowerCase() || ''
    const shouldAskParams = name.includes('translat') || name.includes('code') || name.includes('search')

    if (shouldAskParams) {
      // 需要参数的 Skill，显示参数输入框
      setInvokeParams(getDefaultParams(skill || { id: skillId, name: 'Unknown', version: '1.0', author: '', visibility_scope: 'public', status: 'pending', is_published: false, created_at: '' }))
      setShowParamsDialog(true)
      setInvokingSkillId(null)
    } else {
      // 简单 Skill，直接调用
      setInvokeParams('{}')
      await handleSubmitInvoke(skillId)
    }
  }

  // 从表单值组装 JSON 参数
  const assembleParamsFromForm = (schema: any): string => {
    const params: Record<string, any> = {}
    schema.properties.forEach((field: any) => {
      const val = formValues[field.name]
      if (field.type === 'number') {
        params[field.name] = val ? Number(val) : (field.default || 0)
      } else if (field.type === 'boolean') {
        params[field.name] = val === 'true' || val === '1'
      } else {
        params[field.name] = val || field.default || ''
      }
    })
    return JSON.stringify(params)
  }

  const handleSubmitInvoke = async (skillId: string) => {
    setInvoking(true)

    try {
      const parsedParams = JSON.parse(invokeParams)
      const result = await skillsAPI.invokeSkill(skillId, parsedParams)

      // 保存并显示结果
      setInvokeResult(result)
      setShowResultDialog(true)
    } catch (error) {
      console.error('Failed to invoke skill:', error)
      alert('Error:' + t('common.error') + ': ' + error)
    } finally {
      setInvoking(false)
      setInvokingSkillId(null)
    }
  }

  if (loading) {
    return (
      <PageContainer title="Skill 商店" description="Browse and invoke Skills from store">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer title="Skill 商店" description="Browse and invoke Skills from store">
      {/* 调用进度提示 */}
      {invoking && (
        <div className="fixed top-4 right-4 bg-primary text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          <span>{isZh ? '正在调用 Skill...' : 'Invoking Skill...'}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card variant="premium">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {isZh ? '总 Store 数' : 'Total Store Skills'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-2xl font-bold">{storeSkills.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card variant="premium">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {isZh ? '已发布' : 'Published'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-success" />
              <span className="text-2xl font-bold">
                {storeSkills.filter(s => s.is_published).length}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card variant="premium">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {isZh ? '分类数' : 'Categories'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-info" />
              <span className="text-2xl font-bold">{categories.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={isZh ? '搜索 Skill...' : 'Search Skills...'}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 p-2 border rounded"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="p-2 border rounded"
            >
              <option value="">{isZh ? '全部分类' : 'All Categories'}</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <Button onClick={() => setShowSubmit(true)} variant="primary">
              {isZh ? '提交 Skill' : 'Submit Skill'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSkills.map(skill => (
          <Card key={skill.id} className="flex flex-col hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{skill.name}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    v{skill.version} • {skill.author}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  skill.is_published
                    ? 'bg-success/10 text-success'
                    : 'bg-muted/10 text-muted-foreground'
                }`}>
                  {skill.is_published ? (isZh ? '已发布' : 'Published') : (isZh ? '未发布' : 'Unpublished')}
                </span>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="text-sm text-muted-foreground mb-4">
                {skill.description || (isZh ? '暂无描述' : 'No description available')}
              </p>

              {skill.tags && skill.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {skill.tags.slice(0, 3).map((tag, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-muted/50 text-muted-foreground text-xs rounded">
                      {tag}
                    </span>
                  ))}
                  {skill.tags.length > 3 && (
                    <span className="px-2 py-0.5 bg-muted/50 text-muted-foreground text-xs rounded">
                      +{skill.tags.length - 3}
                    </span>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={() => handleInvokeSkill(skill.id)}
                  variant="primary"
                  className="flex-1"
                  disabled={invoking}
                >
                  {invoking && invokingSkillId === skill.id ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                      {isZh ? '调用中...' : 'Invoking...'}
                    </span>
                  ) : (
                    isZh ? '调用' : 'Invoke'
                  )}
                </Button>
                {skill.category && (
                  <span className="px-2 py-1 bg-primary/5 text-primary text-xs rounded self-center">
                    {skill.category}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredSkills.length === 0 && (
        <div className="text-center py-12">
          <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">
            {isZh ? '暂无符合条件的 Skill' : 'No matching Skills found'}
          </p>
        </div>
      )}

      {showSubmit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{isZh ? '提交 Skill' : 'Submit Skill'}</h3>
              <button onClick={() => setShowSubmit(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {isZh
                ? '提交新 Skill 到商店需要经过审核流程。提交后您的 Skill 将显示在商店中供他人使用。'
                : 'Submitting a new Skill to the store requires review. After approval, your Skill will be available for others to use.'}
            </p>
            <div className="flex gap-3">
              <Button onClick={() => setShowSubmit(false)} variant="secondary">
                {isZh ? '取消' : 'Cancel'}
              </Button>
              <Button onClick={() => {
                setShowSubmit(false)
                window.location.href = '/skills/submit'
              }}>
                {isZh ? '去提交' : 'Submit Now'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 参数输入对话框 - 有 schema 显示表单，无 schema 显示 JSON 编辑器 */}
      {showParamsDialog && selectedSkill && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">{isZh ? '输入调用参数' : 'Enter Parameters'}</h3>
                <p className="text-sm text-muted-foreground mt-1">{selectedSkill.name}</p>
              </div>
              <button onClick={() => setShowParamsDialog(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">{selectedSkill.description}</p>
            </div>

            {/* Schema-based form */}
            {selectedSkill.param_schema?.properties?.length > 0 ? (
              <div className="mb-4 space-y-4">
                {selectedSkill.param_schema.properties.map((field: any) => (
                  <div key={field.name}>
                    <label className="text-sm font-medium mb-1 block">
                      {field.description || field.name}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {field.type === 'select' ? (
                      <select
                        value={formValues[field.name] || ''}
                        onChange={(e) => setFormValues({ ...formValues, [field.name]: e.target.value })}
                        className="w-full p-2 border rounded"
                      >
                        <option value="">{isZh ? '请选择' : 'Select...'}</option>
                        {field.options?.map((opt: any) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    ) : field.type === 'text' ? (
                      <textarea
                        value={formValues[field.name] || ''}
                        onChange={(e) => setFormValues({ ...formValues, [field.name]: e.target.value })}
                        className="w-full p-2 border rounded min-h-[80px]"
                        placeholder={field.placeholder}
                      />
                    ) : field.type === 'number' ? (
                      <input
                        type="number"
                        value={formValues[field.name] || ''}
                        onChange={(e) => setFormValues({ ...formValues, [field.name]: e.target.value })}
                        className="w-full p-2 border rounded"
                        placeholder={field.placeholder}
                      />
                    ) : field.type === 'boolean' ? (
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formValues[field.name] === 'true'}
                          onChange={(e) => setFormValues({ ...formValues, [field.name]: e.target.checked ? 'true' : 'false' })}
                        />
                        <span className="text-sm">{isZh ? '启用' : 'Enable'}</span>
                      </label>
                    ) : (
                      <input
                        type="text"
                        value={formValues[field.name] || ''}
                        onChange={(e) => setFormValues({ ...formValues, [field.name]: e.target.value })}
                        className="w-full p-2 border rounded"
                        placeholder={field.placeholder}
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              /* JSON Editor (fallback) */
              <div className="mb-4">
                <label className="text-sm font-medium mb-2 block">
                  {isZh ? '调用参数（JSON 格式）' : 'Parameters (JSON)'}
                </label>
                <textarea
                  value={invokeParams}
                  onChange={(e) => setInvokeParams(e.target.value)}
                  className="w-full p-3 border rounded font-mono text-sm min-h-[150px]"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {isZh ? '大部分 Skill 使用默认参数即可' : 'Default parameters usually work'}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button onClick={() => setShowParamsDialog(false)} variant="secondary">
                {isZh ? '取消' : 'Cancel'}
              </Button>
              <Button onClick={async () => {
                setShowParamsDialog(false)
                // 如果有 schema，从表单组装参数
                if (selectedSkill.param_schema?.properties?.length > 0) {
                  setInvokeParams(assembleParamsFromForm(selectedSkill.param_schema))
                }
                await handleSubmitInvoke(selectedSkill?.id || '')
              }}>
                {isZh ? '调用' : 'Invoke'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Result Dialog */}
      {showResultDialog && invokeResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">{isZh ? '调用结果' : 'Invocation Result'}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedSkill?.name} • {new Date().toLocaleString()}
                </p>
              </div>
              <button onClick={() => setShowResultDialog(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Success Status */}
            <div className="mb-4 p-3 bg-success/10 rounded-lg flex items-center gap-3">
              <Check className="w-5 h-5 text-success" />
              <span className="text-sm font-medium text-success">
                {isZh ? '执行成功' : 'Execution Successful'}
              </span>
            </div>

            {/* Result Content */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium">{isZh ? '返回结果' : 'Result'}</span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const content = extractResultContent(invokeResult)
                    navigator.clipboard.writeText(content)
                    alert(isZh ? '已复制到剪贴板' : 'Copied to clipboard')
                  }}
                >
                  {isZh ? '复制' : 'Copy'}
                </Button>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <pre className="text-sm whitespace-pre-wrap break-words font-sans">
                  {extractResultContent(invokeResult)}
                </pre>
              </div>
            </div>

            {/* Raw JSON (collapsible) */}
            <details className="mb-4">
              <summary className="text-sm font-medium cursor-pointer mb-2">
                {isZh ? '查看原始 JSON' : 'View Raw JSON'}
              </summary>
              <pre className="p-4 bg-muted/50 rounded-lg overflow-x-auto">
                <code className="text-xs font-mono">
                  {JSON.stringify(invokeResult, null, 2)}
                </code>
              </pre>
            </details>

            <div className="flex justify-end">
              <Button onClick={() => setShowResultDialog(false)}>
                {isZh ? '关闭' : 'Close'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  )
}

// Helper function to extract human-readable content from result
function extractResultContent(result: any): string {
  // Handle the OpenCLAW CLI response format
  if (result?.data?.raw) {
    try {
      // Try to parse the raw string as JSON
      const raw = typeof result.data.raw === 'string'
        ? JSON.parse(result.data.raw)
        : result.data.raw

      // Extract text from payloads (OpenCLAW format)
      if (raw?.payloads && Array.isArray(raw.payloads)) {
        return raw.payloads
          .filter((p: any) => p?.text)
          .map((p: any) => p.text)
          .join('\n\n')
      }

      // Try response.message.content format
      if (raw?.response?.message?.content) {
        return raw.response.message.content
      }
    } catch {
      // If parsing fails, return raw string
      return result.data.raw
    }
  }

  // Try common response structures
  if (result?.data) {
    if (typeof result.data === 'string') return result.data
    if (result.data?.content) return result.data.content
    return JSON.stringify(result.data, null, 2)
  }

  if (result?.response?.message?.content) {
    return result.response.message.content
  }

  if (typeof result === 'string') return result

  return JSON.stringify(result, null, 2)
}
