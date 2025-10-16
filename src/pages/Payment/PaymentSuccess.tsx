import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Gift, ArrowRight, Home, Receipt } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface PaymentResult {
  orderId: string;
  transactionId: string;
  amount: number;
  pointsGranted: number;
  paymentType: string;
  goodsName: string;
  approvedAt: string;
}

const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orderId = searchParams.get('orderId');
  const tid = searchParams.get('tid');

  useEffect(() => {
    if (!orderId || !tid) {
      setError('결제 정보가 올바르지 않습니다.');
      setLoading(false);
      return;
    }

    fetchPaymentResult();
  }, [orderId, tid]);

  const fetchPaymentResult = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/payment/result?orderId=${orderId}&tid=${tid}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('결제 결과를 가져올 수 없습니다.');
      }

      const data = await response.json();
      setPaymentResult(data.result);
    } catch (err) {
      console.error('Payment result fetch error:', err);
      setError(err instanceof Error ? err.message : '결제 결과 조회 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">결제 결과를 확인하고 있습니다...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">오류 발생</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => navigate('/payment')}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              결제 페이지로 돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        {/* 성공 헤더 */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">결제가 완료되었습니다!</h1>
            <p className="text-gray-600">
              결제가 성공적으로 처리되었으며, 포인트가 지급되었습니다.
            </p>
          </div>
        </div>

        {/* 결제 상세 정보 */}
        {paymentResult && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Receipt className="w-5 h-5 mr-2" />
              결제 상세 정보
            </h2>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">주문번호</span>
                <span className="font-mono text-sm">{paymentResult.orderId}</span>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">거래번호</span>
                <span className="font-mono text-sm">{paymentResult.transactionId}</span>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">상품명</span>
                <span className="font-medium">{paymentResult.goodsName}</span>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">결제금액</span>
                <span className="font-bold text-lg">{formatCurrency(paymentResult.amount)}</span>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">결제일시</span>
                <span>{formatDateTime(paymentResult.approvedAt)}</span>
              </div>
            </div>
          </div>
        )}

        {/* 포인트 지급 정보 */}
        {paymentResult && paymentResult.pointsGranted > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 mb-6 border border-blue-200">
            <div className="flex items-center mb-3">
              <Gift className="w-6 h-6 text-blue-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">포인트 지급 완료</h3>
            </div>
            
            <div className="bg-white rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">지급된 포인트</span>
                <span className="text-2xl font-bold text-blue-600">
                  +{paymentResult.pointsGranted.toLocaleString()}P
                </span>
              </div>
              
              {paymentResult.paymentType === 'subscription' && (
                <p className="text-sm text-gray-500 mt-2">
                  구독 포인트는 1개월 후 만료됩니다.
                </p>
              )}
              
              {paymentResult.paymentType === 'addon' && (
                <p className="text-sm text-gray-500 mt-2">
                  추가 충전 포인트는 3개월 후 만료됩니다.
                </p>
              )}
            </div>
          </div>
        )}

        {/* 액션 버튼들 */}
        <div className="space-y-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
          >
            <Home className="w-5 h-5 mr-2" />
            대시보드로 이동
          </button>
          
          <button
            onClick={() => navigate('/payment/history')}
            className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center"
          >
            <Receipt className="w-5 h-5 mr-2" />
            결제 내역 보기
          </button>
          
          <button
            onClick={() => navigate('/payment')}
            className="w-full bg-white border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center"
          >
            <ArrowRight className="w-5 h-5 mr-2" />
            추가 결제하기
          </button>
        </div>

        {/* 고객 지원 안내 */}
        <div className="bg-gray-100 rounded-lg p-4 mt-6">
          <p className="text-sm text-gray-600 text-center">
            결제 관련 문의사항이 있으시면{' '}
            <a href="mailto:support@patent-ai.com" className="text-blue-600 hover:underline">
              고객지원팀
            </a>
            으로 연락해 주세요.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;