import React, { useState, useEffect } from 'react'
import { Loader2, Brain, Clock, Zap, CheckCircle } from 'lucide-react'
import Card, { CardContent } from '../UI/Card'

interface ReportLoadingStateProps {
  title: string
  description: string
  iconColor: string
  Icon: React.ComponentType<{ className?: string }>
  estimatedTime?: number // 예상 소요 시간 (초)
}

const loadingSteps = [
  { id: 1, text: '특허 데이터 분석 중...', icon: Brain, duration: 15 },
  { id: 2, text: 'AI 모델 처리 중...', icon: Zap, duration: 45 },
  { id: 3, text: '시장 분석 생성 중...', icon: Loader2, duration: 60 },
  { id: 4, text: '리포트 구조화 중...', icon: CheckCircle, duration: 15 }
]

export default function ReportLoadingState({ 
  title, 
  description, 
  iconColor, 
  Icon,
  estimatedTime = 120 // 기본 2분
}: ReportLoadingStateProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(prev => {
        const newTime = prev + 1
        
        // 진행률 계산 (최대 95%까지만)
        const newProgress = Math.min((newTime / estimatedTime) * 95, 95)
        setProgress(newProgress)
        
        // 단계별 진행
        let cumulativeTime = 0
        for (let i = 0; i < loadingSteps.length; i++) {
          cumulativeTime += loadingSteps[i].duration
          if (newTime <= cumulativeTime) {
            setCurrentStep(i)
            break
          }
        }
        
        return newTime
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [estimatedTime])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getCurrentStepIcon = () => {
    const step = loadingSteps[currentStep]
    if (!step) return Loader2
    return step.icon
  }

  const CurrentIcon = getCurrentStepIcon()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 ${iconColor} rounded-lg relative`}>
            <Icon className="w-6 h-6" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
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
        <div className="text-right">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            <span>{formatTime(elapsedTime)} / {formatTime(estimatedTime)}</span>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            예상 완료까지 {formatTime(Math.max(0, estimatedTime - elapsedTime))}
          </div>
        </div>
      </div>

      {/* Enhanced progress bar */}
      <div className="space-y-3">
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 h-3 rounded-full transition-all duration-1000 ease-out relative"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
          </div>
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>진행률: {Math.round(progress)}%</span>
          <span>AI 분석 진행 중...</span>
        </div>
      </div>

      {/* Current step indicator */}
      <Card className="border border-blue-200 bg-blue-50/50">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CurrentIcon className="w-5 h-5 text-blue-600 animate-spin" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-blue-900">
                {loadingSteps[currentStep]?.text || '처리 중...'}
              </p>
              <div className="flex items-center gap-4 mt-2">
                {loadingSteps.map((step, index) => (
                  <div key={step.id} className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full transition-colors ${
                      index < currentStep ? 'bg-green-500' :
                      index === currentStep ? 'bg-blue-500 animate-pulse' :
                      'bg-gray-300'
                    }`}></div>
                    <span className={`text-xs ${
                      index <= currentStep ? 'text-blue-700' : 'text-gray-400'
                    }`}>
                      {step.text.split(' ')[0]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="border border-amber-200 bg-amber-50/50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-amber-600 text-xs font-bold">💡</span>
            </div>
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">처리 시간 안내</p>
              <p>복잡한 특허일수록 분석 시간이 오래 걸릴 수 있습니다. 최대 5분까지 소요될 수 있으니 잠시만 기다려주세요.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}