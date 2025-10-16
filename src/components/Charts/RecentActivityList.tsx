import React from 'react';
import { Card, Title, Text, Badge, Button } from '@tremor/react';
import { 
  MagnifyingGlassIcon, 
  DocumentTextIcon, 
  ClockIcon,
  ArrowTopRightOnSquareIcon 
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

interface RecentSearch {
  keyword: string;
  created_at: string;
  technology_field?: string;
  results_count?: number;
}

interface RecentReport {
  title: string;
  invention_title?: string;
  created_at: string;
  technology_field?: string;
  application_number?: string;
}

interface RecentActivityListProps {
  title: string;
  type: 'searches' | 'reports';
  data: RecentSearch[] | RecentReport[];
  maxItems?: number;
}

const RecentActivityList: React.FC<RecentActivityListProps> = ({
  title,
  type,
  data,
  maxItems = 10
}) => {
  const displayData = data.slice(0, maxItems);

  const formatDate = (dateString: string) => {
    if (!dateString) return '날짜 정보 없음';
    
    const date = new Date(dateString);
    
    // 유효하지 않은 날짜인 경우
    if (isNaN(date.getTime())) {
      return '날짜 정보 없음';
    }
    
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    
    if (diffInMs < 0) {
      return '방금 전'; // 미래 날짜인 경우
    }
    
    if (diffInHours < 1) {
      return '방금 전';
    } else if (diffInHours < 24) {
      return `${diffInHours}시간 전`;
    } else if (diffInHours < 48) {
      return '어제';
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}일 전`;
    }
  };

  const getTechnologyFieldColor = (field?: string) => {
    if (!field) return 'gray';
    
    const colorMap: { [key: string]: string } = {
      'AI': 'blue',
      'IoT': 'emerald',
      '통신': 'violet',
      '반도체': 'amber',
      '바이오': 'rose',
      '교통': 'cyan',
      '블록체인': 'pink',
      '에너지': 'indigo',
      '소재': 'teal',
      '기타': 'gray'
    };
    
    return colorMap[field] || 'gray';
  };

  const renderSearchItem = (item: RecentSearch, index: number) => (
    <div key={`search-${index}`} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
      <div className="flex items-center space-x-3 flex-1">
        <div className="flex-shrink-0">
          <MagnifyingGlassIcon className="h-5 w-5 text-blue-500" />
        </div>
        <div className="flex-1 min-w-0">
          <Text className="font-medium text-gray-900 truncate">
            {item.keyword}
          </Text>
          <div className="flex items-center space-x-2 mt-1">
            <Text className="text-xs text-gray-500 flex items-center">
              <ClockIcon className="h-3 w-3 mr-1" />
              {formatDate(item.created_at)}
            </Text>
            {item.results_count && (
              <Text className="text-xs text-gray-500">
                {item.results_count}건 검색됨
              </Text>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        {item.technology_field && (
          <Badge 
            color={getTechnologyFieldColor(item.technology_field)}
            size="sm"
          >
            {item.technology_field}
          </Badge>
        )}
        <Button
          size="xs"
          variant="light"
          icon={ArrowTopRightOnSquareIcon}
          onClick={() => {
            // 검색 페이지로 이동하면서 키워드 전달
            window.location.href = `/search?q=${encodeURIComponent(item.keyword)}`;
          }}
        >
          재검색
        </Button>
      </div>
    </div>
  );

  const renderReportItem = (item: RecentReport, index: number) => (
    <div key={`report-${index}`} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
      <div className="flex items-center space-x-3 flex-1">
        <div className="flex-shrink-0">
          <DocumentTextIcon className="h-5 w-5 text-emerald-500" />
        </div>
        <div className="flex-1 min-w-0">
          <Text className="font-medium text-gray-900 truncate">
            {item.title || item.invention_title || '제목 없음'}
          </Text>
          <div className="flex items-center space-x-2 mt-1">
            <Text className="text-xs text-gray-500 flex items-center">
              <ClockIcon className="h-3 w-3 mr-1" />
              {formatDate(item.created_at)}
            </Text>
            {item.application_number && (
              <Text className="text-xs text-gray-500">
                {item.application_number}
              </Text>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        {item.technology_field && (
          <Badge 
            color={getTechnologyFieldColor(item.technology_field)}
            size="sm"
          >
            {item.technology_field}
          </Badge>
        )}
        {item.application_number && (
          <Link to={`/patent/${item.application_number}`}>
            <Button
              size="xs"
              variant="light"
              icon={ArrowTopRightOnSquareIcon}
            >
              보기
            </Button>
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <Card className="h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          {type === 'searches' ? (
            <MagnifyingGlassIcon className="h-5 w-5 text-blue-500" />
          ) : (
            <DocumentTextIcon className="h-5 w-5 text-emerald-500" />
          )}
          <Title className="text-lg font-semibold">{title}</Title>
        </div>
        <Badge color={type === 'searches' ? 'blue' : 'emerald'} size="sm">
          {displayData.length}개
        </Badge>
      </div>

      {displayData.length > 0 ? (
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {type === 'searches' 
            ? displayData.map((item, index) => renderSearchItem(item as RecentSearch, index))
            : displayData.map((item, index) => renderReportItem(item as RecentReport, index))
          }
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-32 text-gray-500">
          {type === 'searches' ? (
            <MagnifyingGlassIcon className="h-8 w-8 mb-2" />
          ) : (
            <DocumentTextIcon className="h-8 w-8 mb-2" />
          )}
          <Text>최근 {type === 'searches' ? '검색' : '리포트'}가 없습니다</Text>
          <Text className="text-sm">
            {type === 'searches' ? '특허 검색을 시작해보세요' : '리포트를 생성해보세요'}
          </Text>
        </div>
      )}

      {data.length > maxItems && (
        <div className="mt-4 pt-4 border-t text-center">
          <Link to={type === 'searches' ? '/search' : '/reports'}>
            <Button variant="light" size="sm">
              전체 {type === 'searches' ? '검색 기록' : '리포트'} 보기
            </Button>
          </Link>
        </div>
      )}
    </Card>
  );
};

export default RecentActivityList;