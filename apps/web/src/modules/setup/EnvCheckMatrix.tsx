import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, Loader2, Download, ExternalLink } from 'lucide-react'
import { DeployMode } from './DeployModeSelector'

export interface EnvCheckItem {
  name: string
  required: boolean
  installed: boolean
  version?: string
  description: string
  downloadUrl?: string
  fixCommand?: string
}

export interface EnvCheckReport {
  mode: DeployMode['id']
  items: EnvCheckItem[]
  allPassed: boolean
  passedCount: number
  totalCount: number
}

interface EnvCheckMatrixProps {
  mode: DeployMode['id']
  report: EnvCheckReport | null
  isChecking: boolean
  onCheck: () => void
  onFix: (itemName: string) => void
  fixingItems: Set<string>
}

export function EnvCheckMatrix({ mode, report, isChecking, onCheck, onFix, fixingItems }: EnvCheckMatrixProps) {
  const getModeName = (mode: DeployMode['id']) => {
    switch (mode) {
      case 'windows': return 'Windows 原生'
      case 'wsl2': return 'WSL2'
      case 'docker': return 'Docker'
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">环境检测</h2>
        <p className="text-muted-foreground">
          检测 <span className="font-medium text-primary">{getModeName(mode)}</span> 部署所需的环境依赖
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">环境依赖清单</h3>
            <Button
              onClick={onCheck}
              disabled={isChecking}
              size="sm"
            >
              {isChecking ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  检测中...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  开始检测
                </>
              )}
            </Button>
          </div>
        </CardHeader>

        <CardBody>
          {report ? (
            <div className="space-y-4">
              {/* 检测概览 */}
              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                <div className="flex-1">
                  <div className="text-2xl font-bold">
                    {report.passedCount} / {report.totalCount}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    环境项已就绪
                  </div>
                </div>
                <Badge variant={report.allPassed ? 'success' : 'error'}>
                  {report.allPassed ? '环境就绪' : '需要修复'}
                </Badge>
              </div>

              {/* 环境项列表 */}
              <div className="space-y-3">
                {report.items.map((item) => {
                  const isFixing = fixingItems.has(item.name)
                  
                  return (
                    <div
                      key={item.name}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        item.installed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          {item.installed ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600" />
                          )}
                          <span className="font-medium">{item.name}</span>
                          {item.required && (
                            <Badge variant="outline" className="text-xs">必需</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground pl-7">
                          {item.description}
                        </p>
                        {item.installed && item.version && (
                          <p className="text-xs text-green-600 pl-7">
                            已安装版本：{item.version}
                          </p>
                        )}
                      </div>

                      {!item.installed && (
                        <div className="flex items-center gap-2">
                          {item.fixCommand && (
                            <Button
                              size="sm"
                              onClick={() => onFix(item.name)}
                              disabled={isFixing}
                              variant="outline"
                            >
                              {isFixing ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  修复中...
                                </>
                              ) : (
                                <>
                                  <Download className="w-4 h-4 mr-2" />
                                  一键修复
                                </>
                              )}
                            </Button>
                          )}
                          {item.downloadUrl && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.open(item.downloadUrl, '_blank')}
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              官网下载
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>点击"开始检测"按钮检查环境依赖</p>
              <p className="text-sm mt-2">
                根据您选择的 {getModeName(mode)} 部署方式，将检测相应的环境要求
              </p>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
