/**
 * 사용자 관리 페이지
 * 사용자 목록 조회, 검색, 필터링, 상세 정보 관리
 */

import React, { useEffect, useState } from 'react';
import AdminLayout from '../components/Admin/AdminLayout';
import { Card } from '../components/UI/Card';
import { LoadingSpinner } from '../components/UI/LoadingSpinner';
import { adminApiService, User, UserDeleteResponse } from '../services/adminApi';
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  UserPlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  MinusIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';

interface UserFilters {
  status: string;
  role: string;
  dateRange: string;
  search: string;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [userToRestore, setUserToRestore] = useState<User | null>(null);
  const [deleteResponse, setDeleteResponse] = useState<UserDeleteResponse | null>(null);
  const [showDeletedUsers, setShowDeletedUsers] = useState(false);
  const [deletedUsers, setDeletedUsers] = useState<User[]>([]);
  const [isLoadingDeleted, setIsLoadingDeleted] = useState(false);
  
  // 포인트 관리 상태
  const [showPointModal, setShowPointModal] = useState(false);
  const [pointUser, setPointUser] = useState<User | null>(null);
  const [pointAmount, setPointAmount] = useState('');
  const [pointType, setPointType] = useState<'add' | 'subtract'>('add');
  const [pointReason, setPointReason] = useState('');
  const [isProcessingPoint, setIsProcessingPoint] = useState(false);
  
  // 필터 및 검색 상태
  const [filters, setFilters] = useState<UserFilters>({
    status: 'all',
    role: 'all',
    dateRange: 'all',
    search: ''
  });
  
  // 페이지네이션
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const usersPerPage = 10;

  // 사용자 목록 조회
  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = {
        page: currentPage,
        limit: usersPerPage,
        status: filters.status !== 'all' ? filters.status : undefined,
        role: filters.role !== 'all' ? filters.role : undefined,
        search: filters.search || undefined,
        date_range: filters.dateRange !== 'all' ? filters.dateRange : undefined
      };
      
      const response = await adminApiService.getUsers(params);
      setUsers(response.users);
      setTotalPages(response.total_pages);
      setTotalUsers(response.total);
    } catch (error: any) {
      setError(error.response?.data?.detail || '사용자 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentPage, filters]);

  // 필터 변경 핸들러
  const handleFilterChange = (key: keyof UserFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // 필터 변경 시 첫 페이지로 이동
  };

  // 검색 핸들러
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchUsers();
  };

  // 사용자 상태 변경
  const handleUserStatusChange = async (userId: string, newStatus: string) => {
    try {
      await adminApiService.updateUserStatus(userId, newStatus);
      fetchUsers(); // 목록 새로고침
    } catch (error: any) {
      setError(error.response?.data?.detail || '사용자 상태 변경에 실패했습니다.');
    }
  };

  // 삭제된 사용자 목록 조회
  const fetchDeletedUsers = async () => {
    setIsLoadingDeleted(true);
    try {
      const response = await adminApiService.getDeletedUsers();
      setDeletedUsers(response.users); // 페이지네이션된 응답에서 users 배열만 추출
    } catch (error: any) {
      setError(error.response?.data?.detail || '삭제된 사용자 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoadingDeleted(false);
    }
  };

  // 사용자 삭제 (소프트 삭제)
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      const response = await adminApiService.deleteUser(userToDelete.id);
      setDeleteResponse(response);
      setShowDeleteConfirm(false);
      setUserToDelete(null);
      fetchUsers(); // 목록 새로고침
      
      // 성공 메시지 표시
      if (response.success) {
        // 3초 후 응답 메시지 숨기기
        setTimeout(() => setDeleteResponse(null), 3000);
      }
    } catch (error: any) {
      setError(error.response?.data?.detail || '사용자 삭제에 실패했습니다.');
    }
  };

  // 사용자 복원
  const handleRestoreUser = async () => {
    if (!userToRestore) return;
    
    try {
      await adminApiService.restoreUser(userToRestore.id);
      setShowRestoreConfirm(false);
      setUserToRestore(null);
      fetchDeletedUsers(); // 삭제된 사용자 목록 새로고침
      fetchUsers(); // 일반 사용자 목록도 새로고침
    } catch (error: any) {
      setError(error.response?.data?.detail || '사용자 복원에 실패했습니다.');
    }
  };

  // 사용자 상세 정보 보기
  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  // 포인트 관리 모달 열기
  const handleOpenPointModal = (user: User, type: 'add' | 'subtract') => {
    setPointUser(user);
    setPointType(type);
    setPointAmount('');
    setPointReason('');
    setShowPointModal(true);
  };

  // 포인트 관리 처리
  const handlePointManagement = async () => {
    if (!pointUser || !pointAmount || !pointReason) {
      alert('모든 필드를 입력해주세요.');
      return;
    }

    const amount = parseInt(pointAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('유효한 포인트 금액을 입력해주세요.');
      return;
    }

    setIsProcessingPoint(true);
    
    try {
      const response = await fetch('/api/admin/point-management', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: pointUser.id,
          amount,
          type: pointType,
          reason: pointReason,
          adminId: 'admin' // 실제 구현에서는 현재 관리자 ID를 사용
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert(result.message);
        setShowPointModal(false);
        setPointUser(null);
        setPointAmount('');
        setPointReason('');
        fetchUsers(); // 사용자 목록 새로고침
      } else {
        alert(result.error || '포인트 관리에 실패했습니다.');
      }
    } catch (error) {
      console.error('포인트 관리 오류:', error);
      alert('포인트 관리 중 오류가 발생했습니다.');
    } finally {
      setIsProcessingPoint(false);
    }
  };

  // 상태 배지 색상
  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 역할 배지 색상
  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'premium':
        return 'bg-blue-100 text-blue-800';
      case 'basic':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 구독상태 배지 색상
  const getSubscriptionBadgeColor = (subscriptionType: string) => {
    switch (subscriptionType.toLowerCase()) {
      case 'premium':
        return 'bg-purple-100 text-purple-800';
      case 'paid':
        return 'bg-blue-100 text-blue-800';
      case 'free':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string | null | undefined) => {
    // null, undefined, 빈 문자열 체크
    if (!dateString || dateString.trim() === '') {
      return '없음';
    }
    
    try {
      const date = new Date(dateString);
      
      // 유효한 날짜인지 확인
      if (isNaN(date.getTime())) {
        return '잘못된 날짜';
      }
      
      return new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch (error) {
      console.error('Date formatting error:', error, 'for dateString:', dateString);
      return '날짜 오류';
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">사용자 관리</h1>
            <p className="text-gray-600">전체 {totalUsers}명의 사용자</p>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => {
                setShowDeletedUsers(true);
                fetchDeletedUsers();
              }}
              className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              <TrashIcon className="h-5 w-5 mr-2" />
              삭제된 사용자
            </button>
            <button
              onClick={() => setShowUserModal(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <UserPlusIcon className="h-5 w-5 mr-2" />
              새 사용자 추가
            </button>
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">오류</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="mt-2 text-sm text-red-600 hover:text-red-500"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 삭제 성공 메시지 */}
        {deleteResponse && (
          <div className={`border rounded-md p-4 ${
            deleteResponse.success 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex">
              <CheckCircleIcon className={`h-5 w-5 ${
                deleteResponse.success ? 'text-green-400' : 'text-red-400'
              }`} />
              <div className="ml-3">
                <h3 className={`text-sm font-medium ${
                  deleteResponse.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {deleteResponse.success ? '삭제 완료' : '삭제 실패'}
                </h3>
                <p className={`text-sm mt-1 ${
                  deleteResponse.success ? 'text-green-700' : 'text-red-700'
                }`}>
                  {deleteResponse.message}
                </p>
                <button
                  onClick={() => setDeleteResponse(null)}
                  className={`mt-2 text-sm hover:opacity-75 ${
                    deleteResponse.success ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 검색 및 필터 */}
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 검색 */}
            <form onSubmit={handleSearch} className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="이름, 이메일로 검색..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </form>

            {/* 상태 필터 */}
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">모든 상태</option>
              <option value="active">활성</option>
              <option value="inactive">비활성</option>
              <option value="suspended">정지</option>
              <option value="pending">대기</option>
            </select>

            {/* 역할 필터 */}
            <select
              value={filters.role}
              onChange={(e) => handleFilterChange('role', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">모든 역할</option>
              <option value="admin">관리자</option>
              <option value="premium">프리미엄</option>
              <option value="basic">기본</option>
            </select>

            {/* 기간 필터 */}
            <select
              value={filters.dateRange}
              onChange={(e) => handleFilterChange('dateRange', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">전체 기간</option>
              <option value="today">오늘</option>
              <option value="week">최근 7일</option>
              <option value="month">최근 30일</option>
              <option value="year">최근 1년</option>
            </select>
          </div>
        </Card>

        {/* 사용자 목록 */}
        <Card>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : users.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      사용자
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      역할
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상태
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      구독상태
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      가입일
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      마지막 결제일
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      이전 삭제 이력
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-700">
                                {user.name ? user.name.charAt(0).toUpperCase() : user.email ? user.email.charAt(0).toUpperCase() : '?'}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.name || user.username || '이름 없음'}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(user.status)}`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getSubscriptionBadgeColor(user.subscription_type || 'free')}`}>
                          {user.subscription_type === 'paid' ? '유료' : user.subscription_type === 'premium' ? '프리미엄' : '무료'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.last_payment_date ? formatDate(user.last_payment_date) : '결제 없음'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.previously_deleted ? (
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                            이전 삭제됨
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                            신규 사용자
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleViewUser(user)}
                            className="text-blue-600 hover:text-blue-900"
                            title="상세 보기"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleViewUser(user)}
                            className="text-green-600 hover:text-green-900"
                            title="편집"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          {user.status === 'active' ? (
                            <button
                              onClick={() => handleUserStatusChange(user.id, 'suspended')}
                              className="text-yellow-600 hover:text-yellow-900"
                              title="정지"
                            >
                              <XCircleIcon className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUserStatusChange(user.id, 'active')}
                              className="text-green-600 hover:text-green-900"
                              title="활성화"
                            >
                              <CheckCircleIcon className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenPointModal(user, 'add')}
                            className="text-green-600 hover:text-green-900"
                            title="포인트 충전"
                          >
                            <PlusIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenPointModal(user, 'subtract')}
                            className="text-orange-600 hover:text-orange-900"
                            title="포인트 차감"
                          >
                            <MinusIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setUserToDelete(user);
                              setShowDeleteConfirm(true);
                            }}
                            className="text-red-600 hover:text-red-900"
                            title="삭제"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">조건에 맞는 사용자가 없습니다.</p>
            </div>
          )}
        </Card>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              {((currentPage - 1) * usersPerPage) + 1}-{Math.min(currentPage * usersPerPage, totalUsers)} / {totalUsers}명
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                이전
              </button>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + Math.max(1, currentPage - 2);
                if (page > totalPages) return null;
                
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 border rounded-md text-sm font-medium ${
                      currentPage === page
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                다음
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 사용자 상세/편집 모달 */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {selectedUser ? '사용자 정보' : '새 사용자 추가'}
              </h2>
              <button
                onClick={() => {
                  setShowUserModal(false);
                  setSelectedUser(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>
            
            {selectedUser && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">이름</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedUser.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">이메일</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedUser.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">역할</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedUser.role}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">상태</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedUser.status}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">가입일</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(selectedUser.created_at)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">마지막 로그인</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {formatDate(selectedUser.last_login)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">구독상태</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getSubscriptionBadgeColor(selectedUser.subscription_type || 'free')}`}>
                      {selectedUser.subscription_type === 'paid' ? '유료' : selectedUser.subscription_type === 'premium' ? '프리미엄' : '무료'}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">마지막 결제일</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedUser.last_payment_date ? formatDate(selectedUser.last_payment_date) : '결제 없음'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">포인트 잔액</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedUser.point_balance || 0}P</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">총 검색 수</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedUser.total_searches || 0}회</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">총 결제 금액</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedUser.total_payments ? `${selectedUser.total_payments.toLocaleString()}원` : '0원'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">총 특허 수</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedUser.total_patents || 0}건</p>
                  </div>
                </div>
                
                <div className="flex justify-between items-center pt-4">
                  <div className="flex space-x-3">
                    <button
                      onClick={() => {
                        setShowUserModal(false);
                        handleOpenPointModal(selectedUser, 'add');
                      }}
                      className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
                    >
                      <PlusIcon className="h-4 w-4 mr-1" />
                      포인트 충전
                    </button>
                    <button
                      onClick={() => {
                        setShowUserModal(false);
                        handleOpenPointModal(selectedUser, 'subtract');
                      }}
                      className="flex items-center px-3 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700"
                    >
                      <MinusIcon className="h-4 w-4 mr-1" />
                      포인트 차감
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      setShowUserModal(false);
                      setSelectedUser(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    닫기
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {showDeleteConfirm && userToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center mb-4">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-3" />
              <h2 className="text-lg font-bold text-gray-900">사용자 삭제</h2>
            </div>
            
            <div className="text-sm text-gray-600 mb-6">
              <p className="mb-2">
                <strong>{userToDelete.name || userToDelete.email}</strong> 사용자를 삭제하시겠습니까?
              </p>
              <p className="text-xs text-gray-500">
                ※ 이는 안전한 소프트 삭제로, 사용자 데이터는 보존되며 필요시 복원할 수 있습니다.
              </p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setUserToDelete(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleDeleteUser}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제된 사용자 목록 모달 */}
      {showDeletedUsers && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">삭제된 사용자 목록</h2>
              <button
                onClick={() => setShowDeletedUsers(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>
            
            {isLoadingDeleted ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : deletedUsers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        사용자
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        역할
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        삭제일
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        삭제 사유
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        가입일
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        작업
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {deletedUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-700">
                                  {user.name ? user.name.charAt(0).toUpperCase() : user.email ? user.email.charAt(0).toUpperCase() : '?'}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{user.name || user.username || '이름 없음'}</div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(user.role)}`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(user.deleted_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            user.deletion_reason === 'admin_deleted' 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {user.deletion_reason === 'admin_deleted' ? '관리자 삭제' : '사용자 자체 삭제'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(user.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => {
                              setUserToRestore(user);
                              setShowRestoreConfirm(true);
                            }}
                            className="text-green-600 hover:text-green-900"
                            title="복원"
                          >
                            복원
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">삭제된 사용자가 없습니다.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 복원 확인 모달 */}
      {showRestoreConfirm && userToRestore && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center mb-4">
              <CheckCircleIcon className="h-6 w-6 text-green-600 mr-3" />
              <h2 className="text-lg font-bold text-gray-900">사용자 복원</h2>
            </div>
            
            <p className="text-sm text-gray-600 mb-6">
              <strong>{userToRestore.name || userToRestore.email}</strong> 사용자를 복원하시겠습니까?
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRestoreConfirm(false);
                  setUserToRestore(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleRestoreUser}
                className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
              >
                복원
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 포인트 관리 모달 */}
      {showPointModal && pointUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center mb-4">
              <CurrencyDollarIcon className="h-6 w-6 text-blue-600 mr-3" />
              <h2 className="text-lg font-bold text-gray-900">
                포인트 {pointType === 'add' ? '충전' : '차감'}
              </h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  사용자
                </label>
                <p className="text-sm text-gray-900">
                  {pointUser.name || pointUser.email} (현재: {pointUser.point_balance || 0}P)
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {pointType === 'add' ? '충전' : '차감'} 포인트
                </label>
                <input
                  type="number"
                  value={pointAmount}
                  onChange={(e) => setPointAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="포인트 입력"
                  min="1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  사유
                </label>
                <textarea
                  value={pointReason}
                  onChange={(e) => setPointReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="포인트 관리 사유를 입력하세요"
                  rows={3}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowPointModal(false);
                  setPointUser(null);
                  setPointAmount('');
                  setPointReason('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={isProcessingPoint}
              >
                취소
              </button>
              <button
                onClick={handlePointManagement}
                className={`px-4 py-2 rounded-md text-sm font-medium text-white ${
                  pointType === 'add' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-orange-600 hover:bg-orange-700'
                }`}
                disabled={isProcessingPoint}
              >
                {isProcessingPoint ? '처리 중...' : (pointType === 'add' ? '충전' : '차감')}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default UserManagement;