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
    const inputId = useId()
    const errorId = useId()
    const helperTextId = useId()

    const baseClasses = cn(
      'block w-full rounded-md border transition-colors duration-200',
      'focus:outline-none focus:ring-2 focus:ring-ms-olive focus:border-ms-olive',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      fullWidth ? 'w-full' : ''
    )

    const variantClasses = {
      default: cn(
        'border-ms-line',
        'bg-white dark:bg-ms-bg',
        'text-ms-text dark:text-ms-text',
        'placeholder:text-ms-text-muted'
      ),
      filled: cn(
        'border-ms-line',
        'bg-ms-surface dark:bg-ms-surface',
        'text-ms-text dark:text-ms-text',
        'placeholder:text-ms-text-muted'
      ),
      outline: cn(
        'border border-ms-line',
        'bg-transparent',
        'text-ms-text dark:text-ms-text',
        'placeholder:text-ms-text-muted'
      )
    }

    const sizeClasses = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-2.5 text-base',
      lg: 'px-4 py-3 text-lg'
    }

    return (
      <div className={cn('space-y-2', fullWidth ? 'w-full' : '')}>
        {label && (
          <label 
            htmlFor={id || inputId}
            className="block text-sm font-medium text-ms-text dark:text-ms-text"
          >
            {label}
            {props.required && (
              <span className="text-red-500 ml-1" aria-label="필수 입력">*</span>
            )}
          </label>
        )}
        <input
          ref={ref}
          id={id || inputId}
          className={cn(
            baseClasses,
            variantClasses[variant],
            sizeClasses[size],
            className
          )}
          style={{
            direction: 'ltr',
            textAlign: 'left',
            unicodeBidi: 'normal',
            ...props.style
          }}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={[
            error ? errorId : null,
            helperText && !error ? helperTextId : null
          ].filter(Boolean).join(' ') || undefined}
          {...props}
        />
        {error && (
          <p 
            id={errorId}
            className="text-sm text-red-600 dark:text-red-400 flex items-start gap-1"
            role="alert"
            aria-live="polite"
          >
            <span className="text-red-500 mt-0.5" aria-hidden="true">⚠</span>
            {error}
          </p>
        )}
        {helperText && !error && (
          <p 
            id={helperTextId}
            className="text-sm text-ms-text-muted"
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