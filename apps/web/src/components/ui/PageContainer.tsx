// 页面容器
export const PageContainer: React.FC<React.PropsWithChildren<{ title?: string; description?: string; className?: string }>> = ({ 
  children, 
  title,
  description,
  className = ''
}) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* 页面标题区域 */}
      {title && (
        <div className="mb-6 animate-fade-in">
          <h1 className="text-3xl font-bold text-foreground mb-2">{title}</h1>
          {description && (
            <p className="text-muted-foreground max-w-2xl">{description}</p>
          )}
        </div>
      )}

      {/* 页面内容 */}
      {children}
    </div>
  )
}

// 页面卡片组件
export const PageCard: React.FC<React.PropsWithChildren<{ title?: string; subtitle?: string; className?: string; action?: React.ReactNode }>> = ({ 
  children, 
  title,
  subtitle,
  className = '',
  action
}) => {
  return (
    <div className={`rounded-xl border bg-card text-card-foreground shadow-elegant transition-all duration-300 hover:shadow-glow ${className}`}>
      {title && (
        <div className="flex items-center justify-between p-6 border-b border-border/50">
          <div>
            <h2 className="text-2xl font-semibold leading-none tracking-tight">{title}</h2>
            {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-6 pt-0">
        {children}
      </div>
    </div>
  )
}

// 信息卡片
export const InfoCard: React.FC<React.PropsWithChildren<{ title?: string; className?: string }>> = ({ 
  children, 
  title: _title,
  className = ''
}) => {
  return (
    <div className={`rounded-lg border bg-card text-card-foreground shadow-sm ${className}`}>
      <div className="p-6 pt-0">
        {children}
      </div>
    </div>
  )
}

// 统计卡片
export const StatCard = ({ 
  title, 
  value, 
  subtitle,
  icon,
  color = 'primary',
  className
}: { 
  title: string; 
  value: string | number; 
  subtitle?: string;
  icon?: React.ReactNode;
  color?: string;
  className?: string;
}) => {
  const colorClasses: Record<string, string> = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    error: 'bg-error/10 text-error',
  }

  const textColor: Record<string, string> = {
    primary: 'text-foreground',
    success: 'text-success',
    warning: 'text-warning',
    error: 'text-error',
  }

  return (
    <div className={`rounded-xl border bg-card text-card-foreground shadow-elegant transition-all duration-300 hover:shadow-glow ${className}`}>
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">{title}</p>
            <h3 className={`text-3xl font-bold mb-2 ${textColor[color]}`}>{value}</h3>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {icon && (
            <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
              {icon}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
