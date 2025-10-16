import React from 'react';
import { cn } from '../../lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'increase' | 'decrease';
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  loading?: boolean;
  subtitle?: string;
}

const MetricCard = React.forwardRef<HTMLDivElement, MetricCardProps>(
  ({ 
    className, 
    title, 
    value, 
    change, 
    changeType, 
    icon, 
    color = 'blue',
    loading = false,
    subtitle,
    ...props 
  }, ref) => {
    const colorStyles = {
      blue: {
        bg: 'bg-primary-50',
        icon: 'text-primary-600',
        accent: 'border-primary-200'
      },
      green: {
        bg: 'bg-success-50',
        icon: 'text-success-600',
        accent: 'border-success-200'
      },
      yellow: {
        bg: 'bg-warning-50',
        icon: 'text-warning-600',
        accent: 'border-warning-200'
      },
      red: {
        bg: 'bg-danger-50',
        icon: 'text-danger-600',
        accent: 'border-danger-200'
      },
      purple: {
        bg: 'bg-purple-50',
        icon: 'text-purple-600',
        accent: 'border-purple-200'
      }
    };

    const getChangeColor = () => {
      if (change === undefined) return '';
      if (changeType === 'increase' || (changeType === undefined && change > 0)) {
        return 'text-success-600';
      }
      return 'text-danger-600';
    };

    const getChangeIcon = () => {
      if (change === undefined) return null;
      if (changeType === 'increase' || (changeType === undefined && change > 0)) {
        return <TrendingUp className="w-4 h-4" />;
      }
      return <TrendingDown className="w-4 h-4" />;
    };

    if (loading) {
      return (
        <div className={cn("bg-white rounded-lg border border-secondary-200 p-6 shadow-card", className)}>
          <div className="animate-pulse">
            <div className="flex items-center justify-between mb-4">
              <div className="h-4 bg-secondary-200 rounded w-24"></div>
              <div className="h-8 w-8 bg-secondary-200 rounded"></div>
            </div>
            <div className="h-8 bg-secondary-200 rounded w-20 mb-2"></div>
            <div className="h-3 bg-secondary-200 rounded w-16"></div>
          </div>
        </div>
      );
    }

    return (
      <div
        className={cn(
          "bg-white rounded-lg border border-secondary-200 p-6 shadow-card hover:shadow-card-hover transition-all duration-200",
          className
        )}
        ref={ref}
        role="region"
        aria-labelledby={`metric-${title.replace(/\s+/g, '-').toLowerCase()}`}
        {...props}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 
            id={`metric-${title.replace(/\s+/g, '-').toLowerCase()}`}
            className="text-sm font-medium text-secondary-600"
          >
            {title}
          </h3>
          {icon && (
            <div className={cn(
              "p-2 rounded-lg",
              colorStyles[color]?.bg || colorStyles.blue.bg
            )}>
              <div className={cn("w-5 h-5", colorStyles[color]?.icon || colorStyles.blue.icon)}>
                {icon}
              </div>
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <div
            aria-label={`Current value: ${value}`}
            className="text-2xl font-bold text-secondary-900"
          >
            {value}
          </div>
          
          {subtitle && (
            <p className="text-xs text-secondary-500">
              {subtitle}
            </p>
          )}
          
          {change !== undefined && (
            <div 
              className={cn(
                "flex items-center gap-1 text-sm font-medium",
                getChangeColor()
              )}
              aria-label={`Change: ${changeType === 'decrease' || (changeType === undefined && change < 0) ? 'decreased' : 'increased'} by ${Math.abs(change)}%`}
            >
              {getChangeIcon()}
              <span>
                {change > 0 && changeType !== 'decrease' ? '+' : ''}{change}%
              </span>
              <span className="text-secondary-500 font-normal">
                vs last period
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
);

MetricCard.displayName = "MetricCard";

export { MetricCard };
export type { MetricCardProps };