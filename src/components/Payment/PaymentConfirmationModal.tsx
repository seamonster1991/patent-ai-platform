import React from 'react';
import { 
  X, 
  CreditCard, 
  Smartphone, 
  Building2, 
  Wallet,
  AlertCircle,
  Shield,
  Clock
} from 'lucide-react';

interface PaymentConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  paymentData: {
    amount: number;
    method?: string;
    methodName?: string;
    productName?: string;
    paymentMethod?: string;
    buyerName?: string;
    buyerEmail?: string;
    description?: string;
    orderId?: string;
    fee?: number;
  };
  isLoading?: boolean;
}

const PaymentConfirmationModal: React.FC<PaymentConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  paymentData,
  isLoading = false
}) => {
  if (!isOpen) return null;

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'card':
        return <CreditCard className="w-6 h-6" />;
      case 'kakaopay':
        return <Smartphone className="w-6 h-6" />;
      case 'naverpay':
        return <Wallet className="w-6 h-6" />;
      case 'bank':
        return <Building2 className="w-6 h-6" />;
      default:
        return <CreditCard className="w-6 h-6" />;
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  const totalAmount = paymentData.amount + (paymentData.fee || 0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-auto">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              결제 확인
            </h3>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                {getPaymentMethodIcon(paymentData.method || paymentData.paymentMethod || 'card')}
              </div>
              <div>
                <h4 className="font-medium text-gray-900">
                  {paymentData.methodName || paymentData.paymentMethod || '결제 수단'}
                </h4>
                {(paymentData.description || paymentData.productName) && (
                  <p className="text-sm text-gray-600">
                    {paymentData.description || paymentData.productName}
                  </p>
                )}
              </div>
            </div>

            {/* 상품 정보 */}
            {paymentData.productName && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">상품명</span>
                  <span className="font-medium text-gray-900">
                    {paymentData.productName}
                  </span>
                </div>
              </div>
            )}

            {/* 구매자 정보 */}
            {(paymentData.buyerName || paymentData.buyerEmail) && (
              <div className="space-y-3">
                {paymentData.buyerName && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">구매자명</span>
                    <span className="font-medium text-gray-900">
                      {paymentData.buyerName}
                    </span>
                  </div>
                )}
                {paymentData.buyerEmail && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">이메일</span>
                    <span className="font-medium text-gray-900">
                      {paymentData.buyerEmail}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">결제 금액</span>
                <span className="font-medium text-gray-900">
                  {formatAmount(paymentData.amount)}원
                </span>
              </div>

              {paymentData.fee && paymentData.fee > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">수수료</span>
                  <span className="font-medium text-gray-900">
                    {formatAmount(paymentData.fee)}원
                  </span>
                </div>
              )}

              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900">총 결제 금액</span>
                  <span className="text-xl font-bold text-blue-600">
                    {formatAmount(totalAmount)}원
                  </span>
                </div>
              </div>

              {paymentData.orderId && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">주문번호</span>
                  <span className="font-mono text-gray-900">
                    {paymentData.orderId}
                  </span>
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="text-blue-800 font-medium mb-1">
                    안전한 결제
                  </p>
                  <p className="text-blue-700">
                    SSL 암호화를 통해 결제 정보가 안전하게 보호됩니다.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="text-amber-800 font-medium mb-1">
                    결제 전 확인사항
                  </p>
                  <ul className="text-amber-700 space-y-1">
                    <li>• 결제 금액과 결제 방법을 다시 한번 확인해주세요.</li>
                    <li>• 결제 완료 후 취소/환불은 고객센터를 통해 가능합니다.</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>결제 처리 시간: 약 1-2분</span>
            </div>
          </div>

          <div className="flex space-x-3 p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              취소
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>처리중...</span>
                </>
              ) : (
                <span>결제하기</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentConfirmationModal;