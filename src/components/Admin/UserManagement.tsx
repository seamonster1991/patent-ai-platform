import React, { useState, useEffect } from 'react';
import { Card } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { Badge } from '@/components/UI/Badge';
import { 
  Users, 
  Search, 
  Filter,
  Plus,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  Mail,
  Calendar,
  Activity,
  FileText,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal
} from 'lucide-react';

// 타입 정의
interface User {
  id: string;
  email: string;
  name: string;
  status: 'active' | 'inactive' | 'deleted';
  created_at: string;
  last_login: string | null;
  search_count: number;
  report_count: number;
  point_balance: number;
  subscription_plan?: string;
}

interface UserFilters {
  status: 'all' | 'active' | 'inactive' | 'deleted';
  search: string;
  sortBy: 'created_at' | 'last_login' | 'search_count' | 'report_count';
  sortOrder: 'asc' | 'desc';
}

interface UserManagementProps {
  className?: string;
}

const UserManagement: React.FC<UserManagementProps> = ({ className = '' }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [filters, setFilters] = useState<UserFilters>({
    status: 'all',
    search: '',
    sortBy: 'created_at',
    sortOrder: 'desc'
  });

  const pageSize = 20;

  // 사용자 데이터 페칭
  const fetchUsers = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        status: filters.status,
        search: filters.search,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      });

      // API 기본 URL 설정 (개발/프로덕션 환경 대응)
      const apiBaseUrl = process.env.NODE_ENV === 'production' 
        ? '' // Vercel에서는 상대 경로 사용
        : 'http://localhost:3001'; // 로컬 개발 환경
      
      // 인증 헤더 설정
      const token = localStorage.getItem('admin_token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      const response = await fetch(`${apiBaseUrl}/api/dashboard/admin-users?${params}`, {
        headers
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.data.users);
      setTotalPages(data.data.total_pages);
      setTotalUsers(data.data.total_count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentPage, filters]);

  // 사용자 상태 업데이트
  const updateUserStatus = async (userId: string, status: 'active' | 'inactive' | 'deleted') => {
    try {
      // API 기본 URL 설정 (개발/프로덕션 환경 대응)
      const apiBaseUrl = process.env.NODE_ENV === 'production' 
        ? '' // Vercel에서는 상대 경로 사용
        : 'http://localhost:3001'; // 로컬 개발 환경
      
      const response = await fetch(`${apiBaseUrl}/api/dashboard/admin-users`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          user_id: userId, 
          is_active: status === 'active' 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update user status');
      }

      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user status');
    }
  };

  // 사용자 삭제
  const deleteUser = async (userId: string) => {
    if (!confirm('정말로 이 사용자를 삭제하시겠습니까?')) {
      return;
    }

    try {
      // API 기본 URL 설정 (개발/프로덕션 환경 대응)
      const apiBaseUrl = process.env.NODE_ENV === 'production' 
        ? '' // Vercel에서는 상대 경로 사용
        : 'http://localhost:3001'; // 로컬 개발 환경
      
      // 인증 헤더 설정
      const token = localStorage.getItem('admin_token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      const response = await fetch(`${apiBaseUrl}/api/dashboard/admin-users`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ user_id: userId }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  // 필터 변경 핸들러
  const handleFilterChange = (key: keyof UserFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  // 검색 핸들러
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchUsers();
  };

  // 사용자 선택 핸들러
  const handleUserSelect = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // 전체 선택/해제
  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(user => user.id));
    }
  };

  // 상태 배지 컴포넌트
  const StatusBadge: React.FC<{ status: User['status'] }> = ({ status }) => {
    const variants = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-yellow-100 text-yellow-800',
      deleted: 'bg-red-100 text-red-800'
    };

    const labels = {
      active: '활성',
      inactive: '비활성',
      deleted: '삭제됨'
    };

    return (
      <Badge className={variants[status]}>
        {labels[status]}
      </Badge>
    );
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 숫자 포맷팅
  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  if (loading && users.length === 0) {
    return (
      <div className={`${className}`}>
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Activity className="w-8 h-8 animate-pulse text-blue-600 mx-auto mb-2" />
                <p className="text-gray-600">사용자 데이터를 불러오는 중...</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">사용자 관리</h2>
          <p className="text-gray-600 mt-1">
            총 {formatNumber(totalUsers)}명의 사용자
          </p>
        </div>
        <Button onClick={() => setShowUserModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          사용자 추가
        </Button>
      </div>

      {/* 에러 표시 */}
      {error && (
        <Card>
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        </Card>
      )}

      {/* 필터 및 검색 */}
      <Card>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 검색 */}
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="이메일 또는 이름 검색..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <Button type="submit" variant="outline">
                검색
              </Button>
            </form>

            {/* 상태 필터 */}
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">모든 상태</option>
              <option value="active">활성</option>
              <option value="inactive">비활성</option>
              <option value="deleted">삭제됨</option>
            </select>

            {/* 정렬 기준 */}
            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="created_at">가입일</option>
              <option value="last_login">최근 로그인</option>
              <option value="search_count">검색 수</option>
              <option value="report_count">리포트 수</option>
            </select>

            {/* 정렬 순서 */}
            <select
              value={filters.sortOrder}
              onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="desc">내림차순</option>
              <option value="asc">오름차순</option>
            </select>
          </div>
        </div>
      </Card>

      {/* 사용자 목록 */}
      <Card>
        <div className="p-6">
          {/* 일괄 작업 */}
          {selectedUsers.length > 0 && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-blue-800">
                  {selectedUsers.length}명의 사용자가 선택됨
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <UserCheck className="w-4 h-4 mr-1" />
                    활성화
                  </Button>
                  <Button size="sm" variant="outline">
                    <UserX className="w-4 h-4 mr-1" />
                    비활성화
                  </Button>
                  <Button size="sm" variant="outline">
                    <Mail className="w-4 h-4 mr-1" />
                    이메일 발송
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* 테이블 */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4">
                    <input
                      type="checkbox"
                      checked={selectedUsers.length === users.length && users.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">사용자</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">상태</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">가입일</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">최근 로그인</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">활동</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">포인트</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">작업</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => handleUserSelect(user.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium text-gray-900">{user.name || '이름 없음'}</div>
                        <div className="text-sm text-gray-600">{user.email}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={user.status} />
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {formatDate(user.last_login)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Search className="w-4 h-4" />
                          <span>{formatNumber(user.search_count)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <FileText className="w-4 h-4" />
                          <span>{formatNumber(user.report_count)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 text-sm">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        <span className="font-medium">{formatNumber(user.point_balance)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingUser(user)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {user.status === 'active' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateUserStatus(user.id, 'inactive')}
                          >
                            <UserX className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateUserStatus(user.id, 'active')}
                          >
                            <UserCheck className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteUser(user.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-600">
                {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalUsers)} / {formatNumber(totalUsers)}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  이전
                </Button>
                <span className="px-3 py-1 text-sm">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  다음
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default UserManagement;