import React, { useState, useEffect } from 'react';

export interface DeployResult {
  success: boolean;
  message: string;
  install_path?: string;
}

export interface DeploymentFinalProps {
  mode: 'windows' | 'wsl2' | 'docker';
  onDeploy: () => Promise<DeployResult>;
  onBack?: () => void;
  onRestart?: () => void;
}

export const DeploymentFinal: React.FC<DeploymentFinalProps> = ({
  mode,
  onDeploy,
  onBack,
  onRestart,
}) => {
  const [status, setStatus] = useState<'idle' | 'deploying' | 'success' | 'error'>('idle');
  const [log, setLog] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<DeployResult | null>(null);

  const deploy = async () => {
    setStatus('deploying');
    setLog([]);
    setProgress(0);

    try {
      const res = await onDeploy();

      if (res.success) {
        setStatus('success');
        setResult(res);
        setLog((prev) => [...prev, `✅ 部署成功: ${res.message}`]);
        setProgress(100);
      } else {
        setStatus('error');
        setResult(res);
        setLog((prev) => [...prev, `❌ 部署失败: ${res.message}`]);
      }
    } catch (err) {
      setStatus('error');
      setResult({
        success: false,
        message: (err as Error).message,
      });
      setLog((prev) => [...prev, `❌ 异常: ${(err as Error).message}`]);
    }
  };

  useEffect(() => {
    if (status === 'deploying') {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return 90;
          return prev + 5;
        });
        setLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] 部署进行中...`]);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [status]);

  return (
    <div className="deployment-final">
      <h2>部署流程</h2>
      <p>当前模式: <strong>{mode === 'windows' ? 'Windows 原生' : mode === 'wsl2' ? 'WSL2' : 'Docker'}</strong></p>

      {status === 'idle' && (
        <div className="action-area">
          <p>即将开始部署，此操作可能需要几分钟时间。</p>
          <button onClick={deploy}>开始部署</button>
        </div>
      )}

      {status === 'deploying' && (
        <div className="deploying">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
            <span className="progress-text">{progress}%</span>
          </div>
          <div className="log-container">
            {log.map((line, idx) => (
              <div key={idx} className="log-line">
                {line}
              </div>
            ))}
          </div>
          <p>部署进行中...请勿关闭窗口。</p>
        </div>
      )}

      {status === 'success' && result && (
        <div className="success">
          <div className="success-icon">🎉</div>
          <h3>部署成功！</h3>
          <p>{result.message}</p>
          {result.install_path && (
            <p>安装路径: <code>{result.install_path}</code></p>
          )}
          <div className="actions">
            {onRestart && <button onClick={onRestart}>重启服务</button>}
            {onBack && <button onClick={onBack}>返回</button>}
          </div>
        </div>
      )}

      {status === 'error' && result && (
        <div className="error">
          <div className="error-icon">⚠️</div>
          <h3>部署失败</h3>
          <p>{result.message}</p>
          <div className="log-container">
            {log.slice(-5).map((line, idx) => (
              <div key={idx} className="log-line error">
                {line}
              </div>
            ))}
          </div>
          <button onClick={deploy}>重试</button>
        </div>
      )}
    </div>
  );
};

export default DeploymentFinal;
