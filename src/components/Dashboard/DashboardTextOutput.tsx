import React from 'react';
import { motion } from 'framer-motion';
import { 
  ChartBarIcon, 
  MagnifyingGlassIcon,
  DocumentTextIcon,
  ArrowTrendingUpIcon,
  CalendarDaysIcon,
  UserIcon,
  GlobeAltIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

interface DashboardData {
  user?: {
    searchTrends: Array<{ date: string; count: number }>;
    reportTrends: Array<{ date: string; count: number }>;
    conversionRates: {
      searchToReport: number;
      loginToReport: number;
    };
    searchFields: Array<{ label: string; value: number; percentage: string }>;
    reportFields: Array<{ label: string; value: number; percentage: string }>;
    recentSearches: Array<{ id: string; title: string; date: string; type: string }>;
    recentReports: Array<{ id: string; title: string; date: string; type: string }>;
    totalSearches: number;
    totalReports: number;
  };
  market: {
    searchTrends: Array<{ date: string; count: number }>;
    reportTrends: Array<{ date: string; count: number }>;
    searchFields: Array<{ label: string; value: number; percentage: string }>;
    reportFields: Array<{ label: string; value: number; percentage: string }>;
    totalSearches: number;
    totalReports: number;
  };
}

interface DashboardTextOutputProps {
  data: DashboardData;
  hasUserData: boolean;
}

const DashboardTextOutput: React.FC<DashboardTextOutputProps> = ({ data, hasUserData }) => {
  // 데이터가 없는 경우 처리
  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <p className="text-gray-600">텍스트 출력을 위한 데이터가 없습니다.</p>
      </div>
    );
  }

  // 최근 7일 데이터 계산
  const getRecentTrend = (trends: Array<{ date: string; count: number }>) => {
    const recent7Days = trends.slice(-7);
    const total = recent7Days.reduce((sum, item) => sum + item.count, 0);
    const average = total / 7;
    return { total, average: Math.round(average * 10) / 10 };
  };

  // 전환율 계산
  const calculateConversionRate = (reports: number, searches: number) => {
    return searches > 0 ? ((reports / searches) * 100).toFixed(1) : '0.0';
  };

  const userSearchTrend = hasUserData ? getRecentTrend(data.user!.searchTrends) : null;
  const userReportTrend = hasUserData ? getRecentTrend(data.user!.reportTrends) : null;
  const marketSearchTrend = getRecentTrend(data.market.searchTrends);
  const marketReportTrend = getRecentTrend(data.market.reportTrends);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8"
    >
      {/* 헤더 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <DocumentTextIcon className="w-6 h-6 text-blue-600" />
          대시보드 텍스트 분석 리포트
        </h2>
        <p className="text-gray-600">
          최근 100일간의 활동 데이터를 텍스트 형태로 요약한 분석 리포트입니다.
        </p>
      </div>

      {/* 검색 추이 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <ArrowTrendingUpIcon className="w-5 h-5 text-blue-600" />
          검색 추이
        </h3>
        
        {hasUserData && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
              <UserIcon className="w-4 h-4" />
              사용자 검색수 (개인 데이터)
            </h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• 총 검색수: <span className="font-semibold">{data.user!.totalSearches}회</span></p>
              <p>• 최근 7일 총 검색: <span className="font-semibold">{userSearchTrend!.total}회</span></p>
              <p>• 최근 7일 일평균: <span className="font-semibold">{userSearchTrend!.average}회/일</span></p>
            </div>
          </div>
        )}

        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
            <GlobeAltIcon className="w-4 h-4" />
            시장 평균 (전체 사용자 데이터)
          </h4>
          <div className="text-sm text-gray-700 space-y-1">
            <p>• 총 검색수: <span className="font-semibold">{data.market.totalSearches}회</span></p>
            <p>• 최근 7일 총 검색: <span className="font-semibold">{marketSearchTrend.total}회</span></p>
            <p>• 최근 7일 일평균: <span className="font-semibold">{marketSearchTrend.average}회/일</span></p>
          </div>
        </div>
      </div>

      {/* 리포트 추이 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <DocumentTextIcon className="w-5 h-5 text-emerald-600" />
          리포트 추이
        </h3>
        
        {hasUserData && (
          <div className="mb-4 p-4 bg-emerald-50 rounded-lg">
            <h4 className="font-medium text-emerald-900 mb-2 flex items-center gap-2">
              <UserIcon className="w-4 h-4" />
              사용자 리포트 생성수 (개인 데이터)
            </h4>
            <div className="text-sm text-emerald-800 space-y-1">
              <p>• 총 리포트 생성수: <span className="font-semibold">{data.user!.totalReports}회</span></p>
              <p>• 최근 7일 총 리포트: <span className="font-semibold">{userReportTrend!.total}회</span></p>
              <p>• 최근 7일 일평균: <span className="font-semibold">{userReportTrend!.average}회/일</span></p>
            </div>
          </div>
        )}

        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
            <GlobeAltIcon className="w-4 h-4" />
            시장 평균 (전체 사용자 데이터)
          </h4>
          <div className="text-sm text-gray-700 space-y-1">
            <p>• 총 리포트 생성수: <span className="font-semibold">{data.market.totalReports}회</span></p>
            <p>• 최근 7일 총 리포트: <span className="font-semibold">{marketReportTrend.total}회</span></p>
            <p>• 최근 7일 일평균: <span className="font-semibold">{marketReportTrend.average}회/일</span></p>
          </div>
        </div>
      </div>

      {/* 전환율 분석 */}
      {hasUserData && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <ChartBarIcon className="w-5 h-5 text-purple-600" />
            전환율 분석 (개인 데이터)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 검색 전환율 */}
            <div className="p-4 bg-purple-50 rounded-lg">
              <h4 className="font-medium text-purple-900 mb-3">검색 전환율</h4>
              <div className="text-sm text-purple-800 space-y-2">
                <p>• 총 검색수: <span className="font-semibold">{data.user!.totalSearches}회</span></p>
                <p>• 총 리포트수: <span className="font-semibold">{data.user!.totalReports}회</span></p>
                <p>• 전환율: <span className="font-semibold text-lg">{calculateConversionRate(data.user!.totalReports, data.user!.totalSearches)}%</span></p>
                <div className="mt-2 bg-purple-100 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(parseFloat(calculateConversionRate(data.user!.totalReports, data.user!.totalSearches)), 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* 로그인 전환율 (가정: 로그인 수 = 검색 수) */}
            <div className="p-4 bg-indigo-50 rounded-lg">
              <h4 className="font-medium text-indigo-900 mb-3">로그인 전환율</h4>
              <div className="text-sm text-indigo-800 space-y-2">
                <p>• 총 로그인수: <span className="font-semibold">{data.user!.totalSearches}회</span></p>
                <p>• 총 리포트수: <span className="font-semibold">{data.user!.totalReports}회</span></p>
                <p>• 전환율: <span className="font-semibold text-lg">{calculateConversionRate(data.user!.totalReports, data.user!.totalSearches)}%</span></p>
                <div className="mt-2 bg-indigo-100 rounded-full h-2">
                  <div 
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(parseFloat(calculateConversionRate(data.user!.totalReports, data.user!.totalSearches)), 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 분야 분석 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <MagnifyingGlassIcon className="w-5 h-5 text-orange-600" />
          IPC/CPC 분야 분석
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 사용자 검색 분야 */}
          {hasUserData && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <UserIcon className="w-4 h-4" />
                사용자 검색 분야 분석 (개인 데이터)
              </h4>
              <div className="flex items-center justify-center p-8 bg-blue-50 rounded-lg border-2 border-dashed border-blue-200">
                <div className="text-center">
                  <ArrowRightIcon className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-blue-700">분야 분석 데이터 사용 가능</p>
                  <p className="text-xs text-blue-600 mt-1">개인 검색 패턴 기반</p>
                </div>
              </div>
            </div>
          )}

          {/* 시장 검색 분야 */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <GlobeAltIcon className="w-4 h-4" />
              시장 검색 분야 분석 (전체 사용자 데이터)
            </h4>
            <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <div className="text-center">
                <ArrowRightIcon className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-700">분야 분석 데이터 사용 가능</p>
                <p className="text-xs text-gray-600 mt-1">전체 시장 트렌드 기반</p>
              </div>
            </div>
          </div>

          {/* 사용자 리포트 분야 */}
          {hasUserData && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <UserIcon className="w-4 h-4" />
                사용자 리포트 분야 분석 (개인 데이터)
              </h4>
              <div className="flex items-center justify-center p-8 bg-emerald-50 rounded-lg border-2 border-dashed border-emerald-200">
                <div className="text-center">
                  <ArrowRightIcon className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-emerald-700">분야 분석 데이터 사용 가능</p>
                  <p className="text-xs text-emerald-600 mt-1">개인 리포트 패턴 기반</p>
                </div>
              </div>
            </div>
          )}

          {/* 시장 리포트 분야 */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <GlobeAltIcon className="w-4 h-4" />
              시장 리포트 분야 분석 (전체 사용자 데이터)
            </h4>
            <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <div className="text-center">
                <ArrowRightIcon className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-700">분야 분석 데이터 사용 가능</p>
                <p className="text-xs text-gray-600 mt-1">전체 시장 리포트 트렌드 기반</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 최근 활동 */}
      {hasUserData && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <CalendarDaysIcon className="w-5 h-5 text-teal-600" />
            최근 활동 (개인 데이터)
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 최근 검색어 */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                <MagnifyingGlassIcon className="w-4 h-4" />
                최근 검색어 (10개)
              </h4>
              {(() => {
                const recentSearches = data.user?.recentSearches ?? [];
                return recentSearches.length > 0 ? (
                  <div className="space-y-1">
                    {recentSearches.slice(0, 10).map((search, index) => (
                      <div key={search.id ?? `${index}-${search.title}`}
                           className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-blue-900">{search.title}</p>
                          <p className="text-sm text-blue-700">
                            {search.date ? new Date(search.date).toLocaleString() : '날짜 정보 없음'}
                          </p>
                        </div>
                        <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">#{index + 1}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">최근 검색 기록이 없습니다.</p>
                );
              })()}
            </div>

            {/* 최근 리포트 */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                <DocumentTextIcon className="w-4 h-4" />
                최근 리포트 제목 (10개)
              </h4>
              {(() => {
                const recentReports = data.user?.recentReports ?? [];
                return recentReports.length > 0 ? (
                  <div className="space-y-1">
                    {recentReports.slice(0, 10).map((report, index) => (
                      <div key={report.id ?? `${index}-${report.title}`}
                           className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-emerald-900">{report.title}</p>
                          <p className="text-sm text-emerald-700">
                            {report.date ? new Date(report.date).toLocaleString() : '날짜 정보 없음'}
                          </p>
                        </div>
                        <span className="text-sm bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-medium">#{index + 1}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">최근 리포트 기록이 없습니다.</p>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default DashboardTextOutput;