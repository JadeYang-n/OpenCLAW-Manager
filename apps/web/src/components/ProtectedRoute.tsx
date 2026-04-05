import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useLanguageStore } from '../stores/languageStore'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRoles?: string[]
}

export default function ProtectedRoute({ 
  children, 
  requiredRoles 
}: ProtectedRouteProps) {
  const { isAuthenticated, hasPermission } = useAuthStore()
  const { t } = useLanguageStore()

  // 未登录，跳转到登录页
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // 需要特定角色权限
  if (requiredRoles && !hasPermission(requiredRoles)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            {t('error.permissionDenied')}
          </h1>
          <p className="text-gray-600">
            {t('error.permissionMessage')}
          </p>
          <button
            onClick={() => window.history.back()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {t('error.back')}
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
