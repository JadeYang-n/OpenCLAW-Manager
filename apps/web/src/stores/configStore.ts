import { create } from 'zustand'

interface ConfigStore {
  configs: any[]
  selectedConfig: string | null
  addConfig: (config: any) => void
  updateConfig: (name: string, config: any) => void
  deleteConfig: (name: string) => void
  selectConfig: (name: string) => void
}

export const useConfigStore = create<ConfigStore>((set) => ({
  configs: [
    {
      name: '默认配置',
      isCurrent: true,
      data: {}
    },
    {
      name: '开发环境',
      isCurrent: false,
      data: {}
    },
    {
      name: '生产环境',
      isCurrent: false,
      data: {}
    }
  ],
  selectedConfig: '默认配置',
  addConfig: (config) => set((state) => ({
    configs: [...state.configs, config]
  })),
  updateConfig: (name, config) => set((state) => ({
    configs: state.configs.map(c => c.name === name ? { ...c, data: config } : c)
  })),
  deleteConfig: (name) => set((state) => ({
    configs: state.configs.filter(c => c.name !== name)
  })),
  selectConfig: (name) => set({
    selectedConfig: name
  })
}))