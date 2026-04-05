import { create } from 'zustand'

interface ConfigData {
  [key: string]: unknown;
}

interface ConfigStore {
  configs: { name: string; isCurrent: boolean; data: ConfigData }[]
  selectedConfig: string | null
  addConfig: (config: ConfigData) => void
  updateConfig: (name: string, config: ConfigData) => void
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
  addConfig: (config: ConfigData) => set((state) => ({
    configs: [...state.configs, { name: '新配置', isCurrent: false, data: config }]
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