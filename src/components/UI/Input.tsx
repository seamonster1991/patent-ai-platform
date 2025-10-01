import { InputHTMLAttributes, forwardRef, useId } from 'react'
import { cn } from '../../lib/utils'

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  error?: string
  helperText?: string
  variant?: 'default' | 'filled' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    label, 
    error, 
    helperText, 
    className, 
    variant = 'default',
    size = 'md',
    fullWidth = false,
    id,
    ...props 
  }, ref) => {
    const generatedId = useId()
    const inputId = id || generatedId
    const errorId = error ? `${inputId}-error` : undefined
    const helperTextId = helperText ? `${inputId}-helper` : undefined

    const baseClasses = [
      'w-full rounded-lg transition-all duration-200',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      'disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-secondary-100 dark:disabled:bg-secondary-800',
      'placeholder:text-secondary-400 dark:placeholder:text-secondary-500',
      // 최소 터치 크기 보장
      'min-h-touch'
    ].join(' ')

    const variantClasses = {
      default: [
        'bg-white dark:bg-dark-800',
        'border border-secondary-300 dark:border-secondary-600',
        'text-secondary-900 dark:text-secondary-100',
        'focus-visible:ring-primary-500 focus-visible:ring-offset-white dark:focus-visible:ring-offset-dark-900',
        'focus-visible:border-primary-500',
        error ? 'border-danger-500 focus-visible:ring-danger-500' : ''
      ].filter(Boolean).join(' '),
      
      filled: [
        'bg-secondary-100 dark:bg-secondary-800',
        'border border-transparent',
        'text-secondary-900 dark:text-secondary-100',
        'focus-visible:ring-primary-500 focus-visible:ring-offset-white dark:focus-visible:ring-offset-dark-900',
        'focus-visible:bg-white dark:focus-visible:bg-dark-800',
        error ? 'bg-danger-50 dark:bg-danger-900/20 focus-visible:ring-danger-500' : ''
      ].filter(Boolean).join(' '),
      
      outline: [
        'bg-transparent',
        'border-2 border-secondary-300 dark:border-secondary-600',
        'text-secondary-900 dark:text-secondary-100',
        'focus-visible:ring-primary-500 focus-visible:ring-offset-white dark:focus-visible:ring-offset-dark-900',
        'focus-visible:border-primary-500',
        error ? 'border-danger-500 focus-visible:ring-danger-500' : ''
      ].filter(Boolean).join(' ')
    }

    const sizeClasses = {
      sm: 'px-3 py-2 text-sm min-h-[36px]',
      md: 'px-4 py-2.5 text-sm min-h-[44px]',
      lg: 'px-4 py-3 text-base min-h-[48px]'
    }

    return (
      <div className="space-y-2">
        {label && (
          <label 
            htmlFor={inputId}
            className="block text-sm font-medium text-secondary-700 dark:text-secondary-300"
          >
            {label}
            {props.required && (
              <span className="text-danger-500 ml-1" aria-label="필수 입력">*</span>
            )}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            baseClasses,
            variantClasses[variant],
            sizeClasses[size],
            className
          )}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={cn(
            errorId,
            helperTextId
          ).trim() || undefined}
          {...props}
        />
        {error && (
          <p 
            id={errorId}
            className="text-sm text-danger-600 dark:text-danger-400 flex items-start gap-1"
            role="alert"
            aria-live="polite"
          >
            <span className="text-danger-500 mt-0.5" aria-hidden="true">⚠</span>
            {error}
          </p>
        )}
        {helperText && !error && (
          <p 
            id={helperTextId}
            className="text-sm text-secondary-500 dark:text-secondary-400"
          >
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input