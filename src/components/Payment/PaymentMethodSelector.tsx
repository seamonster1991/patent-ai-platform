import React, { useState } from 'react';
import { 
  CreditCard, 
  Smartphone, 
  Building2, 
  Wallet,
  Check,
  ChevronRight
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
  const paymentMethods: PaymentMethod[] = [
    {
      id: 'card',
      name: '신용카드',
      description: '모든 신용카드 및 체크카드 사용 가능',
      icon: <CreditCard className="w-6 h-6" />,
      enabled: true,
      fee: 0,
      minAmount: 1000,
      maxAmount: 10000000
    },
    {
      id: 'kakaopay',
      name: '카카오페이',
      description: '샌드박스 환경에서는 간편결제로 처리됩니다',
      icon: <Smartphone className="w-6 h-6" />,
      enabled: true,
      fee: 0,
      minAmount: 1000,
      maxAmount: 2000000
    },
    {
      id: 'naverpay',
      name: '네이버페이',
      description: '샌드박스 환경에서는 간편결제로 처리됩니다',
      icon: <Wallet className="w-6 h-6" />,
      enabled: true,
      fee: 0,
      minAmount: 1000,
      maxAmount: 2000000
    },
    {
      id: 'bank',
      name: '계좌이체',
      description: '가상계좌로 처리됩니다',
      icon: <Building2 className="w-6 h-6" />,
      enabled: true,
      fee: 0,
      minAmount: 1000,
      maxAmount: 5000000
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

  return (
    <div className={`space-y-3 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">결제 방법 선택</h3>
      
      {paymentMethods.map((method) => {
        const isAvailable = isMethodAvailable(method);
        const isSelected = selectedMethod === method.id;
        
        return (
          <div
            key={method.id}
            onClick={() => isAvailable && onMethodSelect(method.id)}
            className={`
              relative p-4 border-2 rounded-lg cursor-pointer transition-all
              ${isSelected 
                ? 'border-blue-500 bg-blue-50' 
                : isAvailable 
                  ? 'border-gray-200 hover:border-gray-300 bg-white' 
                  : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-50'
              }
            `}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`
                  p-2 rounded-lg
                  ${isSelected 
                    ? 'bg-blue-100 text-blue-600' 
                    : isAvailable 
                      ? 'bg-gray-100 text-gray-600' 
                      : 'bg-gray-50 text-gray-400'
                  }
                `}>
                  {method.icon}
                </div>
                
                <div>
                  <h4 className={`font-medium ${isAvailable ? 'text-gray-900' : 'text-gray-400'}`}>
                    {method.name}
                  </h4>
                  <p className={`text-sm ${isAvailable ? 'text-gray-600' : 'text-gray-400'}`}>
                    {method.description}
                  </p>
                  
                  {method.minAmount && method.maxAmount && (
                    <p className="text-xs text-gray-500 mt-1">
                      결제 한도: {formatAmount(method.minAmount)}원 ~ {formatAmount(method.maxAmount)}원
                    </p>
                  )}
                  
                  {method.fee !== undefined && method.fee > 0 && (
                    <p className="text-xs text-orange-600 mt-1">
                      수수료: {formatAmount(method.fee)}원
                    </p>
                  )}
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
            
            {!isAvailable && method.enabled && (
              <div className="mt-2 text-xs text-red-500">
                {amount < (method.minAmount || 0) && 
                  `최소 결제 금액은 ${formatAmount(method.minAmount || 0)}원입니다.`
                }
                {amount > (method.maxAmount || Infinity) && 
                  `최대 결제 금액은 ${formatAmount(method.maxAmount || 0)}원입니다.`
                }
              </div>
            )}
          </div>
        );
      })}
      
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">결제 금액</span>
          <span className="text-xl font-bold text-gray-900">
            {formatAmount(amount)}원
          </span>
        </div>
        
        {selectedMethod && (() => {
          const method = paymentMethods.find(m => m.id === selectedMethod);
          return method?.fee && method.fee > 0 ? (
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200">
              <span className="text-sm text-gray-600">수수료</span>
              <span className="text-sm text-gray-900">
                +{formatAmount(method.fee)}원
              </span>
            </div>
          ) : null;
        })()}
        
        {selectedMethod && (() => {
          const method = paymentMethods.find(m => m.id === selectedMethod);
          const totalAmount = amount + (method?.fee || 0);
          return method?.fee && method.fee > 0 ? (
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200">
              <span className="font-medium text-gray-900">총 결제 금액</span>
              <span className="text-xl font-bold text-blue-600">
                {formatAmount(totalAmount)}원
              </span>
            </div>
          ) : null;
        })()}
      </div>
    </div>
  );
};

export default PaymentMethodSelector;