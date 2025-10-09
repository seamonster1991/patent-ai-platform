import React from 'react';
import { Card, Title, Text, ProgressBar, Metric } from '@tremor/react';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';

interface EfficiencyMetricsProps {
  efficiencyMetrics: {
    loginEfficiency: {
      value: number;
      status: string;
      totalLogins: number;
      reportsGenerated: number;
    };
    searchConversion: {
      value: number;
      status: string;
      totalSearches: number;
      reportsGenerated: number;
    };
  };
}

const EfficiencyMetrics: React.FC<EfficiencyMetricsProps> = ({ 
  efficiencyMetrics
}) => {
  // Add safety checks for undefined efficiencyMetrics
  if (!efficiencyMetrics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="text-center py-8 text-gray-500">
            <Text>효율성 데이터를 불러오는 중...</Text>
          </div>
        </Card>
        <Card className="p-6">
          <div className="text-center py-8 text-gray-500">
            <Text>효율성 데이터를 불러오는 중...</Text>
          </div>
        </Card>
      </div>
    );
  }

  const { loginEfficiency, searchConversion } = efficiencyMetrics;

  // Add safety checks for individual metrics
  if (!loginEfficiency || !searchConversion) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="text-center py-8 text-gray-500">
            <Text>효율성 데이터가 없습니다</Text>
          </div>
        </Card>
        <Card className="p-6">
          <div className="text-center py-8 text-gray-500">
            <Text>효율성 데이터가 없습니다</Text>
          </div>
        </Card>
      </div>
    );
  }
  const getEfficiencyColor = (rate: number) => {
    if (rate >= 30) return 'emerald';
    if (rate >= 15) return 'yellow';
    return 'red';
  };

  const getEfficiencyIcon = (rate: number) => {
    return rate >= 15 ? ArrowTrendingUpIcon : ArrowTrendingDownIcon;
  };

  const getEfficiencyText = (rate: number) => {
    if (rate >= 30) return '우수';
    if (rate >= 15) return '양호';
    return '개선 필요';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Login to Report Efficiency */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Title className="text-lg font-semibold text-gray-900">
              로그인 효율성
            </Title>
            <Text className="text-sm text-gray-600">
              로그인 세션당 생성된 리포트 수
            </Text>
          </div>
          <div className="flex items-center space-x-2">
            {React.createElement(getEfficiencyIcon(loginEfficiency.value || 0), {
              className: `h-6 w-6 ${
                loginEfficiency.status === 'excellent' || loginEfficiency.status === 'good' ? 'text-emerald-600' : 'text-red-600'
              }`
            })}
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <div className="flex items-baseline space-x-2">
              <Metric className="text-2xl font-bold">
                {(loginEfficiency.value || 0).toFixed(1)}%
              </Metric>
              <Text className={`text-sm font-medium ${
                loginEfficiency.status === 'excellent' || loginEfficiency.status === 'good' ? 'text-emerald-600' : 'text-red-600'
              }`}>
                {loginEfficiency.status === 'excellent' ? '우수' : 
                 loginEfficiency.status === 'good' ? '양호' : '개선 필요'}
              </Text>
            </div>
            <ProgressBar 
              value={Math.min(loginEfficiency.value || 0, 100)} 
              color={getEfficiencyColor(loginEfficiency.value || 0)}
              className="mt-2"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
            <div>
              <Text className="text-xs text-gray-500 uppercase tracking-wide">
                총 로그인
              </Text>
              <Text className="text-lg font-semibold text-gray-900">
                {(loginEfficiency.totalLogins || 0).toLocaleString('ko-KR')}
              </Text>
            </div>
            <div>
              <Text className="text-xs text-gray-500 uppercase tracking-wide">
                생성된 리포트
              </Text>
              <Text className="text-lg font-semibold text-gray-900">
                {(loginEfficiency.reportsGenerated || 0).toLocaleString('ko-KR')}
              </Text>
            </div>
          </div>
        </div>
      </Card>

      {/* Search to Report Efficiency */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Title className="text-lg font-semibold text-gray-900">
              검색 전환율
            </Title>
            <Text className="text-sm text-gray-600">
              검색 쿼리당 생성된 리포트 수
            </Text>
          </div>
          <div className="flex items-center space-x-2">
            {React.createElement(getEfficiencyIcon(searchConversion.value || 0), {
              className: `h-6 w-6 ${
                searchConversion.status === 'excellent' || searchConversion.status === 'good' ? 'text-emerald-600' : 'text-red-600'
              }`
            })}
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <div className="flex items-baseline space-x-2">
              <Metric className="text-2xl font-bold">
                {(searchConversion.value || 0).toFixed(1)}%
              </Metric>
              <Text className={`text-sm font-medium ${
                searchConversion.status === 'excellent' || searchConversion.status === 'good' ? 'text-emerald-600' : 'text-red-600'
              }`}>
                {searchConversion.status === 'excellent' ? '우수' : 
                 searchConversion.status === 'good' ? '양호' : '개선 필요'}
              </Text>
            </div>
            <ProgressBar 
              value={Math.min(searchConversion.value || 0, 100)} 
              color={getEfficiencyColor(searchConversion.value || 0)}
              className="mt-2"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
            <div>
              <Text className="text-xs text-gray-500 uppercase tracking-wide">
                총 검색
              </Text>
              <Text className="text-lg font-semibold text-gray-900">
                {(searchConversion.totalSearches || 0).toLocaleString('ko-KR')}
              </Text>
            </div>
            <div>
              <Text className="text-xs text-gray-500 uppercase tracking-wide">
                생성된 리포트
              </Text>
              <Text className="text-lg font-semibold text-gray-900">
                {(searchConversion.reportsGenerated || 0).toLocaleString('ko-KR')}
              </Text>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default EfficiencyMetrics;