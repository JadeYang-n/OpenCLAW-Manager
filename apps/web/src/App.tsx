import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './modules/auth/LoginPage'
import UsersPage from './modules/users/UsersPage'
import TokenAnalysisPage from './modules/token/TokenAnalysisPage'
import MyUsagePage from './modules/employee/MyUsagePage'
import DashboardPage from './modules/dashboard/DashboardPage'
import SetupPage from './modules/setup/SetupPage'
import InstallWizard from './modules/setup/InstallWizard'
import InstallProgress from './modules/setup/InstallProgress'
import ConfigPage from './modules/config/ConfigPage'
import MonitorPage from './modules/monitor/MonitorPage'
import SecurityPage from './modules/security/SecurityPage'
import SkillsPage from './modules/skills/SkillsPage'
import SettingsPage from './modules/settings/SettingsPage'
import InstancesPage from './modules/instances/InstancesPage'
import AuditLogsPage from './modules/audit/AuditLogsPage'
import DepartmentsPage from './modules/departments/DepartmentsPage'

function App() {
  return (
    <Routes>
      {/* 登录页面（无需权限） */}
      <Route path="/login" element={<LoginPage />} />

      {/* 受保护的路由 - 使用 Layout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/instances" replace />} />
        <Route path="instances" element={<InstancesPage />} />
        <Route path="departments" element={<DepartmentsPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="token" element={<TokenAnalysisPage />} />
        <Route path="my-usage" element={<MyUsagePage />} />
        <Route path="audit" element={<AuditLogsPage />} />
        <Route path="users" element={
          <ProtectedRoute requiredRoles={['admin']}>
            <UsersPage />
          </ProtectedRoute>
        } />
        <Route path="setup" element={<SetupPage />} />
        <Route path="setup/wizard" element={<InstallWizard />} />
        <Route path="setup/install" element={<InstallProgress />} />
        <Route path="config" element={<ConfigPage />} />
        <Route path="monitor" element={<MonitorPage />} />
        <Route path="security" element={<SecurityPage />} />
        <Route path="skills" element={<SkillsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* 404 页面 */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
