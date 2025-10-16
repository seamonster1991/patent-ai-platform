import React from 'react';
import { MagnifyingGlassIcon, DocumentTextIcon, ClockIcon } from '@heroicons/react/24/outline';

interface ActivityItem {
  id: string;
  title: string;
  date: string;
  type: 'search' | 'report';
}

interface RecentActivitiesListProps {
  title: string;
  activities: ActivityItem[];
  type: 'search' | 'report';
}

const RecentActivitiesList: React.FC<RecentActivitiesListProps> = ({
  title,
  activities,
  type
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return `${diffInMinutes}분 전`;
    } else if (diffInHours < 24) {
      return `${diffInHours}시간 전`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}일 전`;
    }
  };

  const getIcon = () => {
    return type === 'search' ? (
      <MagnifyingGlassIcon className="w-5 h-5" />
    ) : (
      <DocumentTextIcon className="w-5 h-5" />
    );
  };

  const getIconColor = () => {
    return type === 'search' ? 'text-blue-600' : 'text-emerald-600';
  };

  const getBgColor = () => {
    return type === 'search' ? 'bg-blue-50' : 'bg-emerald-50';
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center gap-3 mb-6">
        <div className={`p-2 rounded-lg ${getBgColor()}`}>
          <div className={getIconColor()}>
            {getIcon()}
          </div>
        </div>
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      </div>

      {activities.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">
            {type === 'search' ? (
              <MagnifyingGlassIcon className="w-12 h-12 mx-auto" />
            ) : (
              <DocumentTextIcon className="w-12 h-12 mx-auto" />
            )}
          </div>
          <p className="text-gray-500">
            최근 {type === 'search' ? '검색' : '리포트'} 활동이 없습니다.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity, index) => (
            <div
              key={activity.id}
              className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
            >
              {/* 순번 */}
              <div className="flex-shrink-0 w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium text-gray-600 group-hover:bg-gray-300 transition-colors">
                {index + 1}
              </div>

              {/* 내용 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-medium text-gray-800 line-clamp-2 group-hover:text-gray-900 transition-colors">
                    {activity.title}
                  </h4>
                  <div className="flex items-center gap-1 text-xs text-gray-500 flex-shrink-0">
                    <ClockIcon className="w-3 h-3" />
                    {formatDate(activity.date)}
                  </div>
                </div>
                
                {/* 타입 배지 */}
                <div className="mt-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    type === 'search' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {type === 'search' ? '검색' : '리포트'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 더보기 버튼 */}
      {activities.length > 0 && (
        <div className="mt-6 text-center">
          <button className={`text-sm font-medium hover:underline transition-colors ${
            type === 'search' ? 'text-blue-600 hover:text-blue-700' : 'text-emerald-600 hover:text-emerald-700'
          }`}>
            더 많은 {type === 'search' ? '검색' : '리포트'} 보기
          </button>
        </div>
      )}

      {/* 통계 요약 */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-800">
              {activities.length}
            </div>
            <div className="text-sm text-gray-600">
              최근 {type === 'search' ? '검색' : '리포트'}
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-800">
              {activities.length > 0 ? Math.ceil(activities.length / 7) : 0}
            </div>
            <div className="text-sm text-gray-600">
              주간 평균
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecentActivitiesList;