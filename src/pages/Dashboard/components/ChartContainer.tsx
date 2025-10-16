import React from 'react';
import { motion } from 'framer-motion';
import { 
  EllipsisHorizontalIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface ChartContainerProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  loading?: boolean;
  error?: string;
  className?: string;
  height?: string;
}

const ChartContainer: React.FC<ChartContainerProps> = ({
  title,
  description,
  children,
  actions,
  loading = false,
  error,
  className = '',
  height = 'h-80'
}) => {
  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="h-6 bg-slate-200 rounded w-32 mb-2"></div>
              {description && <div className="h-4 bg-slate-200 rounded w-48"></div>}
            </div>
            <div className="h-8 w-20 bg-slate-200 rounded"></div>
          </div>
          <div className={`bg-slate-100 rounded-lg ${height} flex items-center justify-center`}>
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`bg-white rounded-xl shadow-sm border border-red-200 p-6 ${className}`}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            {description && (
              <p className="text-sm text-slate-600 mt-1">{description}</p>
            )}
          </div>
          {actions}
        </div>
        <div className={`${height} flex items-center justify-center bg-red-50 rounded-lg border border-red-200`}>
          <div className="text-center">
            <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <p className="text-red-700 font-medium mb-1">데이터를 불러올 수 없습니다</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`
        bg-white rounded-xl shadow-sm border border-slate-200 p-6 
        hover:shadow-md hover:border-slate-300 
        transition-all duration-200 ease-out
        ${className}
      `}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">{title}</h3>
          {description && (
            <p className="text-sm text-slate-600">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center space-x-2">
            {actions}
          </div>
        )}
      </div>
      <div className={`${height} relative`}>
        {children}
      </div>
    </motion.div>
  );
};

// 차트 액션 버튼들
export const ChartActions: React.FC<{ 
  onRefresh?: () => void; 
  onExport?: () => void;
  onSettings?: () => void;
}> = ({
  onRefresh,
  onExport,
  onSettings
}) => (
  <div className="flex items-center space-x-1">
    {onRefresh && (
      <button
        onClick={onRefresh}
        className="
          p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 
          rounded-lg transition-colors duration-150
        "
        title="새로고침"
      >
        <ArrowPathIcon className="w-4 h-4" />
      </button>
    )}
    {onExport && (
      <button
        onClick={onExport}
        className="
          p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 
          rounded-lg transition-colors duration-150
        "
        title="내보내기"
      >
        <ArrowDownTrayIcon className="w-4 h-4" />
      </button>
    )}
    {onSettings && (
      <button
        onClick={onSettings}
        className="
          p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 
          rounded-lg transition-colors duration-150
        "
        title="설정"
      >
        <EllipsisHorizontalIcon className="w-4 h-4" />
      </button>
    )}
  </div>
);

export default ChartContainer;