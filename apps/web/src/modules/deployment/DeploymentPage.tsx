import React, { useState, useEffect } from 'react';
import ModeSelection from './steps/ModeSelection';
import EnvironmentCheck, { EnvCheckItem } from './steps/EnvironmentCheck';
import EnvironmentFix from './steps/EnvironmentFix';
import DeploymentFinal from './steps/DeploymentFinal';
import { deployAPI } from '../../services/api';

type DeploymentStep = 'mode' | 'check' | 'fix' | 'deploy' | 'result';

export default function DeploymentPage() {
  const [step, setStep] = useState<DeploymentStep>('mode');
  const [selectedMode, setSelectedMode] = useState<'windows' | 'wsl2' | 'docker' | null>(null);
  const [envItems, setEnvItems] = useState<EnvCheckItem[]>([]);
  const [checkStatus, setCheckStatus] = useState<'idle' | 'checking' | 'ready' | 'missing' | 'error'>('idle');

  // 模拟环境检查（实际应调用后端 API）
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
    // TODO: 调用后端 /deploy/fix API
    // const res = await deployAPI.fixEnvironment(selectedMode!, itemName);
    // return res.success;

    // 模拟修复
    return new Promise((resolve) => {
      setTimeout(() => {
        setEnvItems(prev => prev.map(item =>
          item.name === itemName ? { ...item, installed: true } : item
        ));
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

  return (
    <div className="deployment-page">
      <div className="page-header">
        <h1>部署 OpenCLAW</h1>
        <p>指导您完成 OpenCLAW 的环境检查与部署流程</p>
      </div>

      {/* Progress Stepper */}
      <div className="stepper">
        <div className={`step ${step === 'mode' ? 'active' : step === 'check' ? 'completed' : ''}`}>
          <span className="step-number">1</span>
          <span className="step-label">选择模式</span>
        </div>
        <div className="step-divider"></div>
        <div className={`step ${step === 'check' ? 'active' : step === 'fix' || step === 'deploy' || step === 'result' ? 'completed' : ''}`}>
          <span className="step-number">2</span>
          <span className="step-label">环境检查</span>
        </div>
        <div className="step-divider"></div>
        <div className={`step ${step === 'fix' ? 'active' : step === 'deploy' || step === 'result' ? 'completed' : ''}`}>
          <span className="step-number">3</span>
          <span className="step-label">修复缺失</span>
        </div>
        <div className="step-divider"></div>
        <div className={`step ${step === 'deploy' ? 'active' : step === 'result' ? 'completed' : ''}`}>
          <span className="step-number">4</span>
          <span className="step-label">执行部署</span>
        </div>
      </div>

      {/* Content Area */}
      <div className="content-area">
        {step === 'mode' && (
          <ModeSelection
            selectedMode={selectedMode}
            onSelect={(mode) => {
              setSelectedMode(mode);
              setStep('check');
            }}
          />
        )}

        {step === 'check' && selectedMode && (
          <EnvironmentCheck
            mode={selectedMode}
            status={checkStatus}
            items={envItems}
            onCheck={checkEnvironment}
            onFix={fixEnvironment}
            onReady={() => {
              const missing = envItems.some(i => !i.installed && i.required);
              setStep(missing ? 'fix' : 'deploy');
            }}
          />
        )}

        {step === 'fix' && selectedMode && (
          <EnvironmentFix
            mode={selectedMode}
            items={envItems}
            onFix={fixEnvironment}
            onFinish={(success) => {
              if (success) {
                setStep('deploy');
              }
            }}
          />
        )}

        {step === 'deploy' && selectedMode && (
          <DeploymentFinal
            mode={selectedMode}
            onDeploy={deploy}
            onRestart={handleRestart}
          />
        )}
      </div>
    </div>
  );
}
