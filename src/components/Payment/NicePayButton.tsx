import React, { useState, useEffect } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';
import PaymentMethodSelector from './PaymentMethodSelector';
import PaymentConfirmationModal from './PaymentConfirmationModal';
import { useAuthStore } from '../../store/authStore';

// NicePay 공식 가이드에 따라 NicePayButton 컴포넌트를 완전히 재구성합니다. AUTHNICE.requestPay() 메서드를 사용하고, 모든 결제 수단을 지원하며, 결제 금액이 정확히 표시되도록 수정합니다.
declare global {
  interface Window {
    AUTHNICE: {
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
  buyerName,
  buyerEmail,
  buyerTel,
  onSuccess,
  onError,
  className = '',
  disabled = false,
  showMethodSelector = false
}) => {
  const { user } = useAuthStore();
  const [paymentConfig, setPaymentConfig] = useState<any>(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showMethodSelection, setShowMethodSelection] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('card');

  // amount 값 검증 및 디버깅
  useEffect(() => {
    console.log('[NicePayButton] Props 수신:', {
      amount,
      productName,
      buyerName,
      buyerEmail,
      buyerTel,
      amountType: typeof amount,
      amountValid: amount && amount > 0
    });
  }, [amount, productName, buyerName, buyerEmail, buyerTel]);

  // 버튼 상태 디버깅 - 모든 비활성화 조건 추적
  useEffect(() => {
    const buttonDisabled = disabled || isLoading || !isScriptLoaded || !paymentConfig || !amount || amount <= 0;
    
    console.log('[NicePayButton] 버튼 상태 디버깅:', {
      disabled,
      isLoading,
      isScriptLoaded,
      hasPaymentConfig: !!paymentConfig,
      amount,
      amountValid: amount && amount > 0,
      windowAuthNice: !!window.AUTHNICE,
      buttonDisabled,
      disabledReasons: {
        propDisabled: disabled,
        loading: isLoading,
        scriptNotLoaded: !isScriptLoaded,
        noPaymentConfig: !paymentConfig,
        noAmount: !amount,
        invalidAmount: amount <= 0
      }
    });
  }, [disabled, isLoading, isScriptLoaded, paymentConfig, amount]);

  // NicePay 설정 로드
  useEffect(() => {
    const loadPaymentConfig = async () => {
      try {
        console.log('[NicePayButton] NicePay 설정 로드 시작...');
        // Vite 프록시를 사용하여 상대 경로로 API 호출
        const response = await fetch(`/api/nicepay?action=config`);
        const config = await response.json();
        
        console.log('[NicePayButton] NicePay 설정 응답:', config);
        
        if (config.success) {
          setPaymentConfig(config.data);
          console.log('[NicePayButton] NicePay 설정 로드 성공:', config.data);
        } else {
          console.error('[NicePayButton] NicePay 설정 로드 실패:', config.error);
          onError?.({ message: 'NicePay 설정을 불러올 수 없습니다.' });
        }
      } catch (error) {
        console.error('[NicePayButton] NicePay 설정 로드 오류:', error);
        onError?.({ message: 'NicePay 설정 로드 중 오류가 발생했습니다.' });
      }
    };

    loadPaymentConfig();
  }, [onError]);

  // NicePay JS SDK 로드 (공식 가이드에 따라 AUTHNICE 사용)
  useEffect(() => {
    const loadNicePayScript = () => {
      console.log('[NicePayButton] NicePay JS SDK 로드 확인 시작...');
      
      if (window.AUTHNICE) {
        console.log('[NicePayButton] AUTHNICE 이미 로드됨');
        setIsScriptLoaded(true);
        return;
      }

      console.log('[NicePayButton] AUTHNICE 스크립트 로드 시작...');
      const script = document.createElement('script');
      // 공식 가이드에 따라 paymentConfig에서 받은 jsSDKUrl 사용
      script.src = paymentConfig?.jsSDKUrl || 'https://pay.nicepay.co.kr/v1/js/';
      script.async = true;
      
      script.onload = () => {
        console.log('[NicePayButton] NicePay JS SDK 로드 완료:', script.src);
        console.log('[NicePayButton] window.AUTHNICE 확인:', !!window.AUTHNICE);
        setIsScriptLoaded(true);
      };
      
      script.onerror = () => {
        console.error('[NicePayButton] NicePay JS SDK 로드 실패:', script.src);
        onError?.({ message: 'NicePay 결제 모듈을 불러올 수 없습니다.' });
      };

      document.head.appendChild(script);
    };

    if (paymentConfig && paymentConfig.jsSDKUrl) {
      console.log('[NicePayButton] paymentConfig 확인됨, 스크립트 로드 시작:', paymentConfig.jsSDKUrl);
      loadNicePayScript();
    } else {
      console.log('[NicePayButton] paymentConfig 대기 중...', { paymentConfig });
    }
  }, [paymentConfig, onError]);

  // 결제 수단별 이름 반환
  const getPaymentMethodName = (method: string) => {
    switch (method) {
      case 'card': return '신용카드';
      case 'kakaopay': return '카카오페이';
      case 'naverpay': return '네이버페이';
      case 'bank': return '계좌이체';
      case 'vbank': return '가상계좌';
      default: return '신용카드';
    }
  };

  // 결제 수단 선택 핸들러
  const handlePaymentMethodSelect = (methodId: string) => {
    setSelectedPaymentMethod(methodId);
    setShowMethodSelection(false);
    setShowConfirmationModal(true);
  };

  // 결제 확인 및 실행
  const handleConfirmPayment = async () => {
    console.log('[NicePayButton] handleConfirmPayment 시작:', {
      amount,
      productName,
      isScriptLoaded,
      hasPaymentConfig: !!paymentConfig,
      hasAuthNice: !!window.AUTHNICE
    });

    if (!isScriptLoaded || !window.AUTHNICE || !paymentConfig) {
      const errorMsg = '결제 모듈이 아직 로드되지 않았습니다.';
      console.error('[NicePayButton]', errorMsg);
      onError?.({ message: errorMsg });
      return;
    }

    // amount 값 검증 강화
    const validAmount = Number(amount);
    if (!validAmount || validAmount <= 0 || isNaN(validAmount)) {
      const errorMsg = `올바른 결제 금액을 입력해주세요. (현재 값: ${amount}, 타입: ${typeof amount})`;
      console.error('[NicePayButton]', errorMsg);
      onError?.({ message: errorMsg });
      return;
    }

    console.log('[NicePayButton] 검증된 결제 금액:', validAmount);

    setIsLoading(true);
    setShowConfirmationModal(false);

    try {
      // 주문 생성 요청 (Vite 프록시 사용)
      const orderRequestBody = {
        amount: validAmount,
        productName: productName,
        buyerName: buyerName || user?.user_metadata?.name || '구매자',
        buyerEmail: buyerEmail || user?.email || '',
        buyerTel: buyerTel || '',
        paymentMethod: selectedPaymentMethod
      };

      console.log('[NicePayButton] 주문 생성 요청:', orderRequestBody);

      const orderResponse = await fetch(`/api/nicepay?action=create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify(orderRequestBody)
      });

      const orderResult = await orderResponse.json();
      
      console.log('[NicePayButton] 주문 생성 응답:', orderResult);
      
      if (!orderResult.success) {
        throw new Error(orderResult.message || '주문 생성에 실패했습니다.');
      }

      console.log('[NicePayButton] 주문 생성 성공:', orderResult);

      // NicePay 공식 가이드에 따른 결제창 호출 파라미터
      const paymentParams = {
        clientId: paymentConfig.clientId,
        method: selectedPaymentMethod,
        orderId: orderResult.data.orderId,
        amount: validAmount, // 검증된 amount 사용
        goodsName: productName,
        returnUrl: paymentConfig.returnUrl,
        buyerName: buyerName || user?.user_metadata?.name || '구매자',
        buyerEmail: buyerEmail || user?.email || '',
        buyerTel: buyerTel || '',
        mallReserved: '', // 가맹점 예약 필드 (공식 가이드 준수)
        // 에러 콜백 함수 (공식 가이드에 따라 fnError 사용)
        fnError: (result: any) => {
          console.error('[NicePayButton] NicePay 결제 오류:', result);
          setIsLoading(false);
          onError?.({
            message: result.errorMsg || '결제 중 오류가 발생했습니다.',
            code: result.errorCode || 'PAYMENT_ERROR',
            details: result
          });
        }
      };

      console.log('[NicePayButton] NicePay 결제창 호출 파라미터:', paymentParams);

      // NicePay 공식 가이드에 따른 AUTHNICE.requestPay() 호출
      window.AUTHNICE.requestPay(paymentParams);

      // 결제창이 열리면 로딩 상태 해제 (결제 완료는 returnUrl에서 처리)
      setTimeout(() => {
        setIsLoading(false);
      }, 1000);

    } catch (error: any) {
      console.error('[NicePayButton] 결제 요청 오류:', error);
      setIsLoading(false);
      onError?.(error);
    }
  };

  // 결제 시작 핸들러
  const handlePaymentStart = () => {
    if (showMethodSelector) {
      setShowMethodSelection(true);
    } else {
      setShowConfirmationModal(true);
    }
  };

  // 버튼 텍스트 생성 (금액 표시 문제 해결)
  const getButtonText = () => {
    if (isLoading) return '결제 처리 중...';
    
    // 금액이 유효한지 확인하고 안전하게 표시
    const validAmount = Number(amount);
    const displayAmount = validAmount && validAmount > 0 ? validAmount : 0;
    
    console.log('[NicePayButton] 버튼 텍스트 생성:', {
      originalAmount: amount,
      validAmount,
      displayAmount
    });
    
    return `${displayAmount.toLocaleString()}원 결제하기`;
  };

  return (
    <>
      <button
        onClick={handlePaymentStart}
        disabled={disabled || isLoading || !isScriptLoaded || !paymentConfig || !amount || amount <= 0}
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
            <span>결제 처리 중...</span>
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4" />
            <span>{getButtonText()}</span>
          </>
        )}
      </button>

      {/* 결제 수단 선택 모달 */}
      {showMethodSelection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">결제 수단 선택</h3>
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
                amount={amount || 0}
              />
            </div>
          </div>
        </div>
      )}

      {/* 결제 확인 모달 */}
      {showConfirmationModal && (
        <PaymentConfirmationModal
          isOpen={showConfirmationModal}
          onClose={() => setShowConfirmationModal(false)}
          onConfirm={handleConfirmPayment}
          paymentData={{
            amount: amount || 0,
            productName: productName,
            paymentMethod: getPaymentMethodName(selectedPaymentMethod),
            buyerName: buyerName || user?.user_metadata?.name || '구매자',
            buyerEmail: buyerEmail || user?.email || ''
          }}
          isLoading={isLoading}
        />
      )}
    </>
  );
};

export default NicePayButton;