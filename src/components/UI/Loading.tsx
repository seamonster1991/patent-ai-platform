import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  className?: string
}

export default function Loading({ size = 'md', text, className }: LoadingProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }

  return (
    <div className={cn('flex items-center justify-center space-x-2', className)}>
      <Loader2 className={cn('animate-spin text-blue-500', sizeClasses[size])} />
      {text && (
        <span className="text-slate-300 text-sm">{text}</span>
      )}
    </div>
  )
}

export function LoadingPage({ text = '로딩 중...' }: { text?: string }) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <Loading size="lg" />
        <p className="mt-4 text-slate-300">{text}</p>
      </div>
    </div>
  )
}

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <Loader2 className={cn('animate-spin text-blue-500 w-5 h-5', className)} />
  )
}