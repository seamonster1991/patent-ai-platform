import React, { useState, useEffect } from 'react';
import { Card } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { Badge } from '@/components/UI/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/UI/Tabs';
import { Select } from '@/components/UI/Select';
import UserManagement from '@/components/Admin/UserManagement';
import PaymentManagement from '@/components/Admin/PaymentManagement';
import KPICard from '@/components/Admin/KPICard';
import TrendChart from '@/components/Admin/charts/TrendChart';
import InsightBarChart from '@/components/Admin/charts/InsightBarChart';
import TopPatentFieldsChart from '@/components/TopPatentFieldsChart';
import LoadingSkeleton from '@/components/Admin/LoadingSkeleton';
import '@/styles/admin-dashboard.css';
import { 
  Users, 
  UserCheck, 
  LogIn, 
  Search, 
  FileText, 
  DollarSign,
  TrendingUp,
  BarChart3,
  Activity,
  Calendar,
  Download,
  RefreshCw
} from 'lucide-react';

// 인터페이스 정의 - API 응답 구조에 맞게 수정
interface KPIStats {
  total_logins: { value: number; change_rate: number };
  total_searches: { value: number; change_rate: number };
  total_reports: { value: number; change_rate: number };
  total_revenue: { value: number; change_rate: number };
  total_all_users: { value: number; change_rate: number }; // 총 사용자수 (삭제된 계정 포함)
  total_users: { value: number; change_rate: number }; // 총 회원수 (실제 활동중인 계정)
  free_members: { value: number; change_rate: number }; // 무료 회원
  paid_members: { value: number; change_rate: number }; // 유료 회원
  total_members: { value: number; change_rate: number }; // 총 회원수 (무료+유료)
  market_reports: { value: number; change_rate: number };
  business_reports: { value: number; change_rate: number };
}

interface EfficiencyMetrics {
  avg_logins_per_user: number;
  avg_searches_per_user: number;
  avg_market_reports_per_user: number;
  avg_business_reports_per_user: number;
  avg_total_reports_per_user: number;
}

interface ConversionRates {
  login_to_report: number;
  search_to_report: number;
}

interface DailyTrend {
  date: string;
  logins: number;
  searches: number;
  reports: number;
  newUsers: number;
}

interface TopInsight {
  rank: number;
  query?: string;
  topic?: string;
  count: number;
}

interface DashboardData {
  kpi_stats: KPIStats;
  efficiency_metrics: EfficiencyMetrics;
  conversion_rates: ConversionRates;
}

interface TrendData {
  trends: DailyTrend[];
}

interface InsightData {
  topSearches: TopInsight[];
  topPatents: TopInsight[];
}

interface TopKeyword {
  rank: number;
  keyword: string;
  count: number;
}

interface TopCategory {
  rank: number;
  category: string;
  category_name: string;
  count: number;
  percentage?: number;
}

const AdminDashboard: React.FC = () => {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [trendData, setTrendData] = useState<TrendData | null>(null);
  const [insightData, setInsightData] = useState<InsightData | null>(null);
  const [topKeywords, setTopKeywords] = useState<TopKeyword[]>([]);
  const [topCategories, setTopCategories] = useState<TopCategory[]>([]);
  const [reportCategories, setReportCategories] = useState<TopCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 데이터 페칭 함수
  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        throw new Error('관리자 토큰이 없습니다.');
      }

      const baseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://patent-ai.vercel.app' 
        : 'http://localhost:3001';

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // API 호출을 올바른 엔드포인트와 파라미터로 수정
      const [
        metricsResponse,
        extendedStatsResponse,
        keywordsResponse,
        patentsResponse,
        trendsResponse,
        fieldsResponse
      ] = await Promise.all([
        fetch(`${baseUrl}/api/dashboard?action=metrics&period=${period}`, { headers }),
        fetch(`${baseUrl}/api/dashboard?action=admin-stats`, { headers }),
        fetch(`${baseUrl}/api/dashboard?action=popular-keywords&limit=10`, { headers }),
        fetch(`${baseUrl}/api/dashboard?action=popular-patents&limit=10`, { headers }),
        fetch(`${baseUrl}/api/dashboard?action=daily-trends&days=30`, { headers }),
        fetch(`${baseUrl}/api/dashboard?action=field-analysis`, { headers })
      ]);

      // 응답 검증
      if (!metricsResponse.ok) throw new Error(`메트릭 데이터 로드 실패: ${metricsResponse.status}`);
      if (!extendedStatsResponse.ok) throw new Error(`확장 통계 데이터 로드 실패: ${extendedStatsResponse.status}`);
      if (!keywordsResponse.ok) throw new Error(`인기 키워드 데이터 로드 실패: ${keywordsResponse.status}`);
      if (!patentsResponse.ok) throw new Error(`인기 특허 데이터 로드 실패: ${patentsResponse.status}`);
      if (!trendsResponse.ok) throw new Error(`트렌드 데이터 로드 실패: ${trendsResponse.status}`);
      if (!fieldsResponse.ok) throw new Error(`분야 분석 데이터 로드 실패: ${fieldsResponse.status}`);

      // JSON 파싱
      const [
        metricsData,
        extendedStatsData,
        keywordsData,
        patentsData,
        trendsData,
        fieldsData
      ] = await Promise.all([
        metricsResponse.json(),
        extendedStatsResponse.json(),
        keywordsResponse.json(),
        patentsResponse.json(),
        trendsResponse.json(),
        fieldsResponse.json()
      ]);

      // 실제 데이터 추출 (success 필드에서)
      const actualMetricsData = metricsData.success ? metricsData.data : metricsData;
      const actualExtendedStatsData = extendedStatsData.success ? extendedStatsData.data : extendedStatsData;
      const actualKeywordsData = keywordsData.success ? keywordsData.data : keywordsData;
      const actualPatentsData = patentsData.success ? patentsData.data : patentsData;
      const actualTrendsData = trendsData.success ? trendsData.data : trendsData;
      const actualFieldsData = fieldsData.success ? fieldsData.data : fieldsData;

      console.log('API 응답 데이터:', {
        metrics: actualMetricsData,
        extendedStats: actualExtendedStatsData,
        keywords: actualKeywordsData,
        patents: actualPatentsData,
        trends: actualTrendsData,
        fields: actualFieldsData
      });

      // 대시보드 데이터 매핑
      const mappedDashboardData: DashboardData = {
        kpi_stats: {
          total_logins: { 
            value: actualMetricsData?.totalSearches || actualExtendedStatsData?.total_logins || 0, 
            change_rate: 0 
          },
          total_searches: { 
            value: actualMetricsData?.totalSearches || actualExtendedStatsData?.total_searches || 0, 
            change_rate: 0 
          },
          total_reports: { 
            value: actualMetricsData?.totalReports || actualExtendedStatsData?.total_reports || 0, 
            change_rate: 0 
          },
          total_revenue: { 
            value: actualMetricsData?.totalRevenue || actualExtendedStatsData?.total_revenue || 0, 
            change_rate: 0 
          },
          total_all_users: { 
            value: actualMetricsData?.totalUsers || actualExtendedStatsData?.total_all_users || 0, 
            change_rate: 0 
          },
          total_users: { 
            value: actualMetricsData?.activeUsers || actualExtendedStatsData?.total_users || 0, 
            change_rate: 0 
          },
          free_members: { 
            value: actualExtendedStatsData?.free_members || 0, 
            change_rate: 0 
          },
          paid_members: { 
            value: actualExtendedStatsData?.paid_members || 0, 
            change_rate: 0 
          },
          total_members: { 
            value: actualExtendedStatsData?.total_members || 0, 
            change_rate: 0 
          },
          market_reports: { 
            value: actualExtendedStatsData?.market_reports || 0, 
            change_rate: 0 
          },
          business_reports: { 
            value: actualExtendedStatsData?.business_reports || 0, 
            change_rate: 0 
          }
        },
        efficiency_metrics: {
          avg_logins_per_user: actualExtendedStatsData?.avg_logins_per_user || 0,
          avg_searches_per_user: actualExtendedStatsData?.avg_searches_per_user || 0,
          avg_market_reports_per_user: actualExtendedStatsData?.avg_market_reports_per_user || 0,
          avg_business_reports_per_user: actualExtendedStatsData?.avg_business_reports_per_user || 0,
          avg_total_reports_per_user: actualExtendedStatsData?.avg_total_reports_per_user || 0
        },
        conversion_rates: {
          login_to_report: actualExtendedStatsData?.conversion_rates?.login_to_report || 0,
          search_to_report: actualExtendedStatsData?.conversion_rates?.search_to_report || 0
        }
      };

      setDashboardData(mappedDashboardData);

      // 트렌드 데이터 설정
      let mappedTrendData: TrendData = { trends: [] };
      if (actualTrendsData && Array.isArray(actualTrendsData)) {
        mappedTrendData.trends = actualTrendsData.map((item: any) => ({
          date: item.date || item.day || '',
          logins: item.logins || item.login_count || 0,
          searches: item.searches || item.search_count || 0,
          reports: item.reports || item.report_count || 0,
          newUsers: item.newUsers || item.new_users || item.user_count || 0
        }));
      }
      setTrendData(mappedTrendData);

      // 인기 키워드 설정
      let topKeywords: TopKeyword[] = [];
      if (actualKeywordsData && Array.isArray(actualKeywordsData)) {
        topKeywords = actualKeywordsData.slice(0, 10).map((item: any, index: number) => ({
          rank: index + 1,
          keyword: item.keyword || item.query || item.search_term || '',
          count: item.count || item.frequency || item.search_count || 0
        }));
      }
      setTopKeywords(topKeywords);

      // 특허 분야 데이터 설정
      let topCategories: TopCategory[] = [];
      if (actualFieldsData) {
        if (actualFieldsData.fields && Array.isArray(actualFieldsData.fields)) {
          topCategories = actualFieldsData.fields.slice(0, 10).map((item: any, index: number) => ({
            rank: index + 1,
            category: item.category || item.field || item.technology_field || '',
            category_name: item.category_name || item.field_name || item.name || '',
            count: item.count || item.analysis_count || item.frequency || 0
          }));
        } else if (Array.isArray(actualFieldsData)) {
          topCategories = actualFieldsData.slice(0, 10).map((item: any, index: number) => ({
            rank: index + 1,
            category: item.category || item.field || item.technology_field || '',
            category_name: item.category_name || item.field_name || item.name || '',
            count: item.count || item.analysis_count || item.frequency || 0
          }));
        }
      }
      setTopCategories(topCategories);

      // 리포트 카테고리 설정 (특허 데이터 기반)
      let reportCategories: TopCategory[] = [];
      if (actualPatentsData) {
        if (actualPatentsData.patents && Array.isArray(actualPatentsData.patents)) {
          reportCategories = actualPatentsData.patents.slice(0, 10).map((item: any, index: number) => ({
            rank: index + 1,
            category: item.category || item.field || item.technology_field || item.patent_number || item.application_number,
            category_name: item.category_name || item.field_name || item.title || item.patent_title || item.invention_title,
            count: item.count || item.analysis_count || item.frequency || 0
          }));
        } else if (Array.isArray(actualPatentsData)) {
          reportCategories = actualPatentsData.slice(0, 10).map((item: any, index: number) => ({
            rank: index + 1,
            category: item.category || item.field || item.technology_field || item.patent_number,
            category_name: item.category_name || item.field_name || item.title || item.patent_title || item.invention_title,
            count: item.count || item.analysis_count || item.frequency || 0
          }));
        }
      }
      setReportCategories(reportCategories);

      // 인사이트 데이터 설정
      setInsightData({ topSearches: [], topPatents: [] });
      
    } catch (err) {
      console.error('대시보드 데이터 로드 오류:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [period]); // period 의존성 추가 - 기간 변경 시 데이터 재로드

  // 숫자 포맷팅 함수
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

  // 통화 포맷팅 함수
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* 헤더 */}
        <header className="mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  관리자 대시보드
                </h1>
                <p className="text-slate-600 mt-2">시스템 전반의 통계와 관리 기능을 제공합니다</p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={fetchDashboardData}
                  variant="outline"
                  size="sm"
                  className="bg-white/50 hover:bg-white/80 border-slate-200"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  새로고침
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white/50 hover:bg-white/80 border-slate-200"
                >
                  <Download className="w-4 h-4 mr-2" />
                  내보내기
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* 탭 네비게이션 */}
        <Tabs defaultValue="dashboard" className="space-y-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-2 shadow-lg border border-white/20">
            <TabsList className="grid w-full grid-cols-3 bg-transparent gap-2">
              <TabsTrigger 
                value="dashboard" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl transition-all duration-200"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                대시보드
              </TabsTrigger>
              <TabsTrigger 
                value="users"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl transition-all duration-200"
              >
                <Users className="w-4 h-4 mr-2" />
                사용자 관리
              </TabsTrigger>
              <TabsTrigger 
                value="payments"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl transition-all duration-200"
              >
                <DollarSign className="w-4 h-4 mr-2" />
                결제 관리
              </TabsTrigger>
            </TabsList>
          </div>

          {/* 대시보드 탭 */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* 데이터 범위 정보 */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg p-2">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-800">데이터 범위</h2>
                    <p className="text-sm text-slate-600">전체 데이터베이스 데이터 사용 (100일치) - 전환율은 모든 데이터 기반으로 계산</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-slate-700">기간 선택:</label>
                  <Select 
                    value={period} 
                    onValueChange={(value: '7d' | '30d' | '90d') => setPeriod(value)}
                    className="w-32"
                  >
                    <option value="7d">7일</option>
                    <option value="30d">30일</option>
                    <option value="90d">90일</option>
                  </Select>
                </div>
              </div>
            </div>


            {/* 에러 표시 */}
            {error && (
              <div className="bg-red-50/80 backdrop-blur-sm border border-red-200 rounded-2xl p-6 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="bg-red-500 rounded-lg p-2">
                    <RefreshCw className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-red-800 font-semibold">데이터 로드 실패</h3>
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                  <Button 
                    onClick={fetchDashboardData} 
                    className="ml-auto bg-red-500 hover:bg-red-600"
                    size="sm"
                  >
                    다시 시도
                  </Button>
                </div>
              </div>
            )}

            {/* KPI 개요 - 현대적 그라데이션 카드 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
              {loading ? (
                <LoadingSkeleton type="kpi" count={5} />
              ) : dashboardData?.kpi_stats ? (
                <>
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                    <div className="flex items-center justify-between mb-4">
                      <div className="bg-white/20 rounded-lg p-2">
                        <Users className="w-6 h-6" />
                      </div>
                      <Badge className="bg-white/20 text-white border-white/30">
                        {dashboardData.kpi_stats.total_users.change_rate >= 0 ? '+' : ''}{dashboardData.kpi_stats.total_users.change_rate.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="text-2xl font-bold mb-1">{formatNumber(dashboardData.kpi_stats.total_users.value)}</div>
                    <div className="text-blue-100 text-sm">총 사용자</div>
                  </div>

                  <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                    <div className="flex items-center justify-between mb-4">
                      <div className="bg-white/20 rounded-lg p-2">
                        <UserCheck className="w-6 h-6" />
                      </div>
                      <Badge className="bg-white/20 text-white border-white/30">
                        {dashboardData.kpi_stats.total_members.change_rate >= 0 ? '+' : ''}{dashboardData.kpi_stats.total_members.change_rate.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="text-2xl font-bold mb-1">{formatNumber(dashboardData.kpi_stats.total_members.value)}</div>
                    <div className="text-indigo-100 text-sm">총 회원수</div>
                  </div>

                  <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                    <div className="flex items-center justify-between mb-4">
                      <div className="bg-white/20 rounded-lg p-2">
                        <LogIn className="w-6 h-6" />
                      </div>
                      <Badge className="bg-white/20 text-white border-white/30">
                        {dashboardData.kpi_stats.total_logins.change_rate >= 0 ? '+' : ''}{dashboardData.kpi_stats.total_logins.change_rate.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="text-2xl font-bold mb-1">{formatNumber(dashboardData.kpi_stats.total_logins.value)}</div>
                    <div className="text-green-100 text-sm">총 로그인</div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                    <div className="flex items-center justify-between mb-4">
                      <div className="bg-white/20 rounded-lg p-2">
                        <Search className="w-6 h-6" />
                      </div>
                      <Badge className="bg-white/20 text-white border-white/30">
                        {dashboardData.kpi_stats.total_searches.change_rate >= 0 ? '+' : ''}{dashboardData.kpi_stats.total_searches.change_rate.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="text-2xl font-bold mb-1">{formatNumber(dashboardData.kpi_stats.total_searches.value)}</div>
                    <div className="text-purple-100 text-sm">총 검색</div>
                  </div>

                  <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                    <div className="flex items-center justify-between mb-4">
                      <div className="bg-white/20 rounded-lg p-2">
                        <FileText className="w-6 h-6" />
                      </div>
                      <Badge className="bg-white/20 text-white border-white/30">
                        {dashboardData.kpi_stats.total_reports.change_rate >= 0 ? '+' : ''}{dashboardData.kpi_stats.total_reports.change_rate.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="text-2xl font-bold mb-1">{formatNumber(dashboardData.kpi_stats.total_reports.value)}</div>
                    <div className="text-orange-100 text-sm">총 리포트</div>
                  </div>
                </>
              ) : null}
            </div>

            {/* 상세 정보 카드들 */}
            {loading ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <LoadingSkeleton type="chart" />
                <LoadingSkeleton type="chart" />
                <LoadingSkeleton type="chart" />
              </div>
            ) : dashboardData?.kpi_stats && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 리포트 상세 */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-lg p-2">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800">리포트 분석</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                      <span className="text-slate-600 font-medium">총 리포트</span>
                      <span className="font-bold text-slate-800 text-lg">
                        {formatNumber(dashboardData.kpi_stats.total_reports.value)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-orange-50 rounded-xl">
                      <span className="text-orange-700 font-medium">시장분석</span>
                      <span className="font-bold text-orange-600 text-lg">
                        {formatNumber(dashboardData.kpi_stats.market_reports.value)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-red-50 rounded-xl">
                      <span className="text-red-700 font-medium">비즈니스인사이트</span>
                      <span className="font-bold text-red-600 text-lg">
                        {formatNumber(dashboardData.kpi_stats.business_reports.value)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 수익 현황 */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg p-2">
                      <DollarSign className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800">수익 현황</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600 mb-2">
                        {formatCurrency(dashboardData.kpi_stats.total_revenue.value)}
                      </div>
                      <div className="text-slate-600 text-sm">총 수익</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-slate-700">
                        수익 증감
                      </div>
                      <div className={`text-xl font-bold ${dashboardData.kpi_stats.total_revenue.change_rate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {dashboardData.kpi_stats.total_revenue.change_rate >= 0 ? '+' : ''}{dashboardData.kpi_stats.total_revenue.change_rate.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* 회원 현황 */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg p-2">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800">회원 현황</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">총 사용자수 (삭제된 계정 포함)</span>
                      <span className="text-xl font-semibold text-slate-500">{formatNumber(dashboardData.kpi_stats.total_all_users.value)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">총 회원수 (실제 활동중인 계정의 합)</span>
                      <span className="text-2xl font-bold text-indigo-600">{formatNumber(dashboardData.kpi_stats.total_members.value)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">무료 회원 (구독결제 안된 회원)</span>
                      <span className="text-xl font-semibold text-gray-600">{formatNumber(dashboardData.kpi_stats.free_members.value)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">유료 회원 (구독결제 완료한 회원)</span>
                      <span className="text-xl font-semibold text-purple-600">{formatNumber(dashboardData.kpi_stats.paid_members.value)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 사용자별 평균 활동 */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <LoadingSkeleton type="chart" />
                <LoadingSkeleton type="chart" />
                <LoadingSkeleton type="chart" />
              </div>
            ) : dashboardData?.efficiency_metrics && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg p-2">
                      <LogIn className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800">평균 로그인</h3>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-blue-600 mb-2">
                      {dashboardData.efficiency_metrics.avg_logins_per_user.toFixed(1)}
                    </div>
                    <div className="text-slate-600 text-sm font-medium">회/사용자</div>
                  </div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-2">
                      <Search className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800">평균 검색</h3>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-purple-600 mb-2">
                      {dashboardData.efficiency_metrics.avg_searches_per_user.toFixed(1)}
                    </div>
                    <div className="text-slate-600 text-sm font-medium">회/사용자</div>
                  </div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-gradient-to-r from-green-500 to-teal-500 rounded-lg p-2">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800">평균 리포트</h3>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-green-600 mb-2">
                      {(dashboardData.efficiency_metrics.avg_market_reports_per_user + 
                        dashboardData.efficiency_metrics.avg_business_reports_per_user).toFixed(1)}
                    </div>
                    <div className="text-slate-600 text-sm font-medium">개/사용자</div>
                  </div>
                </div>
              </div>
            )}

            {/* 전환율 */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <LoadingSkeleton type="chart" />
                <LoadingSkeleton type="chart" />
              </div>
            ) : dashboardData?.conversion_rates && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg p-2">
                      <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800">로그인 전환율</h3>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-blue-600 mb-2">
                      {dashboardData.conversion_rates.login_to_report.toFixed(1)}%
                    </div>
                    <div className="text-slate-600 text-sm font-medium">로그인 → 리포트</div>
                    <div className="text-xs text-slate-500 mt-1">
                      리포트생성수 / 로그인수 × 100
                    </div>
                  </div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg p-2">
                      <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800">검색 전환율</h3>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-green-600 mb-2">
                      {dashboardData.conversion_rates.search_to_report.toFixed(1)}%
                    </div>
                    <div className="text-slate-600 text-sm font-medium">검색 → 리포트</div>
                    <div className="text-xs text-slate-500 mt-1">
                      리포트생성수 / 검색수 × 100
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 일일 활동 트렌드 */}
            {loading ? (
              <LoadingSkeleton type="chart" />
            ) : trendData?.trends && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg p-2">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800">일일 활동 트렌드</h3>
                </div>
                <div className="chart-container" role="img" aria-label="일일 활동 트렌드 차트">
                  <TrendChart 
                    data={trendData.trends} 
                    height={window.innerWidth < 640 ? 250 : 320}
                  />
                </div>
              </div>
            )}

            {/* TOP 10 특허 분야 분석 */}
            <TopPatentFieldsChart 
              data={topCategories.map(item => ({
                rank: item.rank,
                field_name: item.category_name,
                count: item.count,
                percentage: item.percentage || ((item.count / (topCategories.reduce((sum, d) => sum + d.count, 0) || 1)) * 100)
              }))} 
              loading={loading}
              period={period} 
              limit={10} 
            />

            {/* 상위 검색어 및 특허 분석 주제 */}
            {loading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <LoadingSkeleton type="chart" />
                <LoadingSkeleton type="chart" />
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* TOP 10 검색어 - 항상 표시 */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg p-2">
                      <Search className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800">검색어 순위 TOP 10</h3>
                  </div>
                  <div className="space-y-3">
                    {topKeywords.length > 0 ? (
                      topKeywords.slice(0, 10).map((item, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl hover:from-blue-100 hover:to-cyan-100 transition-all duration-200">
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                              {item.rank}
                            </span>
                            <span className="font-medium text-slate-800">{item.keyword}</span>
                          </div>
                          <span className="text-blue-600 font-bold text-lg">{item.count}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p>검색어 데이터가 없습니다.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* TOP 10 리포트 생성 분야 - 항상 표시 */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg p-2">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800">리포트 생성 분야 TOP 10</h3>
                  </div>
                  <div className="space-y-3">
                    {reportCategories.length > 0 ? (
                      reportCategories.slice(0, 10).map((item, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl hover:from-green-100 hover:to-emerald-100 transition-all duration-200">
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                              {item.rank}
                            </span>
                            <span className="font-medium text-slate-800">{item.category_name}</span>
                          </div>
                          <span className="text-green-600 font-bold text-lg">{item.count}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p>리포트 분야 데이터가 없습니다.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* 사용자 관리 탭 */}
          <TabsContent value="users">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20">
              <UserManagement />
            </div>
          </TabsContent>

          {/* 결제 관리 탭 */}
          <TabsContent value="payments">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20">
              <PaymentManagement />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;