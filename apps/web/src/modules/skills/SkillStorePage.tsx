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
  const [showInvokeDialog, setShowInvokeDialog] = useState(false)
  const [selectedSkillId, setSelectedSkillId] = useState('')
  const [invokeParams, setInvokeParams] = useState('{}')

  const fetchStoreSkills = async () => {
    try {
      const response = await skillsAPI.getSkillStores()
      const skills = Array.isArray(response) ? response : []
      setStoreSkills(skills)
      
      // Extract unique categories
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

  const handleInvokeSkill = async (skillId: string) => {
    setSelectedSkillId(skillId)
    setInvokeParams('{}')
    setShowInvokeDialog(true)
  }

  const handleSubmitInvoke = async () => {
    try {
      const parsedParams = JSON.parse(invokeParams)
      const result = await skillsAPI.invokeSkill(selectedSkillId, parsedParams)
      setShowInvokeDialog(false)
      alert(isZh ? '调用成功!' : 'Invocation successful!')
      console.log('Invocation result:', result)
    } catch (error) {
      console.error('Failed to invoke skill:', error)
      alert('Error:' + t('common.error') + ': ' + error)
    }
  }

  if (loading) {
    return (
      <PageContainer title="Skill商店" description="Browse and invoke Skills from store">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer title="Skill商店" description="Browse and invoke Skills from store">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card variant="premium">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {isZh ? '总Store数' : 'Total Store Skills'}
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

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={isZh ? '搜索Skill...' : 'Search Skills...'}
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
              {isZh ? '提交Skill' : 'Submit Skill'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Skills Grid */}
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
                >
                  {isZh ? '调用' : 'Invoke'}
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
            {isZh ? '暂无符合条件的Skill' : 'No matching Skills found'}
          </p>
        </div>
      )}

      {/* Submit Modal (Simple) */}
      {showSubmit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{isZh ? '提交Skill' : 'Submit Skill'}</h3>
              <button onClick={() => setShowSubmit(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {isZh 
                ? '提交新Skill到商店需要经过审核流程。提交后您的Skill将显示在商店中供他人使用。' 
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

      {/* Invoke Skill Modal */}
      {showInvokeDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{isZh ? '调用Skill' : 'Invoke Skill'}</h3>
              <button onClick={() => setShowInvokeDialog(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {isZh ? '请输入Skill调用参数（JSON格式）：' : 'Enter Skill invocation parameters (JSON format):'}
            </p>
            <textarea
              value={invokeParams}
              onChange={(e) => setInvokeParams(e.target.value)}
              placeholder='{"param1": "value1", "param2": "value2"}'
              className="w-full p-3 border rounded font-mono text-sm mb-4 min-h-[120px]"
            />
            <div className="flex gap-3">
              <Button onClick={() => setShowInvokeDialog(false)} variant="secondary">
                {isZh ? '取消' : 'Cancel'}
              </Button>
              <Button onClick={handleSubmitInvoke}>
                {isZh ? '调用' : 'Invoke'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  )
}
