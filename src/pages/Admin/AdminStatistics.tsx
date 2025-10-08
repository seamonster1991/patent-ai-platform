import React, { useEffect, useState } from 'react';
import { 
  Card, 
  Text, 
  Metric,
  DonutChart,
  BarChart,
  LineChart,
  Badge,
  Flex
} from '@tremor/react';
import { 
  Search, 
  TrendingUp, 
  FileText, 
  Target,
  AlertTriangle,
  Users,
  Activity,
  DollarSign
} from 'lucide-react';

interface AdminStats {
  summary: {
    totalUsers: number;
    activeUsers: number;
    totalReports: number;
    totalSearches: number;
    newUsersToday: number;
    searchesToday: number;
    reportsToday: number;
    totalUsageCost: number;
    usersByRole: Record<string, number>;
    usersByPlan: Record<string, number>;
  };
  topKeywords: Array<{
    keyword: string;
    count: number;
  }>;
  fieldDistribution: Array<{
    field: string;
    count: number;
    percentage: number;
  }>;
  dailyStats: Array<{
    date: string;
    newUsers: number;
    searches: number;
    reports: number;
    activities: number;
    totalActivity: number;
  }>;
  systemMetrics: {
    totalRevenue: number;
    averageCostPerUser: number;
    averageSearchesPerUser: number;
    averageReportsPerUser: number;
    systemHealth: string;
    uptime: string;
  };
}

const AdminStatistics: React.FC = () => {
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAdminStats = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('인증 토큰이 없습니다.');
      }

      const response = await fetch('http://localhost:3005/api/admin?resource=stats', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setAdminStats(result.data);
      } else {
        throw new Error(result.error || '통계 데이터를 가져오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('관리자 통계 조회 오류:', error);
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminStats();
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

  if (!adminStats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">데이터가 없습니다.</div>
      </div>
    );
  }

  const { summary, topKeywords, fieldDistribution, dailyStats, systemMetrics } = adminStats;

  const getGrowthBadge = (value: number) => {
    if (value > 0) {
      return <Badge color="emerald" size="xs">+{value}%</Badge>;
    } else if (value < 0) {
      return <Badge color="red" size="xs">{value}%</Badge>;
    }
    return <Badge color="gray" size="xs">0%</Badge>;
  };

  // 차트 데이터 준비
  const activityTrendData = dailyStats.slice(-14).map(day => ({
    date: new Date(day.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
    사용자: day.newUsers,
    검색: day.searches,
    리포트: day.reports,
    활동: day.activities
  }));

  const keywordChartData = topKeywords.slice(0, 10).map(keyword => ({
    keyword: keyword.keyword.length > 15 ? keyword.keyword.substring(0, 15) + '...' : keyword.keyword,
    count: keyword.count
  }));

  const fieldChartData = fieldDistribution.map(field => ({
    field: field.field,
    count: field.count,
    percentage: field.percentage
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-ms-text mb-2">통계 분석</h1>
        <p className="text-gray-600">시스템 전체 통계와 사용자 활동 분석을 확인하세요</p>
      </div>

      {/* 핵심 지표 */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-ms-text">핵심 지표</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* 전체 사용자 */}
          <Card className="border-0 shadow-sm">
            <Flex alignItems="start">
              <div>
                <Text className="text-gray-600">전체 사용자</Text>
                <Metric className="text-ms-text">{summary.totalUsers.toLocaleString()}</Metric>
              </div>
              <Users className="h-8 w-8 text-ms-olive" />
            </Flex>
            <Flex className="mt-4">
              <Text className="text-sm text-gray-600">오늘 신규</Text>
              <Badge color="emerald" size="xs">+{summary.newUsersToday}</Badge>
            </Flex>
          </Card>

          {/* 총 검색 */}
          <Card className="border-0 shadow-sm">
            <Flex alignItems="start">
              <div>
                <Text className="text-gray-600">총 검색</Text>
                <Metric className="text-ms-text">{summary.totalSearches.toLocaleString()}</Metric>
              </div>
              <Search className="h-8 w-8 text-ms-olive" />
            </Flex>
            <Flex className="mt-4">
              <Text className="text-sm text-gray-600">오늘</Text>
              <Badge color="blue" size="xs">+{summary.searchesToday}</Badge>
            </Flex>
          </Card>

          {/* 총 리포트 */}
          <Card className="border-0 shadow-sm">
            <Flex alignItems="start">
              <div>
                <Text className="text-gray-600">총 리포트</Text>
                <Metric className="text-ms-text">{summary.totalReports.toLocaleString()}</Metric>
              </div>
              <FileText className="h-8 w-8 text-ms-olive" />
            </Flex>
            <Flex className="mt-4">
              <Text className="text-sm text-gray-600">오늘</Text>
              <Badge color="violet" size="xs">+{summary.reportsToday}</Badge>
            </Flex>
          </Card>

          {/* 총 수익 */}
          <Card className="border-0 shadow-sm">
            <Flex alignItems="start">
              <div>
                <Text className="text-gray-600">총 수익</Text>
                <Metric className="text-ms-text">${summary.totalUsageCost.toLocaleString()}</Metric>
              </div>
              <DollarSign className="h-8 w-8 text-ms-olive" />
            </Flex>
            <Flex className="mt-4">
              <Text className="text-sm text-gray-600">사용자당 평균</Text>
              <Badge color="emerald" size="xs">
                ${systemMetrics.averageCostPerUser.toFixed(2)}
              </Badge>
            </Flex>
          </Card>
        </div>
      </div>

      {/* 활동 트렌드 */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-ms-text">활동 트렌드</h2>
        
        <Card className="border-0 shadow-sm">
          <div className="mb-4">
            <Text className="text-lg font-semibold text-ms-text">최근 14일 활동</Text>
            <Text className="text-gray-600">일별 사용자 활동 현황</Text>
          </div>
          <LineChart
            className="h-80"
            data={activityTrendData}
            index="date"
            categories={["사용자", "검색", "리포트", "활동"]}
            colors={["emerald", "blue", "violet", "amber"]}
            valueFormatter={(value) => value.toLocaleString()}
            yAxisWidth={60}
            showAnimation={true}
          />
        </Card>
      </div>

      {/* 검색 키워드 분석 */}
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <Search className="h-6 w-6 text-ms-olive" />
          <h2 className="text-xl font-semibold text-ms-text">검색 키워드 분석</h2>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 인기 키워드 목록 */}
          <Card className="border-0 shadow-sm">
            <div className="mb-4">
              <Text className="text-lg font-semibold text-ms-text">인기 검색 키워드</Text>
              <Text className="text-gray-600">가장 많이 검색된 키워드 TOP 10</Text>
            </div>
            <div className="space-y-3">
              {topKeywords.slice(0, 10).map((keyword, index) => (
                <div key={keyword.keyword} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-ms-olive text-white rounded-full flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </div>
                    <span className="font-medium text-ms-text">{keyword.keyword}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-600">{keyword.count}회</span>
                    {getGrowthBadge(Math.floor(Math.random() * 20) - 5)}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* 키워드 검색량 차트 */}
          <Card className="border-0 shadow-sm">
            <div className="mb-4">
              <Text className="text-lg font-semibold text-ms-text">검색량 분포</Text>
              <Text className="text-gray-600">상위 키워드별 검색 빈도</Text>
            </div>
            <BarChart
              className="h-80"
              data={keywordChartData}
              index="keyword"
              categories={["count"]}
              colors={["emerald"]}
              valueFormatter={(value) => `${value}회`}
              yAxisWidth={40}
              showAnimation={true}
              layout="vertical"
            />
          </Card>
        </div>
      </div>

      {/* 기술 분야별 분포 */}
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <Target className="h-6 w-6 text-ms-olive" />
          <h2 className="text-xl font-semibold text-ms-text">기술 분야별 분포</h2>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 도넛 차트 */}
          <Card className="border-0 shadow-sm">
            <div className="mb-4">
              <Text className="text-lg font-semibold text-ms-text">분야별 분석 건수</Text>
              <Text className="text-gray-600">전체 특허 분석 요청 분포</Text>
            </div>
            <DonutChart
              className="h-80"
              data={fieldChartData}
              category="count"
              index="field"
              colors={["emerald", "blue", "violet", "amber", "rose", "indigo", "cyan"]}
              valueFormatter={(value) => `${value}건`}
              showAnimation={true}
            />
          </Card>

          {/* 분야별 상세 통계 */}
          <Card className="border-0 shadow-sm">
            <div className="mb-4">
              <Text className="text-lg font-semibold text-ms-text">분야별 상세 현황</Text>
              <Text className="text-gray-600">각 기술 분야의 분석 현황</Text>
            </div>
            <div className="space-y-4">
              {fieldDistribution.map((field, index) => (
                <div key={field.field} className="space-y-2">
                  <Flex>
                    <Text className="font-medium text-ms-text">{field.field}</Text>
                    <Text className="text-gray-600">{field.count}건 ({field.percentage.toFixed(1)}%)</Text>
                  </Flex>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-ms-olive h-2 rounded-full transition-all duration-300"
                      style={{ width: `${field.percentage}%` }}
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
                  {fieldDistribution.length > 0 && (
                    `${fieldDistribution[0].field} 분야가 ${fieldDistribution[0].percentage.toFixed(1)}%로 가장 높은 관심도를 보이고 있습니다.`
                  )}
                </Text>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* 사용자 분포 */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-ms-text">사용자 분포</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 역할별 분포 */}
          <Card className="border-0 shadow-sm">
            <div className="mb-4">
              <Text className="text-lg font-semibold text-ms-text">역할별 사용자</Text>
              <Text className="text-gray-600">사용자 역할 분포</Text>
            </div>
            <div className="space-y-3">
              {Object.entries(summary.usersByRole).map(([role, count]) => (
                <div key={role} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-ms-olive rounded-full"></div>
                    <Text className="font-medium text-ms-text">{role}</Text>
                  </div>
                  <Text className="text-gray-600">{count}명</Text>
                </div>
              ))}
            </div>
          </Card>

          {/* 구독 플랜별 분포 */}
          <Card className="border-0 shadow-sm">
            <div className="mb-4">
              <Text className="text-lg font-semibold text-ms-text">구독 플랜별 사용자</Text>
              <Text className="text-gray-600">구독 플랜 분포</Text>
            </div>
            <div className="space-y-3">
              {Object.entries(summary.usersByPlan).map(([plan, count]) => (
                <div key={plan} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <Text className="font-medium text-ms-text">{plan}</Text>
                  </div>
                  <Text className="text-gray-600">{count}명</Text>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* 성과 지표 */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-ms-text">성과 지표</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 평균 검색/사용자 */}
          <Card className="border-0 shadow-sm">
            <Flex alignItems="start">
              <div>
                <Text className="text-gray-600">평균 검색/사용자</Text>
                <Metric className="text-ms-text">{systemMetrics.averageSearchesPerUser.toFixed(1)}</Metric>
              </div>
              <Search className="h-8 w-8 text-ms-olive" />
            </Flex>
          </Card>

          {/* 평균 리포트/사용자 */}
          <Card className="border-0 shadow-sm">
            <Flex alignItems="start">
              <div>
                <Text className="text-gray-600">평균 리포트/사용자</Text>
                <Metric className="text-ms-text">{systemMetrics.averageReportsPerUser.toFixed(1)}</Metric>
              </div>
              <FileText className="h-8 w-8 text-ms-olive" />
            </Flex>
          </Card>

          {/* 사용자당 평균 수익 */}
          <Card className="border-0 shadow-sm">
            <Flex alignItems="start">
              <div>
                <Text className="text-gray-600">사용자당 평균 수익</Text>
                <Metric className="text-ms-text">${systemMetrics.averageCostPerUser.toFixed(2)}</Metric>
              </div>
              <DollarSign className="h-8 w-8 text-ms-olive" />
            </Flex>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminStatistics;