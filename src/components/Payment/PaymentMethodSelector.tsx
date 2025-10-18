import React, { useState } from 'react';
import { 
  CreditCard, 
  Smartphone, 
  Building2, 
  Wallet,
  Check,
  ChevronRight,
  Banknote
} from 'lucide-react';

export interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  fee?: number;
  minAmount?: number;
  maxAmount?: number;
  nicepayMethod: string; // NicePay API에서 사용하는 method 값
}

interface PaymentMethodSelectorProps {
  selectedMethod: string;
  onMethodSelect: (methodId: string) => void;
  amount: number;
  className?: string;
}

const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  selectedMethod,
  onMethodSelect,
  amount,
  className = ''
}) => {
  // NicePay 공식 가이드에 따라 PaymentMethodSelector를 수정하여 모든 결제 수단(카드, 카카오페이, 네이버페이, 계좌이체, 가상계좌)을 지원하도록 개선합니다.
  const paymentMethods: PaymentMethod[] = [
    {
      id: 'card',
      name: '신용카드',
      description: '모든 신용카드 및 체크카드 사용 가능',
      icon: <CreditCard className="w-6 h-6 text-blue-600" />,
      enabled: true,
      fee: 0,
      minAmount: 1000,
      maxAmount: 10000000,
      nicepayMethod: 'card'
    },
    {
      id: 'kakaopay',
      name: '카카오페이',
      description: '카카오페이로 간편하게 결제하세요',
      icon: <Smartphone className="w-6 h-6 text-yellow-500" />,
      enabled: true,
      fee: 0,
      minAmount: 1000,
      maxAmount: 2000000,
      nicepayMethod: 'kakaopay'
    },
    {
      id: 'naverpay',
      name: '네이버페이',
      description: '네이버페이로 안전하게 결제하세요',
      icon: <Wallet className="w-6 h-6 text-green-600" />,
      enabled: true,
      fee: 0,
      minAmount: 1000,
      maxAmount: 2000000,
      nicepayMethod: 'naverpay'
    },
    {
      id: 'bank',
      name: '계좌이체',
      description: '실시간 계좌이체로 즉시 결제',
      icon: <Building2 className="w-6 h-6 text-purple-600" />,
      enabled: true,
      fee: 0,
      minAmount: 1000,
      maxAmount: 5000000,
      nicepayMethod: 'bank'
    },
    {
      id: 'vbank',
      name: '가상계좌',
      description: '가상계좌 입금 (3일 이내 입금)',
      icon: <Banknote className="w-6 h-6 text-orange-600" />,
      enabled: true,
      fee: 0,
      minAmount: 1000,
      maxAmount: 5000000,
      nicepayMethod: 'vbank'
    }
  ];

  const isMethodAvailable = (method: PaymentMethod) => {
    if (!method.enabled) return false;
    if (method.minAmount && amount < method.minAmount) return false;
    if (method.maxAmount && amount > method.maxAmount) return false;
    return true;
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  const getMethodBadge = (method: PaymentMethod) => {
    if (method.id === 'kakaopay') {
      return <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">간편결제</span>;
    }
    if (method.id === 'naverpay') {
      return <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">간편결제</span>;
    }
    if (method.id === 'vbank') {
      return <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">무통장입금</span>;
    }
    if (method.id === 'bank') {
      return <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">실시간</span>;
    }
    return null;
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">결제 수단 선택</h3>
        <p className="text-sm text-gray-600">
          결제 금액: <span className="font-semibold text-blue-600">{formatAmount(amount)}원</span>
        </p>
      </div>
      
      {paymentMethods.map((method) => {
        const isAvailable = isMethodAvailable(method);
        const isSelected = selectedMethod === method.id;
        
        return (
          <div
            key={method.id}
            onClick={() => isAvailable && onMethodSelect(method.id)}
            className={`
              relative p-4 border-2 rounded-lg cursor-pointer transition-all duration-200
              ${isSelected 
                ? 'border-blue-500 bg-blue-50 shadow-md' 
                : isAvailable 
                  ? 'border-gray-200 hover:border-gray-300 hover:shadow-sm' 
                  : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-60'
              }
            `}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`
                  p-2 rounded-lg
                  ${isSelected ? 'bg-blue-100' : 'bg-gray-100'}
                `}>
                  {method.icon}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className={`font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                      {method.name}
                    </h4>
                    {getMethodBadge(method)}
                  </div>
                  <p className={`text-sm mt-1 ${isSelected ? 'text-blue-700' : 'text-gray-600'}`}>
                    {method.description}
                  </p>
                  
                  {/* 결제 한도 정보 */}
                  <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                    <span>최소: {formatAmount(method.minAmount || 0)}원</span>
                    <span>최대: {formatAmount(method.maxAmount || 0)}원</span>
                    {method.fee && method.fee > 0 && (
                      <span className="text-orange-600">수수료: {formatAmount(method.fee)}원</span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {isSelected && (
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
                {isAvailable && !isSelected && (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </div>
            
            {/* 사용 불가능한 경우 안내 메시지 */}
            {!isAvailable && method.enabled && (
              <div className="mt-2 text-xs text-red-500">
                {amount < (method.minAmount || 0) && 
                  `최소 결제 금액은 ${formatAmount(method.minAmount || 0)}원입니다.`
                }
                {amount > (method.maxAmount || 0) && 
                  `최대 결제 금액은 ${formatAmount(method.maxAmount || 0)}원입니다.`
                }
              </div>
            )}
            
            {/* 선택된 결제 수단의 추가 정보 */}
            {isSelected && (
              <div className="mt-3 p-3 bg-blue-100 rounded-lg">
                <div className="text-sm text-blue-800">
                  {method.id === 'card' && (
                    <div>
                      <p className="font-medium mb-1">신용카드 결제 안내</p>
                      <ul className="text-xs space-y-1">
                        <li>• 모든 신용카드 및 체크카드 사용 가능</li>
                        <li>• 할부 결제 지원 (카드사별 상이)</li>
                        <li>• 즉시 결제 완료</li>
                      </ul>
                    </div>
                  )}
                  {method.id === 'kakaopay' && (
                    <div>
                      <p className="font-medium mb-1">카카오페이 결제 안내</p>
                      <ul className="text-xs space-y-1">
                        <li>• 카카오톡에서 간편하게 결제</li>
                        <li>• 카카오머니, 연결된 카드 사용 가능</li>
                        <li>• 즉시 결제 완료</li>
                      </ul>
                    </div>
                  )}
                  {method.id === 'naverpay' && (
                    <div>
                      <p className="font-medium mb-1">네이버페이 결제 안내</p>
                      <ul className="text-xs space-y-1">
                        <li>• 네이버 아이디로 간편 결제</li>
                        <li>• 네이버페이 포인트 사용 가능</li>
                        <li>• 즉시 결제 완료</li>
                      </ul>
                    </div>
                  )}
                  {method.id === 'bank' && (
                    <div>
                      <p className="font-medium mb-1">계좌이체 결제 안내</p>
                      <ul className="text-xs space-y-1">
                        <li>• 실시간 계좌이체로 즉시 결제</li>
                        <li>• 모든 은행 계좌 사용 가능</li>
                        <li>• 공인인증서 또는 간편인증 필요</li>
                      </ul>
                    </div>
                  )}
                  {method.id === 'vbank' && (
                    <div>
                      <p className="font-medium mb-1">가상계좌 결제 안내</p>
                      <ul className="text-xs space-y-1">
                        <li>• 가상계좌 발급 후 입금</li>
                        <li>• 입금 기한: 3일 이내</li>
                        <li>• 입금 확인 후 결제 완료</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
      
      {/* 결제 수단 안내 */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-2">결제 안내</h4>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• 현재 샌드박스 환경에서 테스트 중입니다.</li>
          <li>• 실제 결제는 이루어지지 않습니다.</li>
          <li>• 모든 결제 수단은 NicePay를 통해 안전하게 처리됩니다.</li>
          <li>• 결제 관련 문의사항은 고객센터로 연락해주세요.</li>
        </ul>
      </div>
    </div>
  );
};

export default PaymentMethodSelector;