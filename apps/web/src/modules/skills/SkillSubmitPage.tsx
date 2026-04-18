import { useState, useEffect } from 'react'
import { useLanguageStore } from '../../stores/languageStore'
import { useAuthStore } from '../../stores/authStore'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageContainer } from '../../components/ui/PageContainer'
import { skillsAPI, instancesAPI } from '@/services/api'

interface Category {
  id: string
  name: string
}

const categories: Category[] = [
  { id: 'developer_tools', name: '开发工具' },
  { id: 'productivity', name: '效率工具' },
  { id: 'communication', name: '沟通协作' },
  { id: 'automation', name: '自动化' },
  { id: 'analytics', name: '数据分析' },
  { id: 'other', name: '其他' },
]

export default function SkillSubmitPage() {
  const { t, language } = useLanguageStore()
  const { user, getToken } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [userInstanceId, setUserInstanceId] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'developer_tools',
    tags: '' as string | string[],
  })

  useEffect(() => {
    // 获取用户实例 ID
    const fetchInstances = async () => {
      try {
        const instances = await instancesAPI.getInstances()
        if (instances.length > 0) {
          setUserInstanceId(instances[0].id)
        }
      } catch (error) {
        console.error('Failed to fetch instances:', error)
      }
    }
    
    fetchInstances()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      alert(t('common.nameRequired') || '请输入名称')
      return
    }

    setLoading(true)
    try {
      const tagsArray = formData.tags 
        ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
        : []
      
      await skillsAPI.createSkillStore({
        name: formData.name,
        description: formData.description,
        category: formData.category,
        tags: tagsArray,
        instance_id: userInstanceId,
        visibility_scope: 'department',
      })
      
      setSuccess(true)
      alert('Success:' + t('common.success'))
    } catch (error) {
      console.error('Failed to submit skill:', error)
      alert('Error:' + t('common.error') + ': ' + error)
    } finally {
      setLoading(false)
    }
  }

  const isZh = language === 'zh'

  if (success) {
    return (
      <PageContainer title="提交Skill" description="提交新Skill到商店">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">{isZh ? '提交成功!' : 'Submitted Successfully!'}</CardTitle>
          </CardHeader>
          <CardContent className="text-center py-8">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">✓</span>
            </div>
            <p className="text-muted-foreground mb-6">
              {isZh 
                ? '您的Skill已成功提交，等待审核通过后将在商店中显示。' 
                : 'Your Skill has been submitted successfully. It will appear in the store after review.'}
            </p>
            <Button onClick={() => setSuccess(false)}>
              {isZh ? '返回' : 'Back'}
            </Button>
          </CardContent>
        </Card>
      </PageContainer>
    )
  }

  return (
    <PageContainer title="提交Skill" description="Submit new Skill to store">
      <Card>
        <CardHeader>
          <CardTitle>{isZh ? '提交新Skill' : 'Submit New Skill'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                {isZh ? 'Skill名称' : 'Skill Name'}
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full p-2 border rounded"
                placeholder={isZh ? '例如: Web搜索工具' : 'e.g., Web Search Tool'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                {isZh ? '描述' : 'Description'}
              </label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full p-2 border rounded"
                placeholder={isZh ? '简要描述此Skill的功能...' : 'Briefly describe this Skill functionality...'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                {isZh ? '分类' : 'Category'}
              </label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full p-2 border rounded"
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {isZh ? cat.name : cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                {isZh ? '标签(用逗号分隔)' : 'Tags (comma separated)'}
              </label>
              <input
                type="text"
                value={Array.isArray(formData.tags) ? formData.tags.join(', ') : formData.tags}
                onChange={e => setFormData({ ...formData, tags: e.target.value })}
                className="w-full p-2 border rounded"
                placeholder={isZh ? '例如: web, search, api' : 'e.g., web, search, api'}
              />
            </div>

            <div className="pt-4 flex gap-3">
              <Button type="submit" disabled={loading}>
                {loading ? (isZh ? '提交中...' : 'Submitting...') : (isZh ? '提交' : 'Submit')}
              </Button>
              <Button type="button" variant="secondary" onClick={() => window.history.back()}>
                {isZh ? '取消' : 'Cancel'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
