import { create } from 'zustand'
import { tokenAPI } from '../services/api'

interface TokenEntry {
  id: string
  timestamp: string
  model: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  cost: number
}

interface TokenStats {
  dailyTokens: number
  dailyCost: number
  monthlyTokens: number
  monthlyCost: number
  last7Days: {
    day: string
    tokens: number
    cost: number
  }[]
  modelDistribution: {
    name: string
    value: number
  }[]
}

interface MonitorStore {
  stats: TokenStats
  tokenHistory: TokenEntry[]
  budgetLimit: number
  refreshStats: () => Promise<void>
  setBudgetLimit: (limit: number) => void
}

export const useMonitorStore = create<MonitorStore>((set) => ({
  stats: {
    dailyTokens: 1245,
    dailyCost: 1.56,
    monthlyTokens: 23456,
    monthlyCost: 29.32,
    last7Days: [
      { day: '1日', tokens: 1200, cost: 1.5 },
      { day: '2日', tokens: 1800, cost: 2.2 },
      { day: '3日', tokens: 1500, cost: 1.8 },
      { day: '4日', tokens: 2100, cost: 2.6 },
      { day: '5日', tokens: 1900, cost: 2.3 },
      { day: '6日', tokens: 2300, cost: 2.9 },
      { day: '7日', tokens: 1700, cost: 2.1 }
    ],
    modelDistribution: [
      { name: 'gpt-4o', value: 45 },
      { name: 'claude-sonnet-4', value: 30 },
      { name: 'deepseek-chat', value: 15 },
      { name: 'qwen-max', value: 10 }
    ]
  },
  tokenHistory: [
    {
      id: '1',
      timestamp: '2026-03-05 10:30:00',
      model: 'gpt-4o',
      promptTokens: 120,
      completionTokens: 245,
      totalTokens: 365,
      cost: 0.006
    },
    {
      id: '2',
      timestamp: '2026-03-05 09:15:00',
      model: 'claude-sonnet-4',
      promptTokens: 85,
      completionTokens: 160,
      totalTokens: 245,
      cost: 0.003
    },
    {
      id: '3',
      timestamp: '2026-03-05 08:45:00',
      model: 'gpt-4o',
      promptTokens: 210,
      completionTokens: 320,
      totalTokens: 530,
      cost: 0.009
    }
  ],
  budgetLimit: 100,
  refreshStats: async () => {
    try {
      // 调用后端 API 获取统计数据
      const statsData = await tokenAPI.getStats()
      const stats = statsData as any
      set((state) => ({
        stats: {
          ...state.stats,
          dailyTokens: stats.today || state.stats.dailyTokens,
          dailyCost: stats.todayCost || state.stats.dailyCost,
          monthlyTokens: stats.monthly || state.stats.monthlyTokens,
          monthlyCost: stats.monthlyCost || state.stats.monthlyCost
        }
      }))
    } catch (error) {
      console.error('Failed to refresh stats:', error)
      // 失败时使用模拟数据
      set((state) => ({
        stats: {
          ...state.stats,
          dailyTokens: Math.floor(Math.random() * 1000) + 1000,
          dailyCost: parseFloat((Math.random() * 2 + 1).toFixed(2))
        }
      }))
    }
  },
  setBudgetLimit: (limit) => set({ budgetLimit: limit })
}))