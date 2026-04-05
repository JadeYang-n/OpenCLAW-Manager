import { useNavigate } from 'react-router-dom'
import { DeployModeSelector } from './DeployModeSelector'
import { Card, CardContent } from '@/components/ui/card'
import { PageContainer } from '@/components/ui/PageContainer'

const SetupPage: React.FC = () => {
  const navigate = useNavigate()

  const handleSelectMode = (mode: 'windows' | 'wsl2' | 'docker') => {
    navigate('/setup/deploy', { state: { mode } })
  }

  return (
    <PageContainer
      title="选择部署方式"
      description="请选择适合您的部署模式"
    >
      <Card variant="premium" className="mt-6">
        <CardContent className="p-6">
          <DeployModeSelector onSelectMode={handleSelectMode} />
        </CardContent>
      </Card>
    </PageContainer>
  )
}

export default SetupPage
