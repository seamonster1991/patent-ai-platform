import React from 'react';
import { DonutChart, Card, Title, Text, Badge, Grid } from '@tremor/react';
import { ChartBarIcon, GlobeAltIcon } from '@heroicons/react/24/outline';

interface TechnologyField {
  field: string;
  count: number;
  percentage: number;
}

interface IPCAnalysisChartProps {
  title: string;
  subtitle: string;
  data: TechnologyField[];
  type: 'search' | 'report';
  category: 'field';
  icon?: React.ComponentType<{ className?: string }>;
}

const IPCAnalysisChart: React.FC<IPCAnalysisChartProps> = ({
  title,
  subtitle,
  data,
  type,
  category,
  icon
}) => {
  // 색상 팔레트 정의
  const colors = [
    'blue', 'emerald', 'violet', 'amber', 'rose', 
    'cyan', 'pink', 'indigo', 'teal', 'orange'
  ];

  // 차트 데이터 변환
  const chartData = data.map((item, index) => ({
    name: item.field,
    value: item.count,
    percentage: item.percentage,
    color: colors[index % colors.length]
  }));

  // 총 개수 계산
  const totalCount = data.reduce((sum, item) => sum + item.count, 0);

  // 상위 3개 기술 분야
  const topFields = data.slice(0, 3);

  // 아이콘 컴포넌트 렌더링
  const IconComponent = icon || ChartBarIcon;

  return (
    <Card className="h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <IconComponent className={`h-5 w-5 ${type === 'search' ? 'text-blue-500' : 'text-emerald-500'}`} />
          <div>
            <Title className="text-lg font-semibold">{title}</Title>
            <Text className="text-sm text-gray-600">{subtitle}</Text>
          </div>
        </div>
        <Badge 
          color={type === 'search' ? 'blue' : 'emerald'}
          size="sm"
        >
          {type === 'search' ? '검색 데이터' : '리포트 데이터'}
        </Badge>
      </div>

      {data.length > 0 ? (
        <div className="space-y-4">
          {/* 총 개수 표시 */}
          <div className="text-center">
            <Text className="text-2xl font-bold text-gray-900">{totalCount.toLocaleString()}</Text>
            <Text className="text-sm text-gray-600">
              총 {type === 'search' ? '검색' : '리포트'} 수
            </Text>
          </div>

          {/* 도넛 차트 */}
          <div className="h-64">
            <DonutChart
              data={chartData}
              category="value"
              index="name"
              colors={colors}
              showLabel={true}
              showAnimation={true}
              className="h-full"
            />
          </div>

          {/* 상위 기술 분야 리스트 */}
          <div className="space-y-2">
            <Text className="font-medium text-gray-900">주요 기술 분야</Text>
            {topFields.map((field, index) => (
              <div key={field.field} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div 
                    className={`w-3 h-3 rounded-full bg-${colors[index]}-500`}
                  />
                  <Text className="font-medium">{field.field}</Text>
                </div>
                <div className="text-right">
                  <Text className="font-semibold">{field.count}</Text>
                  <Text className="text-xs text-gray-500">{field.percentage}%</Text>
                </div>
              </div>
            ))}
          </div>

          {/* 전체 분야 요약 */}
          {data.length > 3 && (
            <div className="text-center pt-2 border-t">
              <Text className="text-sm text-gray-600">
                총 {data.length}개 기술 분야 분석됨
              </Text>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <ChartBarIcon className="h-12 w-12 mb-2" />
          <Text>분석할 데이터가 없습니다</Text>
          <Text className="text-sm">
            {type === 'search' ? '검색' : '리포트'} 활동을 시작해보세요
          </Text>
        </div>
      )}
    </Card>
  );
};

export default IPCAnalysisChart;