import React from 'react';
import { cn } from '../../lib/utils';

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'white';
  text?: string;
}

const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ className, size = 'md', color = 'primary', text, ...props }, ref) => {
    const sizeStyles = {
      sm: 'w-4 h-4',
      md: 'w-6 h-6',
      lg: 'w-8 h-8'
    };

    const colorStyles = {
      primary: 'text-primary-600',
      secondary: 'text-secondary-600',
      white: 'text-white'
    };

    return (
      <div
        className={cn("flex items-center justify-center", className)}
        ref={ref}
        {...props}
      >
        <div className="flex flex-col items-center gap-3">
          <svg
            className={cn(
              "animate-spin",
              sizeStyles[size],
              colorStyles[color] || colorStyles.primary
            )}
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          {text && (
            <p className={cn("text-sm font-medium", colorStyles[color] || colorStyles.primary)}>
              {text}
            </p>
          )}
        </div>
      </div>
    );
  }
);

LoadingSpinner.displayName = "LoadingSpinner";

export { LoadingSpinner };
export type { LoadingSpinnerProps };