import React from 'react'

interface PageContainerProps {
  title: string
  description?: string
  children: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export function PageContainer({ title, description, children, actions, className = '' }: PageContainerProps) {
  return (
    <div className={`p-6 ${className}`}>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">{title}</h1>
            {description && <p className="text-gray-600">{description}</p>}
          </div>
          {actions && <div className="flex items-center space-x-2">{actions}</div>}
        </div>
      </div>
      {children}
    </div>
  )
}

export function PageCard({ title, children, className = '' }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      {title && <h2 className="text-lg font-semibold mb-4">{title}</h2>}
      {children}
    </div>
  )
}

export default PageContainer
