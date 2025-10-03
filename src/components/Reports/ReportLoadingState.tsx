import React from 'react'
import { Loader2, Brain } from 'lucide-react'
import Card, { CardContent } from '../UI/Card'

interface ReportLoadingStateProps {
  title: string
  description: string
  iconColor: string
  Icon: React.ComponentType<{ className?: string }>
}

export default function ReportLoadingState({ 
  title, 
  description, 
  iconColor, 
  Icon 
}: ReportLoadingStateProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 ${iconColor} rounded-lg`}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {title}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {description}
            </p>
          </div>
        </div>
      </div>

      <Card className="border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
        <CardContent className="flex flex-col items-center justify-center py-20">
          <div className="relative mb-6">
            {/* Animated background circle */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 opacity-20 animate-pulse"></div>
            
            {/* Loading icons */}
            <div className="relative flex items-center gap-4 p-4">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
              <div className="w-1 h-8 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
              <Brain className="w-10 h-10 text-purple-600 animate-pulse" />
            </div>
          </div>
          
          <div className="text-center space-y-3">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              AI가 리포트를 생성하고 있습니다
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-md leading-relaxed">
              특허 정보를 분석하여 전문적인 인사이트를 생성하고 있습니다. 
              잠시만 기다려주세요.
            </p>
            
            {/* Progress indicator */}
            <div className="mt-6 w-64 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full animate-pulse" 
                   style={{ width: '60%' }}></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}