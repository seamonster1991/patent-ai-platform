import { ButtonHTMLAttributes, ReactNode, cloneElement, isValidElement } from 'react'
import { cn } from '../../lib/utils'
import { LoadingSpinner } from './Loading'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning' | 'default'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  loading?: boolean
  children: ReactNode
  fullWidth?: boolean
  asChild?: boolean
}

function Button({
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
      'bg-transparent hover:bg-secondary-50 active:bg-secondary-100',
      'dark:hover:bg-secondary-800 dark:active:bg-secondary-700',
      'text-secondary-700 dark:text-secondary-300',
      'border border-secondary-300 dark:border-secondary-600',
      'hover:border-secondary-400 dark:hover:border-secondary-500',
      'focus-visible:ring-secondary-500 focus-visible:ring-offset-white dark:focus-visible:ring-offset-dark-900'
    ].join(' '),
    
    ghost: [
      'bg-transparent hover:bg-secondary-100 active:bg-secondary-200',
      'dark:hover:bg-secondary-800 dark:active:bg-secondary-700',
      'text-secondary-700 dark:text-secondary-300',
      'border border-transparent',
      'focus-visible:ring-secondary-500 focus-visible:ring-offset-white dark:focus-visible:ring-offset-dark-900'
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
    ].join(' '),
    
    default: [
      'bg-gray-100 hover:bg-gray-200 active:bg-gray-300',
      'dark:bg-gray-700 dark:hover:bg-gray-600 dark:active:bg-gray-500',
      'text-gray-900 dark:text-gray-100',
      'border border-gray-300 dark:border-gray-600',
      'focus-visible:ring-gray-500 focus-visible:ring-offset-white dark:focus-visible:ring-offset-dark-900'
    ].join(' ')
  }

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-2.5 text-base gap-2',
    xl: 'px-8 py-3 text-lg gap-3'
  }

  const buttonClasses = cn(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    className
  )

  // asChild가 true이면 children을 그대로 렌더링하되, 스타일을 적용
  if (asChild && isValidElement(children)) {
    return cloneElement(children, {
      className: cn(buttonClasses, children.props.className),
      disabled: disabled || loading,
      'aria-disabled': disabled || loading,
      ...props,
      ...children.props
    })
  }

  return (
    <button
      className={buttonClasses}
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

export { Button }
export default Button