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
  user?: any;
  stats?: {
    totalSearches: number;
    totalReports: number;
    totalPoints: number;
    totalPayments: number;
    totalLogins: number;
  };
  marketAverage?: {
    searchAverage: number;
    reportAverage: number;
    totalUsers: number;
    totalSearches?: number;
    totalReports?: number;
  };
  trends?: {
    searches: Array<{ date: string; count: number; type: string }>;
    reports: Array<{ date: string; count: number; type: string }>;
  };
  analysis?: {
    searchFields: Array<{ field: string; count: number }>;
    reportFields: Array<{ field: string; count: number }>;
  };
  recent?: {
    searches: Array<{ id: string; keyword: string; created_at: string }>;
    reports: Array<{ id: string; title?: string; analysis_type?: string; created_at: string }>;
    payments: Array<{ id: string; amount: number; created_at: string }>;
  };
  period?: {
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
    const trends = apiData.trends || {};
    const analysis = apiData.analysis || {};
    const recent = apiData.recent || {};
    const marketAverage = apiData.marketAverage || {};

    // 검색 트렌드 데이터 (실제 API 데이터 사용)
    const userSearchTrends = trends.searches || [];
    const userReportTrends = trends.reports || [];
    
    // 시장 평균 트렌드 데이터 생성 (최근 30일 기준)
    const generateMarketTrends = (avgDaily: number, days: number = 30) => {
      const trends = [];
      const today = new Date();
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        trends.push({
          date: date.toISOString().split('T')[0],
          count: Math.round(avgDaily + (Math.random() - 0.5) * avgDaily * 0.3) // 약간의 변동성 추가
        });
      }
      return trends;
    };

    const marketSearchTrends = generateMarketTrends(marketAverage.searchAverage || 0);
    const marketReportTrends = generateMarketTrends(marketAverage.reportAverage || 0);
    
    // 검색 분야 분석 데이터 변환
    const searchFields = (analysis.searchFields || []).map((field: any, index: number) => ({
      label: field.field || `분야 ${index + 1}`,
      value: field.count || 0,
      percentage: `${((field.count || 0) / Math.max(stats.totalSearches || 1, 1) * 100).toFixed(1)}%`
    }));

    // 리포트 분야 분석 데이터 변환
    const reportFields = (analysis.reportFields || []).map((field: any, index: number) => ({
      label: field.field || `분야 ${index + 1}`,
      value: field.count || 0,
      percentage: `${((field.count || 0) / Math.max(stats.totalReports || 1, 1) * 100).toFixed(1)}%`
    }));

    const userData = user?.id ? {
      searchTrends: userSearchTrends,
      reportTrends: userReportTrends,
      conversionRates: {
        searchToReport: stats.totalSearches > 0 ? ((stats.totalReports || 0) / stats.totalSearches * 100) : 0,
        loginToReport: stats.totalLogins > 0 ? ((stats.totalReports || 0) / stats.totalLogins * 100) : 0
      },
      searchFields: searchFields,
      reportFields: reportFields,
      recentSearches: (recent.searches || []).map((search: any) => ({
        id: search.id || Math.random().toString(),
        title: search.keyword || search.title || '검색어 없음',
        date: search.created_at || new Date().toISOString(),
        type: 'search'
      })),
      recentReports: (recent.reports || []).map((report: any) => ({
        id: report.id || Math.random().toString(),
        title: report.title || report.analysis_type || '리포트 제목 없음',
        date: report.created_at || new Date().toISOString(),
        type: 'report'
      })),
      totalSearches: stats.totalSearches || 0,
      totalReports: stats.totalReports || 0,
    } : undefined;

    return {
      user: userData,
      market: {
        searchTrends: marketSearchTrends,
        reportTrends: marketReportTrends,
        searchFields: [], // 시장 분야 데이터는 현재 제공하지 않음
        reportFields: [],
        totalSearches: Math.round((marketAverage.searchAverage || 0) * (marketAverage.totalUsers || 1) * 30), // 30일 기준 추정
        totalReports: Math.round((marketAverage.reportAverage || 0) * (marketAverage.totalUsers || 1) * 30), // 30일 기준 추정
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

      // API URL 구성 - 백엔드 서버로 요청
      const baseUrl = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001';
      const apiUrl = user?.id 
        ? `${baseUrl}/api/dashboard-analytics?userId=${user.id}`
        : `${baseUrl}/api/dashboard-analytics`;

      console.log('📊 [Dashboard] API 요청:', { apiUrl, userId: user?.id });

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
                      {/* 실제 데이터 표시 섹션 */}
                      <section>
                        <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                          <DocumentTextIcon className="w-6 h-6 text-green-600" />
                          실제 DB 데이터 (텍스트 형태)
                        </h2>
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <div className="bg-blue-50 p-4 rounded-lg">
                              <h3 className="font-medium text-blue-900">개인 총 검색 수</h3>
                              <p className="text-2xl font-bold text-blue-600">{dashboardData.stats?.totalSearches || 0}</p>
                            </div>
                            <div className="bg-green-50 p-4 rounded-lg">
                              <h3 className="font-medium text-green-900">개인 총 리포트 수</h3>
                              <p className="text-2xl font-bold text-green-600">{dashboardData.stats?.totalReports || 0}</p>
                            </div>
                            <div className="bg-purple-50 p-4 rounded-lg">
                              <h3 className="font-medium text-purple-900">총 포인트</h3>
                              <p className="text-2xl font-bold text-purple-600">{dashboardData.stats?.totalPoints || 0}</p>
                            </div>
                            <div className="bg-orange-50 p-4 rounded-lg">
                              <h3 className="font-medium text-orange-900">총 로그인</h3>
                              <p className="text-2xl font-bold text-orange-600">{dashboardData.stats?.totalLogins || 0}</p>
                            </div>
                          </div>
                          
                          {/* 시장 평균 데이터 표시 */}
                          {dashboardData.marketAverage && (
                            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                시장 평균 데이터 (전체 {dashboardData.marketAverage.totalUsers || 0}명 기준)
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-white p-3 rounded border">
                                  <p className="text-sm text-gray-600">일평균 검색 수</p>
                                  <p className="text-lg font-semibold text-blue-600">{(dashboardData.marketAverage.searchAverage || 0).toFixed(1)}회</p>
                                </div>
                                <div className="bg-white p-3 rounded border">
                                  <p className="text-sm text-gray-600">일평균 리포트 수</p>
                                  <p className="text-lg font-semibold text-green-600">{(dashboardData.marketAverage.reportAverage || 0).toFixed(1)}회</p>
                                </div>
                                <div className="bg-white p-3 rounded border">
                                  <p className="text-sm text-gray-600">전체 활성 사용자</p>
                                  <p className="text-lg font-semibold text-purple-600">{dashboardData.marketAverage.totalUsers || 0}명</p>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                              <h4 className="font-medium text-gray-800 mb-3">최근 검색어 (최대 10개)</h4>
                              <div className="space-y-2 max-h-40 overflow-y-auto">
                                {(dashboardData.recent?.searches || []).slice(0, 10).map((search: any, index: number) => (
                                  <div key={index} className="text-sm p-2 bg-gray-50 rounded">
                                    <span className="font-medium">{search.keyword || '검색어 없음'}</span>
                                    <span className="text-gray-500 ml-2">
                                      {search.created_at ? new Date(search.created_at).toLocaleDateString() : '날짜 없음'}
                                    </span>
                                  </div>
                                ))}
                                {(!dashboardData.recent?.searches || dashboardData.recent.searches.length === 0) && (
                                  <p className="text-gray-500 text-sm">검색 기록이 없습니다.</p>
                                )}
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="font-medium text-gray-800 mb-3">최근 리포트 (최대 10개)</h4>
                              <div className="space-y-2 max-h-40 overflow-y-auto">
                                {(dashboardData.recent?.reports || []).slice(0, 10).map((report: any, index: number) => (
                                  <div key={index} className="text-sm p-2 bg-gray-50 rounded">
                                    <span className="font-medium">{report.title || report.analysis_type || '리포트 제목 없음'}</span>
                                    <span className="text-gray-500 ml-2">
                                      {report.created_at ? new Date(report.created_at).toLocaleDateString() : '날짜 없음'}
                                    </span>
                                  </div>
                                ))}
                                {(!dashboardData.recent?.reports || dashboardData.recent.reports.length === 0) && (
                                  <p className="text-gray-500 text-sm">리포트 기록이 없습니다.</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </section>

                      {/* 추이 분석 섹션 */}
                      <section>
                      <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                         <ArrowTrendingUpIcon className="w-6 h-6 text-blue-600" />
                         활동 추이 분석 (차트)
                       </h2>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <TrendAnalysisChart
                          title="검색 추이"
                          userTrends={dashboardData.trends?.searches || []}
                          marketTrends={convertToTextOutputData(dashboardData)?.market?.searchTrends || []}
                          marketTotal={Math.round((dashboardData.marketAverage?.searchAverage || 0) * (dashboardData.marketAverage?.totalUsers || 1) * 30)}
                          type="search"
                        />
                        <TrendAnalysisChart
                          title="리포트 추이"
                          userTrends={dashboardData.trends?.reports || []}
                          marketTrends={convertToTextOutputData(dashboardData)?.market?.reportTrends || []}
                          marketTotal={Math.round((dashboardData.marketAverage?.reportAverage || 0) * (dashboardData.marketAverage?.totalUsers || 1) * 30)}
                          type="report"
                        />
                      </div>
                    </section>

                    {/* 전환율 분석 섹션 */}
                    <section>
                      <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                        <ChartBarIcon className="w-6 h-6 text-emerald-600" />
                        전환율 분석 (차트)
                      </h2>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <ConversionRateChart
                          title="로그인 전환율"
                          data={{
                            totalLogins: dashboardData.stats?.totalLogins || 0,
                            totalReports: dashboardData.stats?.totalReports || 0,
                            conversionRate: dashboardData.stats?.totalLogins > 0 ? 
                              ((dashboardData.stats?.totalReports || 0) / dashboardData.stats.totalLogins * 100) : 0
                          }}
                          type="login"
                        />
                        <ConversionRateChart
                          title="검색 전환율"
                          data={{
                            totalSearches: dashboardData.stats?.totalSearches || 0,
                            totalReports: dashboardData.stats?.totalReports || 0,
                            conversionRate: dashboardData.stats?.totalSearches > 0 ? 
                              ((dashboardData.stats?.totalReports || 0) / dashboardData.stats.totalSearches * 100) : 0
                          }}
                          type="search"
                        />
                      </div>
                    </section>

                    {/* 분야 분석 섹션 */}
                    <section>
                      <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                        <MagnifyingGlassIcon className="w-6 h-6 text-purple-600" />
                        분야 분석 (차트)
                      </h2>
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        <FieldAnalysisDonutChart
                          title="검색 분야 분석"
                          data={(dashboardData.analysis?.searchFields || []).map((field: any) => ({
                            label: field.field || '기타',
                            value: field.count || 0,
                            percentage: `${((field.count || 0) / Math.max(dashboardData.stats?.totalSearches || 1, 1) * 100).toFixed(1)}%`
                          }))}
                          category="search"
                        />
                        <FieldAnalysisDonutChart
                          title="리포트 분야 분석"
                          data={(dashboardData.analysis?.reportFields || []).map((field: any) => ({
                            label: field.field || '기타',
                            value: field.count || 0,
                            percentage: `${((field.count || 0) / Math.max(dashboardData.stats?.totalReports || 1, 1) * 100).toFixed(1)}%`
                          }))}
                          category="report"
                        />
                      </div>
                    </section>

                    {/* 최근 활동 섹션 */}
                    <section>
                      <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                        <DocumentTextIcon className="w-6 h-6 text-orange-600" />
                        최근 활동 (차트)
                      </h2>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <RecentActivitiesList
                           title="최근 검색어 (10개)"
                           activities={(dashboardData.recent?.searches || []).map((search: any) => ({
                             id: search.id || Math.random().toString(),
                             title: search.keyword || '검색어 없음',
                             date: search.created_at || new Date().toISOString(),
                             type: "search" as const
                           }))}
                           type="search"
                         />
                         <RecentActivitiesList
                           title="최근 리포트 제목 (10개)"
                           activities={(dashboardData.recent?.reports || []).map((report: any) => ({
                             id: report.id || Math.random().toString(),
                             title: report.title || report.analysis_type || '리포트 제목 없음',
                             date: report.created_at || new Date().toISOString(),
                             type: "report" as const
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