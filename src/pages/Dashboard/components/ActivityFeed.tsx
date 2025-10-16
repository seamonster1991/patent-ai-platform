import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MagnifyingGlassIcon,
  DocumentTextIcon,
  UserIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

interface ActivityItem {
  id: string;
  type: 'search' | 'report' | 'login' | 'download' | 'share';
  title: string;
  description?: string;
  timestamp: string;
  status: 'success' | 'pending' | 'error' | 'completed';
  metadata?: Record<string, any>;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  loading?: boolean;
  className?: string;
  maxHeight?: string;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ 
  activities, 
  loading = false, 
  className = '',
  maxHeight = 'max-h-96'
}) => {
  const getActivityIcon = (type: ActivityItem['type']) => {
    const iconClass = "w-4 h-4";
    switch (type) {
      case 'search':
        return <MagnifyingGlassIcon className={iconClass} />;
      case 'report':
        return <DocumentTextIcon className={iconClass} />;
      case 'login':
        return <UserIcon className={iconClass} />;
      case 'download':
        return <ArrowDownTrayIcon className={iconClass} />;
      case 'share':
        return <ShareIcon className={iconClass} />;
      default:
        return <ClockIcon className={iconClass} />;
    }
  };

  const getStatusColor = (status: ActivityItem['status']) => {
    switch (status) {
      case 'success':
      case 'completed':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'pending':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'error':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusIcon = (status: ActivityItem['status']) => {
    const iconClass = "w-3 h-3";
    switch (status) {
      case 'success':
      case 'completed':
        return <CheckCircleIcon className={iconClass} />;
      case 'error':
        return <ExclamationCircleIcon className={iconClass} />;
      case 'pending':
        return <InformationCircleIcon className={iconClass} />;
      default:
        return null;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return '방금 전';
    if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}시간 전`;
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">최근 활동</h3>
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse flex items-start space-x-3">
              <div className="w-8 h-8 bg-slate-200 rounded-lg"></div>
              <div className="flex-1">
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-slate-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
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
        <h3 className="text-lg font-semibold text-slate-900">최근 활동</h3>
        <span className="text-sm text-slate-500">
          {activities.length}개 활동
        </span>
      </div>

      {activities.length === 0 ? (
        <div className="text-center py-8">
          <ClockIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">최근 활동이 없습니다</p>
          <p className="text-slate-400 text-sm mt-1">활동이 시작되면 여기에 표시됩니다</p>
        </div>
      ) : (
        <div className={`space-y-3 ${maxHeight} overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100`}>
          <AnimatePresence>
            {activities.map((activity, index) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                className="
                  flex items-start space-x-3 p-3 rounded-lg 
                  hover:bg-slate-50 transition-colors duration-150
                  border border-transparent hover:border-slate-200
                "
              >
                <div className="flex-shrink-0">
                  <div className="
                    w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 
                    flex items-center justify-center text-blue-600
                  ">
                    {getActivityIcon(activity.type)}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900 leading-tight">
                        {activity.title}
                      </p>
                      {activity.description && (
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                          {activity.description}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-2">
                      <span className={`
                        inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border
                        ${getStatusColor(activity.status)}
                      `}>
                        {getStatusIcon(activity.status)}
                        <span className="capitalize">{activity.status}</span>
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-slate-500">
                      {formatTimestamp(activity.timestamp)}
                    </span>
                    {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                      <div className="flex items-center space-x-1">
                        {Object.entries(activity.metadata).slice(0, 2).map(([key, value]) => (
                          <span key={key} className="text-xs text-slate-400">
                            {key}: {String(value)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {activities.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <button className="
            w-full text-sm text-slate-600 hover:text-slate-900 
            font-medium transition-colors duration-150
          ">
            모든 활동 보기
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default ActivityFeed;