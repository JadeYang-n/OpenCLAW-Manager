import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { useAuthStore } from '../../stores/authStore'
import * as deptApi from '../departments/api'
import type { Department } from '../departments/types'
import { api } from '../../lib/api'
import { instancesAPI, configAPI, skillsAPI } from '../../services/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea, Checkbox } from '@/components/ui/form'
import { Badge, RiskBadge, StatusBadge } from '@/components/ui/badges'
import { Server, AlertTriangle, CheckCircle, Activity, Plus, RefreshCw, Scan, Download, MoreVertical } from 'lucide-react'

interface Instance {
  id: string
  name: string
  host_ip: string
  admin_port: number
  status: string
  version?: string
  last_heartbeat?: number
  created_at?: string
  departments?: Department[]
  enabled?: boolean
  gateway_online?: boolean
}

interface Config {
  id: string
  name: string
  data: Record<string, unknown>
}

interface Skill {
  id: string
  name: string
  description: string
  version: string
  installed: boolean
  enabled: boolean
}

interface DiscoveredInstance {
  port: number
  endpoint: string
  status: string
  token?: string
  admin_token?: string
}

interface CreateInstanceForm {
  name: string
  host_ip: string
  admin_port: number
  admin_token: string
  department_id?: string
  config_id?: string
  skill_ids?: string[]
  skip_test?: boolean
}

export default function InstancesPage() {
  console.log('[InstancesPage] Component mounted/rendered')
  const { getToken } = useAuthStore()
  const [instances, setInstances] = useState<Instance[]>([])
  console.log('[InstancesPage] Token from store:', getToken())
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [departments, setDepartments] = useState<Department[]>([])
  const [configs, setConfigs] = useState<Config[]>([])
  const [skills, setSkills] = useState<Skill[]>([])
  const [createForm, setCreateForm] = useState<CreateInstanceForm>({
    name: '',
    host_ip: '',
    admin_port: 18789,
    admin_token: '',
    department_id: '',
    config_id: '',
    skill_ids: [],
    skip_test: false,
  })
  const [selectedInstances, setSelectedInstances] = useState<string[]>([])
  const [batchOperating, setBatchOperating] = useState(false)
  const [showDeptDialog, setShowDeptDialog] = useState(false)
  const [currentInstanceId, setCurrentInstanceId] = useState<string | null>(null)
  const [instanceDepartments, setInstanceDepartments] = useState<Department[]>([])
  const [scanning, setScanning] = useState(false)
  const [discoveredInstances, setDiscoveredInstances] = useState<DiscoveredInstance[]>([])
  const [autoGatewayToken, setAutoGatewayToken] = useState<string>('')
  const [showTokenDialog, setShowTokenDialog] = useState(false)
  const [selectedPortForToken, setSelectedPortForToken] = useState<number | null>(null)
  const [showRemoteForm, setShowRemoteForm] = useState(false)
  const [remoteGatewayIP, setRemoteGatewayIP] = useState('192.168.')
  const [remoteGatewayPort, setRemoteGatewayPort] = useState(18789)
  const [pairingLoading, setPairingLoading] = useState(false)
  const [pairingRequest, setPairingRequest] = useState<{ pairing_id: string; request_id: string } | null>(null)
  const [pairingStatus, setPairingStatus] = useState<{
    status: 'pending' | 'approved' | 'timeout' | 'rejected' | null
    deviceToken?: string
    remainingTime?: number
  } | null>(null)
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)
  const [discovering, setDiscovering] = useState(false)
  const [discoveredGateways, setDiscoveredGateways] = useState<Array<{
    instance_name: string
    display_name: string
    lan_host: string
    ip_address: string
    gateway_port: number
  }>>([])

  const loadDepartments = useCallback(async () => {
    try {
      const token = getToken() || ''
      const list = await deptApi.listDepartments(token)
      setDepartments(list)
    } catch (error) {
      console.error('加载部门失败:', error)
    }
  }, [getToken])

  const loadConfigs = useCallback(async () => {
    try {
      const list = await configAPI.getConfigs()
      const configsData = Array.isArray(list) ? list : (list as { data?: Array<{}> })?.data
      setConfigs(configsData || [])
    } catch (error) {
      console.error('加载配置失败:', error)
      setConfigs([])
    }
  }, [])

  const loadSkills = useCallback(async () => {
    try {
      const list = await skillsAPI.getSkills()
      const skillsData = Array.isArray(list) ? list : (list as { data?: Array<{}> })?.data
      setSkills(skillsData || [
        { id: 'skill-file-ops', name: '文件操作', description: '文件读写功能', version: '1.0.0', installed: true, enabled: true },
        { id: 'skill-browser', name: '浏览器自动化', description: '浏览器控制', version: '1.1.0', installed: true, enabled: true },
        { id: 'skill-github', name: 'GitHub 集成', description: 'GitHub 操作', version: '0.9.0', installed: false, enabled: false },
      ])
    } catch (error) {
      console.error('加载 Skills 失败:', error)
      setSkills([
        { id: 'skill-file-ops', name: '文件操作', description: '文件读写功能', version: '1.0.0', installed: true, enabled: true },
        { id: 'skill-browser', name: '浏览器自动化', description: '浏览器控制', version: '1.1.0', installed: true, enabled: true },
        { id: 'skill-github', name: 'GitHub 集成', description: 'GitHub 操作', version: '0.9.0', installed: false, enabled: false },
      ])
    }
  }, [])

  const loadInstances = useCallback(async () => {
    console.log('[loadInstances] Called')
    try {
      const list = await instancesAPI.getInstances()
      const instancesData = Array.isArray(list) ? list : (list as { data?: Array<{}> })?.data
      console.log('[loadInstances] Loaded instances:', instancesData)
      setInstances(instancesData || [])
    } catch (error) {
      console.error('加载实例失败:', error)
      setInstances([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleScan = useCallback(async () => {
    setScanning(true)
    try {
      console.log('开始扫描...')
      const response = await instancesAPI.scanLocalInstances()
      console.log('扫描完成，响应:', response)
      
      // 从响应中提取 data 数组
      const instances = response.data || []
      console.log('扫描到的实例:', instances)
      
      if (instances.length > 0) {
        // 优先使用 token 字段（后端返回），其次兼容 admin_token
        const autoToken = instances[0].token || instances[0].admin_token
        if (autoToken) {
          setAutoGatewayToken(autoToken)
          console.log('自动读取到 Gateway Token，将在添加时使用')
        } else {
          setAutoGatewayToken('')
          console.log('未从配置文件读取到 Gateway Token，将提示用户输入')
        }
      }
      
      setDiscoveredInstances(instances as DiscoveredInstance[])
    } catch (error) {
      console.error('扫描失败 Details:', error)
      const errorMsg = error instanceof Error ? error.message : String(error)
      alert('扫描失败: ' + errorMsg)
    } finally {
      setScanning(false)
    }
  }, [])

  // 扫描局域网内的 Gateway（Bonjour/mDNS）
  const handleDiscoverGateways = useCallback(async () => {
    setDiscovering(true)
    try {
      console.log('正在扫描局域网 Gateway...')
      const response = await instancesAPI.discoverGateways()
      
      console.log('发现 Gateway 响应:', response)
      
      if (response.success) {
        const gateways = response.data || []
        setDiscoveredGateways(gateways)
        toast.success(`发现 ${gateways.length} 个 Gateway`)
      } else {
        throw new Error(response.error?.message || '扫描失败')
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      toast.error('扫描失败: ' + errorMsg)
    } finally {
      setDiscovering(false)
    }
  }, [])

  const handleAddRemoteGateway = useCallback(async () => {
    if (!remoteGatewayIP) {
      toast.error('请输入 Gateway IP 地址')
      return
    }
    
    setPairingLoading(true)
    try {
      console.log('发起远程 Gateway 配对:', remoteGatewayIP, remoteGatewayPort)
      const response = await instancesAPI.addRemoteInstance({
        gateway_ip: remoteGatewayIP,
        gateway_port: remoteGatewayPort,
      })
      
      console.log('配对响应:', response)
      
      if (response.success) {
        const data = response.data || {}
        setPairingRequest({
          pairing_id: data.pairing_id || '',
          request_id: data.request_id || '',
        })
        
        toast.success(`配对已发起！\n\n请求ID: ${data.request_id}\n请在 Gateway 主机运行：\nopenclaw devices approve ${data.request_id}\n\n等待批准...`)
      } else {
        throw new Error(response.error?.message || '配对失败')
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      toast.error(`❌ 配对失败: ${errorMsg}`)
    } finally {
      setPairingLoading(false)
    }
  }, [remoteGatewayIP, remoteGatewayPort])

  // 使用发现的 Gateway 发起配对
  const handlePairDiscoveredGateway = useCallback(async (gateway: {
    instance_name: string
    display_name: string
    lan_host: string
    ip_address: string
    gateway_port: number
  }) => {
    setRemoteGatewayIP(gateway.ip_address)
    setRemoteGatewayPort(gateway.gateway_port)
    setShowRemoteForm(true)
    setDiscovering(false)
    setDiscoveredGateways([])
    
    // 延迟一点执行，让UI先渲染
    setTimeout(() => {
      handleAddRemoteGateway()
    }, 300)
  }, [handleAddRemoteGateway])

  const cancelPairing = useCallback(() => {
    if (pollingInterval) {
      clearInterval(pollingInterval)
      setPollingInterval(null)
    }
    setPairingRequest(null)
    setPairingStatus(null)
    setShowRemoteForm(false)
    setRemoteGatewayIP('192.168.')
    setRemoteGatewayPort(18789)
  }, [pollingInterval])

  const checkPairingStatus = useCallback(async () => {
    if (!pairingRequest?.pairing_id) return
    
    try {
      console.log('检查配对状态:', pairingRequest.pairing_id)
      const response = await instancesAPI.getPairingStatus(pairingRequest.pairing_id)
      console.log('配对状态响应:', response)
      
      if (response.success && response.data) {
        const data = response.data
        setPairingStatus({
          status: data.status as 'pending' | 'approved' | 'timeout' | 'rejected' | null,
          deviceToken: data.device_token,
          remainingTime: data.expires_at ? Math.ceil((data.expires_at - Date.now() / 1000)) : 300,
        })
        
        // 如果配对成功，自动创建实例
        if (data.status === 'approved' && data.device_token) {
          console.log('配对成功，设备Token:', data.device_token)
          
          // 停止轮询
          if (pollingInterval) {
            clearInterval(pollingInterval)
            setPollingInterval(null)
          }
          
          // 自动创建实例
          await handleCreateInstanceFromPairing(data.device_token)
        }
        // 如果超时或被拒绝，停止轮询
        else if (data.status === 'timeout' || data.status === 'rejected') {
          if (pollingInterval) {
            clearInterval(pollingInterval)
            setPollingInterval(null)
          }
          toast.error(`配对 ${data.status === 'timeout' ? '超时' : '被拒绝'}`)
        }
      }
    } catch (error) {
      console.error('检查配对状态失败:', error)
    }
  }, [pairingRequest, pollingInterval])

  const handleCreateInstanceFromPairing = useCallback(async (deviceToken: string) => {
    if (!pairingRequest?.pairing_id) return
    
    try {
      // 创建实例
      const response = await instancesAPI.createInstance({
        name: `Remote Gateway (${remoteGatewayIP})`,
        host_ip: remoteGatewayIP,
        admin_port: remoteGatewayPort,
        admin_token: deviceToken,
        department_id: '',
        config_id: '',
        skill_ids: [],
        skip_test: false,
      })
      
      const instanceId = response.data as string
      
      toast.success(`✅ 远程Gateway实例添加成功！\n\n实例ID: ${instanceId}`)
      
      // 重置表单
      cancelPairing()
      loadInstances()
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      toast.error(`❌ 创建实例失败: ${errorMsg}`)
    }
  }, [pairingRequest, remoteGatewayIP, remoteGatewayPort, cancelPairing, loadInstances])

  // Status polling effect
  useEffect(() => {
    if (pairingRequest && !pollingInterval) {
      // 开始轮询，每2秒检查一次
      const interval = setInterval(checkPairingStatus, 2000)
      setPollingInterval(interval)
      
      toast.success(`配对已发起！\n\n请求ID: ${pairingRequest.request_id}\n请在 Gateway 主机运行：\nopenclaw devices approve ${pairingRequest.request_id}\n\n等待批准...（5分钟超时）`)
      
      // 5分钟（300秒）后自动超时
      const timeoutId = setTimeout(() => {
        console.log('配对超时')
        setPairingStatus(prev => ({
          ...prev,
          status: 'timeout',
          remainingTime: 0,
        }))
      }, 300000) // 5 minutes
      
      // 返回清理函数
      return () => {
        clearInterval(interval)
        clearTimeout(timeoutId)
        if (pollingInterval) {
          clearInterval(pollingInterval)
        }
      }
    }
  }, [pairingRequest, pollingInterval, checkPairingStatus])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
    }
  }, [pollingInterval])

  const handleAddLocalInstance = useCallback(async (port: number) => {
    // 直接使用自动读取的 token，不再弹出确认框
    let adminToken = autoGatewayToken
    
    if (!adminToken) {
      // 如果没有自动 token，才提示用户手动输入
      adminToken = prompt(`为端口 ${port} 输入管理 Token:`)
      if (!adminToken) return
    } else {
      console.log('使用自动读取的 Gateway Token')
    }
    
    try {
      console.log(`正在连接到 http://127.0.0.1:${port}...`)
      await instancesAPI.addLocalInstance({ port, admin_token: adminToken })
      loadInstances()
      toast.success(`✅ 实例添加成功！`)
      
      // 成功后保持 autoGatewayToken，方便下次添加
      // setAutoGatewayToken('')
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      let friendlyMsg = errorMsg
      if (errorMsg.includes("localhost:5173") || errorMsg.includes("8080")) {
        friendlyMsg = "无法连接到服务器,请确保后端服务正在运行"
      }
      toast.error(`❌ 添加失败: ${friendlyMsg}`)
    }
  }, [autoGatewayToken, loadInstances])

  useEffect(() => {
    console.log('[InstancesPage] useEffect running - loading data')
    loadInstances()
    loadDepartments()
    loadConfigs()
    loadSkills()
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    try {
      const req = {
        name: createForm.name,
        host_ip: createForm.host_ip,
        admin_port: createForm.admin_port,
        admin_token: createForm.admin_token,
        config_id: createForm.config_id || undefined,
        skill_ids: createForm.skill_ids || [],
        department_id: createForm.department_id || undefined,
        skip_test: createForm.skip_test || false,
      }
      
      const response = await instancesAPI.createInstance(req)
      const instanceId = response.data as string
      
      setCreateForm({ name: '', host_ip: '', admin_port: 18789, admin_token: '', department_id: '', config_id: '', skill_ids: [], skip_test: false })
      setShowCreateForm(false)
      loadInstances()
      
      if (createForm.skip_test) {
        alert(`✅ 实例创建成功！\n\n实例ID: ${instanceId}\n状态: offline（未测试）\n\n提示：实例创建后，你可以稍后通过健康检查功能来更新实例状态。`)
      } else {
        alert('✅ 实例创建成功！\n\n已自动连接到 OpenCLAW 设备并获取实例信息。')
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      alert('❌ 创建失败\n\n' + errorMsg + '\n\n请检查：\n1. 设备 IP 地址和端口是否正确\n2. OpenCLAW 是否正在运行\n3. 管理 Token 是否正确\n4. 网络是否通畅\n5. 防火墙是否开放端口')
    } finally {
      setCreating(false)
    }
  }

  async function openDeptDialog(instanceId: string) {
    setCurrentInstanceId(instanceId)
    try {
      const token = getToken() || ''
      const depts = await deptApi.getInstanceDepartments(token, instanceId)
      setInstanceDepartments(depts)
      setShowDeptDialog(true)
    } catch (error) {
      console.error('加载部门失败:', error)
      setInstanceDepartments([])
      setShowDeptDialog(true)
    }
  }

  async function bindDepartment(deptId: string) {
    if (!currentInstanceId) return
    try {
      const token = getToken() || ''
      await deptApi.bindInstanceToDepartment(token, {
        instance_id: currentInstanceId,
        department_id: deptId
      })
      await openDeptDialog(currentInstanceId)
      alert('✅ 部门绑定成功！')
    } catch (error) {
      alert('❌ 绑定失败：' + error)
    }
  }

  async function unbindDepartment(deptId: string) {
    if (!currentInstanceId) return
    try {
      const token = getToken() || ''
      await deptApi.unbindInstanceFromDepartment(token, currentInstanceId, deptId)
      await openDeptDialog(currentInstanceId)
      alert('✅ 部门解绑成功！')
    } catch (error) {
      alert('❌ 解绑失败：' + error)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('确定要删除这个实例吗？')) return
    try {
      const response = await api.delete<{ success: boolean }>(`/instances/${id}`)
      if (!response.success) {
        throw new Error(response.error?.message || '删除失败')
      }
      loadInstances()
    } catch (error) {
      alert('删除失败：' + error)
    }
  }

  async function handleBatchRestart() {
    if (selectedInstances.length === 0) {
      alert('请先选择实例')
      return
    }
    setBatchOperating(true)
    try {
      const results = await instancesAPI.batchOperation({
        instance_ids: selectedInstances,
        operation: 'restart',
      })
      
      // 检查响应格式
      let successCount = 0
      let resultsStr = ''
      
      if (Array.isArray(results)) {
        successCount = (results as string[]).filter(r => r.startsWith('✅')).length
        resultsStr = (results as string[]).join('\n')
      } else if (typeof results === 'object' && results !== null) {
        // 如果返回的是对象格式
        successCount = 1
        resultsStr = JSON.stringify(results, null, 2)
      } else {
        resultsStr = String(results)
        successCount = 1
      }
      
      alert(`批量重启完成\n✅ 成功：${successCount}\n❌ 失败：(results.length - successCount)\n\n详情：\n${resultsStr}`)
      loadInstances()
    } catch (error) {
      alert('批量操作失败：' + error)
    } finally {
      setBatchOperating(false)
    }
  }

  async function handleToggleEnable(id: string, currentEnabled: boolean) {
    try {
      const response = await api.put<{ success: boolean }>(`/instances/${id}`, {
        enabled: !currentEnabled,
      })
      if (!response.success) {
        throw new Error(response.error?.message || '操作失败')
      }
      loadInstances()
      alert(`实例已${!currentEnabled ? '启用' : '禁用'}`)
    } catch (error) {
      alert('操作失败：' + error)
    }
  }

  function toggleSelectInstance(id: string) {
    setSelectedInstances((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'running':
        return <StatusBadge status="success" />
      case 'offline':
        return <StatusBadge status="error" />
      case 'degraded':
        return <StatusBadge status="warning" />
      default:
        return <StatusBadge status="error" />
    }
  }

  if (loading) {
    return (
      <Card className="shadow-elegant">
        <CardContent className="p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载实例数据...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* 顶部标题区域 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">实例管理</h1>
          <p className="text-muted-foreground mt-1">监控和管理所有OpenCLAW实例</p>
        </div>
        
        <div className="flex items-center gap-3">
          {selectedInstances.length > 0 && (
            <Button 
              variant="primary" 
              onClick={handleBatchRestart}
              disabled={batchOperating}
              className="shadow-elegant hover:shadow-glow transition-all"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {batchOperating ? '操作中...' : '批量重启 (' + selectedInstances.length + ')'}
            </Button>
          )}
          <Button 
            variant="warning" 
            onClick={handleScan}
            disabled={scanning}
            className="shadow-elegant hover:shadow-glow transition-all"
          >
            <Scan className="w-4 h-4 mr-2" />
            {scanning ? '扫描中...' : '扫描本地实例'}
          </Button>
          <Button 
            variant="success"
            onClick={handleDiscoverGateways}
            disabled={discovering}
            className="shadow-elegant hover:shadow-glow transition-all"
          >
            <Scan className="w-4 h-4 mr-2" />
            {discovering ? '扫描中...' : '发现局域网 Gateway'}
          </Button>
          <Button 
            variant="primary" 
            onClick={() => setShowRemoteForm(true)}
            className="shadow-elegant hover:shadow-glow transition-all"
          >
            <Plus className="w-4 h-4 mr-2" />
            添加远程Gateway
          </Button>
        </div>
      </div>

      {/* 远程Gateway添加表单区域 */}
      {showRemoteForm && (
        <Card className="shadow-elegant overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="w-5 h-5 text-blue-600" />
              添加远程 Gateway 实例
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={(e) => { e.preventDefault(); handleAddRemoteGateway(); }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Gateway IP 地址</label>
                  <Input
                    type="text"
                    value={remoteGatewayIP}
                    onChange={(e) => setRemoteGatewayIP(e.target.value)}
                    className="w-full"
                    placeholder="例如：192.168.1.100"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Gateway 端口</label>
                  <Input
                    type="number"
                    value={remoteGatewayPort}
                    onChange={(e) => setRemoteGatewayPort(parseInt(e.target.value) || 18789)}
                    className="w-full"
                    min={1}
                    max={65535}
                    required
                  />
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="text-sm font-medium text-blue-900 mb-2">配对流程说明</h3>
                <div className="text-sm text-blue-800 space-y-1">
                  <p>1. 点击"添加"后，系统将连接到 Gateway 并发起配对请求</p>
                  <p>2. 请在 Gateway 主机运行以下命令来批准配对：</p>
                  <code className="block p-2 bg-blue-100 rounded mt-1 font-mono text-xs">
                    openclaw devices approve &lt;request_id&gt;
                  </code>
                  <p>3. 配对成功后，系统将自动获取 Token 并添加实例</p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowRemoteForm(false)}
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={pairingLoading}
                >
                  {pairingLoading ? '配对中...' : '添加远程 Gateway'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 发现的 Gateway 列表显示区域 */}
      {discoveredGateways.length > 0 && !showRemoteForm && (
        <Card className="shadow-elegant overflow-hidden border-2 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scan className="w-5 h-5 text-green-600" />
              发现的 Gateway ({discoveredGateways.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {discoveredGateways.map((gateway, index) => (
                <div 
                  key={`${gateway.instance_name}-${index}`}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-green-500 text-white shadow-lg">
                      <Server className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-lg text-gray-900">{gateway.display_name}</h3>
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <span>IP: {gateway.ip_address}</span>
                        <span>端口: {gateway.gateway_port}</span>
                      </div>
                      {gateway.lan_host && (
                        <div className="text-xs text-gray-500 font-mono">
                          {gateway.lan_host}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    onClick={() => handlePairDiscoveredGateway(gateway)}
                    className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 shadow-lg shadow-blue-200"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    添加
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-center">
              <Button
                variant="ghost"
                onClick={() => {
                  setDiscoveredGateways([])
                  setDiscovering(false)
                }}
              >
                关闭列表
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 创建表单区域 */}
      {showCreateForm && (
        <Card className="shadow-elegant overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="w-5 h-5 text-blue-600" />
              创建新实例
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleCreate} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">实例名称</label>
                  <Input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    className="w-full"
                    placeholder="例如：主服务器实例"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">主机 IP</label>
                  <Input
                    type="text"
                    value={createForm.host_ip}
                    onChange={(e) => setCreateForm({ ...createForm, host_ip: e.target.value })}
                    className="w-full"
                    placeholder="例如：192.168.1.100"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">管理端口</label>
                  <Input
                    type="number"
                    value={createForm.admin_port}
                    onChange={(e) => setCreateForm({ ...createForm, admin_port: parseInt(e.target.value) || 18789 })}
                    className="w-full"
                    min={1}
                    max={65535}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">管理 Token</label>
                  <Input
                    type="password"
                    value={createForm.admin_token}
                    onChange={(e) => setCreateForm({ ...createForm, admin_token: e.target.value })}
                    className="w-full"
                    placeholder="输入 OpenCLAW 管理 Token"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">所属部门</label>
                  <Select
                    value={createForm.department_id}
                    onChange={(e) => setCreateForm({ ...createForm, department_id: e.target.value })}
                    className="w-full"
                  >
                    <option value="">不绑定部门</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">关联配置</label>
                  <Select
                    value={createForm.config_id}
                    onChange={(e) => setCreateForm({ ...createForm, config_id: e.target.value })}
                    className="w-full"
                  >
                    <option value="">不关联配置</option>
                    {configs.map((config) => (
                      <option key={config.id} value={config.id}>{config.name}</option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <label className="text-sm font-medium text-foreground">安装 Skills（可选）</label>
                <div className="border rounded-lg p-4 bg-muted/30">
                  {skills.filter(s => s.installed).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      暂无已安装的 Skills，请先在 Skills 管理页面安装
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {skills.filter(s => s.installed).map((skill) => (
                        <label key={skill.id} className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-lg transition-colors cursor-pointer">
                          <input
                            type="checkbox"
                            checked={createForm.skill_ids?.includes(skill.id)}
                            onChange={(e) => {
                              const current = createForm.skill_ids || []
                              if (e.target.checked) {
                                setCreateForm({ ...createForm, skill_ids: [...current, skill.id] })
                              } else {
                                setCreateForm({ ...createForm, skill_ids: current.filter(id => id !== skill.id) })
                              }
                            }}
                            className="rounded border-border text-primary focus:ring-primary"
                          />
                          <div>
                            <span className={'text-sm font-medium ' + (skill.enabled ? 'text-foreground' : 'text-muted-foreground')}>
                              {skill.name}
                            </span>
                            {!skill.enabled && <span className="text-xs text-warning-foreground ml-2">（已禁用）</span>}
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-3 p-4 bg-muted/30 rounded-lg border">
                <input
                  type="checkbox"
                  id="skip_test"
                  checked={createForm.skip_test || false}
                  onChange={(e) => setCreateForm({ ...createForm, skip_test: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="skip_test" className="text-sm text-foreground select-none">
                  <div className="font-medium">跳过连接测试</div>
                  <div className="text-xs text-muted-foreground">直接创建实例，稍后手动配置</div>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowCreateForm(false)}
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={creating}
                >
                  {creating ? '创建中...' : '创建实例'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 配对状态显示区域 */}
      {pairingRequest && (
        <Card className="shadow-elegant overflow-hidden animate-in fade-in slide-in-from-top-4">
          <CardHeader className="bg-blue-600 text-white">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5" />
                配对进行中
              </CardTitle>
              <Button
                variant="ghost"
                onClick={cancelPairing}
                className="text-white hover:text-white hover:bg-white/20"
                size="sm"
              >
                <MoreVertical className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              {/* 配对信息卡片 */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Server className="w-4 h-4" />
                      <span>远程 Gateway</span>
                    </div>
                    <div className="text-lg font-medium text-foreground">
                      {remoteGatewayIP}:{remoteGatewayPort}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="w-4 h-4" />
                      <span>请求ID</span>
                    </div>
                    <div className="text-lg font-mono text-foreground bg-white px-3 py-2 rounded-lg inline-block">
                      {pairingRequest.request_id}
                    </div>
                  </div>
                </div>
              </div>

              {/* 配对状态信息 */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white">
                    <RefreshCw className={`w-5 h-5 ${pairingStatus?.status === 'pending' ? 'animate-spin' : ''}`} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">配对状态</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {pairingStatus?.status === 'pending' && '⏳ 等待 Gateway 主机批准...'}
                      {pairingStatus?.status === 'approved' && '✅ 配对已批准，正在创建实例...'}
                      {pairingStatus?.status === 'timeout' && '⏰ 配对已超时'}
                      {pairingStatus?.status === 'rejected' && '❌ 配对已被拒绝'}
                    </p>
                  </div>
                  {pairingStatus?.remainingTime && (
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">
                        {pairingStatus.remainingTime}s
                      </div>
                      <div className="text-xs text-muted-foreground">倒计时</div>
                    </div>
                  )}
                </div>

                {/* 操作说明 */}
                {pairingStatus?.status === 'pending' && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-foreground flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-600" />
                      下一步操作
                    </h4>
                    <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-yellow-600 text-white text-xs font-bold mt-0.5">
                          1
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-foreground font-medium">在 Gateway 主机上运行批准命令</p>
                          <p className="text-xs text-muted-foreground mt-1">通过SSH或本地终端访问 Gateway 主机</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-yellow-600 text-white text-xs font-bold mt-0.5">
                          2
                        </div>
                        <div className="flex-1 bg-white rounded p-3 font-mono text-xs break-all">
                          openclaw devices approve {pairingRequest.request_id}
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-yellow-600 text-white text-xs font-bold mt-0.5">
                          3
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-foreground">系统将自动轮询配对状态</p>
                          <p className="text-xs text-muted-foreground mt-1">批准后将自动创建实例</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {pairingStatus?.status === 'approved' && (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200 flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <div>
                      <h4 className="font-medium text-green-900">配对批准！</h4>
                      <p className="text-sm text-green-700 mt-1">正在自动创建实例...</p>
                    </div>
                  </div>
                )}

                {(pairingStatus?.status === 'timeout' || pairingStatus?.status === 'rejected') && (
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200 flex items-center gap-3">
                    {pairingStatus.status === 'timeout' ? (
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                    ) : (
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                    )}
                    <div>
                      <h4 className="font-medium text-red-900">
                        {pairingStatus.status === 'timeout' ? '配对超时' : '配对被拒绝'}
                      </h4>
                      <p className="text-sm text-red-700 mt-1">请重新发起配对请求</p>
                    </div>
                  </div>
                )}
              </div>

              {/* 取消按钮 */}
              <div className="flex justify-end pt-4 border-t">
                {pairingStatus?.status !== 'approved' && (
                  <Button
                    variant="ghost"
                    onClick={cancelPairing}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    取消配对
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 扫描结果卡片 */}
      {discoveredInstances.length > 0 && (
        <Card className="shadow-elegant overflow-hidden">
          <CardHeader className="bg-blue-600 text-white">
            <CardTitle className="flex items-center gap-2">
              <Scan className="w-5 h-5" />
              扫描发现 {discoveredInstances.length} 个本地实例
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold text-foreground">端口</th>
                    <th className="px-6 py-4 text-left font-semibold text-foreground">端点</th>
                    <th className="px-6 py-4 text-left font-semibold text-foreground">Token状态</th>
                    <th className="px-6 py-4 text-left font-semibold text-foreground">状态</th>
                    <th className="px-6 py-4 text-right font-semibold text-foreground">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {discoveredInstances.map((inst, index) => (
                    <tr key={index} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm text-foreground">
                          {inst.manager_endpoint?.split(':').pop() || inst.port || '未知'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-foreground">{inst.manager_endpoint}</td>
                      <td className="px-6 py-4">
                        {inst.admin_token ? (
                          <Badge variant="success">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            自动读取
                          </Badge>
                        ) : (
                          <Badge variant="warning">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            需要输入
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={inst.gateway_online ? 'success' : 'error'} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddLocalInstance(inst.port)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          一键添加
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 text-right border-t">
              <Button
                variant="ghost"
                onClick={() => setDiscoveredInstances([])}
                className="text-muted-foreground hover:text-foreground"
              >
                收起结果
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 实例列表卡片 */}
      <Card className="shadow-elegant overflow-hidden">
        <CardHeader className="flex flex-row justify-between items-center bg-muted/30">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Server className="w-5 h-5 text-blue-600" />
            所有实例
          </CardTitle>
          <Button variant="outline" onClick={loadInstances} disabled={loading}>
            <RefreshCw className={'w-4 h-4 mr-2 ' + (loading ? 'animate-spin' : '')} />
            刷新
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-4 text-left w-12">
                    <Checkbox
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedInstances(instances.map((i) => i.id))
                        } else {
                          setSelectedInstances([])
                        }
                      }}
                      checked={instances.length > 0 && selectedInstances.length === instances.length}
                    />
                  </th>
                  <th className="px-6 py-4 text-left font-semibold text-foreground">名称</th>
                  <th className="px-6 py-4 text-left font-semibold text-foreground">端点</th>
                  <th className="px-6 py-4 text-left font-semibold text-foreground">部门</th>
                  <th className="px-6 py-4 text-left font-semibold text-foreground">状态</th>
                  <th className="px-6 py-4 text-left font-semibold text-foreground">版本</th>
                  <th className="px-6 py-4 text-right font-semibold text-foreground">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {instances.map((instance) => (
                  <tr key={instance.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-6 py-4">
                      <Checkbox
                        checked={selectedInstances.includes(instance.id)}
                        onChange={() => toggleSelectInstance(instance.id)}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{instance.name}</span>
                        {instance.enabled === false && (
                          <span className="text-xs text-muted-foreground">已禁用</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-foreground">
                      <span className="font-mono text-sm">{instance.host_ip}:{instance.admin_port}</span>
                    </td>
                    <td className="px-6 py-4">
                      <Button
                        variant="ghost"
                        onClick={() => openDeptDialog(instance.id)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-0 h-auto"
                      >
                        {instance.departments && instance.departments.length > 0
                          ? instance.departments.map(d => d.name).join(', ')
                          : '未绑定'}
                      </Button>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(instance.status)}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-sm">
                      {instance.version || '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/instances/${instance.id}/gateway-config`)}
                          className="text-xs"
                        >
                          配置 Gateway
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleToggleEnable(instance.id, instance.enabled || false)}
                          className="text-xs"
                        >
                          {instance.enabled ? '禁用' : '启用'}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(instance.id)}
                          className="text-xs"
                        >
                          删除
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {instances.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <Server className="w-16 h-16 mb-4 opacity-20" />
                        <p className="text-lg font-medium">暂无实例</p>
                        <p className="text-sm mt-2">点击右上角按钮添加第一个实例</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* 统计信息 */}
          <div className="bg-muted/20 px-6 py-4 border-t">
            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">总计：</span>
                <span className="font-semibold text-foreground">{instances.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">运行中：</span>
                <span className="font-semibold text-emerald-600">{instances.filter(i => i.status === 'running').length}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">离线：</span>
                <span className="font-semibold text-red-600">{instances.filter(i => i.status === 'offline').length}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">已选：</span>
                <span className="font-semibold text-blue-600">{selectedInstances.length}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 部门管理对话框 */}
      {showDeptDialog && currentInstanceId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <Card className="shadow-2xl w-full max-w-md m-4 animate-in fade-in zoom-in duration-200">
            <CardHeader className="flex flex-row justify-between items-center bg-blue-600 text-white">
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5" />
                部门管理
              </CardTitle>
              <Button
                variant="ghost"
                onClick={() => setShowDeptDialog(false)}
                className="text-white hover:text-white hover:bg-white/20"
              >
                <MoreVertical className="w-5 h-5" />
              </Button>
            </CardHeader>
            <CardContent className="p-6">
              <div className="mb-6">
                <div className="p-4 bg-blue-50 rounded-lg mb-4">
                  <p className="text-sm text-muted-foreground mb-1">说明</p>
                  <p className="text-sm text-foreground">为实例分配所属部门，用于数据隔离和成本统计</p>
                </div>
                
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">已绑定部门</h3>
                {instanceDepartments.length === 0 ? (
                  <div className="p-6 text-center border rounded-lg bg-muted/30">
                    <p className="text-muted-foreground">暂无绑定部门</p>
                  </div>
                ) : (
                  <div className="space-y-2 mb-6">
                    {instanceDepartments.map(dept => (
                      <div key={dept.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg border group hover:border-blue-200 transition-colors">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                          <span className="font-medium text-foreground">{dept.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          onClick={() => unbindDepartment(dept.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mb-6">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">绑定新部门</h3>
                <select
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all bg-background"
                  onChange={(e) => {
                    if (e.target.value) {
                      bindDepartment(e.target.value)
                      e.target.value = ''
                    }
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>选择部门...</option>
                  {departments
                    .filter(d => !instanceDepartments.find(id => id.id === d.id))
                    .map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))
                  }
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="ghost"
                  onClick={() => setShowDeptDialog(false)}
                >
                  关闭
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
