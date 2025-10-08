import { ReactNode } from 'react'
import { Card, Text, Title } from '@tremor/react'
import { 
  MagnifyingGlassIcon, 
  DocumentTextIcon, 
  EyeIcon,
  BookmarkIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'

interface ActivityItem {
  id: string
  type: 'search' | 'report' | 'view' | 'bookmark'
  title: string
  description?: string
  timestamp: string
  metadata?: {
    patentId?: string
    searchQuery?: string
    reportType?: string
  }
}

interface ActivityFeedProps {
  activities: ActivityItem[]
  title?: string
  maxItems?: number
  showViewAll?: boolean
  onViewAll?: () => void
  className?: string
}

export default function ActivityFeed({ 
  activities, 
  title = "최근 활동", 
  maxItems = 5,
  showViewAll = false,
  onViewAll,
  className = '' 
}: ActivityFeedProps) {
  const getActivityIcon = (type: string): ReactNode => {
    // Minimal-solid: unify icon accent color to olive
    switch (type) {
      case 'search':
        return <MagnifyingGlassIcon className="h-5 w-5 text-ms-olive" />
      case 'report':
        return <DocumentTextIcon className="h-5 w-5 text-ms-olive" />
      case 'view':
        return <EyeIcon className="h-5 w-5 text-ms-olive" />
      case 'bookmark':
        return <BookmarkIcon className="h-5 w-5 text-ms-olive" />
      default:
        return <div className="h-5 w-5 bg-gray-400 rounded-full" />
    }
  }

  const getActivityTypeText = (type: string): string => {
    switch (type) {
      case 'search':
        return '검색'
      case 'report':
        return '리포트 생성'
      case 'view':
        return '특허 조회'
      case 'bookmark':
        return '북마크 추가'
      default:
        return '활동'
    }
  }

  const formatTimestamp = (timestamp: string): string => {
    const now = new Date()
    const activityTime = new Date(timestamp)
    const diffInMinutes = Math.floor((now.getTime() - activityTime.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return '방금 전'
    if (diffInMinutes < 60) return `${diffInMinutes}분 전`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}시간 전`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}일 전`
    
    return activityTime.toLocaleDateString('ko-KR')
  }

  const displayedActivities = activities.slice(0, maxItems)

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <Title className="text-gray-800">{title}</Title>
        {showViewAll && onViewAll && (
          <button 
            onClick={onViewAll}
            className="flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
          >
            전체 보기
            <ArrowRightIcon className="h-4 w-4 ml-1" />
          </button>
        )}
      </div>

      {displayedActivities.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">
            <DocumentTextIcon className="h-12 w-12 mx-auto" />
          </div>
          <Text className="text-gray-500">최근 활동이 없습니다</Text>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedActivities.map((activity, index) => (
            <div key={activity.id} className="flex items-start space-x-3 group">
              {/* Activity Icon */}
              <div className="flex-shrink-0 mt-1">
                {getActivityIcon(activity.type)}
              </div>

              {/* Activity Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Text className="text-gray-600 text-sm">
                      {getActivityTypeText(activity.type)}
                    </Text>
                    <span className="text-gray-300">•</span>
                    <Text className="text-gray-500 text-sm">
                      {formatTimestamp(activity.timestamp)}
                    </Text>
                  </div>
                </div>
                
                <Text className="text-gray-800 font-medium mt-1 group-hover:text-ms-olive transition-colors cursor-pointer">
                  {activity.title}
                </Text>
                
                {activity.description && (
                  <Text className="text-gray-600 text-sm mt-1 line-clamp-2">
                    {activity.description}
                  </Text>
                )}

                {/* Metadata */}
                {activity.metadata && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {activity.metadata.searchQuery && (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs border border-gray-200 bg-white text-ms-olive">
                        검색어: {activity.metadata.searchQuery}
                      </span>
                    )}
                    {activity.metadata.reportType && (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs border border-gray-200 bg-white text-ms-olive">
                        {activity.metadata.reportType}
                      </span>
                    )}
                    {activity.metadata.patentId && (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs border border-gray-200 bg-white text-ms-olive">
                        특허 ID: {activity.metadata.patentId}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Connector Line */}
              {index < displayedActivities.length - 1 && (
                <div className="absolute left-[22px] mt-8 w-px h-6 bg-gray-200" />
              )}
            </div>
          ))}
        </div>
      )}

      {activities.length > maxItems && !showViewAll && (
        <div className="mt-4 text-center">
          <Text className="text-gray-500 text-sm">
            +{activities.length - maxItems}개의 추가 활동
          </Text>
        </div>
      )}
    </Card>
  )
}