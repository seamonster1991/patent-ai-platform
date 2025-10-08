import { ReactNode } from 'react'
import { Card, Text, Metric, Flex } from '@tremor/react'

interface KPICardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
  color?: 'blue' | 'emerald' | 'red' | 'yellow' | 'purple' | 'gray' | 'olive'
  className?: string
}

export default function KPICard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  trend, 
  color = 'blue',
  className = '' 
}: KPICardProps) {
  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return {
          icon: 'text-blue-500',
          trend: trend?.isPositive ? 'text-emerald-600' : 'text-red-600'
        }
      case 'emerald':
        return {
          icon: 'text-emerald-500',
          trend: trend?.isPositive ? 'text-emerald-600' : 'text-red-600'
        }
      case 'olive':
        return {
          icon: 'text-ms-olive',
          trend: trend?.isPositive ? 'text-ms-olive' : 'text-red-600'
        }
      case 'red':
        return {
          icon: 'text-red-500',
          trend: trend?.isPositive ? 'text-emerald-600' : 'text-red-600'
        }
      case 'yellow':
        return {
          icon: 'text-yellow-500',
          trend: trend?.isPositive ? 'text-emerald-600' : 'text-red-600'
        }
      case 'purple':
        return {
          icon: 'text-purple-500',
          trend: trend?.isPositive ? 'text-emerald-600' : 'text-red-600'
        }
      default:
        return {
          icon: 'text-gray-500',
          trend: trend?.isPositive ? 'text-emerald-600' : 'text-red-600'
        }
    }
  }

  const colorClasses = getColorClasses(color)

  return (
    <Card className={`ms-card bg-ms-white ${className}`}>
      <Flex alignItems="start" justifyContent="between">
        <div className="flex-1">
          <Text className="text-ms-secondary mb-1">{title}</Text>
          <Metric className="text-ms-primary mb-1">{value}</Metric>
          {subtitle && (
            <Text className="text-ms-text-muted text-sm">{subtitle}</Text>
          )}
          {trend && (
            <Text className={`text-sm mt-1 font-medium ${colorClasses.trend}`}>
              {trend.isPositive ? '↗' : '↘'} {Math.abs(trend.value)}% 전월 대비
            </Text>
          )}
        </div>
        {icon && (
          <div className={`ml-4 p-2 rounded-md border border-ms-line bg-ms-soft ${colorClasses.icon}`}>
            {icon}
          </div>
        )}
      </Flex>
    </Card>
  )
}