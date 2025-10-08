import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Card, Text, Title, Grid } from '@tremor/react'
import { 
  MagnifyingGlassIcon,
  DocumentTextIcon,
  ChartBarIcon,
  CreditCardIcon,
  BookmarkIcon,
  Cog6ToothIcon,
  PlusIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'

interface QuickAction {
  id: string
  title: string
  description: string
  icon: ReactNode
  href: string
  color: 'blue' | 'emerald' | 'purple' | 'yellow' | 'red' | 'gray'
  badge?: string
  external?: boolean
}

interface QuickActionsProps {
  title?: string
  actions?: QuickAction[]
  className?: string
}

const defaultActions: QuickAction[] = [
  {
    id: 'search',
    title: '새 검색',
    description: '특허 검색 시작',
    icon: <MagnifyingGlassIcon className="h-6 w-6" />,
    href: '/search',
    color: 'blue'
  },
  {
    id: 'reports',
    title: '리포트 생성',
    description: '분석 리포트 작성',
    icon: <DocumentTextIcon className="h-6 w-6" />,
    href: '/reports/new',
    color: 'emerald'
  },
  {
    id: 'analytics',
    title: '활동 분석',
    description: '상세 사용 통계',
    icon: <ChartBarIcon className="h-6 w-6" />,
    href: '/dashboard/activity',
    color: 'purple'
  },
  {
    id: 'billing',
    title: '크레딧 충전',
    description: '결제 및 구독 관리',
    icon: <CreditCardIcon className="h-6 w-6" />,
    href: '/dashboard/billing',
    color: 'yellow'
  },
  {
    id: 'bookmarks',
    title: '북마크',
    description: '저장된 특허 보기',
    icon: <BookmarkIcon className="h-6 w-6" />,
    href: '/bookmarks',
    color: 'red'
  },
  {
    id: 'settings',
    title: '설정',
    description: '계정 및 환경설정',
    icon: <Cog6ToothIcon className="h-6 w-6" />,
    href: '/settings',
    color: 'gray'
  }
]

export default function QuickActions({ 
  title = "빠른 작업", 
  actions = defaultActions,
  className = '' 
}: QuickActionsProps) {
  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return {
          bg: 'bg-blue-50 hover:bg-blue-100',
          icon: 'text-blue-500',
          border: 'border-blue-200 hover:border-blue-300'
        }
      case 'emerald':
        return {
          bg: 'bg-emerald-50 hover:bg-emerald-100',
          icon: 'text-emerald-500',
          border: 'border-emerald-200 hover:border-emerald-300'
        }
      case 'purple':
        return {
          bg: 'bg-purple-50 hover:bg-purple-100',
          icon: 'text-purple-500',
          border: 'border-purple-200 hover:border-purple-300'
        }
      case 'yellow':
        return {
          bg: 'bg-yellow-50 hover:bg-yellow-100',
          icon: 'text-yellow-500',
          border: 'border-yellow-200 hover:border-yellow-300'
        }
      case 'red':
        return {
          bg: 'bg-red-50 hover:bg-red-100',
          icon: 'text-red-500',
          border: 'border-red-200 hover:border-red-300'
        }
      default:
        return {
          bg: 'bg-gray-50 hover:bg-gray-100',
          icon: 'text-gray-500',
          border: 'border-gray-200 hover:border-gray-300'
        }
    }
  }

  const ActionButton = ({ action }: { action: QuickAction }) => {
    const colorClasses = getColorClasses(action.color)
    
    const buttonContent = (
      <div className={`
        relative p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer group
        ${colorClasses.bg} ${colorClasses.border}
      `}>
        {action.badge && (
          <div className="absolute -top-2 -right-2">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
              {action.badge}
            </span>
          </div>
        )}
        
        <div className="flex items-center justify-between mb-3">
          <div className={`${colorClasses.icon} group-hover:scale-110 transition-transform duration-200`}>
            {action.icon}
          </div>
          <ArrowRightIcon className="h-4 w-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all duration-200" />
        </div>
        
        <div>
          <Text className="text-gray-800 font-medium mb-1 group-hover:text-gray-900">
            {action.title}
          </Text>
          <Text className="text-gray-600 text-sm">
            {action.description}
          </Text>
        </div>
      </div>
    )

    if (action.external) {
      return (
        <a 
          href={action.href} 
          target="_blank" 
          rel="noopener noreferrer"
          className="block"
        >
          {buttonContent}
        </a>
      )
    }

    return (
      <Link to={action.href} className="block">
        {buttonContent}
      </Link>
    )
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <Title className="text-gray-800">{title}</Title>
        <PlusIcon className="h-5 w-5 text-gray-400" />
      </div>

      <Grid numItems={1} numItemsSm={2} numItemsLg={3} className="gap-4">
        {actions.map((action) => (
          <ActionButton key={action.id} action={action} />
        ))}
      </Grid>

      {/* Additional Actions Hint */}
      <div className="mt-6 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <Text className="text-gray-600 text-sm text-center">
          💡 <strong>팁:</strong> 키보드 단축키를 사용하여 더 빠르게 작업하세요. 
          <span className="text-blue-600 ml-1">Ctrl+K</span>로 검색, 
          <span className="text-emerald-600 ml-1">Ctrl+R</span>로 리포트 생성
        </Text>
      </div>
    </Card>
  )
}