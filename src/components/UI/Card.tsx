import { ReactNode, HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'default' | 'elevated' | 'outlined' | 'filled'
  hover?: boolean
  interactive?: boolean
}

export function Card({ 
  children, 
  className, 
  padding = 'md',
  variant = 'default',
  hover = false,
  interactive = false,
  ...props
}: CardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8'
  }

  const variantClasses = {
    default: [
      'bg-white dark:bg-dark-800',
      'border border-ms-line dark:border-secondary-700',
      'shadow-none'
    ].join(' '),
    
    elevated: [
      'bg-white dark:bg-dark-800',
      'border border-ms-line dark:border-secondary-700',
      'shadow-md'
    ].join(' '),
    
    outlined: [
      'bg-transparent',
      'border-2 border-ms-line dark:border-secondary-600'
    ].join(' '),
    
    filled: [
      'bg-secondary-50 dark:bg-secondary-900',
      'border border-ms-line dark:border-secondary-700'
    ].join(' ')
  }

  const interactiveClasses = interactive || hover ? [
    'transition-colors duration-200',
    'hover:border-ms-olive',
    'cursor-pointer',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ms-olive focus-visible:ring-offset-2',
    'focus-visible:ring-offset-white dark:focus-visible:ring-offset-dark-900'
  ].join(' ') : ''

  return (
    <div
      className={cn(
        'rounded-md',
        variantClasses[variant],
        paddingClasses[padding],
        interactiveClasses,
        className
      )}
      tabIndex={interactive ? 0 : undefined}
      role={interactive ? 'button' : undefined}
      {...props}
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
    <div className={cn('mb-4 space-y-1', className)}>
      {children}
    </div>
  )
}

export function CardTitle({ 
  children, 
  className,
  as: Component = 'h3'
}: { 
  children: ReactNode
  className?: string
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
}) {
  return (
    <Component className={cn(
      'text-lg font-semibold leading-tight',
      'text-secondary-900 dark:text-secondary-100',
      className
    )}>
      {children}
    </Component>
  )
}

export function CardDescription({ 
  children, 
  className 
}: { 
  children: ReactNode
  className?: string 
}) {
  return (
    <p className={cn(
      'text-sm text-secondary-600 dark:text-secondary-400',
      className
    )}>
      {children}
    </p>
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
    <div className={cn(
      'text-secondary-700 dark:text-secondary-300',
      className
    )}>
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
    <div className={cn(
      'mt-4 pt-4 border-t border-ms-line dark:border-secondary-700',
      className
    )}>
      {children}
    </div>
  )
}

// Default export for backward compatibility
export default Card