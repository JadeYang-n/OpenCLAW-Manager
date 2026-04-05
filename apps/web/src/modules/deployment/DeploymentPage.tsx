import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Server, Terminal, Box, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { PageContainer } from '@/components/ui/PageContainer';

interface EnvCheckItem {
  name: string;
  required: boolean;
  installed: boolean;
  version?: string;
  description: string;
  download_url?: string;
  auto_fix?: string;
}

type DeploymentStep = 'mode' | 'check' | 'fix' | 'deploy' | 'result';

export default function DeploymentPage() {
  const [step, setStep] = useState<DeploymentStep>('mode');
  const [selectedMode, setSelectedMode] = useState<'windows' | 'wsl2' | 'docker' | null>(null);
  const [envItems, setEnvItems] = useState<EnvCheckItem[]>([]);
  const [checkStatus, setCheckStatus] = useState<'idle' | 'checking' | 'ready' | 'missing' | 'error'>('idle');
  const [fixingItems, setFixingItems] = useState<Set<string>>(new Set());

  // 模拟环境检查
  const checkEnvironment = async () => {
    if (!selectedMode) return;

    setCheckStatus('checking');

    // TODO: 调用后端 /deploy/check API
    // const res = await deployAPI.checkEnvironment(selectedMode);
    // setEnvItems(res.items || []);
    // if (res.success && res.items.every(i => i.installed)) {
    //   setCheckStatus('ready');
    // } else if (res.success && res.items.some(i => !i.installed && i.required)) {
    //   setCheckStatus('missing');
    // } else {
    //   setCheckStatus('error');
    // }

    // 模拟数据
    setTimeout(() => {
      const mockItems: EnvCheckItem[] = [
        { name: 'Node.js', required: true, installed: selectedMode !== 'docker', version: selectedMode === 'docker' ? undefined : '18.x', description: '运行时环境', download_url: 'https://nodejs.org', auto_fix: 'winget install -e -i OpenJS.NodeJS.LTS --silent' },
        { name: 'Git', required: true, installed: true, version: '2.40+', description: '版本控制', download_url: 'https://git-scm.com', auto_fix: 'winget install -e -i Git.Git --silent' },
        { name: 'pnpm', required: true, installed: true, version: '8.x+', description: '包管理器', download_url: 'https://pnpm.io', auto_fix: 'npm install -g pnpm' },
        { name: 'Docker Desktop', required: selectedMode === 'docker', installed: selectedMode === 'docker', version: selectedMode === 'docker' ? '4.x' : undefined, description: '容器运行时', download_url: 'https://www.docker.com/products/docker-desktop', auto_fix: 'winget install -e -i Docker.DockerDesktop --silent' },
      ];
      setEnvItems(mockItems);

      if (mockItems.every(i => i.installed)) {
        setCheckStatus('ready');
      } else if (mockItems.some(i => !i.installed && i.required)) {
        setCheckStatus('missing');
      } else {
        setCheckStatus('error');
      }
    }, 500);
  };

  const fixEnvironment = async (itemName: string): Promise<boolean> => {
    if (!selectedMode) return false;

    setFixingItems(prev => new Set(prev).add(itemName));

    // TODO: 调用后端 /deploy/fix API
    // const res = await deployAPI.fixEnvironment(selectedMode!, itemName);
    // return res.success;

    // 模拟修复
    return new Promise((resolve) => {
      setTimeout(() => {
        setEnvItems(prev => prev.map(item =>
          item.name === itemName ? { ...item, installed: true } : item
        ));
        setFixingItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(itemName);
          return newSet;
        });
        resolve(true);
      }, 1000);
    });
  };

  const deploy = async (): Promise<{ success: boolean; message: string; install_path?: string }> => {
    if (!selectedMode) {
      return { success: false, message: '未选择部署模式' };
    }

    // TODO: 调用后端 /deploy API
    // return await deployAPI.deploy(selectedMode, { install_path: config.install_path });

    // 模拟部署
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          message: selectedMode === 'docker'
            ? `OpenCLAW 已通过 Docker 成功部署，端口：9000`
            : `OpenCLAW 已成功部署在本地环境`,
          install_path: selectedMode === 'docker' ? 'openclaw-data' : undefined,
        });
      }, 2000);
    });
  };

  const handleRestart = () => {
    setStep('mode');
    setSelectedMode(null);
    setCheckStatus('idle');
  };

  // 模式选择组件
  const ModeSelection = () => {
    const modes = [
      { id: 'windows', name: '本地直接安装', icon: <Terminal className="w-12 h-12" />, description: '适用于 Windows 环境，直接安装所有依赖' },
      { id: 'wsl2', name: 'WSL2 部署', icon: <Server className="w-12 h-12" />, description: '适用于 Windows WSL2 环境，最佳性能表现' },
      { id: 'docker', name: 'Docker 部署', icon: <Box className="w-12 h-12" />, description: '容器化部署，环境一致，易于迁移' },
    ];

    return (
      <div className="grid gap-6 md:grid-cols-3">
        {modes.map((mode) => (
          <Card
            key={mode.id}
            className={`cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 ${
              selectedMode === mode.id
                ? 'border-primary bg-primary/5 shadow-primary/30'
                : 'border-border'
            }`}
            onClick={() => {
              setSelectedMode(mode.id as 'windows' | 'wsl2' | 'docker');
              setStep('check');
            }}
          >
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className={`p-4 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg transition-transform duration-300 ${
                  selectedMode === mode.id ? 'scale-110' : 'group-hover:scale-105'
                }`}>
                  {mode.icon}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-2">
                    {mode.name}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {mode.description}
                  </p>
                </div>
                {selectedMode === mode.id && (
                  <div className="w-full pt-4">
                    <Button size="sm" variant="primary" className="w-full">
                      选择此模式
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  // 环境检查组件
  const EnvironmentCheck = ({ onReady }: { onReady: () => void }) => {
    const getModeIcon = () => {
      switch (selectedMode) {
        case 'windows': return <Terminal className="w-6 h-6" />;
        case 'wsl2': return <Server className="w-6 h-6" />;
        case 'docker': return <Box className="w-6 h-6" />;
        default: return null;
      }
    };

    const getModeName = () => {
      switch (selectedMode) {
        case 'windows': return '本地环境';
        case 'wsl2': return 'WSL2 环境';
        case 'docker': return 'Docker 环境';
        default: return '';
      }
    };

    const getRequirements = () => {
      if (!selectedMode) return [];
      switch (selectedMode) {
        case 'windows':
        case 'wsl2':
          return [
            { name: 'Node.js', required: true, installed: envItems.find(i => i.name === 'Node.js')?.installed, version: envItems.find(i => i.name === 'Node.js')?.version, description: '运行时环境' },
            { name: 'Git', required: true, installed: envItems.find(i => i.name === 'Git')?.installed, version: envItems.find(i => i.name === 'Git')?.version, description: '版本控制' },
            { name: 'pnpm', required: true, installed: envItems.find(i => i.name === 'pnpm')?.installed, version: envItems.find(i => i.name === 'pnpm')?.version, description: '包管理器' },
          ];
        case 'docker':
          return [
            { name: 'Docker Desktop', required: true, installed: envItems.find(i => i.name === 'Docker Desktop')?.installed, version: envItems.find(i => i.name === 'Docker Desktop')?.version, description: '容器运行时' },
          ];
      }
    };

    return (
      <div className="space-y-6">
        <Card variant="premium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getModeIcon()}
              <span>环境检查 - {getModeName()}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {checkStatus === 'idle' || checkStatus === 'checking' ? (
              <div className="text-center py-12">
                {checkStatus === 'checking' ? (
                  <div className="space-y-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 animate-spin">
                      <Loader2 className="w-8 h-8 text-primary" />
                    </div>
                    <p className="text-muted-foreground">正在检查环境...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <p className="text-muted-foreground">点击按钮开始检查环境配置</p>
                    <Button onClick={checkEnvironment} className="shadow-lg">
                      开始检查
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/10">
                  <span className="font-medium">检查状态</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    checkStatus === 'ready'
                      ? 'bg-success text-success-foreground'
                      : 'bg-warning text-warning-foreground'
                  }`}>
                    {checkStatus === 'ready' ? '准备就绪' : checkStatus === 'missing' ? '缺少依赖' : '错误'}
                  </span>
                </div>

                <div className="space-y-3">
                  {getRequirements().map((item) => (
                    <div key={item.name} className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          item.installed
                            ? 'bg-success/10 text-success'
                            : 'bg-error/10 text-error'
                        }`}>
                          {item.installed ? (
                            <CheckCircle className="w-5 h-5" />
                          ) : (
                            <XCircle className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium text-foreground">{item.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {item.description} {item.version && <span className="text-primary">({item.version})</span>}
                          </p>
                        </div>
                      </div>
                      {!item.installed && item.required && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => fixEnvironment(item.name)}
                          disabled={fixingItems.has(item.name)}
                        >
                          {fixingItems.has(item.name) ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : null}
                          {fixingItems.has(item.name) ? '修复中...' : '修复缺失'}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {checkStatus === 'ready' && (
                  <div className="pt-4">
                    <Button onClick={onReady} variant="success" className="w-full shadow-lg shadow-success/20">
                      环境检查通过，开始部署
                    </Button>
                  </div>
                )}

                {checkStatus === 'missing' && (
                  <div className="pt-4">
                    <Button onClick={onReady} variant="warning" className="w-full shadow-lg shadow-warning/20">
                      部分依赖缺失，继续尝试
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // 步骤进度条
  const renderSteps = () => {
    const steps = [
      { id: 'mode', label: '选择模式', icon: <Terminal className="w-4 h-4" /> },
      { id: 'check', label: '环境检查', icon: <CheckCircle className="w-4 h-4" /> },
      { id: 'fix', label: '修复缺失', icon: <AlertCircle className="w-4 h-4" /> },
      { id: 'deploy', label: '执行部署', icon: <Server className="w-4 h-4" /> },
    ];

    const stepIndices = ['mode', 'check', 'fix', 'deploy', 'result'];
    const currentStepIndex = stepIndices.indexOf(step);

    return (
      <div className="relative mb-8">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-border -z-10" />
        <div className="flex justify-between relative">
          {steps.map((s, idx) => {
            const isCompleted = idx < currentStepIndex;
            const isActive = idx === currentStepIndex;
            const isFuture = idx > currentStepIndex;

            return (
              <div key={s.id} className="flex flex-col items-center gap-2 group">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isActive
                      ? 'bg-primary shadow-lg shadow-primary/30 ring-4 ring-primary/10'
                      : isCompleted
                      ? 'bg-success shadow-lg shadow-success/30'
                      : 'bg-border text-muted-foreground'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5 text-success-foreground" />
                  ) : isActive ? (
                    s.icon
                  ) : (
                    <span className="text-xs font-medium">{idx + 1}</span>
                  )}
                </div>
                <span
                  className={`text-xs font-medium transition-colors ${
                    isActive || isCompleted ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <PageContainer
      title="部署 OpenCLAW"
      description="指导您完成 OpenCLAW 的环境检查与部署流程"
    >
      <Card variant="premium" className="mt-6">
        <CardContent className="p-8">
          {renderSteps()}

          <div className="min-h-[400px]">
            {step === 'mode' && <ModeSelection />}

            {step === 'check' && selectedMode && (
              <EnvironmentCheck
                onReady={() => {
                  const missing = envItems.some(i => !i.installed && i.required);
                  setStep(missing ? 'fix' : 'deploy');
                }}
              />
            )}

            {step === 'fix' && selectedMode && (
              <EnvironmentCheck onReady={() => setStep('deploy')} />
            )}

            {step === 'deploy' && selectedMode && (
              <div className="space-y-6">
                <Card variant="premium">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Server className="w-5 h-5 text-primary" />
                      正在部署...
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-4 bg-primary/5 rounded-lg">
                        <span className="text-foreground font-medium">
                          部署模式：{selectedMode === 'windows' ? '本地环境' : selectedMode === 'wsl2' ? 'WSL2 环境' : 'Docker'}
                        </span>
                        <CheckCircle className="w-5 h-5 text-success" />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">部署进度</span>
                          <span className="text-primary font-medium">80%</span>
                        </div>
                        <Progress value={80} className="h-2" />
                      </div>

                      <div className="space-y-2">
                        {[
                          '检查环境配置...',
                          '安装依赖包...',
                          '配置服务...',
                          '启动服务...',
                          '验证部署...'
                        ].map((step, idx) => (
                          <div key={step} className="flex items-center gap-3 text-sm">
                            {idx < 4 ? (
                              <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                            ) : (
                              <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
                            )}
                            <span className="text-foreground">{step}</span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-4">
                        <Button disabled className="w-full">
                          正在部署...
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {step === 'result' && selectedMode && (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-success/10 mb-6">
                  <CheckCircle className="w-12 h-12 text-success" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  部署成功！
                </h2>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                  {selectedMode === 'docker'
                    ? 'OpenCLAW 已通过 Docker 成功部署，端口：9000'
                    : 'OpenCLAW 已成功部署在本地环境'}
                </p>
                <div className="flex justify-center gap-4">
                  <Button onClick={handleRestart} variant="outline">
                    重新部署
                  </Button>
                  <Button onClick={handleRestart} variant="primary">
                    返回首页
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
