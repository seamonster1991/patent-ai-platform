import { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/utils'
import { LoadingSpinner } from './Loading'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  loading?: boolean
  children: ReactNode
  fullWidth?: boolean
  asChild?: boolean
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  className,
  disabled,
  fullWidth = false,
  asChild = false,
  ...props
}: ButtonProps) {
  const baseClasses = [
    'inline-flex items-center justify-center font-medium rounded-lg',
    'transition-all duration-200 ease-in-out',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none',
    'select-none touch-manipulation',
    // 최소 터치 크기 보장 (44px)
    'min-h-touch',
    fullWidth ? 'w-full' : ''
  ].filter(Boolean).join(' ')
  
  const variantClasses = {
    primary: [
      'bg-primary-600 hover:bg-primary-700 active:bg-primary-800',
      'text-white',
      'focus-visible:ring-primary-500 focus-visible:ring-offset-dark-900',
      'shadow-sm hover:shadow-md',
      'border border-transparent'
    ].join(' '),
    
    secondary: [
      'bg-secondary-600 hover:bg-secondary-700 active:bg-secondary-800',
      'text-white',
      'focus-visible:ring-secondary-500 focus-visible:ring-offset-dark-900',
      'shadow-sm hover:shadow-md',
      'border border-transparent'
    ].join(' '),
    
    outline: [
      'border-2 border-secondary-300 dark:border-secondary-600',
      'bg-transparent hover:bg-secondary-50 dark:hover:bg-secondary-800',
      'text-secondary-700 dark:text-secondary-300',
      'hover:text-secondary-900 dark:hover:text-white',
      'focus-visible:ring-secondary-500 focus-visible:ring-offset-white dark:focus-visible:ring-offset-dark-900',
      'active:bg-secondary-100 dark:active:bg-secondary-700'
    ].join(' '),
    
    ghost: [
      'bg-transparent hover:bg-secondary-100 dark:hover:bg-secondary-800',
      'text-secondary-700 dark:text-secondary-300',
      'hover:text-secondary-900 dark:hover:text-white',
      'focus-visible:ring-secondary-500 focus-visible:ring-offset-white dark:focus-visible:ring-offset-dark-900',
      'active:bg-secondary-200 dark:active:bg-secondary-700'
    ].join(' '),
    
    danger: [
      'bg-danger-600 hover:bg-danger-700 active:bg-danger-800',
      'text-white',
      'focus-visible:ring-danger-500 focus-visible:ring-offset-dark-900',
      'shadow-sm hover:shadow-md',
      'border border-transparent'
    ].join(' '),
    
    success: [
      'bg-success-600 hover:bg-success-700 active:bg-success-800',
      'text-white',
      'focus-visible:ring-success-500 focus-visible:ring-offset-dark-900',
      'shadow-sm hover:shadow-md',
      'border border-transparent'
    ].join(' '),
    
    warning: [
      'bg-warning-600 hover:bg-warning-700 active:bg-warning-800',
      'text-white',
      'focus-visible:ring-warning-500 focus-visible:ring-offset-dark-900',
      'shadow-sm hover:shadow-md',
      'border border-transparent'
    ].join(' ')
  }
  
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm min-h-[36px]',
    md: 'px-4 py-2.5 text-sm min-h-[44px]',
    lg: 'px-6 py-3 text-base min-h-[48px]',
    xl: 'px-8 py-4 text-lg min-h-[52px]'
  }

  return (
    <button
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      disabled={disabled || loading}
      aria-disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <LoadingSpinner 
          className="mr-2 h-4 w-4" 
          aria-hidden="true"
        />
      )}
      <span className={loading ? 'opacity-70' : ''}>
        {children}
      </span>
    </button>
  )
}