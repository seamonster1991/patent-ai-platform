import React, { useState, useEffect } from 'react';
import { Card } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { Badge } from '@/components/UI/Badge';
import { 
  CreditCard, 
  Search, 
  Filter,
  RefreshCw,
  Download,
  DollarSign,
  Calendar,
  User,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Eye,
  RotateCcw
} from 'lucide-react';

// 타입 정의
interface Payment {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  payment_method: string;
  transaction_id: string;
  created_at: string;
  updated_at: string;
  description?: string;
  refund_amount?: number;
  refund_reason?: string;
}

interface PaymentFilters {
  status: 'all' | 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  search: string;
  dateFrom: string;
  dateTo: string;
  sortBy: 'created_at' | 'amount' | 'updated_at';
  sortOrder: 'asc' | 'desc';
}

interface PaymentStats {
  total_amount: number;
  total_transactions: number;
  successful_transactions: number;
  failed_transactions: number;
  refunded_amount: number;
  pending_amount: number;
}

interface PaymentManagementProps {
  className?: string;
}

const PaymentManagement: React.FC<PaymentManagementProps> = ({ className = '' }) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPayments, setTotalPayments] = useState(0);
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundingPayment, setRefundingPayment] = useState<Payment | null>(null);
  const [refundReason, setRefundReason] = useState('');

  const [filters, setFilters] = useState<PaymentFilters>({
    status: 'all',
    search: '',
    dateFrom: '',
    dateTo: '',
    sortBy: 'created_at',
    sortOrder: 'desc'
  });

  const pageSize = 20;

  // 결제 데이터 페칭
  const fetchPayments = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        status: filters.status,
        search: filters.search,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      });

      // API 기본 URL 설정 (개발/프로덕션 환경 대응)
      const apiBaseUrl = process.env.NODE_ENV === 'production' 
        ? '' // Vercel에서는 상대 경로 사용
        : 'http://localhost:3001'; // 로컬 개발 환경
      
      const response = await fetch(`${apiBaseUrl}/api/dashboard/admin-payments?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch payments');
      }

      const data = await response.json();
      setPayments(data.data.payments);
      setStats(data.data.stats);
      setTotalPages(data.data.total_pages);
      setTotalPayments(data.data.total_count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [currentPage, filters]);

  // 환불 처리
  const processRefund = async (paymentId: string, reason: string, amount?: number) => {
    try {
      // API 기본 URL 설정 (개발/프로덕션 환경 대응)
      const apiBaseUrl = process.env.NODE_ENV === 'production' 
        ? '' // Vercel에서는 상대 경로 사용
        : 'http://localhost:3001'; // 로컬 개발 환경
      
      const response = await fetch(`${apiBaseUrl}/api/dashboard/admin-payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'refund',
          paymentId, 
          reason,
          amount 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process refund');
      }

      await fetchPayments();
      setShowRefundModal(false);
      setRefundingPayment(null);
      setRefundReason('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process refund');
    }
  };

  // 결제 상태 업데이트
  const updatePaymentStatus = async (paymentId: string, status: Payment['status']) => {
    try {
      // API 기본 URL 설정 (개발/프로덕션 환경 대응)
      const apiBaseUrl = process.env.NODE_ENV === 'production' 
        ? '' // Vercel에서는 상대 경로 사용
        : 'http://localhost:3001'; // 로컬 개발 환경
      
      const response = await fetch(`${apiBaseUrl}/api/dashboard/admin-payments`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentId, status }),
      });

      if (!response.ok) {
        throw new Error('Failed to update payment status');
      }

      await fetchPayments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update payment status');
    }
  };

  // 필터 변경 핸들러
  const handleFilterChange = (key: keyof PaymentFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  // 검색 핸들러
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchPayments();
  };

  // 결제 선택 핸들러
  const handlePaymentSelect = (paymentId: string) => {
    setSelectedPayments(prev => 
      prev.includes(paymentId) 
        ? prev.filter(id => id !== paymentId)
        : [...prev, paymentId]
    );
  };

  // 전체 선택/해제
  const handleSelectAll = () => {
    if (selectedPayments.length === payments.length) {
      setSelectedPayments([]);
    } else {
      setSelectedPayments(payments.map(payment => payment.id));
    }
  };

  // 상태 배지 컴포넌트
  const StatusBadge: React.FC<{ status: Payment['status'] }> = ({ status }) => {
    const variants = {
      pending: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      refunded: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };

    const labels = {
      pending: '대기중',
      completed: '완료',
      failed: '실패',
      refunded: '환불됨',
      cancelled: '취소됨'
    };

    const icons = {
      pending: <Clock className="w-3 h-3" />,
      completed: <CheckCircle className="w-3 h-3" />,
      failed: <XCircle className="w-3 h-3" />,
      refunded: <RotateCcw className="w-3 h-3" />,
      cancelled: <XCircle className="w-3 h-3" />
    };

    return (
      <Badge className={`flex items-center gap-1 ${variants[status]}`}>
        {icons[status]}
        {labels[status]}
      </Badge>
    );
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 통화 포맷팅
  const formatCurrency = (amount: number | undefined | null, currency: string = 'KRW') => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: currency
      }).format(0);
    }
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  // 숫자 포맷팅 (안전한 처리)
  const formatNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) {
      return '0';
    }
    return num.toLocaleString();
  };

  if (loading && payments.length === 0) {
    return (
      <div className={`${className}`}>
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <CreditCard className="w-8 h-8 animate-pulse text-blue-600 mx-auto mb-2" />
                <p className="text-gray-600">결제 데이터를 불러오는 중...</p>
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
          <h2 className="text-2xl font-bold text-gray-900">결제 관리</h2>
          <p className="text-gray-600 mt-1">
            총 {formatNumber(totalPayments || 0)}건의 결제 내역
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchPayments}>
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            내보내기
          </Button>
        </div>
      </div>

      {/* 통계 카드 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card>
            <div className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">총 수익</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(stats.total_amount || 0)}
                  </p>
                </div>
              </div>
            </div>
          </Card>
          <Card>
            <div className="p-4">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">총 거래</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatNumber(stats.total_transactions || 0)}
                  </p>
                </div>
              </div>
            </div>
          </Card>
          <Card>
            <div className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">성공</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatNumber(stats.successful_transactions || 0)}
                  </p>
                </div>
              </div>
            </div>
          </Card>
          <Card>
            <div className="p-4">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="text-sm text-gray-600">실패</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatNumber(stats.failed_transactions || 0)}
                  </p>
                </div>
              </div>
            </div>
          </Card>
          <Card>
            <div className="p-4">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">환불액</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(stats.refunded_amount || 0)}
                  </p>
                </div>
              </div>
            </div>
          </Card>
          <Card>
            <div className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="text-sm text-gray-600">대기중</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(stats.pending_amount || 0)}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

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
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            {/* 검색 */}
            <form onSubmit={handleSearch} className="flex gap-2 md:col-span-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="사용자 이메일 또는 거래 ID 검색..."
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
              <option value="pending">대기중</option>
              <option value="completed">완료</option>
              <option value="failed">실패</option>
              <option value="refunded">환불됨</option>
              <option value="cancelled">취소됨</option>
            </select>

            {/* 시작 날짜 */}
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            {/* 종료 날짜 */}
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            {/* 정렬 */}
            <select
              value={`${filters.sortBy}-${filters.sortOrder}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split('-');
                setFilters(prev => ({ ...prev, sortBy: sortBy as any, sortOrder: sortOrder as any }));
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="created_at-desc">최신순</option>
              <option value="created_at-asc">오래된순</option>
              <option value="amount-desc">금액 높은순</option>
              <option value="amount-asc">금액 낮은순</option>
            </select>
          </div>
        </div>
      </Card>

      {/* 결제 목록 */}
      <Card>
        <div className="p-6">
          {/* 일괄 작업 */}
          {selectedPayments.length > 0 && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-blue-800">
                  {selectedPayments.length}건의 결제가 선택됨
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <Download className="w-4 h-4 mr-1" />
                    선택 내보내기
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
                      checked={selectedPayments.length === payments.length && payments.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">거래 정보</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">사용자</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">금액</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">상태</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">결제일</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">작업</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={selectedPayments.includes(payment.id)}
                        onChange={() => handlePaymentSelect(payment.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium text-gray-900">
                          {payment.transaction_id}
                        </div>
                        <div className="text-sm text-gray-600">
                          {payment.payment_method}
                        </div>
                        {payment.description && (
                          <div className="text-xs text-gray-500 mt-1">
                            {payment.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium text-gray-900">
                          {payment.user_name || '이름 없음'}
                        </div>
                        <div className="text-sm text-gray-600">
                          {payment.user_email}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">
                        {formatCurrency(payment.amount || 0, payment.currency)}
                      </div>
                      {payment.refund_amount && (
                        <div className="text-sm text-red-600">
                          환불: {formatCurrency(payment.refund_amount || 0, payment.currency)}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={payment.status} />
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {formatDate(payment.created_at)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline">
                          <Eye className="w-4 h-4" />
                        </Button>
                        {payment.status === 'completed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setRefundingPayment(payment);
                              setShowRefundModal(true);
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                        )}
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
                {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalPayments || 0)} / {formatNumber(totalPayments || 0)}
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

      {/* 환불 모달 */}
      {showRefundModal && refundingPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">환불 처리</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">거래 ID</p>
                  <p className="font-medium">{refundingPayment.transaction_id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">환불 금액</p>
                  <p className="font-medium">{formatCurrency(refundingPayment.amount || 0, refundingPayment.currency)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    환불 사유
                  </label>
                  <textarea
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="환불 사유를 입력하세요..."
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <Button
                  onClick={() => {
                    setShowRefundModal(false);
                    setRefundingPayment(null);
                    setRefundReason('');
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  취소
                </Button>
                <Button
                  onClick={() => processRefund(refundingPayment.id, refundReason)}
                  disabled={!refundReason.trim()}
                  className="flex-1"
                >
                  환불 처리
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PaymentManagement;