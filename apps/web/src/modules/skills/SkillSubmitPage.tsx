import { useState, useEffect } from 'react'
import { useLanguageStore } from '../../stores/languageStore'
import { useAuthStore } from '../../stores/authStore'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageContainer } from '../../components/ui/PageContainer'
import { skillsAPI, instancesAPI } from '@/services/api'
import { Plus, X } from 'lucide-react'

interface Category {
  id: string
  name: string
}

interface ParamField {
  name: string
  type: string
  required: boolean
  description: string
  default: string
  placeholder: string
  options: { label: string; value: string }[]
}

const FIELD_TYPES = [
  { value: 'string', label: '单行文本', desc: 'Text input' },
  { value: 'text', label: '多行文本', desc: 'Textarea' },
  { value: 'number', label: '数字', desc: 'Number' },
  { value: 'select', label: '下拉选择', desc: 'Dropdown' },
  { value: 'boolean', label: '开关', desc: 'Toggle' },
]

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
    skillFile: '',
  })
  const [showSchema, setShowSchema] = useState(false)
  const [paramFields, setParamFields] = useState<ParamField[]>([])

  const addField = () => {
    setParamFields([...paramFields, { name: '', type: 'string', required: false, description: '', default: '', placeholder: '', options: [] }])
  }

  const removeField = (index: number) => {
    setParamFields(paramFields.filter((_, i) => i !== index))
  }

  const updateField = (index: number, key: keyof ParamField, value: any) => {
    const updated = [...paramFields]
    updated[index] = { ...updated[index], [key]: value }
    setParamFields(updated)
  }

  const addOption = (fieldIndex: number) => {
    const updated = [...paramFields]
    updated[fieldIndex] = {
      ...updated[fieldIndex],
      options: [...updated[fieldIndex].options, { label: '', value: '' }]
    }
    setParamFields(updated)
  }

  const removeOption = (fieldIndex: number, optionIndex: number) => {
    const updated = [...paramFields]
    updated[fieldIndex] = {
      ...updated[fieldIndex],
      options: updated[fieldIndex].options.filter((_, i) => i !== optionIndex)
    }
    setParamFields(updated)
  }

  const updateOption = (fieldIndex: number, optionIndex: number, key: 'label' | 'value', val: string) => {
    const updated = [...paramFields]
    updated[fieldIndex].options[optionIndex][key] = val
    // 自动填充 value（使用 label 的拼音或英文）
    if (key === 'label') {
      updated[fieldIndex].options[optionIndex].value = val.toLowerCase().replace(/\s+/g, '_')
    }
    setParamFields(updated)
  }

  const buildParamSchema = () => {
    const valid = paramFields.filter(f => f.name.trim())
    if (valid.length === 0) return undefined
    return {
      properties: valid.map(f => {
        const field: any = {
          name: f.name.trim(),
          type: f.type,
          required: f.required,
          description: f.description,
          default: f.default,
          placeholder: f.placeholder,
        }
        if (f.type === 'select') {
          field.options = f.options
        }
        return field
      })
    }
  }

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
      const paramSchema = buildParamSchema()

      const desc = formData.skillFile
        ? `${formData.description}\n[Skill File: ${formData.skillFile}]`
        : formData.description

      await skillsAPI.createSkillStore({
        name: formData.name,
        description: desc,
        category: formData.category,
        tags: tagsArray,
        instance_id: userInstanceId,
        visibility_scope: 'department',
        param_schema: paramSchema,
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

            <div>
              <label className="block text-sm font-medium mb-1">
                {isZh ? 'Skill 文件名（可选）' : 'Skill File Name (Optional)'}
              </label>
              <input
                type="text"
                value={formData.skillFile}
                onChange={e => setFormData({ ...formData, skillFile: e.target.value })}
                className="w-full p-2 border rounded"
                placeholder={isZh ? '例如: my-skill.md 或完整路径' : 'e.g., my-skill.md or full path'}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {isZh ? '输入本地 skill 文件名，便于审核人员定位' : 'Enter local skill file name to help reviewers locate the file'}
              </p>
            </div>

            {/* 参数配置区域 */}
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">
                    {isZh ? '参数配置 (可选)' : 'Parameters (Optional)'}
                  </label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isZh ? '定义此 Skill 的输入参数，用户调用时会看到对应的表单' : 'Define input parameters. Users will see a form when invoking.'}
                  </p>
                </div>
                <Button type="button" variant="secondary" size="sm" onClick={addField}>
                  <Plus className="w-4 h-4 mr-1" />
                  {isZh ? '添加参数' : 'Add Parameter'}
                </Button>
              </div>

              {paramFields.length > 0 && (
                <div className="space-y-4">
                  {paramFields.map((field, fi) => (
                    <div key={fi} className="border rounded-lg p-3 relative bg-muted/20">
                      <button type="button" onClick={() => removeField(fi)} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground">
                        <X className="w-4 h-4" />
                      </button>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs font-medium mb-1 block">{isZh ? '参数名' : 'Name'}</label>
                          <input
                            type="text"
                            value={field.name}
                            onChange={e => updateField(fi, 'name', e.target.value)}
                            placeholder={isZh ? 'location' : 'e.g., location'}
                            className="w-full p-1.5 text-sm border rounded"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium mb-1 block">{isZh ? '类型' : 'Type'}</label>
                          <select
                            value={field.type}
                            onChange={e => updateField(fi, 'type', e.target.value)}
                            className="w-full p-1.5 text-sm border rounded"
                          >
                            {FIELD_TYPES.map(ft => (
                              <option key={ft.value} value={ft.value}>
                                {ft.label} ({ft.desc})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium mb-1 block">{isZh ? '描述' : 'Description'}</label>
                          <input
                            type="text"
                            value={field.description}
                            onChange={e => updateField(fi, 'description', e.target.value)}
                            placeholder={isZh ? '要查询的城市' : 'City name to query'}
                            className="w-full p-1.5 text-sm border rounded"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium mb-1 block">{isZh ? '默认值' : 'Default'}</label>
                          <input
                            type="text"
                            value={field.default}
                            onChange={e => updateField(fi, 'default', e.target.value)}
                            placeholder={isZh ? 'Beijing' : 'Beijing'}
                            className="w-full p-1.5 text-sm border rounded"
                          />
                        </div>
                        <div className="col-span-2 flex items-center gap-4">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={e => updateField(fi, 'required', e.target.checked)}
                            />
                            {isZh ? '必填' : 'Required'}
                          </label>
                        </div>

                        {/* Select options */}
                        {field.type === 'select' && (
                          <div className="col-span-2 mt-2">
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-xs font-medium">{isZh ? '选项' : 'Options'}</label>
                              <Button type="button" variant="secondary" size="sm" onClick={() => addOption(fi)}>
                                <Plus className="w-3 h-3 mr-1" />
                                {isZh ? '添加选项' : 'Add Option'}
                              </Button>
                            </div>
                            {field.options.map((opt, oi) => (
                              <div key={oi} className="flex gap-2 mb-1">
                                <input
                                  type="text"
                                  value={opt.label}
                                  onChange={e => updateOption(fi, oi, 'label', e.target.value)}
                                  placeholder={isZh ? '显示名称' : 'Label'}
                                  className="flex-1 p-1.5 text-sm border rounded"
                                />
                                <input
                                  type="text"
                                  value={opt.value}
                                  onChange={e => updateOption(fi, oi, 'value', e.target.value)}
                                  placeholder={isZh ? '值' : 'Value'}
                                  className="flex-1 p-1.5 text-sm border rounded"
                                />
                                <button type="button" onClick={() => removeOption(fi, oi)} className="text-muted-foreground hover:text-foreground p-1">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
