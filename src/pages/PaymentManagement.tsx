/**
 * 결제 관리 페이지
 * 결제 내역 조회, 환불 처리, 결제 통계 관리
 */

import React, { useEffect, useState } from 'react';
import AdminLayout from '../components/Admin/AdminLayout';
import { Card } from '../components/UI/Card';
import { LoadingSpinner } from '../components/UI/LoadingSpinner';
import { adminApiService, Payment } from '../services/adminApi';
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  CreditCardIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  BanknotesIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

interface PaymentFilters {
  status: string;
  method: string;
  dateRange: string;
  search: string;
  amountRange: string;
}

interface PaymentStats {
  total_revenue: number;
  total_transactions: number;
  successful_transactions: number;
  failed_transactions: number;
  refunded_transactions: number;
  pending_transactions: number;
  average_transaction_amount: number;
  revenue_today: number;
  revenue_this_week: number;
  revenue_this_month: number;
}

const PaymentManagement: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRefundConfirm, setShowRefundConfirm] = useState(false);
  const [paymentToRefund, setPaymentToRefund] = useState<Payment | null>(null);
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [refundReason, setRefundReason] = useState<string>('');
  
  // 필터 및 검색 상태
  const [filters, setFilters] = useState<PaymentFilters>({
    status: 'all',
    method: 'all',
    dateRange: 'all',
    search: '',
    amountRange: 'all'
  });
  
  // 페이지네이션
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPayments, setTotalPayments] = useState(0);
  const paymentsPerPage = 10;

  // 결제 목록 조회
  const fetchPayments = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = {
        page: currentPage,
        limit: paymentsPerPage,
        status: filters.status !== 'all' ? filters.status : undefined,
        method: filters.method !== 'all' ? filters.method : undefined,
        search: filters.search || undefined,
        date_range: filters.dateRange !== 'all' ? filters.dateRange : undefined,
        amount_range: filters.amountRange !== 'all' ? filters.amountRange : undefined
      };
      
      const response = await adminApiService.getPayments(params);
      setPayments(response.payments);
      setTotalPages(response.total_pages);
      setTotalPayments(response.total);
    } catch (error: any) {
      setError(error.response?.data?.detail || '결제 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 결제 통계 조회
  const fetchPaymentStats = async () => {
    setIsStatsLoading(true);
    
    try {
      const response = await adminApiService.getPaymentStats({
        date_range: filters.dateRange !== 'all' ? filters.dateRange : undefined
      });
      setStats(response);
    } catch (error: any) {
      console.error('결제 통계 조회 실패:', error);
    } finally {
      setIsStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [currentPage, filters]);

  useEffect(() => {
    fetchPaymentStats();
  }, [filters.dateRange]);

  // 필터 변경 핸들러
  const handleFilterChange = (key: keyof PaymentFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // 필터 변경 시 첫 페이지로 이동
  };

  // 검색 핸들러
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchPayments();
  };

  // 환불 처리
  const handleRefund = async () => {
    if (!paymentToRefund || !refundAmount) return;
    
    try {
      await adminApiService.processRefund(paymentToRefund.id, {
        amount: parseFloat(refundAmount),
        reason: refundReason
      });
      
      setShowRefundConfirm(false);
      setPaymentToRefund(null);
      setRefundAmount('');
      setRefundReason('');
      fetchPayments(); // 목록 새로고침
      fetchPaymentStats(); // 통계 새로고침
    } catch (error: any) {
      setError(error.response?.data?.detail || '환불 처리에 실패했습니다.');
    }
  };

  // 결제 상세 정보 보기
  const handleViewPayment = (payment: Payment) => {
    setSelectedPayment(payment);
    setShowPaymentModal(true);
  };

  // 상태 배지 색상
  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 결제 방법 아이콘
  const getPaymentMethodIcon = (method: string) => {
    if (!method) return <CreditCardIcon className="h-4 w-4" />;
    
    switch (method.toLowerCase()) {
      case 'card':
      case 'credit_card':
        return <CreditCardIcon className="h-4 w-4" />;
      case 'bank':
      case 'bank_transfer':
        return <BanknotesIcon className="h-4 w-4" />;
      default:
        return <CreditCardIcon className="h-4 w-4" />;
    }
  };

  // 금액 포맷팅
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount);
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">결제 관리</h1>
            <p className="text-gray-600">전체 {totalPayments}건의 결제 내역</p>
          </div>
          
          <button
            onClick={() => {
              fetchPayments();
              fetchPaymentStats();
            }}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <ArrowPathIcon className="h-5 w-5 mr-2" />
            새로고침
          </button>
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

        {/* 결제 통계 */}
        {isStatsLoading ? (
          <Card className="p-6">
            <div className="flex justify-center">
              <LoadingSpinner size="sm" />
            </div>
          </Card>
        ) : stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <BanknotesIcon className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">총 수익</p>
                  <p className="text-2xl font-bold text-gray-900">{formatAmount(stats.total_revenue)}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChartBarIcon className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">총 거래</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_transactions.toLocaleString()}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircleIcon className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">성공률</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.total_transactions > 0 
                      ? Math.round((stats.successful_transactions / stats.total_transactions) * 100)
                      : 0}%
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ArrowPathIcon className="h-8 w-8 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">환불 거래</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.refunded_transactions.toLocaleString()}</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* 검색 및 필터 */}
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* 검색 */}
            <form onSubmit={handleSearch} className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="거래 ID, 사용자로 검색..."
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
              <option value="completed">완료</option>
              <option value="pending">대기</option>
              <option value="failed">실패</option>
              <option value="refunded">환불</option>
              <option value="cancelled">취소</option>
            </select>

            {/* 결제 방법 필터 */}
            <select
              value={filters.method}
              onChange={(e) => handleFilterChange('method', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">모든 방법</option>
              <option value="card">카드</option>
              <option value="bank">계좌이체</option>
              <option value="paypal">PayPal</option>
            </select>

            {/* 금액 범위 필터 */}
            <select
              value={filters.amountRange}
              onChange={(e) => handleFilterChange('amountRange', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">모든 금액</option>
              <option value="0-10000">1만원 미만</option>
              <option value="10000-50000">1-5만원</option>
              <option value="50000-100000">5-10만원</option>
              <option value="100000+">10만원 이상</option>
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

        {/* 결제 목록 */}
        <Card>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : payments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      거래 ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      사용자
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      금액
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      결제 방법
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상태
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      결제일
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {payment.transaction_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{payment.user_name}</div>
                        <div className="text-sm text-gray-500">{payment.user_email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatAmount(payment.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getPaymentMethodIcon(payment.method)}
                          <span className="ml-2 text-sm text-gray-900">{payment.method}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(payment.status)}`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(payment.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleViewPayment(payment)}
                            className="text-blue-600 hover:text-blue-900"
                            title="상세 보기"
                          >
                            상세
                          </button>
                          {payment.status === 'completed' && (
                            <button
                              onClick={() => {
                                setPaymentToRefund(payment);
                                setRefundAmount(payment.amount.toString());
                                setShowRefundConfirm(true);
                              }}
                              className="text-orange-600 hover:text-orange-900"
                              title="환불"
                            >
                              환불
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">조건에 맞는 결제 내역이 없습니다.</p>
            </div>
          )}
        </Card>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              {((currentPage - 1) * paymentsPerPage) + 1}-{Math.min(currentPage * paymentsPerPage, totalPayments)} / {totalPayments}건
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

      {/* 결제 상세 모달 */}
      {showPaymentModal && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">결제 상세 정보</h2>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedPayment(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">거래 ID</label>
                  <p className="mt-1 text-sm font-mono text-gray-900">{selectedPayment.transaction_id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">상태</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(selectedPayment.status)}`}>
                    {selectedPayment.status}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">사용자</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedPayment.user_name}</p>
                  <p className="text-sm text-gray-500">{selectedPayment.user_email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">금액</label>
                  <p className="mt-1 text-sm font-medium text-gray-900">{formatAmount(selectedPayment.amount)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">결제 방법</label>
                  <div className="flex items-center mt-1">
                    {getPaymentMethodIcon(selectedPayment.method)}
                    <span className="ml-2 text-sm text-gray-900">{selectedPayment.method}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">결제일</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(selectedPayment.created_at)}</p>
                </div>
              </div>
              
              {selectedPayment.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">설명</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedPayment.description}</p>
                </div>
              )}
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedPayment(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  닫기
                </button>
                {selectedPayment.status === 'completed' && (
                  <button
                    onClick={() => {
                      setPaymentToRefund(selectedPayment);
                      setRefundAmount(selectedPayment.amount.toString());
                      setShowPaymentModal(false);
                      setShowRefundConfirm(true);
                    }}
                    className="px-4 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700"
                  >
                    환불 처리
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 환불 확인 모달 */}
      {showRefundConfirm && paymentToRefund && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center mb-4">
              <ExclamationTriangleIcon className="h-6 w-6 text-orange-600 mr-3" />
              <h2 className="text-lg font-bold text-gray-900">환불 처리</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  거래 ID: <span className="font-mono">{paymentToRefund.transaction_id}</span>
                </p>
                <p className="text-sm text-gray-600">
                  원래 금액: <span className="font-medium">{formatAmount(paymentToRefund.amount)}</span>
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">환불 금액</label>
                <input
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  max={paymentToRefund.amount}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">환불 사유</label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="환불 사유를 입력하세요..."
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowRefundConfirm(false);
                  setPaymentToRefund(null);
                  setRefundAmount('');
                  setRefundReason('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleRefund}
                disabled={!refundAmount || parseFloat(refundAmount) <= 0}
                className="px-4 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                환불 처리
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default PaymentManagement;