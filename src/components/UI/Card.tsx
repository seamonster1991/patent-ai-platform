import { ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface CardProps {
  children: ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hover?: boolean
}

export default function Card({ 
  children, 
  className, 
  padding = 'md',
  hover = false 
}: CardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  }

  return (
    <div
      className={cn(
        'bg-slate-800 border border-slate-700 rounded-lg',
        paddingClasses[padding],
        hover && 'hover:bg-slate-750 transition-colors cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({ 
  children, 
  className 
}: { 
  children: ReactNode
  className?: string 
}) {
  return (
    <div className={cn('mb-4', className)}>
      {children}
    </div>
  )
}

export function CardTitle({ 
  children, 
  className 
}: { 
  children: ReactNode
  className?: string 
}) {
  return (
    <h3 className={cn('text-lg font-semibold text-white', className)}>
      {children}
    </h3>
  )
}

export function CardContent({ 
  children, 
  className 
}: { 
  children: ReactNode
  className?: string 
}) {
  return (
    <div className={cn('text-slate-300', className)}>
      {children}
    </div>
  )
}

export function CardFooter({ 
  children, 
  className 
}: { 
  children: ReactNode
  className?: string 
}) {
  return (
    <div className={cn('mt-4 pt-4 border-t border-slate-700', className)}>
      {children}
    </div>
  )
}