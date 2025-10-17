import React, { memo } from 'react';
import { Card } from '@/components/UI/Card';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: number;
  change: number;
  icon: React.ReactNode;
  color: string;
  format?: 'number' | 'currency';
}

const KPICard: React.FC<KPICardProps> = memo(({ 
  title, 
  value, 
  change, 
  icon, 
  color, 
  format = 'number' 
}) => {
  // 숫자 포맷팅 함수
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

  // 통화 포맷팅 함수
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount);
  };

  // 값 포맷팅
  const formattedValue = format === 'currency' ? formatCurrency(value) : formatNumber(value);

  // 변화율 색상 결정
  const changeColor = change >= 0 ? 'text-green-600' : 'text-red-600';
  const ChangeIcon = change >= 0 ? TrendingUp : TrendingDown;

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 bg-${color}-100 rounded-lg`}>
              {icon}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
              <p className="text-2xl font-bold text-gray-900">
                {formattedValue}
              </p>
            </div>
          </div>
          <div className={`flex items-center gap-1 text-sm ${changeColor}`}>
            <ChangeIcon className="w-4 h-4" />
            <span className="font-medium">{Math.abs(change).toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </Card>
  );
});

KPICard.displayName = 'KPICard';

export default KPICard;