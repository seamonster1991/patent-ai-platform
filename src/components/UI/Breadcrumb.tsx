import React from 'react';
import { cn } from '../../lib/utils';
import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  current?: boolean;
}

interface BreadcrumbProps extends React.HTMLAttributes<HTMLElement> {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  showHome?: boolean;
}

const Breadcrumb = React.forwardRef<HTMLElement, BreadcrumbProps>(
  ({ 
    className, 
    items, 
    separator = <ChevronRight className="w-4 h-4" />,
    showHome = true,
    ...props 
  }, ref) => {
    const allItems = showHome 
      ? [{ label: 'Home', href: '/admin/dashboard', icon: <Home className="w-4 h-4" />, current: false }, ...items]
      : items;

    return (
      <nav
        className={cn(
          "flex items-center space-x-1 text-sm text-secondary-600",
          className
        )}
        aria-label="Breadcrumb"
        ref={ref}
        {...props}
      >
        <ol className="flex items-center space-x-1">
          {allItems.map((item, index) => {
            const isLast = index === allItems.length - 1;
            const isCurrent = item.current || isLast;

            return (
              <li key={index} className="flex items-center">
                {index > 0 && (
                  <span className="mx-2 text-secondary-400" aria-hidden="true">
                    {separator}
                  </span>
                )}
                
                {item.href && !isCurrent ? (
                  <Link
                    to={item.href}
                    className={cn(
                      "flex items-center gap-1.5 hover:text-secondary-900 transition-colors",
                      "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-md px-1 py-0.5"
                    )}
                    aria-current={isCurrent ? 'page' : undefined}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                ) : (
                  <span
                    className={cn(
                      "flex items-center gap-1.5",
                      isCurrent ? "text-secondary-900 font-medium" : "text-secondary-600"
                    )}
                    aria-current={isCurrent ? 'page' : undefined}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    );
  }
);

Breadcrumb.displayName = "Breadcrumb";

export { Breadcrumb };
export type { BreadcrumbProps, BreadcrumbItem };