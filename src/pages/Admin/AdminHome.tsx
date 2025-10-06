import React, { useEffect } from 'react';
import { useAdminStore } from '@/store/adminStore';
import { 
  Card, 
  Metric, 
  Text, 
  Flex, 
  BadgeDelta, 
  DeltaType,
  LineChart,
  ProgressBar
} from '@tremor/react';
import { 
  DollarSign, 
  Zap, 
  AlertTriangle, 
  TrendingUp,
  Server,
  Database
} from 'lucide-react';

const AdminHome: React.FC = () => {
  const {
    systemMetrics,
    isLoading,
    fetchSystemMetrics
  } = useAdminStore();

  useEffect(() => {
    fetchSystemMetrics();
  }, [fetchSystemMetrics]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  const getDeltaType = (value: number): DeltaType => {
    if (value > 0) return 'increase';
    if (value < 0) return 'decrease';
    return 'unchanged';
  };

  const getStatusColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return 'emerald';
    if (value <= thresholds.warning) return 'yellow';
    return 'red';
  };

  // Mock chart data for LLM cost trends
  const costTrendData = [
    { date: '1월', cost: 980 },
    { date: '2월', cost: 1120 },
    { date: '3월', cost: 1050 },
    { date: '4월', cost: 1180 },
    { date: '5월', cost: 1250 },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-ms-text mb-2">운영 효율 &amp; 비용 통제</h1>
        <p className="text-gray-600">시스템 성능과 비용 최적화 현황을 모니터링합니다</p>
      </div>

      {/* LLM 비용 및 사용량 섹션 */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-ms-text">LLM 비용 &amp; 사용량</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* LLM 비용 */}
          <Card className="border-0 shadow-sm">
            <Flex alignItems="start">
              <div>
                <Text className="text-gray-600">월간 LLM 비용</Text>
                <Metric className="text-ms-text">${systemMetrics?.llmCost.toLocaleString()}</Metric>
              </div>
              <DollarSign className="h-8 w-8 text-ms-olive" />
            </Flex>
            <Flex className="mt-4">
              <BadgeDelta 
                deltaType="unchanged"
                size="xs"
              >
                변화 없음
              </BadgeDelta>
              <Text className="text-xs text-gray-500">전월 대비</Text>
            </Flex>
          </Card>

          {/* LLM 사용량 */}
          <Card className="border-0 shadow-sm">
            <Flex alignItems="start">
              <div>
                <Text className="text-gray-600">토큰 사용량</Text>
                <Metric className="text-ms-text">{systemMetrics?.llmUsage.toLocaleString()}</Metric>
              </div>
              <Zap className="h-8 w-8 text-ms-olive" />
            </Flex>
            <Flex className="mt-4">
              <BadgeDelta 
                deltaType="unchanged"
                size="xs"
              >
                변화 없음
              </BadgeDelta>
              <Text className="text-xs text-gray-500">전월 대비</Text>
            </Flex>
          </Card>

          {/* 캐싱 히트율 */}
          <Card className="border-0 shadow-sm">
            <Flex alignItems="start">
              <div>
                <Text className="text-gray-600">캐싱 히트율</Text>
                <Metric className="text-ms-text">{systemMetrics?.cachingHitRate}%</Metric>
              </div>
              <Database className="h-8 w-8 text-ms-olive" />
            </Flex>
            <div className="mt-4">
              <ProgressBar 
                value={systemMetrics?.cachingHitRate || 0} 
                color="emerald"
                className="mt-2"
              />
              <Text className="text-xs text-gray-500 mt-1">절감 비용: $450</Text>
            </div>
          </Card>

          {/* 예상 절감액 */}
          <Card className="border-0 shadow-sm">
            <Flex alignItems="start">
              <div>
                <Text className="text-gray-600">월간 절감액</Text>
                <Metric className="text-emerald-600">$450</Metric>
              </div>
              <TrendingUp className="h-8 w-8 text-emerald-500" />
            </Flex>
            <Flex className="mt-4">
              <BadgeDelta deltaType="increase" size="xs">
                +15.2%
              </BadgeDelta>
              <Text className="text-xs text-gray-500">캐싱 효과</Text>
            </Flex>
          </Card>
        </div>

        {/* LLM 비용 추이 차트 */}
        <Card className="border-0 shadow-sm">
          <div className="mb-4">
            <Text className="text-lg font-semibold text-ms-text">LLM 비용 추이</Text>
            <Text className="text-gray-600">최근 5개월간 비용 변화</Text>
          </div>
          <LineChart
            className="h-72"
            data={costTrendData}
            index="date"
            categories={["cost"]}
            colors={["emerald"]}
            valueFormatter={(value) => `$${value}`}
            yAxisWidth={60}
            showAnimation={true}
          />
        </Card>
      </div>

      {/* 시스템 건전성 섹션 */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-ms-text">시스템 건전성</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* API 지연시간 */}
          <Card className="border-0 shadow-sm">
            <Flex alignItems="start">
              <div>
                <Text className="text-gray-600">API 지연시간</Text>
                <Metric className="text-ms-text">{systemMetrics?.apiLatency}ms</Metric>
              </div>
              <Server className="h-8 w-8 text-ms-olive" />
            </Flex>
            <div className="mt-4">
              <ProgressBar 
                value={Math.min((systemMetrics?.apiLatency || 0) / 500 * 100, 100)} 
                color={getStatusColor(systemMetrics?.apiLatency || 0, { good: 100, warning: 200 })}
                className="mt-2"
              />
              <Text className="text-xs text-gray-500 mt-1">
                목표: &lt;100ms
              </Text>
            </div>
          </Card>

          {/* 오류 발생률 */}
          <Card className="border-0 shadow-sm">
            <Flex alignItems="start">
              <div>
                <Text className="text-gray-600">오류 발생률</Text>
                <Metric className="text-ms-text">{systemMetrics?.errorRate}%</Metric>
              </div>
              <AlertTriangle className="h-8 w-8 text-ms-olive" />
            </Flex>
            <div className="mt-4">
              <ProgressBar 
                value={systemMetrics?.errorRate || 0} 
                color={getStatusColor(systemMetrics?.errorRate || 0, { good: 1, warning: 3 })}
                className="mt-2"
              />
              <Text className="text-xs text-gray-500 mt-1">
                목표: &lt;1%
              </Text>
            </div>
          </Card>

          {/* 시스템 상태 */}
          <Card className="border-0 shadow-sm">
            <Flex alignItems="start">
              <div>
                <Text className="text-gray-600">전체 시스템 상태</Text>
                <Metric className="text-emerald-600">정상</Metric>
              </div>
              <div className="h-8 w-8 bg-emerald-100 rounded-full flex items-center justify-center">
                <div className="h-4 w-4 bg-emerald-500 rounded-full"></div>
              </div>
            </Flex>
            <div className="mt-4">
              <Text className="text-xs text-gray-500">
                마지막 업데이트: 방금 전
              </Text>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminHome;