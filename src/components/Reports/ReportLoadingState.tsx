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

      {/* Simple progress bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full animate-pulse" 
             style={{ width: '60%' }}></div>
      </div>
    </div>
  )
}