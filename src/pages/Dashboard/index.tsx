import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChartBarIcon, 
  MagnifyingGlassIcon,
  DocumentTextIcon,
  ArrowTrendingUpIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline';

import { useAuthStore } from '../../store/authStore';
import { activityTracker } from '../../lib/activityTracker';
import { LoadingPage } from '../../components/UI/Loading';

// Import new chart components
import TrendAnalysisChart from '../../components/Charts/TrendAnalysisChart';
import ConversionRateChart from '../../components/Charts/ConversionRateChart';
import FieldAnalysisDonutChart from '../../components/Charts/FieldAnalysisDonutChart';
import RecentActivitiesList from '../../components/Charts/RecentActivitiesList';
import DashboardTextOutput from '../../components/Dashboard/DashboardTextOutput';
import PointBalance from '../../components/PointBalance';
import ExpiringPointsAlert from '../../components/ExpiringPointsAlert';

interface DashboardAnalyticsData {
  searchTrends: {
    userSearches: Array<{ date: string; count: number }>;
    marketAverage: Array<{ date: string; count: number }>;
    marketTotal: number;
  };
  reportTrends: {
    userReports: Array<{ date: string; count: number }>;
    marketAverage: Array<{ date: string; count: number }>;
    marketTotal: number;
  };
  conversionRates: {
    loginConversion: {
      totalLogins: number;
      totalReports: number;
      conversionRate: number;
    };
    searchConversion: {
      totalSearches: number;
      totalReports: number;
      conversionRate: number;
    };
  };
  fieldAnalysis: {
    userSearchFields: Array<{ label: string; value: number; percentage: string }>;
    marketSearchFields: Array<{ label: string; value: number; percentage: string }>;
    userReportFields: Array<{ label: string; value: number; percentage: string }>;
    marketReportFields: Array<{ label: string; value: number; percentage: string }>;
  };
  recentActivities: {
    searches: Array<{ id: string; title: string; date: string; type: string }>;
    reports: Array<{ id: string; title: string; date: string; type: string }>;
  };
  period: {
    startDate: string;
    endDate: string;
    days: number;
  };
}

const Dashboard: React.FC = () => {
  const { user, signOut } = useAuthStore();
  const [dashboardData, setDashboardData] = useState<DashboardAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'charts' | 'text'>('charts');

  // 텍스트 출력용 데이터 변환
  const convertToTextOutputData = (apiData: any) => {
    if (!apiData) return null;

    console.log('📊 [Dashboard] API 데이터 구조:', apiData);

    // 실제 API 응답 구조에 맞게 변환
    const stats = apiData.stats || {};
    const recentActivity = apiData.recentActivity || {};
    const insights = apiData.insights || {};

    // 검색 트렌드 데이터 (임시로 빈 배열 사용, 실제 트렌드 데이터가 없음)
    const userSearchTrends = [];
    const userReportTrends = [];
    const marketSearchTrends = [];
    const marketReportTrends = [];

    const userData = user?.id ? {
      searchTrends: userSearchTrends,
      reportTrends: userReportTrends,
      conversionRates: {
        searchToReport: 0, // 실제 변환율 계산 필요
        loginToReport: 0
      },
      searchFields: [], // 실제 필드 분석 데이터 필요
      reportFields: [],
      recentSearches: (recentActivity.searches || []).map((search: any) => ({
        id: search.id,
        title: search.keyword,
        date: search.created_at,
        type: 'search'
      })),
      recentReports: [], // 리포트 데이터가 없음
      totalSearches: stats.totalSearches || 0,
      totalReports: stats.totalReports || 0,
    } : undefined;

    return {
      user: userData,
      market: {
        searchTrends: marketSearchTrends,
        reportTrends: marketReportTrends,
        searchFields: [],
        reportFields: [],
        totalSearches: 0,
        totalReports: 0,
      }
    };
  };

  const loadDashboardData = async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      if (user?.id) {
        await activityTracker.trackDashboardView();
      }

      // 인증 토큰 가져오기 (단순화)
      const token = localStorage.getItem('token');
      
      // API 호출 설정
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // API URL 구성
      const apiUrl = user?.id 
        ? `/api/dashboard-analytics?userId=${user.id}`
        : '/api/dashboard-analytics';

      const response = await fetch(apiUrl, { 
        method: 'GET',
        headers,
        cache: 'no-cache'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        
        // 인증 오류인 경우 - 로그아웃 후 로그인 페이지로 리다이렉트
        if (response.status === 401 || response.status === 403) {
          console.warn('[Dashboard] 인증 오류 발생, 로그아웃 처리:', response.status);
          await signOut();
          window.location.href = '/login';
          return;
        }
        
        throw new Error(`API 요청 실패: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || '데이터를 불러오는데 실패했습니다.');
      }

      setDashboardData(result.data);
      
    } catch (err: any) {
      console.error('대시보드 데이터 로딩 오류:', err);
      
      // 인증 관련 오류가 아닌 경우에만 에러 상태 설정
      if (!err.message?.includes('인증')) {
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const handleRefresh = () => {
    loadDashboardData(true);
  };

  if (loading) {
    return <LoadingPage text="대시보드 데이터를 불러오는 중..." />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">데이터 로딩 오류</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">데이터가 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                분석 대시보드
              </h1>
              <p className="text-gray-600 mt-1">
                최근 100일간의 활동 분석 및 시장 동향
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CalendarDaysIcon className="w-4 h-4" />
                <span>
                  {dashboardData?.period?.startDate 
                    ? `${new Date(dashboardData.period.startDate).toLocaleDateString()} ~ ${new Date(dashboardData.period.endDate).toLocaleDateString()}`
                    : '데이터 로딩 중...'
                  }
                </span>
              </div>
              <button
                onClick={() => window.location.href = '/billing'}
                className="flex items-center gap-2 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
              >
                <CreditCardIcon className="w-4 h-4" />
                결제 정보
              </button>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <ArrowPathIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                새로고침
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
          >
            {/* 포인트 정보 및 경고 */}
            <div className="space-y-4">
              {/* 만료 예정 포인트 경고 */}
              <ExpiringPointsAlert userId={user?.id} days={7} />
              
              {/* 포인트 현황 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">포인트 현황</h2>
                <PointBalance showDetails={true} />
              </div>
            </div>

            {/* 뷰 모드 토글 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-800">표시 모드</h2>
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('charts')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      viewMode === 'charts'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    차트 뷰
                  </button>
                  <button
                    onClick={() => setViewMode('text')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      viewMode === 'text'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    텍스트 뷰
                  </button>
                </div>
              </div>
            </div>

            {viewMode === 'charts' ? (
              <>
                {dashboardData ? (
                    <>
                      {/* 추이 분석 섹션 */}
                      <section>
                      <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                         <ArrowTrendingUpIcon className="w-6 h-6 text-blue-600" />
                         활동 추이 분석
                       </h2>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <TrendAnalysisChart
                          title="검색 추이"
                          userTrends={dashboardData.searchTrends?.userSearches || []}
                          marketTrends={dashboardData.searchTrends?.marketAverage || []}
                          marketTotal={dashboardData.searchTrends?.marketTotal || 0}
                          type="search"
                        />
                        <TrendAnalysisChart
                          title="리포트 추이"
                          userTrends={dashboardData.reportTrends?.userReports || []}
                          marketTrends={dashboardData.reportTrends?.marketAverage || []}
                          marketTotal={dashboardData.reportTrends?.marketTotal || 0}
                          type="report"
                        />
                      </div>
                    </section>

                    {/* 전환율 분석 섹션 */}
                    <section>
                      <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                        <ChartBarIcon className="w-6 h-6 text-emerald-600" />
                        전환율 분석
                      </h2>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <ConversionRateChart
                          title="로그인 전환율"
                          data={dashboardData.conversionRates?.loginConversion || { totalLogins: 0, totalReports: 0, conversionRate: 0 }}
                          type="login"
                        />
                        <ConversionRateChart
                          title="검색 전환율"
                          data={dashboardData.conversionRates?.searchConversion || { totalSearches: 0, totalReports: 0, conversionRate: 0 }}
                          type="search"
                        />
                      </div>
                    </section>

                    {/* 분야 분석 섹션 */}
                    <section>
                      <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                        <MagnifyingGlassIcon className="w-6 h-6 text-purple-600" />
                        IPC/CPC 분야 분석
                      </h2>
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        <FieldAnalysisDonutChart
                          title="사용자 검색 분야 분석"
                          data={dashboardData.fieldAnalysis?.userSearchFields || []}
                          category="search"
                        />
                        <FieldAnalysisDonutChart
                          title="시장 검색 분야 분석"
                          data={dashboardData.fieldAnalysis?.marketSearchFields || []}
                          category="search"
                        />
                        <FieldAnalysisDonutChart
                          title="사용자 리포트 분야 분석"
                          data={dashboardData.fieldAnalysis?.userReportFields || []}
                          category="report"
                        />
                        <FieldAnalysisDonutChart
                          title="시장 리포트 분야 분석"
                          data={dashboardData.fieldAnalysis?.marketReportFields || []}
                          category="report"
                        />
                      </div>
                    </section>

                    {/* 최근 활동 섹션 */}
                    <section>
                      <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                        <DocumentTextIcon className="w-6 h-6 text-orange-600" />
                        최근 활동
                      </h2>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <RecentActivitiesList
                           title="최근 검색어 (10개)"
                           activities={(dashboardData.recentActivities?.searches || []).map(item => ({
                             ...item,
                             type: item.type as "search" | "report"
                           }))}
                           type="search"
                         />
                         <RecentActivitiesList
                           title="최근 리포트 제목 (10개)"
                           activities={(dashboardData.recentActivities?.reports || []).map(item => ({
                             ...item,
                             type: item.type as "search" | "report"
                           }))}
                           type="report"
                         />
                      </div>
                      </section>
                    </>
                 ) : (
                  <div className="text-center py-8 text-gray-500">
                    데이터 로딩 중...
                  </div>
                )}
              </>
            ) : (
              /* 텍스트 출력 섹션 */
              <DashboardTextOutput
                data={convertToTextOutputData(dashboardData)}
                hasUserData={!!user?.id}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Dashboard;