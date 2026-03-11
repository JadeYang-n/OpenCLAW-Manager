// 一键部署模块 - Tauri 后端命令接口定义
// 用于前端 TypeScript 代码的类型提示

import type { DeployMode } from '@/modules/setup/DeployModeSelector'
import type { EnvCheckItem } from '@/modules/setup/EnvCheckMatrix'

/**
 * 环境检测报告
 */
export interface EnvCheckReport {
  mode: DeployMode['id']
  items: EnvCheckItem[]
  allPassed: boolean
  passedCount: number
  totalCount: number
}

/**
 * 部署配置
 */
export interface DeployConfig {
  mode: DeployMode['id']
  installPath: string
  port: number
  autoStart: boolean
  openclawConfig: {
    apiKey: string
    model: string
    maxTokens: number
  }
}

/**
 * 部署进度事件
 */
export interface DeployProgress {
  step: string
  progress: number
  message: string
}

/**
 * 后端命令：检查环境
 * 
 * @param mode 部署方式 ('windows' | 'wsl2' | 'docker')
 * @returns 环境检测报告
 */
export async function checkEnvironment(mode: DeployMode['id']): Promise<EnvCheckReport> {
  // 实际调用由 Tauri 生成
  return {} as EnvCheckReport
}

/**
 * 后端命令：修复环境
 * 
 * @param mode 部署方式
 * @param itemName 环境项名称
 * @returns 是否成功
 */
export async function fixEnvironment(
  mode: DeployMode['id'],
  itemName: string
): Promise<boolean> {
  return false
}

/**
 * 后端命令：部署 OpenCLAW
 * 
 * @param mode 部署方式
 * @param config 部署配置
 * @returns 部署结果
 */
export async function deployOpenclaw(
  mode: DeployMode['id'],
  config: DeployConfig
): Promise<{ success: boolean; message: string }> {
  return { success: false, message: '' }
}

/**
 * 后端命令：获取部署进度
 * 
 * @returns 部署进度
 */
export async function getDeployProgress(): Promise<DeployProgress> {
  return {} as DeployProgress
}

/**
 * 后端命令：取消部署
 * 
 * @returns 是否成功取消
 */
export async function cancelDeploy(): Promise<boolean> {
  return false
}
