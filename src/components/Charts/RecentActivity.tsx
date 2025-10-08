import React, { useState } from 'react';
import { Card, Title, Text, Button } from '@tremor/react';
import { CalendarIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface RecentReport {
  id: string;
  type: 'report';
  title: string;
  description?: string;
  timestamp: string;
  metadata?: {
    reportType?: string;
  };
}

interface RecentSearch {
  id: string;
  type: 'search';
  title: string;
  description?: string;
  timestamp: string;
  metadata?: {
    searchQuery?: string;
  };
}

interface RecentActivityProps {
  recentActivities: {
    reports: RecentReport[];
    searches: RecentSearch[];
  };
}

const RecentActivity: React.FC<RecentActivityProps> = ({
  recentActivities
}) => {
  const [showAllReports, setShowAllReports] = useState(false);
  const [showAllSearches, setShowAllSearches] = useState(false);

  const { reports: recentReports, searches: recentSearches } = recentActivities;
  const displayedReports = showAllReports ? recentReports : recentReports.slice(0, 10);
  const displayedSearches = showAllSearches ? recentSearches : recentSearches.slice(0, 10);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '오늘';
    if (diffDays === 2) return '어제';
    if (diffDays <= 7) return `${diffDays - 1}일 전`;
    
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'emerald';
      case 'processing': return 'yellow';
      case 'failed': return 'red';
      default: return 'gray';
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return '완료';
      case 'processing': return '처리중';
      case 'failed': return '실패';
      default: return '알 수 없음';
    }
  };

  const getReportTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'patent_analysis': return 'blue';
      case 'market_analysis': return 'purple';
      case 'technology_analysis': return 'indigo';
      case 'competitor_analysis': return 'orange';
      default: return 'gray';
    }
  };

  const getReportTypeText = (type: string) => {
    switch (type.toLowerCase()) {
      case 'patent_analysis': return '특허 분석';
      case 'market_analysis': return '시장 분석';
      case 'technology_analysis': return '기술 분석';
      case 'competitor_analysis': return '경쟁사 분석';
      default: return '분석';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Recent Reports - 텍스트 중심 */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <Title className="text-lg font-semibold text-gray-900">최근 리포트</Title>
          <Text className="text-xs text-gray-600">총 {recentReports.length}개</Text>
        </div>

        <div className="space-y-3">
          {displayedReports.length > 0 ? (
            displayedReports.map((report, index) => (
              <div 
                key={report.id || index}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <Text className="font-medium text-gray-900 truncate">
                      {report.title || `리포트 #${index + 1}`}
                    </Text>
                    <div className="mt-1 text-xs text-gray-700">
                      {report.description && `설명: ${report.description}`}
                      {report.metadata?.reportType && ` · 분석 종류: ${getReportTypeText(report.metadata.reportType)}`}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center text-xs text-gray-500">
                  <CalendarIcon className="h-3 w-3 mr-1" />
                  {formatDate(report.timestamp)}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Text>최근 리포트가 없습니다</Text>
            </div>
          )}
        </div>

        {recentReports.length > 10 && (
          <div className="mt-4 text-center">
            <Button
              size="xs"
              variant="light"
              onClick={() => setShowAllReports(!showAllReports)}
              icon={showAllReports ? ChevronUpIcon : ChevronDownIcon}
            >
              {showAllReports ? '접기' : `전체 ${recentReports.length}개 리포트 보기`}
            </Button>
          </div>
        )}
      </Card>

      {/* Recent Searches - 텍스트 중심 */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <Title className="text-lg font-semibold text-gray-900">최근 검색</Title>
          <Text className="text-xs text-gray-600">총 {recentSearches.length}개</Text>
        </div>

        <div className="space-y-3">
          {displayedSearches.length > 0 ? (
            displayedSearches.map((search, index) => (
              <div 
                key={index}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <Text className="font-medium text-gray-900">
                      {search.title}
                    </Text>
                    <div className="mt-1 text-xs text-gray-700">
                      {search.description}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center text-xs text-gray-500">
                  <CalendarIcon className="h-3 w-3 mr-1" />
                  {formatDate(search.timestamp)}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Text>최근 검색 기록이 없습니다</Text>
            </div>
          )}
        </div>

        {recentSearches.length > 10 && (
          <div className="mt-4 text-center">
            <Button
              size="xs"
              variant="light"
              onClick={() => setShowAllSearches(!showAllSearches)}
              icon={showAllSearches ? ChevronUpIcon : ChevronDownIcon}
            >
              {showAllSearches ? '접기' : `전체 ${recentSearches.length}개 검색 보기`}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default RecentActivity;