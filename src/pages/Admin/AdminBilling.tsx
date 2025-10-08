import React, { useEffect, useState } from 'react';
import { 
  Card, 
  Text, 
  Metric,
  BarChart,
  LineChart,
  Badge,
  Flex,
  ProgressBar
} from '@tremor/react';
import { 
  DollarSign, 
  TrendingDown, 
  TrendingUp, 
  CreditCard,
  AlertTriangle,
  Users,
  FileText,
  PieChart,
  Calendar,
  Target
} from 'lucide-react';
import { apiGet } from '../../lib/api';

interface BillingStats {
  summary: {
    totalRevenue: number;
    monthlyRevenue: number;
    averageRevenuePerUser: number;
    totalTransactions: number;
    revenueGrowth: number;
    userGrowth: number;
    conversionRate: number;
  };
  revenueByPlan: Array<{
    plan: string;
    revenue: number;
    users: number;
    percentage: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    revenue: number;
    users: number;
    transactions: number;
  }>;
  topSpenders: Array<{
    userId: string;
    email: string;
    totalSpent: number;
    lastPayment: string;
    plan: string;
  }>;
  paymentRisks: Array<{
    userId: string;
    email: string;
    riskLevel: 'high' | 'medium' | 'low';
    reason: string;
    lastActivity: string;
  }>;
}

const AdminBilling: React.FC = () => {
  const [billingStats, setBillingStats] = useState<BillingStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBillingStats = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('[DATA] [AdminBilling] 빌링 통계 데이터 로드 시작');

      // 개선된 API 함수 사용
      const response = await apiGet('/api/admin?resource=billing', {
        timeout: 30000,
        retries: 2,
        requireAuth: true
      });

      console.log('[DATA] [AdminBilling] API 응답:', response);

      if (!response.success) {
        throw new Error(response.error || '빌링 데이터를 가져오는데 실패했습니다.');
      }

      if (response.data) {
        setBillingStats(response.data);
        console.log('[DATA] [AdminBilling] 빌링 데이터 설정 완료');
      }
    } catch (error) {
      console.error('[ERROR] [AdminBilling] 빌링 통계 조회 오류:', error);
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingStats();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">오류: {error}</div>
      </div>
    );
  }

  if (!billingStats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">데이터가 없습니다.</div>
      </div>
    );
  }

  const { summary, revenueByPlan, monthlyTrends, topSpenders, paymentRisks } = billingStats;

  const getGrowthBadge = (value: number) => {
    if (value > 0) {
      return <Badge color="emerald" size="xs" icon={TrendingUp}>+{value.toFixed(1)}%</Badge>;
    } else if (value < 0) {
      return <Badge color="red" size="xs" icon={TrendingDown}>{value.toFixed(1)}%</Badge>;
    }
    return <Badge color="gray" size="xs">0%</Badge>;
  };

  const getRiskBadge = (level: string) => {
    switch (level) {
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

  // 차트 데이터 준비
  const revenueChartData = monthlyTrends.slice(-12).map(trend => ({
    month: trend.month,
    수익: trend.revenue,
    사용자: trend.users,
    거래: trend.transactions
  }));

  const planRevenueData = revenueByPlan.map(plan => ({
    plan: plan.plan,
    revenue: plan.revenue,
    users: plan.users
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-ms-text mb-2">빌링 & 수익 관리</h1>
        <p className="text-gray-600">수익 현황과 결제 관리를 확인하세요</p>
      </div>

      {/* 핵심 수익 지표 */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-ms-text">핵심 수익 지표</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* 총 수익 */}
          <Card className="border-0 shadow-sm">
            <Flex alignItems="start">
              <div>
                <Text className="text-gray-600">총 수익</Text>
                <Metric className="text-ms-text">${summary.totalRevenue.toLocaleString()}</Metric>
              </div>
              <DollarSign className="h-8 w-8 text-ms-olive" />
            </Flex>
            <Flex className="mt-4">
              <Text className="text-sm text-gray-600">성장률</Text>
              {getGrowthBadge(summary.revenueGrowth)}
            </Flex>
          </Card>

          {/* 월간 수익 */}
          <Card className="border-0 shadow-sm">
            <Flex alignItems="start">
              <div>
                <Text className="text-gray-600">월간 수익</Text>
                <Metric className="text-ms-text">${summary.monthlyRevenue.toLocaleString()}</Metric>
              </div>
              <Calendar className="h-8 w-8 text-ms-olive" />
            </Flex>
            <Flex className="mt-4">
              <Text className="text-sm text-gray-600">전월 대비</Text>
              {getGrowthBadge(summary.revenueGrowth)}
            </Flex>
          </Card>

          {/* 사용자당 평균 수익 */}
          <Card className="border-0 shadow-sm">
            <Flex alignItems="start">
              <div>
                <Text className="text-gray-600">사용자당 평균 수익</Text>
                <Metric className="text-ms-text">${summary.averageRevenuePerUser.toFixed(2)}</Metric>
              </div>
              <Users className="h-8 w-8 text-ms-olive" />
            </Flex>
            <Flex className="mt-4">
              <Text className="text-sm text-gray-600">사용자 증가율</Text>
              {getGrowthBadge(summary.userGrowth)}
            </Flex>
          </Card>

          {/* 총 거래 */}
          <Card className="border-0 shadow-sm">
            <Flex alignItems="start">
              <div>
                <Text className="text-gray-600">총 거래</Text>
                <Metric className="text-ms-text">{summary.totalTransactions.toLocaleString()}</Metric>
              </div>
              <CreditCard className="h-8 w-8 text-ms-olive" />
            </Flex>
            <Flex className="mt-4">
              <Text className="text-sm text-gray-600">전환율</Text>
              <Badge color="blue" size="xs">{summary.conversionRate.toFixed(1)}%</Badge>
            </Flex>
          </Card>
        </div>
      </div>

      {/* 수익 트렌드 */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-ms-text">수익 트렌드</h2>
        
        <Card className="border-0 shadow-sm">
          <div className="mb-4">
            <Text className="text-lg font-semibold text-ms-text">월별 수익 현황</Text>
            <Text className="text-gray-600">최근 12개월 수익 및 사용자 증가 추이</Text>
          </div>
          <LineChart
            className="h-80"
            data={revenueChartData}
            index="month"
            categories={["수익", "사용자", "거래"]}
            colors={["emerald", "blue", "violet"]}
            valueFormatter={(value) => value.toLocaleString()}
            yAxisWidth={80}
            showAnimation={true}
          />
        </Card>
      </div>

      {/* 플랜별 수익 분석 */}
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <PieChart className="h-6 w-6 text-ms-olive" />
          <h2 className="text-xl font-semibold text-ms-text">플랜별 수익 분석</h2>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 플랜별 수익 차트 */}
          <Card className="border-0 shadow-sm">
            <div className="mb-4">
              <Text className="text-lg font-semibold text-ms-text">플랜별 수익 분포</Text>
              <Text className="text-gray-600">구독 플랜별 수익 현황</Text>
            </div>
            <BarChart
              className="h-80"
              data={planRevenueData}
              index="plan"
              categories={["revenue"]}
              colors={["emerald"]}
              valueFormatter={(value) => `$${value.toLocaleString()}`}
              yAxisWidth={80}
              showAnimation={true}
            />
          </Card>

          {/* 플랜별 상세 통계 */}
          <Card className="border-0 shadow-sm">
            <div className="mb-4">
              <Text className="text-lg font-semibold text-ms-text">플랜별 상세 현황</Text>
              <Text className="text-gray-600">각 플랜의 수익과 사용자 수</Text>
            </div>
            <div className="space-y-4">
              {revenueByPlan.map((plan, index) => (
                <div key={plan.plan} className="space-y-2">
                  <Flex>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-ms-olive rounded-full"></div>
                      <Text className="font-medium text-ms-text">{plan.plan}</Text>
                    </div>
                    <Text className="text-gray-600">${plan.revenue.toLocaleString()}</Text>
                  </Flex>
                  <Flex>
                    <Text className="text-sm text-gray-600">{plan.users}명 사용자</Text>
                    <Text className="text-sm text-gray-600">{plan.percentage.toFixed(1)}%</Text>
                  </Flex>
                  <ProgressBar 
                    value={plan.percentage} 
                    color="emerald" 
                    className="mt-2"
                  />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* 고액 사용자 */}
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <Target className="h-6 w-6 text-ms-olive" />
          <h2 className="text-xl font-semibold text-ms-text">고액 사용자</h2>
        </div>
        
        <Card className="border-0 shadow-sm">
          <div className="mb-4">
            <Text className="text-lg font-semibold text-ms-text">TOP 고액 사용자</Text>
            <Text className="text-gray-600">가장 많이 지출한 사용자 목록</Text>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-ms-text">순위</th>
                  <th className="text-left py-3 px-4 font-semibold text-ms-text">사용자</th>
                  <th className="text-left py-3 px-4 font-semibold text-ms-text">총 지출</th>
                  <th className="text-left py-3 px-4 font-semibold text-ms-text">플랜</th>
                  <th className="text-left py-3 px-4 font-semibold text-ms-text">최근 결제</th>
                </tr>
              </thead>
              <tbody>
                {topSpenders.map((spender, index) => (
                  <tr key={spender.userId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="w-6 h-6 bg-ms-olive text-white rounded-full flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <Text className="font-medium text-ms-text">{spender.email}</Text>
                        <Text className="text-xs text-gray-500">ID: {spender.userId}</Text>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Text className="font-semibold text-emerald-600">${spender.totalSpent.toLocaleString()}</Text>
                    </td>
                    <td className="py-3 px-4">
                      <Badge color="blue" size="xs">{spender.plan}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Text className="text-sm text-gray-600">
                        {new Date(spender.lastPayment).toLocaleDateString('ko-KR')}
                      </Text>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {topSpenders.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              고액 사용자 데이터가 없습니다.
            </div>
          )}
        </Card>
      </div>

      {/* 결제 위험 관리 */}
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <AlertTriangle className="h-6 w-6 text-red-500" />
          <h2 className="text-xl font-semibold text-ms-text">결제 위험 관리</h2>
        </div>
        
        <Card className="border-0 shadow-sm">
          <div className="mb-4">
            <Text className="text-lg font-semibold text-ms-text">결제 위험 사용자</Text>
            <Text className="text-gray-600">결제 문제가 예상되는 사용자 목록</Text>
          </div>
          
          <div className="space-y-3">
            {paymentRisks.map((risk) => (
              <div key={risk.userId} className="p-4 border border-gray-200 rounded-lg">
                <Flex>
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <div>
                      <Text className="font-medium text-ms-text">{risk.email}</Text>
                      <Text className="text-xs text-gray-500">ID: {risk.userId}</Text>
                    </div>
                  </div>
                  {getRiskBadge(risk.riskLevel)}
                </Flex>
                <div className="mt-2">
                  <Text className="text-sm text-gray-600">{risk.reason}</Text>
                  <Text className="text-xs text-gray-500 mt-1">
                    최근 활동: {new Date(risk.lastActivity).toLocaleDateString('ko-KR')}
                  </Text>
                </div>
              </div>
            ))}
            
            {paymentRisks.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                현재 결제 위험 사용자가 없습니다.
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* 수익 요약 */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-ms-text">수익 요약</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-0 shadow-sm bg-emerald-50">
            <div className="text-center">
              <DollarSign className="h-12 w-12 text-emerald-600 mx-auto mb-2" />
              <Metric className="text-emerald-800">${summary.totalRevenue.toLocaleString()}</Metric>
              <Text className="text-emerald-600">총 누적 수익</Text>
            </div>
          </Card>
          
          <Card className="border-0 shadow-sm bg-blue-50">
            <div className="text-center">
              <Users className="h-12 w-12 text-blue-600 mx-auto mb-2" />
              <Metric className="text-blue-800">${summary.averageRevenuePerUser.toFixed(2)}</Metric>
              <Text className="text-blue-600">사용자당 평균 수익</Text>
            </div>
          </Card>
          
          <Card className="border-0 shadow-sm bg-violet-50">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 text-violet-600 mx-auto mb-2" />
              <Metric className="text-violet-800">{summary.conversionRate.toFixed(1)}%</Metric>
              <Text className="text-violet-600">전환율</Text>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminBilling;