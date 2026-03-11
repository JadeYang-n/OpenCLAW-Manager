import React from 'react';

type Mode = 'windows' | 'wsl2' | 'docker';

interface ModeSelectionProps {
  selectedMode: Mode | null;
  onSelect: (mode: Mode) => void;
}

export const ModeSelection: React.FC<ModeSelectionProps> = ({ selectedMode, onSelect }) => {
  const modes: { id: Mode; title: string; desc: string; icon: string }[] = [
    { id: 'windows', title: 'Windows 原生部署', desc: '直接在 Windows 上安装 Node.js、Git、pnpm 并运行', icon: '🪟' },
    { id: 'wsl2', title: 'WSL2 部署', desc: '在 WSL2 的 Ubuntu 中部署，隔离环境更干净', icon: '🐧' },
    { id: 'docker', title: 'Docker 部署', desc: '使用 Docker 容器运行，一键启动，免安装', icon: '🐳' },
  ];

  return (
    <div className="mode-selection">
      <h2>选择部署方式</h2>
      <p>请选择您希望的部署方式，我们将为您检查环境并引导完成部署流程。</p>

      <div className="mode-cards">
        {modes.map((m) => (
          <div
            key={m.id}
            className={`mode-card ${selectedMode === m.id ? 'selected' : ''}`}
            onClick={() => onSelect(m.id)}
          >
            <div className="mode-icon">{m.icon}</div>
            <h3>{m.title}</h3>
            <p>{m.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ModeSelection;
