import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { 
  Users, 
  Search, 
  Filter, 
  MoreHorizontal,
  UserCheck,
  UserX,
  Crown,
  Calendar,
  Mail,
  Activity
} from 'lucide-react';



// 더미 데이터
const userData: Array<{
  id: string;
  email: string;
  name: string;
  tier: TierType;
  status: StatusType;
  lastLogin: string;
  reportCount: number;
  joinDate: string;
}> = [
  {
    id: 'usr_001',
    email: 'john.doe@company.com',
    name: '김철수',
    tier: 'premium',
    status: 'active',
    lastLogin: '2024-12-21',
    reportCount: 47,
    joinDate: '2024-01-15'
  },
  {
    id: 'usr_002',
    email: 'jane.smith@startup.co.kr',
    name: '이영희',
    tier: 'basic',
    status: 'active',
    lastLogin: '2024-12-20',
    reportCount: 23,
    joinDate: '2024-03-22'
  },
  {
    id: 'usr_003',
    email: 'mike.wilson@tech.com',
    name: '박민수',
    tier: 'enterprise',
    status: 'inactive',
    lastLogin: '2024-12-18',
    reportCount: 156,
    joinDate: '2023-11-08'
  },
  {
    id: 'usr_004',
    email: 'sarah.lee@research.ac.kr',
    name: '최지연',
    tier: 'premium',
    status: 'active',
    lastLogin: '2024-12-21',
    reportCount: 89,
    joinDate: '2024-02-14'
  },
  {
    id: 'usr_005',
    email: 'david.kim@innovation.kr',
    name: '정대현',
    tier: 'basic',
    status: 'active',
    lastLogin: '2024-12-19',
    reportCount: 12,
    joinDate: '2024-11-30'
  }
];

const activityData = [
  { date: '12/15', activeUsers: 234, newUsers: 12 },
  { date: '12/16', activeUsers: 267, newUsers: 18 },
  { date: '12/17', activeUsers: 198, newUsers: 8 },
  { date: '12/18', activeUsers: 289, newUsers: 15 },
  { date: '12/19', activeUsers: 312, newUsers: 22 },
  { date: '12/20', activeUsers: 278, newUsers: 19 },
  { date: '12/21', activeUsers: 345, newUsers: 25 }
];

type TierType = 'basic' | 'premium' | 'enterprise';
type StatusType = 'active' | 'inactive';

const UserManagementModule: React.FC = () => {
  const [users, setUsers] = useState(userData);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTier, setFilterTier] = useState<TierType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<StatusType | 'all'>('all');

  const getTierColor = (tier: TierType) => {
    switch (tier) {
      case 'basic': return 'text-gray-600 bg-gray-100';
      case 'premium': return 'text-blue-600 bg-blue-100';
      case 'enterprise': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTierLabel = (tier: TierType) => {
    switch (tier) {
      case 'basic': return '베이직';
      case 'premium': return '프리미엄';
      case 'enterprise': return '엔터프라이즈';
      default: return tier;
    }
  };

  const getStatusColor = (status: StatusType) => {
    return status === 'active' 
      ? 'text-green-600 bg-green-100' 
      : 'text-red-600 bg-red-100';
  };

  const getStatusLabel = (status: StatusType) => {
    return status === 'active' ? '활성' : '비활성';
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTier = filterTier === 'all' || user.tier === filterTier;
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    
    return matchesSearch && matchesTier && matchesStatus;
  });

  const handleStatusChange = (userId: string, newStatus: StatusType) => {
    setUsers(users.map(user => 
      user.id === userId ? { ...user, status: newStatus } : user
    ));
  };

  const handleTierChange = (userId: string, newTier: TierType) => {
    setUsers(users.map(user => 
      user.id === userId ? { ...user, tier: newTier } : user
    ));
  };

  const UserCard: React.FC<{ user: typeof userData[0] }> = ({ user }) => {
    const [showActions, setShowActions] = useState(false);

    return (
      <div className="bg-white rounded-lg p-4 border border-gray-100">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className="font-medium text-stone-900">{user.name}</h4>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTierColor(user.tier)}`}>
                  {getTierLabel(user.tier)}
                </span>
              </div>
              <div className="flex items-center space-x-1 text-xs text-stone-500 mb-2">
                <Mail className="h-3 w-3" />
                <span>{user.email}</span>
              </div>
            </div>
            
            <div className="relative">
              <button
                onClick={() => setShowActions(!showActions)}
                className="p-1 hover:bg-gray-100 rounded-md transition-colors"
              >
                <MoreHorizontal className="h-4 w-4 text-stone-500" />
              </button>
              
              {showActions && (
                <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-32">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        handleStatusChange(user.id, user.status === 'active' ? 'inactive' : 'active');
                        setShowActions(false);
                      }}
                      className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 flex items-center space-x-2"
                    >
                      {user.status === 'active' ? <UserX className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
                      <span>{user.status === 'active' ? '비활성화' : '활성화'}</span>
                    </button>
                    <button
                      onClick={() => {
                        const newTier = user.tier === 'basic' ? 'premium' : user.tier === 'premium' ? 'enterprise' : 'basic';
                        handleTierChange(user.id, newTier);
                        setShowActions(false);
                      }}
                      className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 flex items-center space-x-2"
                    >
                      <Crown className="h-3 w-3" />
                      <span>등급 변경</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <p className="text-stone-500">상태</p>
              <span className={`inline-block px-2 py-1 rounded-full font-medium ${getStatusColor(user.status)}`}>
                {getStatusLabel(user.status)}
              </span>
            </div>
            <div>
              <p className="text-stone-500">리포트</p>
              <p className="font-medium text-stone-900">{user.reportCount}개</p>
            </div>
            <div>
              <p className="text-stone-500">최종 로그인</p>
              <p className="font-medium text-stone-900">{user.lastLogin}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* 페이지 헤더 */}
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-stone-900">사용자 관리</h2>
        <p className="text-stone-600">등록된 사용자들의 활동과 구독 상태를 관리합니다</p>
      </div>

      {/* 검색 및 필터 */}
      <div className="bg-white rounded-lg p-4 border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              type="text"
              placeholder="이름 또는 이메일로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex space-x-3">
            <select
              value={filterTier}
              onChange={(e) => setFilterTier(e.target.value as any)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-500"
            >
              <option value="all">모든 등급</option>
              <option value="basic">베이직</option>
              <option value="premium">프리미엄</option>
              <option value="enterprise">엔터프라이즈</option>
            </select>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-500"
            >
              <option value="all">모든 상태</option>
              <option value="active">활성</option>
              <option value="inactive">비활성</option>
            </select>
          </div>
        </div>
      </div>

      {/* 사용자 목록 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-stone-600" />
            <h3 className="text-lg font-medium text-stone-900">사용자 목록</h3>
            <span className="text-sm text-stone-500">({filteredUsers.length}명)</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((user) => (
            <UserCard key={user.id} user={user} />
          ))}
        </div>
        
        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-stone-500">검색 조건에 맞는 사용자가 없습니다.</p>
          </div>
        )}
      </div>

      {/* 활동 추이 차트 */}
      <div className="bg-white rounded-lg p-6 border border-gray-100">
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-stone-600" />
            <h3 className="text-lg font-medium text-stone-900">사용자 활동 추이</h3>
            <span className="text-sm text-stone-500">(최근 7일)</span>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activityData}>
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#78716c' }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#78716c' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="activeUsers" 
                  stroke="#78716c" 
                  strokeWidth={2}
                  dot={{ fill: '#78716c', strokeWidth: 0, r: 4 }}
                  name="활성 사용자"
                />
                <Line 
                  type="monotone" 
                  dataKey="newUsers" 
                  stroke="#a8a29e" 
                  strokeWidth={2}
                  dot={{ fill: '#a8a29e', strokeWidth: 0, r: 4 }}
                  name="신규 가입자"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 요약 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <div className="space-y-2">
            <p className="text-sm text-stone-600">총 사용자</p>
            <p className="text-2xl font-semibold text-stone-900">{users.length}</p>
            <p className="text-xs text-stone-500">전체 등록 사용자</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <div className="space-y-2">
            <p className="text-sm text-stone-600">활성 사용자</p>
            <p className="text-2xl font-semibold text-stone-900">
              {users.filter(u => u.status === 'active').length}
            </p>
            <p className="text-xs text-stone-500">현재 활성 상태</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <div className="space-y-2">
            <p className="text-sm text-stone-600">프리미엄 사용자</p>
            <p className="text-2xl font-semibold text-stone-900">
              {users.filter(u => u.tier === 'premium' || u.tier === 'enterprise').length}
            </p>
            <p className="text-xs text-stone-500">유료 구독자</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <div className="space-y-2">
            <p className="text-sm text-stone-600">평균 리포트</p>
            <p className="text-2xl font-semibold text-stone-900">
              {Math.round(users.reduce((sum, u) => sum + u.reportCount, 0) / users.length)}
            </p>
            <p className="text-xs text-stone-500">사용자당 평균</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagementModule;