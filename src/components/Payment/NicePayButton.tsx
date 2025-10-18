import React, { useState, useEffect } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';
import PaymentMethodSelector from './PaymentMethodSelector';
import PaymentConfirmationModal from './PaymentConfirmationModal';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';

declare global {
  interface Window {
    NICEPAY: {
      requestPay: (params: any) => void;
    };
  }
}

interface NicePayButtonProps {
  amount: number;
  productName: string;
  buyerName?: string;
  buyerEmail?: string;
  buyerTel?: string;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  className?: string;
  disabled?: boolean;
  showMethodSelector?: boolean;
}

const NicePayButton: React.FC<NicePayButtonProps> = ({
  amount,
  productName,
  buyerName = '',
  buyerEmail = '',
  buyerTel = '',
  onSuccess,
  onError,
  className = '',
  disabled = false,
  showMethodSelector = true
}) => {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState<any>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('card');
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showMethodSelection, setShowMethodSelection] = useState(false);

  useEffect(() => {
    // 나이스페이 설정 정보 가져오기
    const fetchPaymentConfig = async () => {
      try {
        const response = await fetch('/api/nicepay?action=config');
        const config = await response.json();
        setPaymentConfig(config);
      } catch (error) {
        console.error('Failed to fetch payment config:', error);
        onError?.({ message: '결제 설정을 불러오는데 실패했습니다.' });
      }
    };

    fetchPaymentConfig();
  }, [onError]);

  useEffect(() => {
    // 나이스페이 JS SDK 로드
    const loadNicePayScript = () => {
      if (window.NICEPAY) {
        setIsScriptLoaded(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://web.nicepay.co.kr/v3/webstd/js/nicepay-3.0.js';
      script.async = true;
      script.onload = () => {
        setIsScriptLoaded(true);
      };
      script.onerror = () => {
        console.error('나이스페이 JS SDK 로드 실패');
        onError?.({ message: '결제 모듈 로드에 실패했습니다.' });
      };
      document.head.appendChild(script);
    };

    if (paymentConfig) {
      loadNicePayScript();
    }
  }, [paymentConfig, onError]);

  const getPaymentMethodName = (method: string) => {
    switch (method) {
      case 'card': return '신용카드';
      case 'kakaopay': return '카카오페이';
      case 'naverpay': return '네이버페이';
      case 'bank': return '계좌이체';
      default: return '신용카드';
    }
  };

  const getPaymentMethodDescription = (method: string) => {
    switch (method) {
      case 'card': return '모든 신용카드 및 체크카드 사용 가능';
      case 'kakaopay': return '카카오페이로 간편하게 결제';
      case 'naverpay': return '네이버페이로 안전하게 결제';
      case 'bank': return '실시간 계좌이체';
      default: return '모든 신용카드 및 체크카드 사용 가능';
    }
  };

  const handlePaymentMethodSelect = (methodId: string) => {
    setSelectedPaymentMethod(methodId);
    setShowMethodSelection(false);
    setShowConfirmationModal(true);
  };

  const handleConfirmPayment = async () => {
    if (!isScriptLoaded || !window.NICEPAY || !paymentConfig) {
      onError?.({ message: '결제 모듈이 아직 로드되지 않았습니다.' });
      return;
    }

    setIsLoading(true);

    try {
      if (!user) {
        onError?.({ message: '로그인이 필요합니다.' });
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        onError?.({ message: '인증 세션이 없습니다.' });
        return;
      }

      // 주문 생성
      const orderResponse = await fetch('/api/nicepay?action=create-order', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          amount: amount,
          goodsName: productName,
          paymentType: 'addon',
          payMethod: selectedPaymentMethod
        })
      });

      const orderResult = await orderResponse.json();

      if (!orderResult.success) {
        throw new Error(orderResult.error || '주문 생성에 실패했습니다.');
      }

      // NicePay v3 결제 파라미터 설정
      const getPaymentMethodParams = (payMethod: string) => {
        const baseParams = {
          PayMethod: 'CARD', // 기본값: 신용카드
          MID: paymentConfig.clientId,
          Moid: orderResult.orderId,
          Amt: amount,
          GoodsName: productName,
          BuyerName: buyerName || '구매자',
          BuyerEmail: buyerEmail || '',
          BuyerTel: buyerTel || '',
          ReturnURL: paymentConfig.returnUrl,
          MallUserID: user?.id || '',
          VbankExpDate: '', // 가상계좌 입금기한 (YYYYMMDD)
          EdiDate: new Date().toISOString().replace(/[-:]/g, '').slice(0, 14), // 전문생성일시
          SignData: orderResult.signature || '', // 위변조 검증 데이터
          CharSet: 'utf-8',
          ReqReserved: '', // 상점 예약필드
          TrKey: orderResult.trKey || '' // 암호화키
        };

        switch (payMethod) {
          case 'kakaopay':
            return {
              ...baseParams,
              PayMethod: 'EASYPAY',
              EasyPayMethod: 'KAKAOPAY'
            };
          case 'naverpay':
            return {
              ...baseParams,
              PayMethod: 'EASYPAY',
              EasyPayMethod: 'NAVERPAY'
            };
          case 'bank':
            return {
              ...baseParams,
              PayMethod: 'VBANK',
              VbankExpDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10).replace(/-/g, '') // 3일 후
            };
          case 'card':
          default:
            return {
              ...baseParams,
              PayMethod: 'CARD'
            };
        }
      };

      // NicePay v3 결제 요청 파라미터 설정
      const paymentParams = getPaymentMethodParams(orderResult.payMethod || selectedPaymentMethod);

      // NicePay v3 결제창 호출
      window.NICEPAY.requestPay({
        ...paymentParams,
        // 성공 콜백
        SuccessfullURL: async (result: any) => {
          console.log('나이스페이 결제 성공:', result);
          
          try {
            // 결제 승인 요청
            const approveResponse = await fetch('/api/nicepay?action=approve', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                tid: result.TID || result.tid,
                amount: amount,
                orderId: orderResult.orderId,
                signature: orderResult.signature
              })
            });

            const approveResult = await approveResponse.json();

            if (approveResult.success) {
              setIsLoading(false);
              setShowConfirmationModal(false);
              onSuccess?.(approveResult);
            } else {
              throw new Error(approveResult.error || '결제 승인에 실패했습니다.');
            }
          } catch (approveError) {
            console.error('결제 승인 오류:', approveError);
            setIsLoading(false);
            setShowConfirmationModal(false);
            onError?.(approveError);
          }
        },
        // 실패 콜백
        FailURL: async (result: any) => {
          console.error('나이스페이 결제 오류:', result);
          setIsLoading(false);
          setShowConfirmationModal(false);
          onError?.(result);
        }
      });

    } catch (error) {
      console.error('결제 요청 오류:', error);
      setIsLoading(false);
      setShowConfirmationModal(false);
      onError?.(error);
    }
  };

  const handlePaymentStart = () => {
    if (showMethodSelector) {
      setShowMethodSelection(true);
    } else {
      setShowConfirmationModal(true);
    }
  };

  const getButtonText = () => {
    if (isLoading) return '결제 처리 중...';
    return `${amount.toLocaleString()}원 결제하기`;
  };

  return (
    <>
      <button
        onClick={handlePaymentStart}
        disabled={disabled || isLoading || !isScriptLoaded || !paymentConfig}
        className={`
          flex items-center justify-center space-x-2 px-6 py-3 
          bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 
          text-white font-medium rounded-lg transition-colors
          ${className}
        `}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{getButtonText()}</span>
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4" />
            <span>{getButtonText()}</span>
          </>
        )}
      </button>

      {/* Payment Method Selection Modal */}
      {showMethodSelection && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => setShowMethodSelection(false)}
          />
          
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full mx-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  결제 방법 선택
                </h3>
                <button
                  onClick={() => setShowMethodSelection(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ×
                </button>
              </div>
              
              <div className="p-6">
                <PaymentMethodSelector
                  selectedMethod={selectedPaymentMethod}
                  onMethodSelect={handlePaymentMethodSelect}
                  amount={amount}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Confirmation Modal */}
      <PaymentConfirmationModal
        isOpen={showConfirmationModal}
        onClose={() => setShowConfirmationModal(false)}
        onConfirm={handleConfirmPayment}
        paymentData={{
          amount,
          method: selectedPaymentMethod,
          methodName: getPaymentMethodName(selectedPaymentMethod),
          description: getPaymentMethodDescription(selectedPaymentMethod),
          orderId: `ORDER-${Date.now()}`,
          fee: 0
        }}
        isLoading={isLoading}
      />
    </>
  );
};

export default NicePayButton;