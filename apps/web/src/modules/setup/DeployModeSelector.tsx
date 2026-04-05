import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Server, Terminal, Box } from 'lucide-react'

export interface DeployMode {
  id: 'windows' | 'wsl2' | 'docker'
  name: string
  description: string
  icon: React.ReactNode
  accentColor: string
}

const deployModes: DeployMode[] = [
  {
    id: 'windows',
    name: '本地直接安装',
    description: '适用于 Windows 环境，直接安装所有依赖',
    icon: <Terminal className="w-8 h-8" />,
    accentColor: 'border-blue-600 shadow-blue-600/25'
  },
  {
    id: 'wsl2',
    name: 'WSL2 部署',
    description: '适用于 Windows WSL2 环境，最佳性能表现',
    icon: <Server className="w-8 h-8" />,
    accentColor: 'border-green-600 shadow-green-600/25'
  },
  {
    id: 'docker',
    name: 'Docker 部署',
    description: '容器化部署，环境一致，易于迁移',
    icon: <Box className="w-8 h-8" />,
    accentColor: 'border-cyan-600 shadow-cyan-600/25'
  }
]

interface DeployModeSelectorProps {
  onSelectMode: (mode: 'windows' | 'wsl2' | 'docker') => void
}

export function DeployModeSelector({ onSelectMode }: DeployModeSelectorProps) {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {deployModes.map((mode) => (
        <Card
          key={mode.id}
          className={`cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-primary/15 border-2 hover:border-primary group relative overflow-hidden`}
          onClick={() => onSelectMode(mode.id)}
        >
          {/* Hover overlay effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          
          <CardContent className="p-6 relative z-10">
            <div className="flex items-start gap-4">
              <div className={`flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg transition-transform duration-300 group-hover:scale-110 flex items-center justify-center`}>
                {mode.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-bold text-foreground truncate">
                    {mode.name}
                  </h3>
                  <div className="flex-shrink-0">
                    <div className={`w-2 h-2 rounded-full ${mode.id === 'windows' ? 'bg-blue-500' : mode.id === 'wsl2' ? 'bg-green-500' : 'bg-cyan-500'}`} />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                  {mode.description}
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                点击选择
              </span>
              <Button size="sm" variant="outline" className="h-8 text-xs">
                选择 {mode.id === 'windows' ? '本地' : mode.id === 'wsl2' ? 'WSL2' : 'Docker'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default DeployModeSelector
