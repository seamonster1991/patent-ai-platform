import React, { useState, useEffect } from 'react';
import { 
  MagnifyingGlassIcon, 
  ArrowUpIcon, 
  ArrowDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  UserIcon,
  ArrowRightOnRectangleIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline';
import { adminApiService, UserStats, UserStatsResponse } from '../../services/adminApi';

interface UserStatsTableProps {
  className?: string;
}

const UserStatsTable: React.FC<UserStatsTableProps> = ({ className = '' }) => {
  const [userStats, setUserStats] = useState<UserStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 필터 및 정렬 상태
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  // 데이터 로드
  const loadUserStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await adminApiService.getUserStats({
        page: currentPage,
        limit: pageSize,
        search: searchTerm,
        sortBy,
        sortOrder
      });
      
      setUserStats(response);
    } catch (err: any) {
      console.error('Error loading user stats:', err);
      setError(err.message || '회원 통계를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 초기 로드 및 의존성 변경 시 재로드
  useEffect(() => {
    loadUserStats();
  }, [currentPage, sortBy, sortOrder]);

  // 검색어 변경 시 디바운스 적용
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1); // 검색 시 첫 페이지로
      loadUserStats();
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 정렬 핸들러
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  // 정렬 아이콘 렌더링
  const renderSortIcon = (column: string) => {
    if (sortBy !== column) return null;
    return sortOrder === 'asc' ? 
      <ArrowUpIcon className="w-4 h-4 ml-1" /> : 
      <ArrowDownIcon className="w-4 h-4 ml-1" />;
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  // 구독 플랜 배지
  const getSubscriptionBadge = (plan: string) => {
    const colors = {
      free: 'bg-gray-100 text-gray-800',
      premium: 'bg-blue-100 text-blue-800',
      enterprise: 'bg-purple-100 text-purple-800'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[plan as keyof typeof colors] || colors.free}`}>
        {plan.toUpperCase()}
      </span>
    );
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="text-center py-8">
          <div className="text-red-500 mb-2">⚠️</div>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={loadUserStats}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  if (!userStats) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="text-center py-8">
          <p className="text-gray-600">데이터를 불러올 수 없습니다.</p>
        </div>
      </div>
    );
  }

  const { users, pagination, summary } = userStats.data;

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* 헤더 */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">회원별 활동 통계</h3>
          <div className="text-sm text-gray-500">
            총 {summary.totalUsers}명
          </div>
        </div>

        {/* 요약 통계 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex items-center">
              <ArrowRightOnRectangleIcon className="w-5 h-5 text-blue-500 mr-2" />
              <div>
                <p className="text-sm text-blue-600">평균 로그인</p>
                <p className="text-lg font-semibold text-blue-900">{summary.averageLogins.toFixed(1)}</p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="flex items-center">
              <MagnifyingGlassIcon className="w-5 h-5 text-green-500 mr-2" />
              <div>
                <p className="text-sm text-green-600">평균 검색</p>
                <p className="text-lg font-semibold text-green-900">{summary.averageSearches.toFixed(1)}</p>
              </div>
            </div>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg">
            <div className="flex items-center">
              <DocumentDuplicateIcon className="w-5 h-5 text-purple-500 mr-2" />
              <div>
                <p className="text-sm text-purple-600">평균 리포트</p>
                <p className="text-lg font-semibold text-purple-900">{summary.averageReports.toFixed(1)}</p>
              </div>
            </div>
          </div>
          <div className="bg-orange-50 p-3 rounded-lg">
            <div className="flex items-center">
              <UserIcon className="w-5 h-5 text-orange-500 mr-2" />
              <div>
                <p className="text-sm text-orange-600">활성 회원</p>
                <p className="text-lg font-semibold text-orange-900">{summary.totalUsers}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 검색 */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="이름, 이메일, 회사명으로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* 테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center">
                  회원명
                  {renderSortIcon('name')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('email')}
              >
                <div className="flex items-center">
                  이메일
                  {renderSortIcon('email')}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                구독 플랜
              </th>
              <th 
                className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('total_logins')}
              >
                <div className="flex items-center justify-center">
                  로그인 수
                  {renderSortIcon('total_logins')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('total_searches')}
              >
                <div className="flex items-center justify-center">
                  검색 수
                  {renderSortIcon('total_searches')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('total_reports')}
              >
                <div className="flex items-center justify-center">
                  리포트 수
                  {renderSortIcon('total_reports')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('activity_score')}
              >
                <div className="flex items-center justify-center">
                  활동 점수
                  {renderSortIcon('activity_score')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('last_login_at')}
              >
                <div className="flex items-center justify-center">
                  최근 로그인
                  {renderSortIcon('last_login_at')}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    {user.company && (
                      <div className="text-sm text-gray-500">{user.company}</div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{user.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getSubscriptionBadge(user.subscription_plan)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className="text-sm font-medium text-blue-600">{user.total_logins}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className="text-sm font-medium text-green-600">{user.total_searches}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className="text-sm font-medium text-purple-600">{user.total_reports}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className="text-sm font-medium text-orange-600">{user.activity_score}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className="text-sm text-gray-500">{formatDate(user.last_login_at)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {pagination.totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} / {pagination.total}명
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={!pagination.hasPrev}
                className="p-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(pagination.totalPages - 4, currentPage - 2)) + i;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-2 rounded-md text-sm font-medium ${
                        pageNum === currentPage
                          ? 'bg-blue-500 text-white'
                          : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-300'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={!pagination.hasNext}
                className="p-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserStatsTable;