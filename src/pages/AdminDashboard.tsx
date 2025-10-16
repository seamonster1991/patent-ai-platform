import React, { useEffect, useCallback, useMemo } from 'react';
import AdminLayout from '../components/Admin/AdminLayout';
import { useAdminDashboardStore, useMetricsFormatters } from '../stores/useAdminDashboardStore';
import { Card } from '../components/UI/Card';
import { LoadingSpinner } from '../components/UI/LoadingSpinner';
import { 
  UsersIcon, 
  CurrencyDollarIcon, 
  DocumentTextIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const AdminDashboard: React.FC = () => {
  const {
    metrics,
    systemMetrics,
    recentActivities,
    extendedStats,
    popularKeywords,
    popularPatents,
    isLoadingMetrics,
    isLoadingActivities,
    isLoadingSystemMetrics,
    isLoadingExtendedStats,
    isLoadingPopularKeywords,
    isLoadingPopularPatents,
    metricsError,
    activitiesError,
    systemMetricsError,
    extendedStatsError,
    popularKeywordsError,
    popularPatentsError,
    selectedPeriod,
    autoRefresh,
    refreshInterval,
    setSelectedPeriod,
    setAutoRefresh,
    clearErrors,
    refreshAll
  } = useAdminDashboardStore();

  const {
    formatCurrency,
    formatNumber,
    formatPercentage,
    formatDate,
    getStatusBadgeColor
  } = useMetricsFormatters();

  useEffect(() => {
    // 초기 데이터 로드
    console.log('[AdminDashboard] 컴포넌트 마운트됨, refreshAll 호출');
    refreshAll();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refreshAll();
    }, refreshInterval); // 스토어에서 설정된 간격 사용 (60초)

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refreshAll]);

  const handlePeriodChange = useCallback((period: string) => {
    setSelectedPeriod(period);
  }, [setSelectedPeriod]);

  if (isLoadingMetrics && !metrics) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">관리자 대시보드</h1>
            <p className="text-gray-600">시스템 현황과 주요 지표를 확인하세요</p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* 기간 선택 */}
            <select
              value={selectedPeriod}
              onChange={(e) => handlePeriodChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1d">최근 1일</option>
              <option value="7d">최근 7일</option>
              <option value="30d">최근 30일</option>
              <option value="90d">최근 90일</option>
            </select>

            {/* 자동 새로고침 토글 */}
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">자동 새로고침</span>
            </label>

            {/* 수동 새로고침 버튼 */}
            <button
              onClick={refreshAll}
              disabled={isLoadingMetrics}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              새로고침
            </button>
          </div>
        </div>

        {/* 에러 메시지 */}
        {(metricsError || activitiesError || systemMetricsError || extendedStatsError || popularKeywordsError || popularPatentsError) && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">오류가 발생했습니다</h3>
                <div className="mt-2 text-sm text-red-700">
                  {metricsError && <p>메트릭: {metricsError}</p>}
                  {activitiesError && <p>활동 로그: {activitiesError}</p>}
                  {systemMetricsError && <p>시스템 메트릭: {systemMetricsError}</p>}
                  {extendedStatsError && <p>확장 통계: {extendedStatsError}</p>}
                  {popularKeywordsError && <p>인기 검색어: {popularKeywordsError}</p>}
                  {popularPatentsError && <p>인기 특허: {popularPatentsError}</p>}
                </div>
                <button
                  onClick={clearErrors}
                  className="mt-2 text-sm text-red-600 hover:text-red-500"
                >
                  오류 메시지 닫기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 주요 메트릭 카드 */}
        {useMemo(() => metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UsersIcon className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">총 사용자</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatNumber(metrics.total_users)}
                  </p>
                  {metrics.user_growth_rate !== undefined && (
                    <p className={`text-sm ${metrics.user_growth_rate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {metrics.user_growth_rate >= 0 ? '+' : ''}{formatPercentage(metrics.user_growth_rate)}
                    </p>
                  )}
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">총 수익</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(metrics.total_revenue)}
                  </p>
                  {metrics.revenue_growth_rate !== undefined && (
                    <p className={`text-sm ${metrics.revenue_growth_rate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {metrics.revenue_growth_rate >= 0 ? '+' : ''}{formatPercentage(metrics.revenue_growth_rate)}
                    </p>
                  )}
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DocumentTextIcon className="h-8 w-8 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">특허 분석</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatNumber(metrics.total_analyses)}
                  </p>
                  {metrics.analysis_growth_rate !== undefined && (
                    <p className={`text-sm ${metrics.analysis_growth_rate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {metrics.analysis_growth_rate >= 0 ? '+' : ''}{formatPercentage(metrics.analysis_growth_rate)}
                    </p>
                  )}
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChartBarIcon className="h-8 w-8 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">활성 사용자</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatNumber(metrics.active_users)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {metrics.total_users > 0 ? formatPercentage((metrics.active_users / metrics.total_users) * 100) : '0%'} 활성률
                  </p>
                </div>
              </div>
            </Card>
          </div>
        ), [metrics, formatNumber, formatCurrency, formatPercentage])}

        {/* 확장 통계 섹션 */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">상세 통계 (최근 30일)</h2>
          
          {isLoadingExtendedStats ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, index) => (
                <Card key={index} className="p-6">
                  <div className="text-center">
                    <div className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-20 mx-auto mb-2"></div>
                      <div className="h-8 bg-gray-200 rounded w-16 mx-auto mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-24 mx-auto"></div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : extendedStats ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-500">총 로그인 수</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {formatNumber(extendedStats.total_logins)}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    평균 {extendedStats.avg_logins_per_user.toFixed(1)}회/사용자
                  </p>
                </div>
              </Card>

              <Card className="p-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-500">총 검색 수</p>
                  <p className="text-3xl font-bold text-green-600">
                    {formatNumber(extendedStats.total_searches)}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    평균 {extendedStats.avg_searches_per_user.toFixed(1)}회/사용자
                  </p>
                </div>
              </Card>

              <Card className="p-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-500">총 리포트 생성</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {formatNumber(extendedStats.total_reports)}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    평균 {extendedStats.avg_reports_per_user.toFixed(1)}회/사용자
                  </p>
                </div>
              </Card>

              <Card className="p-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-500">전환율</p>
                  <div className="space-y-2">
                    <div>
                      <p className="text-lg font-bold text-orange-600">
                        {formatPercentage(extendedStats.login_to_report_rate)}
                      </p>
                      <p className="text-xs text-gray-600">로그인→리포트</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-teal-600">
                        {formatPercentage(extendedStats.search_to_report_rate)}
                      </p>
                      <p className="text-xs text-gray-600">검색→리포트</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, index) => (
                <Card key={index} className="p-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-500">확장 통계 데이터 없음</p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* 인기 순위 섹션 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 인기 검색어 */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">인기 검색어 TOP 10</h3>
              <ChartBarIcon className="h-5 w-5 text-gray-400" />
            </div>
            
            {isLoadingPopularKeywords ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : popularKeywords.length > 0 ? (
              <div className="space-y-3">
                {popularKeywords.map((keyword, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                        {index + 1}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{keyword.keyword}</span>
                    </div>
                    <span className="text-sm text-gray-600">{formatNumber(keyword.count)}회</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">검색어 데이터가 없습니다.</p>
            )}
          </Card>

          {/* 인기 특허 */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">인기 분석 특허 TOP 10</h3>
              <DocumentTextIcon className="h-5 w-5 text-gray-400" />
            </div>
            
            {isLoadingPopularPatents ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : popularPatents.length > 0 ? (
              <div className="space-y-3">
                {popularPatents.map((patent, index) => (
                  <div key={index} className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <span className="flex items-center justify-center w-6 h-6 bg-purple-100 text-purple-800 text-sm font-medium rounded-full mt-0.5">
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{patent.title}</p>
                        <p className="text-xs text-gray-500">{patent.patent_number}</p>
                      </div>
                    </div>
                    <span className="text-sm text-gray-600 ml-2">{formatNumber(patent.analysis_count)}회</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">특허 분석 데이터가 없습니다.</p>
            )}
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 최근 활동 */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">최근 활동</h3>
              <ClockIcon className="h-5 w-5 text-gray-400" />
            </div>
            
            {isLoadingActivities ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : recentActivities.length > 0 ? (
              <div className="space-y-4">
                {recentActivities.slice(0, 5).map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{activity.description}</p>
                      <p className="text-xs text-gray-500">{formatDate(activity.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">최근 활동이 없습니다.</p>
            )}
          </Card>

          {/* 시스템 상태 */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">시스템 상태</h3>
              <ExclamationTriangleIcon className="h-5 w-5 text-gray-400" />
            </div>
            
            {isLoadingSystemMetrics ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : systemMetrics.length > 0 ? (
              <div className="space-y-4">
                {systemMetrics.slice(0, 5).map((metric, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{metric.name}</p>
                      <p className="text-xs text-gray-500">{metric.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{metric.value}</p>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(metric.status)}`}>
                        {metric.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">시스템 메트릭을 불러올 수 없습니다.</p>
            )}
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;