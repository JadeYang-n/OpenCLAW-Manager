import React, { useState, useEffect, useRef } from 'react';

export interface EnvCheckItem {
  name: string;
  required: boolean;
  installed: boolean;
  version?: string;
  description: string;
  download_url?: string;
  auto_fix?: string;
}

export interface EnvironmentFixProps {
  mode: 'windows' | 'wsl2' | 'docker';
  items: EnvCheckItem[];
  onFix: (item: string) => Promise<boolean>;
  onFinish: (success: boolean) => void;
}

export const EnvironmentFix: React.FC<EnvironmentFixProps> = ({
  mode,
  items,
  onFix,
  onFinish,
}) => {
  const [fixingItems, setFixingItems] = useState<string[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  
  // 添加 AbortController 用于取消进行中的请求
  const abortControllerRef = useRef<AbortController | null>(null);

  const requiredItems = items.filter((i) => !i.installed && i.required);

  useEffect(() => {
    const fixLoop = async () => {
      // 如果已存在 cleanup 信号，直接返回
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }
      
      for (let i = 0; i < requiredItems.length; i++) {
        const item = requiredItems[i];
        
        // 检查是否已中止
        if (abortControllerRef.current?.signal.aborted) {
          onFinish(false);
          return;
        }
        
        setFixingItems((prev) => [...prev, item.name]);
        setLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] 开始修复: ${item.name}`]);

        try {
          const success = await onFix(item.name);
          if (success) {
            setLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ✅ 修复成功: ${item.name}`]);
            setProgress(((i + 1) / requiredItems.length) * 100);
          } else {
            setLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ❌ 修复失败: ${item.name}`]);
            onFinish(false);
            return;
          }
        } catch (err) {
          // 检查是否是中止错误
          if (err instanceof Error && err.name === 'AbortError') {
            return;
          }
          setLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ❌ 异常: ${(err as Error).message}`]);
          onFinish(false);
          return;
        }

        setFixingItems((prev) => prev.filter((name) => name !== item.name));
      }
      onFinish(true);
    };

    if (requiredItems.length > 0) {
      fixLoop();
    } else {
      onFinish(true);
    }
    
    // Cleanup 函数
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [mode, requiredItems, onFix, onFinish]);

  return (
    <div className="environment-fix">
      <h2>环境修复中</h2>
      <p>正在安装缺失的组件，请耐心等待...</p>

      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }}></div>
        <span className="progress-text">{progress.toFixed(0)}%</span>
      </div>

      <div className="log-container">
        {log.map((line, idx) => (
          <div key={idx} className="log-line">
            {line}
          </div>
        ))}
      </div>

      {fixingItems.length > 0 && (
        <div className="current-fixing">
          正在修复: {fixingItems.map((name, i) => (
            <span key={name} className="badge">
              {name}
              {i < fixingItems.length - 1 ? ', ' : ''}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default EnvironmentFix;
