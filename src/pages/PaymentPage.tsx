// Patent-AI 결제 정보 페이지
import React, { useState, useEffect } from 'react';
import { CreditCard, Calendar, Gift, Clock, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import PointBalance from '../components/PointBalance';
import NicePayButton from '../components/Payment/NicePayButton';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  created_at: string;
  description: string;
  source_amount_krw?: number;
  expires_at?: string;
  report_type?: string;
}

interface PaymentState {
  reason?: 'insufficient_points';
  requiredPoints?: number;
  currentPoints?: number;
  reportType?: string;
  returnPath?: string;
}

const PaymentPage: React.FC = () => {
  const { user, profile, loading: authLoading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const paymentState = location.state as PaymentState;
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'addon' | null>(null);
  const [paymentData, setPaymentData] = useState<{
    orderId: string;
    amount: number;
    goodsName: string;
    paymentType: string;
  } | null>(null);

  useEffect(() => {
    fetchTransactions();
    
    // 포인트 부족으로 인한 리다이렉트인 경우 안내 메시지 표시
    if (paymentState?.reason === 'insufficient_points') {
      const { requiredPoints, currentPoints, reportType } = paymentState;
      toast.info(
        `${reportType === 'business_insights' ? '비즈니스 인사이트' : '시장 분석'} 리포트 생성을 위해 포인트 충전이 필요합니다.`,
        {
          description: `필요 포인트: ${requiredPoints}P, 현재 포인트: ${currentPoints}P`,
          duration: 5000
        }
      );
    }
  }, [paymentState]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user) {
        setError('로그인이 필요합니다');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('인증 세션이 없습니다');
        return;
      }

      const response = await fetch('/api/points?action=transactions&limit=10', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('거래 내역 조회에 실패했습니다');
      }

      const data = await response.json();
      setTransactions(data.transactions || []);

    } catch (err) {
      console.error('Transactions fetch error:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscription = async () => {
    // 나이스페이 정기 구독 결제 처리 - VAT 10% 포함
    const baseAmount = 10000;
    const vatAmount = Math.floor(baseAmount * 0.1);
    const totalAmount = baseAmount + vatAmount;
    await createNicePayOrder(totalAmount, 'monthly', '월간 정기 구독 (10,000P)');
  };

  const handleAddonPurchase = async (amountKrw: number) => {
    console.log('[PaymentPage] handleAddonPurchase 호출:', {
      inputAmount: amountKrw,
      inputType: typeof amountKrw
    });
    
    // 나이스페이 추가 충전 결제 처리 - VAT 10% 포함
    const baseAmount = amountKrw;
    const vatAmount = Math.floor(baseAmount * 0.1);
    const totalAmount = baseAmount + vatAmount;
    const points = baseAmount; // 기본 포인트는 VAT 제외 금액
    const bonus = Math.floor(points * 0.1); // 10% 보너스
    const total = points + bonus;
    
    console.log('[PaymentPage] 결제 금액 계산:', {
      baseAmount,
      vatAmount,
      totalAmount,
      points,
      bonus,
      total
    });
    
    await createNicePayOrder(totalAmount, 'addon', `포인트 충전 (${total.toLocaleString()}P)`);
  };

  const createNicePayOrder = async (amountKrw: number, paymentType: 'monthly' | 'addon', goodsName: string) => {
    try {
      if (!user) {
        toast.error('로그인이 필요합니다.');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('인증 세션이 없습니다.');
        return;
      }

      console.log('[PaymentPage] createNicePayOrder 호출:', {
        amountKrw,
        paymentType,
        goodsName
      });

      // 올바른 API 엔드포인트로 요청 (Express 서버)
      const baseUrl = 'http://localhost:3001'; // Express 서버 포트
      const response = await fetch(`${baseUrl}/api/nicepay?action=create-order`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: amountKrw,
          productName: goodsName,
          buyerName: user?.user_metadata?.name || '',
          buyerEmail: user?.email || '',
          buyerTel: user?.user_metadata?.phone || '',
          paymentMethod: 'card'
        })
      });

      const data = await response.json();
      
      console.log('[PaymentPage] API 응답 데이터:', data);
      
      if (!data.success) {
        throw new Error(data.message || '주문 생성에 실패했습니다.');
      }

      console.log('[PaymentPage] 주문 생성 성공:', data);

      // API 응답에서 amount 값 확인 및 보정
      const responseAmount = data.data?.amount || amountKrw;
      console.log('[PaymentPage] 결제 데이터 설정:', {
        orderId: data.data.orderId,
        originalAmount: amountKrw,
        responseAmount: responseAmount,
        goodsName: data.data.productName || goodsName,
        responseAmountType: typeof responseAmount,
        responseAmountValid: responseAmount && responseAmount > 0
      });

      // 나이스페이 결제창 호출을 위한 데이터 설정
      const paymentDataToSet = {
        orderId: data.data.orderId,
        amount: responseAmount, // API 응답의 amount 또는 원본 amount 사용
        goodsName: data.data.productName || goodsName,
        paymentType: paymentType
      };

      console.log('[PaymentPage] setPaymentData 호출 전:', paymentDataToSet);
      
      setSelectedPlan(paymentType);
      setPaymentData(paymentDataToSet);

      console.log('[PaymentPage] setPaymentData 호출 완료');

    } catch (error) {
      console.error('[PaymentPage] 주문 생성 오류:', error);
      toast.error(error instanceof Error ? error.message : '주문 생성 중 오류가 발생했습니다.');
    }
  };

  const handlePaymentSuccess = (result: any) => {
    console.log('결제 성공:', result);
    toast.success('결제가 성공적으로 완료되었습니다!', {
      duration: 3000
    });
    
    setSelectedPlan(null);
    setPaymentData(null);
    fetchTransactions(); // 거래 내역 새로고침
    
    // 결제 완료 후 원래 페이지로 복귀
    setTimeout(() => {
      handleReturnAfterPayment();
    }, 2000);
  };

  const handlePaymentError = (error: any) => {
    console.error('결제 오류:', error);
    toast.error(error.message || '결제 중 오류가 발생했습니다.', {
      duration: 5000
    });
    setSelectedPlan(null);
    setPaymentData(null);
  };

  const handleReturnAfterPayment = () => {
    // 세션 스토리지에서 복귀 정보 확인
    const returnInfo = sessionStorage.getItem('returnAfterPayment');
    if (returnInfo) {
      try {
        const parsed = JSON.parse(returnInfo);
        sessionStorage.removeItem('returnAfterPayment');
        
        // 원래 페이지로 복귀하면서 리포트 생성 재시도 안내
        toast.info('포인트 충전이 완료되었습니다. 리포트 생성을 다시 시도해주세요.', {
          duration: 4000
        });
        
        navigate(parsed.path);
        return;
      } catch (error) {
        console.error('Return info parsing error:', error);
      }
    }
    
    // paymentState에서 복귀 경로 확인
    if (paymentState?.returnPath) {
      toast.info('포인트 충전이 완료되었습니다. 리포트 생성을 다시 시도해주세요.', {
        duration: 4000
      });
      navigate(paymentState.returnPath);
      return;
    }
    
    // 기본적으로 대시보드로 이동
    navigate('/dashboard');
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'charge':
        return <CreditCard className="w-4 h-4 text-green-500" />;
      case 'deduct':
        return <ArrowRight className="w-4 h-4 text-red-500" />;
      case 'bonus':
        return <Gift className="w-4 h-4 text-blue-500" />;
      case 'expire':
        return <Clock className="w-4 h-4 text-gray-500" />;
      default:
        return <CheckCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'charge':
      case 'bonus':
        return 'text-green-600';
      case 'deduct':
      case 'expire':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  // 인증 로딩 중이거나 사용자가 없는 경우
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">로그인이 필요합니다</h2>
          <p className="text-gray-600 mb-4">결제 서비스를 이용하려면 로그인해주세요.</p>
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 transition-colors"
          >
            로그인하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">결제 정보</h1>
          <p className="mt-2 text-gray-600">포인트 충전 및 거래 내역을 관리하세요</p>
        </div>

        {/* 포인트 부족 알림 (포인트 부족으로 인한 리다이렉트인 경우) */}
        {paymentState?.reason === 'insufficient_points' && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-amber-800 mb-2">
                  포인트 부족으로 인한 충전 필요
                </h3>
                <p className="text-amber-700 mb-3">
                  {paymentState.reportType === 'business_insights' ? '비즈니스 인사이트' : '시장 분석'} 리포트 생성을 위해 포인트가 부족합니다.
                </p>
                <div className="bg-white rounded-lg p-4 border border-amber-200">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">필요 포인트:</span>
                      <span className="font-semibold text-amber-800 ml-2">{(paymentState.requiredPoints || 0).toLocaleString()}P</span>
                    </div>
                    <div>
                      <span className="text-gray-600">현재 포인트:</span>
                      <span className="font-semibold text-red-600 ml-2">{(paymentState.currentPoints || 0).toLocaleString()}P</span>
                    </div>
                    <div>
                      <span className="text-gray-600">부족 포인트:</span>
                      <span className="font-semibold text-red-600 ml-2">
                        {((paymentState.requiredPoints || 0) - (paymentState.currentPoints || 0)).toLocaleString()}P
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">리포트 유형:</span>
                      <span className="font-semibold text-amber-800 ml-2">
                        {paymentState.reportType === 'business_insights' ? '비즈니스 인사이트' : '시장 분석'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex items-center space-x-3">
                  <button
                    onClick={() => {
                      const shortfall = (paymentState.requiredPoints || 0) - (paymentState.currentPoints || 0);
                      if (shortfall <= 5500) {
                        handleAddonPurchase(5000);
                      } else if (shortfall <= 11000) {
                        handleAddonPurchase(10000);
                      } else {
                        handleSubscription();
                      }
                    }}
                    className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors font-medium"
                  >
                    추천 충전하기
                  </button>
                  <button
                    onClick={() => navigate(paymentState.returnPath || '/dashboard')}
                    className="text-amber-700 hover:text-amber-800 font-medium"
                  >
                    나중에 하기
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 왼쪽: 포인트 잔액 및 충전 옵션 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 포인트 잔액 */}
            <PointBalance showDetails={true} />

            {/* 충전 옵션 */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">포인트 충전</h3>
              
              {/* 정기 구독 */}
              <div className="mb-6">
                <div className={`border rounded-lg p-6 ${
                  paymentState?.reason === 'insufficient_points' && 
                  ((paymentState.requiredPoints || 0) - (paymentState.currentPoints || 0)) > 11000
                    ? 'bg-amber-50 border-amber-200' 
                    : 'bg-olive-50 border-olive-200'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Calendar className="w-5 h-5 text-olive-600" />
                        <h4 className="text-lg font-semibold text-olive-800">월간 정기 구독</h4>
                        <span className="bg-olive-600 text-white text-xs px-2 py-1 rounded-full">추천</span>
                        {paymentState?.reason === 'insufficient_points' && 
                         ((paymentState.requiredPoints || 0) - (paymentState.currentPoints || 0)) > 11000 && (
                          <span className="bg-amber-600 text-white text-xs px-2 py-1 rounded-full">권장</span>
                        )}
                      </div>
                      <p className="text-olive-700 mb-3">매월 자동으로 포인트가 충전됩니다</p>
                      <div className="space-y-2 text-sm text-olive-600">
                        <p>• 10,000포인트 충전</p>
                        <p>• 매월 1,500P 무료 지급 (별도)</p>
                        <p>• 포인트 만료: 1개월</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-olive-700">₩11,000</p>
                      <p className="text-sm text-olive-600">(VAT 포함) / 월</p>
                    </div>
                  </div>
                  <button
                    onClick={handleSubscription}
                    className="w-full mt-4 bg-olive-600 text-white py-3 px-4 rounded-lg hover:bg-olive-700 transition-colors font-medium"
                  >
                    정기 구독 시작하기
                  </button>
                </div>
              </div>

              {/* 추가 충전 */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">추가 포인트 충전</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  {/* 5,000원 충전 */}
                  <div className={`border rounded-lg p-4 ${
                    paymentState?.reason === 'insufficient_points' && 
                    ((paymentState.requiredPoints || 0) - (paymentState.currentPoints || 0)) <= 5500
                      ? 'border-amber-300 bg-amber-50' 
                      : 'border-gray-200'
                  }`}>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-gray-900">₩5,500</p>
                      <p className="text-sm text-gray-600 mb-2">(VAT 포함)</p>
                      <p className="text-sm text-blue-600 font-medium">5,500포인트</p>
                      <p className="text-xs text-green-600 font-medium">10% 보너스 포함</p>
                      {paymentState?.reason === 'insufficient_points' && 
                       ((paymentState.requiredPoints || 0) - (paymentState.currentPoints || 0)) <= 5500 && (
                        <p className="text-xs text-amber-600 font-medium mt-1">권장 충전</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleAddonPurchase(5000)}
                      className={`w-full mt-3 py-2 px-4 rounded-lg transition-colors ${
                        paymentState?.reason === 'insufficient_points' && 
                        ((paymentState.requiredPoints || 0) - (paymentState.currentPoints || 0)) <= 5500
                          ? 'bg-amber-600 text-white hover:bg-amber-700' 
                          : 'bg-gray-600 text-white hover:bg-gray-700'
                      }`}
                    >
                      충전하기
                    </button>
                  </div>

                  {/* 10,000원 충전 */}
                  <div className={`border rounded-lg p-4 ${
                    paymentState?.reason === 'insufficient_points' && 
                    ((paymentState.requiredPoints || 0) - (paymentState.currentPoints || 0)) > 5500 &&
                    ((paymentState.requiredPoints || 0) - (paymentState.currentPoints || 0)) <= 11000
                      ? 'border-amber-300 bg-amber-50' 
                      : 'border-gray-200'
                  }`}>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-gray-900">₩11,000</p>
                      <p className="text-sm text-gray-600 mb-2">(VAT 포함)</p>
                      <p className="text-sm text-blue-600 font-medium">11,000포인트</p>
                      <p className="text-xs text-green-600 font-medium">10% 보너스 포함</p>
                      {paymentState?.reason === 'insufficient_points' && 
                       ((paymentState.requiredPoints || 0) - (paymentState.currentPoints || 0)) > 5500 &&
                       ((paymentState.requiredPoints || 0) - (paymentState.currentPoints || 0)) <= 11000 && (
                        <p className="text-xs text-amber-600 font-medium mt-1">권장 충전</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleAddonPurchase(10000)}
                      className={`w-full mt-3 py-2 px-4 rounded-lg transition-colors ${
                        paymentState?.reason === 'insufficient_points' && 
                        ((paymentState.requiredPoints || 0) - (paymentState.currentPoints || 0)) > 5500 &&
                        ((paymentState.requiredPoints || 0) - (paymentState.currentPoints || 0)) <= 11000
                          ? 'bg-amber-600 text-white hover:bg-amber-700' 
                          : 'bg-gray-600 text-white hover:bg-gray-700'
                      }`}
                    >
                      충전하기
                    </button>
                  </div>
                </div>

                {/* 직접 입력 충전 */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="text-center mb-4">
                    <h5 className="text-lg font-semibold text-gray-900 mb-2">사용자 정의 충전</h5>
                    <p className="text-sm text-gray-600">원하는 금액을 직접 입력하세요</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex-1">
                      <input
                        type="number"
                        min="1000"
                        max="1000000"
                        step="1000"
                        placeholder="충전 금액 (원)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
                        onChange={(e) => {
                          const baseAmount = parseInt(e.target.value) || 0;
                          const vatAmount = Math.floor(baseAmount * 0.1);
                          const totalAmount = baseAmount + vatAmount;
                          const points = baseAmount;
                          const bonus = Math.floor(baseAmount * 0.1);
                          const total = points + bonus;
                          
                          const preview = document.getElementById('custom-preview');
                          if (preview) {
                            if (baseAmount >= 1000) {
                              preview.innerHTML = `결제금액: ₩${totalAmount.toLocaleString()} (VAT포함) → ${points.toLocaleString()}P + ${bonus.toLocaleString()}P 보너스 = ${total.toLocaleString()}P`;
                              preview.className = 'text-sm text-blue-600 font-medium';
                            } else {
                              preview.innerHTML = '최소 1,000원 이상 입력해주세요';
                              preview.className = 'text-sm text-red-600';
                            }
                          }
                        }}
                      />
                    </div>
                    <button
                      onClick={() => {
                        const input = document.querySelector('input[type="number"]') as HTMLInputElement;
                        const baseAmount = parseInt(input?.value) || 0;
                        if (baseAmount >= 1000) {
                          handleAddonPurchase(baseAmount);
                        } else {
                          alert('최소 1,000원 이상 입력해주세요.');
                        }
                      }}
                      className="bg-olive-600 text-white py-2 px-4 rounded-lg hover:bg-olive-700 transition-colors font-medium"
                    >
                      충전하기
                    </button>
                  </div>
                  <div id="custom-preview" className="text-sm text-gray-500 mt-2 text-center">
                    금액을 입력하면 받을 포인트가 표시됩니다
                  </div>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    * 추가 충전 시 10% 보너스 포인트가 지급됩니다 (VAT 포함)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 오른쪽: 거래 내역 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">최근 거래 내역</h3>
                <button
                  onClick={fetchTransactions}
                  className="text-sm text-olive-600 hover:text-olive-700 font-medium"
                >
                  새로고침
                </button>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-olive-600 mx-auto"></div>
                  <p className="text-sm text-gray-600 mt-2">로딩 중...</p>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-600">거래 내역이 없습니다</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                      <div className="flex items-center space-x-3">
                        {getTransactionIcon(transaction.type)}
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {transaction.description}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(transaction.created_at).toLocaleDateString('ko-KR')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${getTransactionColor(transaction.type)}`}>
                          {transaction.type === 'deduct' || transaction.type === 'expire' ? '-' : '+'}
                          {(transaction.amount || 0).toLocaleString()}P
                        </p>
                        {transaction.source_amount_krw && (
                          <p className="text-xs text-gray-500">
                            ₩{(transaction.source_amount_krw || 0).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 나이스페이 결제 컴포넌트 */}
        {selectedPlan && paymentData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">결제 진행</h3>
              <div className="mb-4">
                <p className="text-sm text-gray-600">상품명: {paymentData.goodsName || '상품명 없음'}</p>
                <p className="text-sm text-gray-600">결제금액: ₩{(paymentData.amount || 0).toLocaleString()}</p>
              </div>
              <div className="flex space-x-3">
                <NicePayButton
                  amount={paymentData.amount}
                  productName={paymentData.goodsName}
                  buyerName={user?.user_metadata?.name || ''}
                  buyerEmail={user?.email || ''}
                  buyerTel={user?.user_metadata?.phone || ''}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                  showMethodSelector={true}
                />
                <button
                  onClick={() => {
                    setSelectedPlan(null);
                    setPaymentData(null);
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentPage;