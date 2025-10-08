import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { ActivityTracker } from '../lib/activityTracker'

export function usePageTracking() {
  let location
  let currentPath = ''
  let hasRouterContext = true
  
  try {
    location = useLocation()
    currentPath = location.pathname
  } catch (error) {
    // Router 컨텍스트가 없는 경우 무시
    hasRouterContext = false
    return
  }

  const { user } = useAuthStore()
  const previousPath = useRef<string>('')

  useEffect(() => {
    if (!user || !currentPath) return

    const prevPath = previousPath.current

    // 첫 번째 로드가 아닌 경우에만 추적
    if (prevPath && prevPath !== currentPath) {
      const activityTracker = ActivityTracker.getInstance()
      activityTracker.setUserId(user.id)
      
      activityTracker.trackPageNavigation(prevPath, currentPath, {
         timestamp: new Date().toISOString()
       }).catch(error => {
        console.error('페이지 네비게이션 추적 오류:', error)
      })
    }

    previousPath.current = currentPath
  }, [currentPath, user])
}