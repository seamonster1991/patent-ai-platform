import React, { useEffect, useState } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
  Users,
  RefreshCw,
  Download,
  Filter
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from 'recharts';
import AdminLayout from '../../components/Layout/AdminLayout';

interface RevenueMetrics {
  mrr: number;
  arr: number;
  churnRate: number;
  mrrGrowth: number;
  arrGrowth: number;
  churnGrowth: number;
}

interface Subscriber {
  id: string;
  name: string;
  email: string;
  plan: 'basic' | 'premium' | 'enterprise';
  nextPaymentDate: string;
  paymentStatus: 'active' | 'failed' | 'pending' | 'cancelled';
  monthlyAmount: number;
  joinDate: string;
  lastPayment: string;
}

interface PaymentAlert {
  id: string;
  type: 'failed_payment' | 'card_expiring' | 'subscription_cancelled';
  userId: string;
  userName: string;
  userEmail: string;
  message: string;
  severity: 'high' | 'medium' | 'low';
  date: string;
}

interface RevenueData {
  date: string;
  mrr: number;
  newRevenue: number;
  churnedRevenue: number;
}

interface BillingData {
  metrics: RevenueMetrics;
  subscribers: Subscriber[];
  paymentAlerts: PaymentAlert[];
  revenueHistory: RevenueData[];
  totalSubscribers: number;
  activeSubscriptions: number;
  failedPayments: number;
  expiringCards: number;
}

const BillingManagement: React.FC = () => {
  const [data, setData] = useState<BillingData>({
    metrics: {
      mrr: 125400,
      arr: 1504800,
      churnRate: 3.2,
      mrrGrowth: 12.5,
      arrGrowth: 15.8,
      churnGrowth: -0.8
    },
    subscribers: [
      {
        id: '1',
        name: '김철수',
        email: 'kim@company.com',
        plan: 'enterprise',
        nextPaymentDate: '2024-12-25',
        paymentStatus: 'active',
        monthlyAmount: 299000,
        joinDate: '2024-01-15',
        lastPayment: '2024-11-25'
      },
      {
        id: '2',
        name: '이영희',
        email: 'lee@startup.co.kr',
        plan: 'premium',
        nextPaymentDate: '2024-12-28',
        paymentStatus: 'active',
        monthlyAmount: 99000,
        joinDate: '2024-03-10',
        lastPayment: '2024-11-28'
      },
      {
        id: '3',
        name: '박민수',
        email: 'park@tech.com',
        plan: 'basic',
        nextPaymentDate: '2024-12-22',
        paymentStatus: 'failed',
        monthlyAmount: 29000,
        joinDate: '2024-08-05',
        lastPayment: '2024-10-22'
      },
      {
        id: '4',
        name: '정수진',
        email: 'jung@innovation.kr',
        plan: 'premium',
        nextPaymentDate: '2024-12-30',
        paymentStatus: 'pending',
        monthlyAmount: 99000,
        joinDate: '2024-06-20',
        lastPayment: '2024-11-30'
      },
      {
        id: '5',
        name: '최대한',
        email: 'choi@bigcorp.com',
        plan: 'enterprise',
        nextPaymentDate: '2024-12-26',
        paymentStatus: 'active',
        monthlyAmount: 299000,
        joinDate: '2023-12-01',
        lastPayment: '2024-11-26'
      }
    ],
    paymentAlerts: [
      {
        id: '1',
        type: 'failed_payment',
        userId: '3',
        userName: '박민수',
        userEmail: 'park@tech.com',
        message: '결제가 실패했습니다. 카드 정보를 확인해주세요.',
        severity: 'high',
        date: '2024-12-20'
      },
      {
        id: '2',
        type: 'card_expiring',
        userId: '7',
        userName: '김영수',
        userEmail: 'kim.y@example.com',
        message: '등록된 카드가 다음 달에 만료됩니다.',
        severity: 'medium',
        date: '2024-12-19'
      },
      {
        id: '3',
        type: 'subscription_cancelled',
        userId: '12',
        userName: '이미영',
        userEmail: 'lee.m@company.kr',
        message: '구독이 취소되었습니다.',
        severity: 'medium',
        date: '2024-12-18'
      }
    ],
    revenueHistory: [
      { date: '10월', mrr: 98500, newRevenue: 15000, churnedRevenue: 8000 },
      { date: '11월', mrr: 112300, newRevenue: 22000, churnedRevenue: 8200 },
      { date: '12월', mrr: 125400, newRevenue: 18500, churnedRevenue: 5400 }
    ],
    totalSubscribers: 423,
    activeSubscriptions: 398,
    failedPayments: 12,
    expiringCards: 8
  });
  const [isLoading, setIsLoading] = useState(true);
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    const fetchBillingData = async () => {
      try {
        // TODO: Implement actual API calls to fetch billing data
        // For now, using mock data
        setTimeout(() => {
          setIsLoading(false);
          setLastUpdated(new Date());
        }, 1000);
      } catch (error) {
        console.error('Error fetching billing data:', error);
        setIsLoading(false);
      }
    };

    fetchBillingData();
    
    // Auto-refresh every 15 minutes
    const interval = setInterval(fetchBillingData, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const refreshData = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setLastUpdated(new Date());
    }, 1000);
  };

  const exportData = () => {
    // TODO: Implement export functionality
    console.log('Exporting billing data...');
  };

  const filteredSubscribers = data.subscribers.filter(subscriber => {
    const matchesPlan = filterPlan === 'all' || subscriber.plan === filterPlan;
    const matchesStatus = filterStatus === 'all' || subscriber.paymentStatus === filterStatus;
    return matchesPlan && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">활성</span>;
      case 'failed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">실패</span>;
      case 'pending':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">대기</span>;
      case 'cancelled':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">취소</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case 'basic':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">베이직</span>;
      case 'premium':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">프리미엄</span>;
      case 'enterprise':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">엔터프라이즈</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{plan}</span>;
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'failed_payment':
        return <XCircle className="h-5 w-5 text-red-400" />;
      case 'card_expiring':
        return <AlertTriangle className="h-5 w-5 text-yellow-400" />;
      case 'subscription_cancelled':
        return <XCircle className="h-5 w-5 text-gray-400" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'border-red-500 bg-red-50';
      case 'medium': return 'border-yellow-500 bg-yellow-50';
      case 'low': return 'border-blue-500 bg-blue-50';
      default: return 'border-gray-500 bg-gray-50';
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-white sm:text-3xl sm:truncate">
              결제 관리
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              수익 현황, 구독자 관리 및 결제 이슈 모니터링
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
            <div className="text-sm text-gray-400">
              마지막 업데이트: {lastUpdated.toLocaleString('ko-KR')}
            </div>
            <button
              onClick={exportData}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>내보내기</span>
            </button>
            <button
              onClick={refreshData}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>새로고침</span>
            </button>
          </div>
        </div>

        {/* Revenue Metrics */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-gray-800 overflow-hidden shadow-lg rounded-lg border border-gray-700">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 rounded-lg bg-green-500 text-green-100">
                    <DollarSign className="h-6 w-6" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-400 truncate">
                      월간 반복 수익 (MRR)
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-white">
                        ₩{data.metrics.mrr.toLocaleString()}
                      </div>
                      <div className="ml-2 flex items-baseline text-sm font-semibold text-green-400">
                        <TrendingUp className="h-4 w-4 mr-1" />
                        +{data.metrics.mrrGrowth}%
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 overflow-hidden shadow-lg rounded-lg border border-gray-700">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 rounded-lg bg-blue-500 text-blue-100">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-400 truncate">
                      연간 반복 수익 (ARR)
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-white">
                        ₩{data.metrics.arr.toLocaleString()}
                      </div>
                      <div className="ml-2 flex items-baseline text-sm font-semibold text-green-400">
                        <TrendingUp className="h-4 w-4 mr-1" />
                        +{data.metrics.arrGrowth}%
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 overflow-hidden shadow-lg rounded-lg border border-gray-700">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 rounded-lg bg-red-500 text-red-100">
                    <TrendingDown className="h-6 w-6" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-400 truncate">
                      이탈률 (Churn Rate)
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-white">
                        {data.metrics.churnRate}%
                      </div>
                      <div className="ml-2 flex items-baseline text-sm font-semibold text-green-400">
                        <TrendingDown className="h-4 w-4 mr-1" />
                        {data.metrics.churnGrowth}%
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Trend Chart */}
        <div className="bg-gray-800 shadow-lg rounded-lg border border-gray-700">
          <div className="px-6 py-4 border-b border-gray-700">
            <h3 className="text-lg font-medium text-white">수익 추이</h3>
            <p className="text-sm text-gray-400">월별 MRR, 신규 수익 및 이탈 수익</p>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.revenueHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F9FAFB'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="mrr" 
                  stackId="1"
                  stroke="#10B981" 
                  fill="#10B981"
                  fillOpacity={0.6}
                  name="MRR"
                />
                <Area 
                  type="monotone" 
                  dataKey="newRevenue" 
                  stackId="2"
                  stroke="#3B82F6" 
                  fill="#3B82F6"
                  fillOpacity={0.4}
                  name="신규 수익"
                />
                <Area 
                  type="monotone" 
                  dataKey="churnedRevenue" 
                  stackId="3"
                  stroke="#EF4444" 
                  fill="#EF4444"
                  fillOpacity={0.3}
                  name="이탈 수익"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Alerts */}
        <div className="bg-gray-800 shadow-lg rounded-lg border border-gray-700">
          <div className="px-6 py-4 border-b border-gray-700">
            <h3 className="text-lg font-medium text-white">결제 실패/위험 알림</h3>
            <p className="text-sm text-gray-400">즉시 조치가 필요한 결제 이슈</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {data.paymentAlerts.map((alert) => (
                <div key={alert.id} className={`border-l-4 p-4 rounded-lg bg-gray-900 ${getSeverityColor(alert.severity)}`}>
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      {getAlertIcon(alert.type)}
                    </div>
                    <div className="ml-3 flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-white">{alert.userName}</h4>
                        <span className="text-xs text-gray-400">{alert.date}</span>
                      </div>
                      <p className="text-sm text-gray-300 mt-1">{alert.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{alert.userEmail}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Subscriber List */}
        <div className="bg-gray-800 shadow-lg rounded-lg border border-gray-700">
          <div className="px-6 py-4 border-b border-gray-700">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
              <div>
                <h3 className="text-lg font-medium text-white">구독자 목록</h3>
                <p className="text-sm text-gray-400">현재 구독 상태 및 결제 정보</p>
              </div>
              <div className="flex items-center space-x-4">
                <select
                  value={filterPlan}
                  onChange={(e) => setFilterPlan(e.target.value)}
                  className="bg-gray-700 border border-gray-600 rounded-lg text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">모든 플랜</option>
                  <option value="basic">베이직</option>
                  <option value="premium">프리미엄</option>
                  <option value="enterprise">엔터프라이즈</option>
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-gray-700 border border-gray-600 rounded-lg text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">모든 상태</option>
                  <option value="active">활성</option>
                  <option value="failed">실패</option>
                  <option value="pending">대기</option>
                  <option value="cancelled">취소</option>
                </select>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    구독자
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    플랜
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    월 요금
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    결제 상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    다음 결제일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    가입일
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {filteredSubscribers.map((subscriber) => (
                  <tr key={subscriber.id} className="hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-600 flex items-center justify-center">
                            <span className="text-sm font-medium text-white">
                              {subscriber.name.charAt(0)}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-white">{subscriber.name}</div>
                          <div className="text-sm text-gray-400">{subscriber.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getPlanBadge(subscriber.plan)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">
                        ₩{subscriber.monthlyAmount.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(subscriber.paymentStatus)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-white">
                        <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                        {subscriber.nextPaymentDate}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-400">{subscriber.joinDate}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-gray-800 overflow-hidden shadow-lg rounded-lg border border-gray-700">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 rounded-lg bg-blue-500 text-blue-100">
                    <Users className="h-6 w-6" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-400 truncate">
                      총 구독자
                    </dt>
                    <dd className="text-2xl font-semibold text-white">
                      {data.totalSubscribers}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 overflow-hidden shadow-lg rounded-lg border border-gray-700">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 rounded-lg bg-green-500 text-green-100">
                    <CheckCircle className="h-6 w-6" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-400 truncate">
                      활성 구독
                    </dt>
                    <dd className="text-2xl font-semibold text-white">
                      {data.activeSubscriptions}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 overflow-hidden shadow-lg rounded-lg border border-gray-700">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 rounded-lg bg-red-500 text-red-100">
                    <XCircle className="h-6 w-6" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-400 truncate">
                      결제 실패
                    </dt>
                    <dd className="text-2xl font-semibold text-white">
                      {data.failedPayments}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 overflow-hidden shadow-lg rounded-lg border border-gray-700">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 rounded-lg bg-yellow-500 text-yellow-100">
                    <CreditCard className="h-6 w-6" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-400 truncate">
                      카드 만료 임박
                    </dt>
                    <dd className="text-2xl font-semibold text-white">
                      {data.expiringCards}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default BillingManagement;