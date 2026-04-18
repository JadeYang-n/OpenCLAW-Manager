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
import SkillSubmitPage from './modules/skills/SkillSubmitPage'
import SkillStorePage from './modules/skills/SkillStorePage'
import SkillReviewPage from './modules/skills/SkillReviewPage'
import SkillStatsPage from './modules/skills/SkillStatsPage'
import FeedbackManagementPage from './modules/skills/FeedbackManagementPage'
import SettingsPage from './modules/settings/SettingsPage'
import InstancesPage from './modules/instances/InstancesPage'
import GatewayConfigPage from './modules/instances/GatewayConfigPage'
import AuditLogsPage from './modules/audit/AuditLogsPage'
import DepartmentsPage from './modules/departments/DepartmentsPage'
import ExportPage from './modules/export/ExportPage'
import PortScannerPage from './modules/security/PortScannerPage'
import InstanceDiscoveryPage from './modules/security/InstanceDiscoveryPage'
import TokenBlacklistPage from './modules/security/TokenBlacklistPage'
import NotificationsPage from './modules/notifications/NotificationsPage'
import { Toaster } from './components/ui/toaster'

function App() {
  return (
    <>
      <Toaster />
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
        <Route path="instances/:id/gateway-config" element={<GatewayConfigPage />} />
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
        <Route path="security/ports" element={<PortScannerPage />} />
        <Route path="security/discovery" element={<InstanceDiscoveryPage />} />
        <Route path="security/tokens/blacklist" element={<TokenBlacklistPage />} />
        <Route path="skills" element={<SkillsPage />} />
        <Route path="skills/submit" element={<SkillSubmitPage />} />
        <Route path="skills/store" element={<SkillStorePage />} />
        <Route path="skills/review" element={<SkillReviewPage />} />
        <Route path="skills/stats" element={<SkillStatsPage />} />
        <Route path="skills/feedback" element={<FeedbackManagementPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="export" element={<ExportPage />} />
      </Route>

      {/* 404 页面 */}
      <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  )
}

export default App
