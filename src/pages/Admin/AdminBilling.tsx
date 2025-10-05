import React, { useEffect } from 'react';
import { useAdminStore } from '@/store/adminStore';
import { 
  Card, 
  Text, 
  Metric,
  BarChart,
  Badge,
  Flex,
  BadgeDelta,
  DeltaType
} from '@tremor/react';
import { 
  DollarSign, 
  TrendingDown, 
  TrendingUp, 
  CreditCard,
  AlertTriangle,
  Users,
  FileText,
  PieChart
} from 'lucide-react';

const AdminBilling: React.FC = () => {
  const { 
    revenueStats,
    paymentRisks,
    loading, 
    error, 
    fetchRevenueStats,
    fetchPaymentRisks
  } = useAdminStore();

  useEffect(() => {
    fetchRevenueStats();
    fetchPaymentRisks();
  }, [fetchRevenueStats, fetchPaymentRisks]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
          <span className="text-red-700">{error}</span>
        </div>
      </div>
    );
  }

  const getDeltaType = (value: number): DeltaType => {
    if (value > 0) return 'increase';
    if (value < 0) return 'decrease';
    return 'unchanged';
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return <Badge color="red" size="xs">높음</Badge>;
      case 'medium':
        return <Badge color="yellow" size="xs">보통</Badge>;
      case 'low':
        return <Badge color="green" size="xs">낮음</Badge>;
      default:
        return <Badge color="gray" size="xs">알 수 없음</Badge>;
    }
  };

  // Mock data for report type preferences
  const reportTypeData = [
    { type: '시장분석', count: 450, percentage: 65 },
    { type: '비즈니스인사이트', count: 242, percentage: 35 }
  ];

  // Mock data for revenue trends
  const revenueTrendData = [
    { month: '1월', mrr: 12500, arr: 150000 },
    { month: '2월', mrr: 13200, arr: 158400 },
    { month: '3월', mrr: 14100, arr: 169200 },
    { month: '4월', mrr: 14800, arr: 177600 },
    { month: '5월', mrr: 15750, arr: 189000 },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-ms-text mb-2">수익 &amp; 구독 관리</h1>
        <p className="text-gray-600">매출 현황과 구독 관리, 결제 위험 요소를 모니터링합니다</p>
      </div>

      {/* 핵심 수익 지표 */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-ms-text">핵심 수익 지표</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* MRR */}
          <Card className="border-0 shadow-sm">
            <Flex alignItems="start">
              <div>
                <Text className="text-gray-600">월간 반복 수익 (MRR)</Text>
                <Metric className="text-ms-text">${revenueStats?.mrr.toLocaleString()}</Metric>
              </div>
              <DollarSign className="h-8 w-8 text-ms-olive" />
            </Flex>
            <Flex className="mt-4">
              <BadgeDelta 
                deltaType={getDeltaType(revenueStats?.mrrChange || 0)}
                size="xs"
              >
                {revenueStats?.mrrChange > 0 ? '+' : ''}{revenueStats?.mrrChange}%
              </BadgeDelta>
              <Text className="text-xs text-gray-500">전월 대비</Text>
            </Flex>
          </Card>

          {/* Churn Rate */}
          <Card className="border-0 shadow-sm">
            <Flex alignItems="start">
              <div>
                <Text className="text-gray-600">이탈률 (Churn Rate)</Text>
                <Metric className="text-ms-text">{revenueStats?.churnRate}%</Metric>
              </div>
              <TrendingDown className="h-8 w-8 text-ms-olive" />
            </Flex>
            <Flex className="mt-4">
              <BadgeDelta 
                deltaType={getDeltaType(-(revenueStats?.churnChange || 0))}
                size="xs"
              >
                {revenueStats?.churnChange > 0 ? '+' : ''}{revenueStats?.churnChange}%
              </BadgeDelta>
              <Text className="text-xs text-gray-500">전월 대비</Text>
            </Flex>
          </Card>

          {/* ARR */}
          <Card className="border-0 shadow-sm">
            <Flex alignItems="start">
              <div>
                <Text className="text-gray-600">연간 반복 수익 (ARR)</Text>
                <Metric className="text-ms-text">${revenueStats?.arr.toLocaleString()}</Metric>
              </div>
              <TrendingUp className="h-8 w-8 text-ms-olive" />
            </Flex>
            <Flex className="mt-4">
              <BadgeDelta 
                deltaType={getDeltaType(revenueStats?.arrChange || 0)}
                size="xs"
              >
                {revenueStats?.arrChange > 0 ? '+' : ''}{revenueStats?.arrChange}%
              </BadgeDelta>
              <Text className="text-xs text-gray-500">전년 대비</Text>
            </Flex>
          </Card>
        </div>

        {/* 수익 추이 차트 */}
        <Card className="border-0 shadow-sm">
          <div className="mb-4">
            <Text className="text-lg font-semibold text-ms-text">수익 추이</Text>
            <Text className="text-gray-600">월간 및 연간 반복 수익 변화</Text>
          </div>
          <BarChart
            className="h-64"
            data={revenueTrendData}
            index="month"
            categories={["mrr", "arr"]}
            colors={["emerald", "blue"]}
            valueFormatter={(value) => `$${value.toLocaleString()}`}
            yAxisWidth={80}
            showAnimation={true}
          />
        </Card>
      </div>

      {/* 결제 위험 알림 */}
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <AlertTriangle className="h-6 w-6 text-ms-olive" />
          <h2 className="text-xl font-semibold text-ms-text">결제 위험 알림</h2>
        </div>
        
        <Card className="border-0 shadow-sm">
          <div className="mb-4">
            <Text className="text-lg font-semibold text-ms-text">결제 문제 사용자</Text>
            <Text className="text-gray-600">결제 실패 및 카드 만료 임박 사용자 목록</Text>
          </div>
          
          {paymentRisks.length > 0 ? (
            <div className="space-y-3">
              {paymentRisks.map((risk, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <CreditCard className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="font-medium text-ms-text">{risk.email}</div>
                      <div className="text-sm text-gray-600">{risk.issue}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {getSeverityBadge(risk.severity)}
                    <button className="text-ms-olive hover:text-ms-text text-sm font-medium">
                      처리하기
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              현재 결제 위험 요소가 없습니다.
            </div>
          )}
        </Card>
      </div>

      {/* 리포트 유형 선호도 */}
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <PieChart className="h-6 w-6 text-ms-olive" />
          <h2 className="text-xl font-semibold text-ms-text">리포트 유형 선호도</h2>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 선호도 차트 */}
          <Card className="border-0 shadow-sm">
            <div className="mb-4">
              <Text className="text-lg font-semibold text-ms-text">리포트 생성 비율</Text>
              <Text className="text-gray-600">시장분석 vs 비즈니스인사이트</Text>
            </div>
            <BarChart
              className="h-48"
              data={reportTypeData}
              index="type"
              categories={["count"]}
              colors={["emerald"]}
              valueFormatter={(value) => `${value}건`}
              yAxisWidth={60}
              showAnimation={true}
            />
          </Card>

          {/* 상세 통계 */}
          <Card className="border-0 shadow-sm">
            <div className="mb-4">
              <Text className="text-lg font-semibold text-ms-text">리포트 유형별 상세</Text>
              <Text className="text-gray-600">각 유형별 생성 현황</Text>
            </div>
            <div className="space-y-4">
              {reportTypeData.map((report) => (
                <div key={report.type} className="space-y-2">
                  <Flex>
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-ms-olive" />
                      <Text className="font-medium text-ms-text">{report.type}</Text>
                    </div>
                    <Text className="text-gray-600">{report.count}건 ({report.percentage}%)</Text>
                  </Flex>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-ms-olive h-2 rounded-full transition-all duration-300"
                      style={{ width: `${report.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
              
              <div className="mt-6 p-4 bg-emerald-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  <Text className="font-medium text-emerald-800">인사이트</Text>
                </div>
                <Text className="text-sm text-emerald-700">
                  시장분석 리포트가 65%로 높은 선호도를 보이고 있습니다. 
                  비즈니스인사이트 기능 개선을 통해 균형을 맞출 수 있습니다.
                </Text>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminBilling;