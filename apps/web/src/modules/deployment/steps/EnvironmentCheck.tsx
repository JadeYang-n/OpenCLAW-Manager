import React from 'react';

export interface EnvCheckItem {
  name: string;
  required: boolean;
  installed: boolean;
  version?: string;
  description: string;
  download_url?: string;
  auto_fix?: string;
}

export interface EnvironmentCheckProps {
  mode: 'windows' | 'wsl2' | 'docker';
  status: 'idle' | 'checking' | 'ready' | 'missing' | 'error';
  items: EnvCheckItem[];
  onCheck: () => void;
  onFix?: (item: string) => void;
  onReady?: () => void;
}

export const EnvironmentCheck: React.FC<EnvironmentCheckProps> = ({
  mode,
  status,
  items,
  onCheck,
  onFix,
  onReady,
}) => {
  const allInstalled = items.every((i) => i.installed);
  const hasMissing = items.some((i) => !i.installed && i.required);

  const handleFix = (itemName: string) => {
    if (onFix) {
      onFix(itemName);
    }
  };

  return (
    <div className="environment-check">
      <div className="header">
        <h2>环境检查</h2>
        {status === 'idle' && (
          <button onClick={onCheck}>开始检查</button>
        )}
        {status === 'checking' && <span className="loading">正在检查环境...</span>}
      </div>

      {status === 'idle' && (
        <p>请点击「开始检查」按钮，系统将检测当前环境是否满足部署要求。</p>
      )}

      {status === 'checking' && (
        <div className="loading-list">
          {items.map((item, idx) => (
            <div key={idx} className="check-item">
              <span>{item.name}</span>
              <span className="status checking">检查中...</span>
            </div>
          ))}
        </div>
      )}

      {status === 'ready' && (
        <div className="check-result ready">
          <div className="success-icon">✅</div>
          <h3>环境就绪</h3>
          <p>所有必需组件已安装，可以开始部署。</p>
          {onReady && <button onClick={onReady}>开始部署</button>}
        </div>
      )}

      {status === 'missing' && (
        <div className="check-result missing">
          <h3>环境不满足要求</h3>
          <p>以下必需组件未安装，请先修复：</p>
          <ul className="missing-list">
            {items.map((item) =>
              !item.installed && item.required ? (
                <li key={item.name}>
                  <span>{item.name}</span>
                  {item.auto_fix ? (
                    <button onClick={() => handleFix(item.name)}>
                      一键修复
                    </button>
                  ) : (
                    <a href={item.download_url} target="_blank" rel="noopener noreferrer">
                      下载安装
                    </a>
                  )}
                </li>
              ) : null
            )}
          </ul>
        </div>
      )}

      {status === 'error' && (
        <div className="check-result error">
          <div className="error-icon">⚠️</div>
          <h3>检查失败</h3>
          <p>环境检查过程中出现错误，请重试。</p>
          <button onClick={onCheck}>重试</button>
        </div>
      )}
    </div>
  );
};

export default EnvironmentCheck;
