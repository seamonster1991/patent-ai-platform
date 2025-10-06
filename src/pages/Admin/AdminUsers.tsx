import React, { useEffect, useState } from 'react';
import { useAdminStore } from '@/store/adminStore';
import { 
  Card, 
  Text, 
  Metric,
  LineChart,
  Badge,
  Flex,
  Button,
  Select,
  SelectItem,
  TextInput
} from '@tremor/react';
import { 
  Users, 
  UserPlus, 
  Activity, 
  Search,
  AlertTriangle,
  Edit,
  MoreVertical
} from 'lucide-react';

const AdminUsers: React.FC = () => {
  const {
    userStats,
    adminUsers,
    isLoading,
    fetchAdminUsers,
    fetchUserStats,
    updateUserStatus,
    updateUserSubscription
  } = useAdminStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [subscriptionFilter, setSubscriptionFilter] = useState('all');

  useEffect(() => {
    fetchUserStats();
    fetchAdminUsers();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-ms-text">데이터를 불러오는 중...</div>
      </div>
    )
  }

  const filteredUsers = adminUsers.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    const matchesSubscription = subscriptionFilter === 'all' || user.subscriptionPlan === subscriptionFilter;
    return matchesSearch && matchesStatus && matchesSubscription;
  });

  const getSubscriptionBadge = (subscription: string) => {
    switch (subscription) {
      case 'premium':
        return <Badge color="emerald" size="xs">Premium</Badge>;
      case 'pro':
        return <Badge color="blue" size="xs">Pro</Badge>;
      case 'basic':
        return <Badge color="yellow" size="xs">Basic</Badge>;
      default:
        return <Badge color="gray" size="xs">Free</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    return status === 'active' 
      ? <Badge color="emerald" size="xs">활성</Badge>
      : <Badge color="red" size="xs">비활성</Badge>;
  };

  const handleStatusChange = async (userId: string, newStatus: 'active' | 'inactive') => {
    await updateUserStatus(userId, newStatus);
  };

  const handleSubscriptionChange = async (userId: string, newSubscription: string) => {
    await updateUserSubscription(userId, newSubscription as 'free' | 'premium');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-ms-text mb-2">사용자 관리</h1>
        <p className="text-gray-600">사용자 계정과 활동을 관리하고 모니터링합니다</p>
      </div>

      {/* 사용자 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-0 shadow-sm">
          <Flex alignItems="start">
            <div>
              <Text className="text-gray-600">전체 사용자</Text>
              <Metric className="text-ms-text">{userStats?.totalUsers.toLocaleString()}</Metric>
            </div>
            <Users className="h-8 w-8 text-ms-olive" />
          </Flex>
          <div className="mt-4">
            <Text className="text-xs text-gray-500">
              누적 가입자 수
            </Text>
          </div>
        </Card>

        <Card className="border-0 shadow-sm">
          <Flex alignItems="start">
            <div>
              <Text className="text-gray-600">활성 사용자</Text>
              <Metric className="text-ms-text">{userStats?.activeUsers.toLocaleString()}</Metric>
            </div>
            <Activity className="h-8 w-8 text-ms-olive" />
          </Flex>
          <div className="mt-4">
            <Text className="text-xs text-gray-500">
              최근 7일 활동
            </Text>
          </div>
        </Card>

        <Card className="border-0 shadow-sm">
          <Flex alignItems="start">
            <div>
              <Text className="text-gray-600">신규 가입자</Text>
              <Metric className="text-ms-text">{userStats?.newSignups.toLocaleString()}</Metric>
            </div>
            <UserPlus className="h-8 w-8 text-ms-olive" />
          </Flex>
          <div className="mt-4">
            <Badge color="emerald" size="xs">
              +{((userStats?.newSignups || 0) / Math.max(userStats?.totalUsers || 1, 1) * 100).toFixed(1)}%
            </Badge>
            <Text className="text-xs text-gray-500 ml-2">
              최근 30일
            </Text>
          </div>
        </Card>
      </div>

      {/* 활동 추이 차트 */}
      <Card className="border-0 shadow-sm">
        <div className="mb-4">
          <Text className="text-lg font-semibold text-ms-text">사용자 활동 추이</Text>
          <Text className="text-gray-600">일별 활성 사용자 및 신규 가입자 수</Text>
        </div>
        <div className="h-64 flex items-center justify-center text-gray-500">
          활동 추이 데이터를 준비 중입니다...
        </div>
      </Card>

      {/* 사용자 목록 */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-ms-text">사용자 목록</h2>
          <div className="flex items-center space-x-4">
            {/* 검색 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <TextInput
                placeholder="이메일 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            
            {/* 상태 필터 */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectItem value="all">모든 상태</SelectItem>
              <SelectItem value="active">활성</SelectItem>
              <SelectItem value="inactive">비활성</SelectItem>
            </Select>
            
            {/* 구독 필터 */}
            <Select value={subscriptionFilter} onValueChange={setSubscriptionFilter}>
              <SelectItem value="all">모든 구독</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="basic">Basic</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
            </Select>
          </div>
        </div>

        <Card className="border-0 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-ms-text">사용자</th>
                  <th className="text-left py-3 px-4 font-semibold text-ms-text">구독 등급</th>
                  <th className="text-left py-3 px-4 font-semibold text-ms-text">상태</th>
                  <th className="text-left py-3 px-4 font-semibold text-ms-text">최종 로그인</th>
                  <th className="text-left py-3 px-4 font-semibold text-ms-text">리포트 수</th>
                  <th className="text-left py-3 px-4 font-semibold text-ms-text">관리</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium text-ms-text">{user.email}</div>
                        <div className="text-xs text-gray-500">ID: {user.id.slice(0, 8)}...</div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {getSubscriptionBadge(user.subscriptionPlan)}
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(user.status)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {new Date(user.lastLogin).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="py-3 px-4 text-sm text-ms-text font-medium">
                      {user.totalReports}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <Select
                          value={user.subscriptionPlan}
                          onValueChange={(value) => handleSubscriptionChange(user.id, value)}
                        >
                          <SelectItem value="free">Free</SelectItem>
                          <SelectItem value="basic">Basic</SelectItem>
                          <SelectItem value="pro">Pro</SelectItem>
                          <SelectItem value="premium">Premium</SelectItem>
                        </Select>
                        
                        <Button
                          size="xs"
                          variant="secondary"
                          onClick={() => handleStatusChange(
                            user.id, 
                            user.status === 'active' ? 'inactive' : 'active'
                          )}
                        >
                          {user.status === 'active' ? '비활성화' : '활성화'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              조건에 맞는 사용자가 없습니다.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AdminUsers;