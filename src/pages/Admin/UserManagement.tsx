import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Shield, 
  UserX,
  Eye,
  DollarSign,
  Activity,
  Calendar,
  Download,
  FileText,
  CreditCard,
  TrendingUp,
  Star
} from 'lucide-react';
import { useAdminStore } from '../../store/adminStore';
import AdminLayout from '../../components/Layout/AdminLayout';

const UserManagement: React.FC = () => {
  const { 
    userManagement, 
    loading, 
    error,
    fetchUserManagement,
    updateUserStatus,
    deleteUser 
  } = useAdminStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [subscriptionFilter, setSubscriptionFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [showUserDetail, setShowUserDetail] = useState(false);

  // 데이터 로드
  useEffect(() => {
    fetchUserManagement();
  }, [fetchUserManagement]);

  // 검색 핸들러
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // 사용자 선택 핸들러
  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(user => user.id));
    }
  };

  // 사용자 상태 변경
  const handleStatusChange = async (userId: string, isActive: boolean) => {
    try {
      await updateUserStatus(userId, isActive);
    } catch (error) {
      console.error('사용자 상태 변경 실패:', error);
    }
  };

  // 사용자 삭제
  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('정말로 이 사용자를 삭제하시겠습니까?')) {
      try {
        await deleteUser(userId);
      } catch (error) {
        console.error('사용자 삭제 실패:', error);
      }
    }
  };

  // 사용자 상세 보기
  const handleViewUser = (userId: string) => {
    setSelectedUser(userId);
    setShowUserDetail(true);
  };

  // 필터링된 사용자 목록
  const filteredUsers = useMemo(() => {
    if (!userManagement?.users) return [];

    return userManagement.users.filter(user => {
      const matchesSearch = 
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.company && user.company.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' && user.isActive) ||
        (statusFilter === 'inactive' && !user.isActive);

      const matchesRole = roleFilter === 'all' || user.role === roleFilter;

      const matchesSubscription = subscriptionFilter === 'all' || 
        user.subscriptionPlan === subscriptionFilter;

      return matchesSearch && matchesStatus && matchesRole && matchesSubscription;
    }).sort((a, b) => {
      let aValue: any = a[sortBy as keyof typeof a];
      let bValue: any = b[sortBy as keyof typeof b];

      if (sortBy === 'createdAt' || sortBy === 'lastLogin') {
        aValue = new Date(aValue || 0).getTime();
        bValue = new Date(bValue || 0).getTime();
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [userManagement?.users, searchTerm, statusFilter, roleFilter, subscriptionFilter, sortBy, sortOrder]);

  // 통계 계산
  const stats = useMemo(() => {
    if (!userManagement?.users) return null;

    const users = userManagement.users;
    const totalRevenue = users.reduce((sum, user) => sum + (user.totalPayments || 0), 0);
    const premiumUsers = users.filter(user => user.subscriptionPlan === 'premium').length;
    const avgReports = users.length > 0 ? users.reduce((sum, user) => sum + user.reportCount, 0) / users.length : 0;
    const avgSearches = users.length > 0 ? users.reduce((sum, user) => sum + user.searchCount, 0) / users.length : 0;

    return {
      totalRevenue,
      premiumUsers,
      avgReports: Math.round(avgReports * 10) / 10,
      avgSearches: Math.round(avgSearches * 10) / 10,
    };
  }, [userManagement?.users]);

  // 로딩 상태
  if (loading.users) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  const selectedUserData = selectedUser ? userManagement?.users.find(u => u.id === selectedUser) : null;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">사용자 관리</h1>
          <p className="text-slate-600 dark:text-slate-400">
            등록된 사용자 {userManagement?.totalUsers || 0}명 | 활성 사용자 {userManagement?.activeUsers || 0}명
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchUserManagement()}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            새로고침
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
            <UserPlus className="w-4 h-4" />
            <span>사용자 추가</span>
          </button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">전체 사용자</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {userManagement?.totalUsers || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Activity className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">활성 사용자</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {userManagement?.activeUsers || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <Star className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">프리미엄 사용자</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {stats?.premiumUsers || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
              <DollarSign className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">총 수익 (100일)</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                ${(stats?.totalRevenue || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 검색 및 필터 */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="이메일, 이름, 회사명으로 검색..."
              value={searchTerm}
              onChange={handleSearch}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center space-x-2"
            >
              <Filter className="w-4 h-4" />
              <span>필터</span>
            </button>

            {selectedUsers.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {selectedUsers.length}명 선택됨
                </span>
                <button className="px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded text-sm hover:bg-green-200 dark:hover:bg-green-900/40">
                  활성화
                </button>
                <button className="px-3 py-1 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded text-sm hover:bg-red-200 dark:hover:bg-red-900/40">
                  비활성화
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 필터 옵션 */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  상태
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="all">모든 상태</option>
                  <option value="active">활성</option>
                  <option value="inactive">비활성</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  구독 플랜
                </label>
                <select
                  value={subscriptionFilter}
                  onChange={(e) => setSubscriptionFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="all">모든 플랜</option>
                  <option value="free">무료</option>
                  <option value="premium">프리미엄</option>
                  <option value="enterprise">엔터프라이즈</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  역할
                </label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="all">모든 역할</option>
                  <option value="user">사용자</option>
                  <option value="admin">관리자</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  정렬
                </label>
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split('-');
                    setSortBy(field);
                    setSortOrder(order as 'asc' | 'desc');
                  }}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="createdAt-desc">최신 가입순</option>
                  <option value="createdAt-asc">오래된 가입순</option>
                  <option value="email-asc">이메일 A-Z</option>
                  <option value="lastLogin-desc">최근 로그인순</option>
                  <option value="totalPayments-desc">결제 금액순</option>
                  <option value="reportCount-desc">리포트 생성순</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 사용자 테이블 */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-700">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  사용자
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  구독 플랜
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  활동 통계 (100일)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  결제 정보
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  가입일
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => handleSelectUser(user.id)}
                      className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-slate-900 dark:text-white">
                          {user.name || '이름 없음'}
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          {user.email}
                        </div>
                        {user.company && (
                          <div className="text-xs text-slate-400 dark:text-slate-500">
                            {user.company}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.subscriptionPlan === 'premium' 
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
                        : user.subscriptionPlan === 'enterprise'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                    }`}>
                      {user.subscriptionPlan === 'premium' ? '프리미엄' : 
                       user.subscriptionPlan === 'enterprise' ? '엔터프라이즈' : '무료'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900 dark:text-white">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <FileText className="w-3 h-3 text-blue-500" />
                          <span>{user.reportCount}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Search className="w-3 h-3 text-green-500" />
                          <span>{user.searchCount}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Download className="w-3 h-3 text-purple-500" />
                          <span>{user.downloadCount || 0}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900 dark:text-white">
                      <div className="font-medium">${(user.totalPayments || 0).toLocaleString()}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {user.billingHistory?.length || 0}건의 거래
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                    <div>
                      {new Date(user.createdAt).toLocaleDateString('ko-KR')}
                    </div>
                    <div className="text-xs">
                      {user.metadata?.joinedDaysAgo}일 전
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.isActive 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                    }`}>
                      {user.isActive ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewUser(user.id)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                        title="상세 보기"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleStatusChange(user.id, !user.isActive)}
                        className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-900 dark:hover:text-yellow-300"
                        title="상태 변경"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-2 text-sm font-medium text-slate-900 dark:text-white">사용자가 없습니다</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              검색 조건을 변경하거나 새 사용자를 추가해보세요.
            </p>
          </div>
        )}
      </div>

      {/* 사용자 상세 모달 */}
      {showUserDetail && selectedUserData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  사용자 상세 정보
                </h2>
                <button
                  onClick={() => setShowUserDetail(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* 기본 정보 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">기본 정보</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-slate-600 dark:text-slate-400">이메일</label>
                      <p className="text-slate-900 dark:text-white">{selectedUserData.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-600 dark:text-slate-400">이름</label>
                      <p className="text-slate-900 dark:text-white">{selectedUserData.name || '없음'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-600 dark:text-slate-400">회사</label>
                      <p className="text-slate-900 dark:text-white">{selectedUserData.company || '없음'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-600 dark:text-slate-400">전화번호</label>
                      <p className="text-slate-900 dark:text-white">{selectedUserData.phone || '없음'}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">활동 통계</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">리포트 생성</span>
                      <span className="font-medium text-slate-900 dark:text-white">{selectedUserData.reportCount}개</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">검색 수행</span>
                      <span className="font-medium text-slate-900 dark:text-white">{selectedUserData.searchCount}회</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">문서 다운로드</span>
                      <span className="font-medium text-slate-900 dark:text-white">{selectedUserData.downloadCount || 0}회</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">로그인 횟수</span>
                      <span className="font-medium text-slate-900 dark:text-white">{selectedUserData.metadata?.loginCount || 0}회</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 결제 내역 */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  결제 내역 (최근 100일)
                </h3>
                <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-slate-600 dark:text-slate-400">총 결제 금액</span>
                    <span className="text-xl font-bold text-slate-900 dark:text-white">
                      ${(selectedUserData.totalPayments || 0).toLocaleString()}
                    </span>
                  </div>
                  
                  {selectedUserData.billingHistory && selectedUserData.billingHistory.length > 0 ? (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {selectedUserData.billingHistory.map((billing, index) => (
                        <div key={index} className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-600 last:border-b-0">
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                              {billing.event_type === 'payment_succeeded' ? '결제 성공' : billing.event_type}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {new Date(billing.processed_at).toLocaleDateString('ko-KR')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                              ${(billing.amount || 0).toLocaleString()}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {billing.payment_method || '카드'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 dark:text-slate-400 text-center py-4">
                      결제 내역이 없습니다.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;