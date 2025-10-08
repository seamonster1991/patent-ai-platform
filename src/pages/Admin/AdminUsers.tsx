import React, { useEffect, useState } from 'react';
import { 
  Card, 
  Text, 
  Metric,
  Badge,
  Flex,
  Button,
  Select,
  SelectItem,
  TextInput,
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell
} from '@tremor/react';
import { 
  Users, 
  UserPlus, 
  Activity, 
  Search,
  AlertTriangle,
  Edit,
  MoreVertical,
  FileText,
  DollarSign
} from 'lucide-react';
import { apiGet } from '../../lib/api';

interface User {
  id: string;
  email: string;
  name?: string;
  company?: string;
  phone?: string;
  bio?: string;
  role?: string;
  subscriptionPlan?: string;
  usageCount?: number;
  createdAt: string;
  updatedAt?: string;
  lastLogin?: string;
  isActive: boolean;
  reportCount: number;
  searchCount: number;
  downloadCount?: number;
  activityCount?: number;
  totalPayments?: number;
  billingHistory?: any[];
  currentSubscription?: string;
  metadata?: {
    loginCount: number;
    lastActivity?: string;
    joinedDaysAgo: number;
  };
}

interface UserManagementData {
  users: User[];
  totalUsers: number;
  activeUsers: number;
  premiumUsers?: number;
  newUsersThisMonth: number;
  totalRevenue?: number;
  stats?: {
    totalUsers: number;
    activeUsers: number;
    premiumUsers: number;
    newUsersThisMonth: number;
    totalRevenue: number;
    averageReportsPerUser: number;
    averageSearchesPerUser: number;
  };
}

const AdminUsers: React.FC = () => {
  const [userManagementData, setUserManagementData] = useState<UserManagementData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterPlan, setFilterPlan] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const fetchUserManagementData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('👥 [AdminUsers] 사용자 관리 데이터 로드 시작');

      // 개선된 API 함수 사용
      const response = await apiGet('/api/admin?resource=users', {
        timeout: 30000,
        retries: 2,
        requireAuth: true
      });

      console.log('👥 [AdminUsers] API 응답:', response);

      if (!response.success) {
        throw new Error(response.error || '사용자 데이터를 가져오는데 실패했습니다.');
      }

      if (response.data) {
        setUserManagementData(response.data);
        console.log('👥 [AdminUsers] 사용자 데이터 설정 완료');
      }
    } catch (error) {
      console.error('[ERROR] [AdminUsers] 사용자 관리 데이터 조회 오류:', error);
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserManagementData();
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

  if (!userManagementData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">데이터가 없습니다.</div>
      </div>
    );
  }

  const { users, totalUsers, activeUsers, newUsersThisMonth, stats } = userManagementData;

  // 필터링된 사용자 목록
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesPlan = filterPlan === 'all' || user.subscriptionPlan === filterPlan;
    
    return matchesSearch && matchesRole && matchesPlan;
  });

  // 페이지네이션
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge color="emerald" size="xs">활성</Badge>
    ) : (
      <Badge color="red" size="xs">비활성</Badge>
    );
  };

  const getRoleBadge = (role: string) => {
    const roleColors: Record<string, string> = {
      'admin': 'red',
      'user': 'blue',
      'premium': 'emerald'
    };
    return <Badge color={roleColors[role] || 'gray'} size="xs">{role}</Badge>;
  };

  const getPlanBadge = (plan: string) => {
    const planColors: Record<string, string> = {
      'free': 'gray',
      'basic': 'blue',
      'premium': 'emerald',
      'enterprise': 'violet'
    };
    return <Badge color={planColors[plan] || 'gray'} size="xs">{plan}</Badge>;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-ms-text mb-2">사용자 관리</h1>
        <p className="text-gray-600">전체 사용자 현황과 관리 기능을 제공합니다</p>
      </div>

      {/* 사용자 통계 */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-ms-text">사용자 통계</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* 전체 사용자 */}
          <Card className="border-0 shadow-sm">
            <Flex alignItems="start">
              <div>
                <Text className="text-gray-600">전체 사용자</Text>
                <Metric className="text-ms-text">{totalUsers.toLocaleString()}</Metric>
              </div>
              <Users className="h-8 w-8 text-ms-olive" />
            </Flex>
          </Card>

          {/* 활성 사용자 */}
          <Card className="border-0 shadow-sm">
            <Flex alignItems="start">
              <div>
                <Text className="text-gray-600">활성 사용자</Text>
                <Metric className="text-ms-text">{activeUsers.toLocaleString()}</Metric>
              </div>
              <Activity className="h-8 w-8 text-ms-olive" />
            </Flex>
            <Flex className="mt-4">
              <Text className="text-sm text-gray-600">활성률</Text>
              <Badge color="emerald" size="xs">
                {totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0}%
              </Badge>
            </Flex>
          </Card>

          {/* 이번 달 신규 */}
          <Card className="border-0 shadow-sm">
            <Flex alignItems="start">
              <div>
                <Text className="text-gray-600">이번 달 신규</Text>
                <Metric className="text-ms-text">{newUsersThisMonth.toLocaleString()}</Metric>
              </div>
              <UserPlus className="h-8 w-8 text-ms-olive" />
            </Flex>
          </Card>

          {/* 평균 리포트/사용자 */}
          <Card className="border-0 shadow-sm">
            <Flex alignItems="start">
              <div>
                <Text className="text-gray-600">평균 리포트/사용자</Text>
                <Metric className="text-ms-text">
                  {stats?.averageReportsPerUser?.toFixed(1) || '0.0'}
                </Metric>
              </div>
              <FileText className="h-8 w-8 text-ms-olive" />
            </Flex>
          </Card>
        </div>
      </div>

      {/* 필터 및 검색 */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-ms-text">사용자 목록</h2>
        
        <Card className="border-0 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {/* 검색 */}
            <div className="md:col-span-2">
              <TextInput
                placeholder="이메일 또는 이름으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={Search}
              />
            </div>

            {/* 역할 필터 */}
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectItem value="all">모든 역할</SelectItem>
              <SelectItem value="user">일반 사용자</SelectItem>
              <SelectItem value="admin">관리자</SelectItem>
            </Select>

            {/* 구독 플랜 필터 */}
            <Select value={filterPlan} onValueChange={setFilterPlan}>
              <SelectItem value="all">모든 플랜</SelectItem>
              <SelectItem value="free">무료</SelectItem>
              <SelectItem value="basic">기본</SelectItem>
              <SelectItem value="premium">프리미엄</SelectItem>
              <SelectItem value="enterprise">엔터프라이즈</SelectItem>
            </Select>
          </div>

          {/* 사용자 테이블 */}
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>사용자</TableHeaderCell>
                <TableHeaderCell>역할</TableHeaderCell>
                <TableHeaderCell>구독 플랜</TableHeaderCell>
                <TableHeaderCell>리포트</TableHeaderCell>
                <TableHeaderCell>검색</TableHeaderCell>
                <TableHeaderCell>가입일</TableHeaderCell>
                <TableHeaderCell>상태</TableHeaderCell>
                <TableHeaderCell>액션</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <Text className="font-medium text-ms-text">{user.email}</Text>
                      {user.name && (
                        <Text className="text-sm text-gray-600">{user.name}</Text>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getRoleBadge(user.role || 'user')}
                  </TableCell>
                  <TableCell>
                    {getPlanBadge(user.subscriptionPlan || 'free')}
                  </TableCell>
                  <TableCell>
                    <Text>{user.reportCount.toLocaleString()}</Text>
                  </TableCell>
                  <TableCell>
                    <Text>{user.searchCount.toLocaleString()}</Text>
                  </TableCell>
                  <TableCell>
                    <Text className="text-sm">
                      {new Date(user.createdAt).toLocaleDateString('ko-KR')}
                    </Text>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(user.isActive)}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        size="xs"
                        variant="secondary"
                        icon={Edit}
                        onClick={() => {
                          // 사용자 편집 로직
                          console.log('Edit user:', user.id);
                        }}
                      >
                        편집
                      </Button>
                      <Button
                        size="xs"
                        variant="secondary"
                        icon={MoreVertical}
                        onClick={() => {
                          // 더 많은 옵션
                          console.log('More options for user:', user.id);
                        }}
                      >
                        더보기
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2 mt-6">
              <Button
                size="xs"
                variant="secondary"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                이전
              </Button>
              
              <div className="flex space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <Button
                      key={pageNum}
                      size="xs"
                      variant={currentPage === pageNum ? "primary" : "secondary"}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              <Button
                size="xs"
                variant="secondary"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                다음
              </Button>
            </div>
          )}

          {/* 결과 정보 */}
          <div className="mt-4 text-center">
            <Text className="text-sm text-gray-600">
              총 {filteredUsers.length}명 중 {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredUsers.length)}명 표시
            </Text>
          </div>
        </Card>
      </div>

      {/* 사용자 활동 요약 */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-ms-text">활동 요약</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 총 검색 수 */}
          <Card className="border-0 shadow-sm">
            <Flex alignItems="start">
              <div>
                <Text className="text-gray-600">총 검색 수</Text>
                <Metric className="text-ms-text">
                  {users.reduce((sum, user) => sum + user.searchCount, 0).toLocaleString()}
                </Metric>
              </div>
              <Search className="h-8 w-8 text-ms-olive" />
            </Flex>
          </Card>

          {/* 총 리포트 수 */}
          <Card className="border-0 shadow-sm">
            <Flex alignItems="start">
              <div>
                <Text className="text-gray-600">총 리포트 수</Text>
                <Metric className="text-ms-text">
                  {users.reduce((sum, user) => sum + user.reportCount, 0).toLocaleString()}
                </Metric>
              </div>
              <FileText className="h-8 w-8 text-ms-olive" />
            </Flex>
          </Card>

          {/* 총 수익 */}
          <Card className="border-0 shadow-sm">
            <Flex alignItems="start">
              <div>
                <Text className="text-gray-600">총 수익</Text>
                <Metric className="text-ms-text">
                  ${stats?.totalRevenue?.toLocaleString() || '0'}
                </Metric>
              </div>
              <DollarSign className="h-8 w-8 text-ms-olive" />
            </Flex>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;