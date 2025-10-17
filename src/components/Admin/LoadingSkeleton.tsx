import React, { memo } from 'react';
import { Card } from '@/components/UI/Card';

interface LoadingSkeletonProps {
  type: 'kpi' | 'chart' | 'table';
  count?: number;
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = memo(({ type, count = 1 }) => {
  const KPISkeleton = () => (
    <Card>
      <div className="p-6">
        <div className="animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );

  const ChartSkeleton = () => (
    <Card>
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-80 bg-gray-200 rounded"></div>
        </div>
      </div>
    </Card>
  );

  const TableSkeleton = () => (
    <Card>
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );

  const renderSkeleton = () => {
    switch (type) {
      case 'kpi':
        return <KPISkeleton />;
      case 'chart':
        return <ChartSkeleton />;
      case 'table':
        return <TableSkeleton />;
      default:
        return <KPISkeleton />;
    }
  };

  if (count === 1) {
    return renderSkeleton();
  }

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          {renderSkeleton()}
        </div>
      ))}
    </>
  );
});

LoadingSkeleton.displayName = 'LoadingSkeleton';

export default LoadingSkeleton;