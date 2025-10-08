import { ReactNode } from 'react'
import { Card, Text, Metric, ProgressBar, Flex, Badge } from '@tremor/react'
import { ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

interface QuotaCardProps {
  title: string
  current: number
  total: number
  unit: string
  expiryDate?: string
  icon?: ReactNode
  color?: 'blue' | 'emerald' | 'red' | 'yellow' | 'purple' | 'olive'
  className?: string
}

export default function QuotaCard({ 
  title, 
  current, 
  total, 
  unit, 
  expiryDate, 
  icon, 
  color = 'blue',
  className = '' 
}: QuotaCardProps) {
  const percentage = (current / total) * 100
  const isLow = percentage < 20
  const isWarning = percentage < 50 && percentage >= 20
  const isGood = percentage >= 50

  const getStatusColor = () => {
    if (isLow) return 'red'
    if (isWarning) return 'yellow'
    return 'emerald'
  }

  const getStatusIcon = () => {
    if (isLow || isWarning) {
      return <ExclamationTriangleIcon className="h-4 w-4" />
    }
    return <CheckCircleIcon className="h-4 w-4" />
  }

  const getStatusText = () => {
    if (isLow) return '부족'
    if (isWarning) return '주의'
    return '양호'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric'
    })
  }

  const getIconColor = () => {
    switch (color) {
      case 'blue': return 'text-blue-500'
      case 'emerald': return 'text-emerald-500'
      case 'olive': return 'text-ms-olive'
      case 'red': return 'text-red-500'
      case 'yellow': return 'text-yellow-500'
      case 'purple': return 'text-purple-500'
      default: return 'text-gray-500'
    }
  }

  return (
    <Card className={`ms-card bg-ms-white ${className}`}>
      <Flex alignItems="start" justifyContent="between" className="mb-4">
        <div className="flex-1">
          <Text className="text-ms-secondary mb-1">{title}</Text>
          <div className="flex items-center space-x-2 mb-2">
            <Metric className="text-ms-primary">
              {current.toLocaleString()}
            </Metric>
            <Text className="text-ms-text-muted">/ {total.toLocaleString()} {unit}</Text>
          </div>
        </div>
        {icon && (
          <div className={`ml-4 p-2 rounded-md border border-ms-line bg-ms-soft ${getIconColor()}`}>
            {icon}
          </div>
        )}
      </Flex>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <Text className="text-ms-secondary text-sm">사용률</Text>
          <div className="flex items-center space-x-2">
            <Text className="text-ms-primary font-medium text-sm">
              {percentage.toFixed(1)}%
            </Text>
            <Badge color={getStatusColor()} size="xs" className="flex items-center">
              {getStatusIcon()}
              <span className="ml-1">{getStatusText()}</span>
            </Badge>
          </div>
        </div>
        <ProgressBar 
          value={percentage} 
          color={getStatusColor()}
          className="h-2"
        />
      </div>

      {/* Expiry Date */}
      {expiryDate && (
        <div className="flex items-center justify-between text-sm">
          <Text className="text-ms-secondary">갱신일</Text>
          <Text className="text-ms-primary font-medium">
            {formatDate(expiryDate)}
          </Text>
        </div>
      )}

      {/* Warning Messages */}
      {isLow && (
        <div className="mt-3 p-2 border-l-4 border-red-400 bg-ms-white rounded">
          <Text className="text-ms-text text-sm">
            {unit}이 부족합니다. 추가 충전을 고려해보세요.
          </Text>
        </div>
      )}
      
      {isWarning && (
        <div className="mt-3 p-2 border-l-4 border-yellow-400 bg-ms-white rounded">
          <Text className="text-ms-text text-sm">
            {unit} 사용량을 확인하고 필요시 충전하세요.
          </Text>
        </div>
      )}
    </Card>
  )
}