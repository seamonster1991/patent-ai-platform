import React from 'react';
import { cn } from '../../lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ 
    className, 
    variant = 'rectangular', 
    width, 
    height, 
    lines = 1,
    ...props 
  }, ref) => {
    const baseStyles = "animate-pulse bg-secondary-200 rounded";
    
    const variantStyles = {
      text: "h-4 rounded",
      circular: "rounded-full",
      rectangular: "rounded-lg"
    };

    if (variant === 'text' && lines > 1) {
      return (
        <div className={cn("space-y-2", className)} ref={ref} {...props}>
          {Array.from({ length: lines }).map((_, index) => (
            <div
              key={index}
              className={cn(
                baseStyles,
                variantStyles.text,
                index === lines - 1 ? "w-3/4" : "w-full"
              )}
              style={{ 
                width: index === lines - 1 ? '75%' : width,
                height: height || '1rem'
              }}
            />
          ))}
        </div>
      );
    }

    return (
      <div
        className={cn(
          baseStyles,
          variantStyles[variant],
          className
        )}
        style={{ width, height }}
        ref={ref}
        {...props}
      />
    );
  }
);

Skeleton.displayName = "Skeleton";

// Predefined skeleton components for common use cases
export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("p-6 space-y-4", className)}>
    <div className="flex items-center space-x-4">
      <Skeleton variant="circular" width={40} height={40} />
      <div className="space-y-2 flex-1">
        <Skeleton variant="text" width="60%" />
        <Skeleton variant="text" width="40%" />
      </div>
    </div>
    <Skeleton variant="rectangular" height={200} />
    <div className="space-y-2">
      <Skeleton variant="text" lines={3} />
    </div>
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number; columns?: number; className?: string }> = ({ 
  rows = 5, 
  columns = 4, 
  className 
}) => (
  <div className={cn("space-y-3", className)}>
    {/* Header */}
    <div className="flex space-x-4">
      {Array.from({ length: columns }).map((_, index) => (
        <Skeleton key={index} variant="text" width="100%" height={20} />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="flex space-x-4">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton key={colIndex} variant="text" width="100%" height={16} />
        ))}
      </div>
    ))}
  </div>
);

export const SkeletonChart: React.FC<{ className?: string; height?: number }> = ({ 
  className, 
  height = 300 
}) => (
  <div className={cn("space-y-4", className)}>
    <div className="flex justify-between items-center">
      <Skeleton variant="text" width="30%" height={24} />
      <Skeleton variant="rectangular" width={100} height={32} />
    </div>
    <Skeleton variant="rectangular" width="100%" height={height} />
    <div className="flex justify-center space-x-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex items-center space-x-2">
          <Skeleton variant="circular" width={12} height={12} />
          <Skeleton variant="text" width={60} />
        </div>
      ))}
    </div>
  </div>
);

export const SkeletonMetrics: React.FC<{ count?: number; className?: string }> = ({ 
  count = 4, 
  className 
}) => (
  <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", className)}>
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="bg-white p-6 rounded-lg border border-secondary-200">
        <div className="flex items-center justify-between mb-4">
          <Skeleton variant="text" width="60%" height={16} />
          <Skeleton variant="circular" width={40} height={40} />
        </div>
        <Skeleton variant="text" width="40%" height={32} className="mb-2" />
        <div className="flex items-center space-x-2">
          <Skeleton variant="circular" width={16} height={16} />
          <Skeleton variant="text" width="50%" height={14} />
        </div>
      </div>
    ))}
  </div>
);

export { Skeleton };
export type { SkeletonProps };