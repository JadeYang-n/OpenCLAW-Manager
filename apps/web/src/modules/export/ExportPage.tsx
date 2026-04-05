import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { toast } from 'react-hot-toast'
import { useAuthStore } from '../../stores/authStore'
import * as deptApi from '../departments/api'
import type { Department } from '../departments/types'

interface ExportReport {
  csv_content: string
  filename: string
}

export default function ExportPage() {
  const { getToken } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [departs, setDepartments] = useState<Department[]>([])
  const [selectedMonth, setSelectedMonth] = useState('')
  const [selectedDeptId, setSelectedDeptId] = useState('')
  const [exportType, setExportType] = useState<'cost' | 'department'>('cost')

  const loadDepartments = useCallback(async () => {
    try {
      const token = getToken() || ''
      const list = await deptApi.listDepartments(token)
      setDepartments(list)
    } catch (error) {
      console.error('加载部门失败:', error)
    }
  }, [getToken])

  useEffect(() => {
    loadDepartments()
    // 设置默认月份为当前月
    const currentMonth = new Date().toISOString().slice(0, 7)
    setSelectedMonth(currentMonth)
  }, [loadDepartments])

  const handleExportCost = useCallback(async () => {
    if (!selectedMonth) {
      toast('请选择月份');
      return;
    }

    setLoading(true)
    try {
      const token = getToken() || ''
      const result = await invoke<ExportReport>('export_cost_report', {
        token,
        month: selectedMonth
      })
      
      // 下载文件
      const blob = new Blob([result.csv_content], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', result.filename)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success('✅ 成本报表导出成功!')
    } catch (error) {
      toast.error('❌ 导出失败: ' + (error as string))
    } finally {
      setLoading(false)
    }
  }, [getToken, selectedMonth])

  const handleExportDepartment = useCallback(async () => {
    if (!selectedMonth) {
      toast('请选择月份');
      return;
    }
    if (!selectedDeptId) {
      toast('请选择部门');
      return;
    }

    setLoading(true)
    try {
      const token = getToken() || ''
      const result = await invoke<ExportReport>('export_department_cost_report', {
        token,
        month: selectedMonth,
        department_id: selectedDeptId
      })
      
      // 下载文件
      const blob = new Blob([result.csv_content], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', result.filename)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success('✅ 部门成本报表导出成功!')
    } catch (error) {
      toast.error('❌ 导出失败: ' + (error as string))
    } finally {
      setLoading(false)
    }
  }, [getToken, selectedMonth, selectedDeptId])

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">数据导出</h1>

      {/* 导出类型选择 */}
      <div className="mb-8 p-6 border rounded bg-white">
        <h2 className="text-xl font-semibold mb-4">选择导出类型</h2>
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setExportType('cost')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              exportType === 'cost'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            全局成本报表
          </button>
          <button
            onClick={() => setExportType('department')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              exportType === 'department'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            部门成本报表
          </button>
        </div>

        {/* 月份选择 */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            选择月份 <span className="text-red-500">*</span>
          </label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full max-w-xs px-4 py-2 border rounded-lg"
          />
          <p className="text-sm text-gray-500 mt-1">
            选择要导出的月份,例如: 2024-01
          </p>
        </div>

        {exportType === 'department' && (
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              选择部门 <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="w-full max-w-xs px-4 py-2 border rounded-lg"
            >
              <option value="">请选择部门...</option>
              {departs.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-500 mt-1">
              选择要导出成本数据的部门
            </p>
          </div>
        )}

        <div className="pt-4 border-t">
          <h3 className="text-lg font-medium mb-4">导出说明</h3>
          <div className="space-y-2 text-sm text-gray-600">
            {exportType === 'cost' ? (
              <>
                <p>📄 <strong>全局成本报表</strong> 包含:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>所有实例的成本统计</li>
                  <li>按模型分类的调用次数</li>
                  <li>总支出和各项费用明细</li>
                  <li>时间序列数据(每日/每小时)</li>
                </ul>
              </>
            ) : (
              <>
                <p>📄 <strong>部门成本报表</strong> 包含:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>指定部门的所有成本</li>
                  <li>部门内各实例的费用明细</li>
                  <li>按模型分类的费用占比</li>
                  <li>成本分析和摘要信息</li>
                </ul>
              </>
            )}
          </div>

          <div className="mt-6">
            <button
              onClick={exportType === 'cost' ? handleExportCost : handleExportDepartment}
              disabled={loading}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? '导出中...' : `✅ 导出 ${exportType === 'cost' ? '全局成本' : '部门成本'} 报表`}
            </button>
          </div>
        </div>
      </div>

      {/* 示例表格 */}
      <div className="p-6 border rounded bg-white">
        <h2 className="text-xl font-semibold mb-4">📊 导出的CSV格式示例</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">字段名</th>
                <th className="px-4 py-2 text-left">说明</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr>
                <td className="px-4 py-2 font-mono">timestamp</td>
                <td className="px-4 py-2">时间戳</td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-mono">instance_id</td>
                <td className="px-4 py-2">实例ID</td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-mono">instance_name</td>
                <td className="px-4 py-2">实例名称</td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-mono">model</td>
                <td className="px-4 py-2">模型名称</td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-mono">calls</td>
                <td className="px-4 py-2">调用次数</td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-mono">total_tokens</td>
                <td className="px-4 py-2">总token数量</td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-mono">total_cost</td>
                <td className="px-4 py-2">总费用(美元)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
