import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { 
  DollarSign, 
  Zap, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Database,
  Shield
} from 'lucide-react';

// 더미 데이터
const costTrendData = [
  { date: '12/15', cost: 45.2 },
  { date: '12/16', cost: 52.8 },
  { date: '12/17', cost: 38.9 },
  { date: '12/18', cost: 67.3 },
  { date: '12/19', cost: 71.5 },
  { date: '12/20', cost: 59.2 },
  { date: '12/21', cost: 63.8 }
];

const HomeModule: React.FC = () => {
  const [metrics, setMetrics] = useState({
    llmCost: {
      today: 63.8,
      yesterday: 59.2,
      monthly: 1847.5
    },
    tokenUsage: {
      today: 127500,
      yesterday: 118200,
      monthly: 3825000
    },
    apiLatency: {
      current: 245,
      threshold: 500
    },
    errorRate: {
      current: 0.12,
      threshold: 1.0
    },
    cacheHitRate: {
      current: 87.3,
      savedCost: 234.7
    }
  });

  const calculateChange = (current: number, previous: number) => {
    const change = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(change),
      isPositive: change > 0,
      isNegative: change < 0
    };
  };

  const costChange = calculateChange(metrics.llmCost.today, metrics.llmCost.yesterday);
  const tokenChange = calculateChange(metrics.tokenUsage.today, metrics.tokenUsage.yesterday);

  const MetricCard: React.FC<{
    title: string;
    value: string | number;
    subtitle?: string;
    change?: { value: number; isPositive: boolean; isNegative: boolean };
    icon: React.ElementType;
    status?: 'normal' | 'warning' | 'critical';
    className?: string;
  }> = ({ title, value, subtitle, change, icon: Icon, status = 'normal', className = '' }) => {
    const getStatusColor = () => {
      switch (status) {
        case 'warning': return 'text-amber-600';
        case 'critical': return 'text-red-600';
        default: return 'text-stone-600';
      }
    };

    return (
      <div className={`bg-white rounded-lg p-6 border border-gray-100 ${className}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <Icon className={`h-4 w-4 ${getStatusColor()}`} />
              <h3 className="text-sm font-medium text-stone-600">{title}</h3>
            </div>
            
            <div className="space-y-1">
              <p className="text-2xl font-semibold text-stone-900">{value}</p>
              {subtitle && (
                <p className="text-xs text-stone-500">{subtitle}</p>
              )}
            </div>

            {change && (
              <div className="flex items-center space-x-1 mt-3">
                {change.isPositive && <TrendingUp className="h-3 w-3 text-red-500" />}
                {change.isNegative && <TrendingDown className="h-3 w-3 text-green-500" />}
                <span className={`text-xs font-medium ${
                  change.isPositive ? 'text-red-500' : 'text-green-500'
                }`}>
                  {change.value.toFixed(1)}%
                </span>
                <span className="text-xs text-stone-500">전일 대비</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* 페이지 헤더 */}
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-stone-900">운영 효율 및 비용 통제</h2>
        <p className="text-stone-600">시스템 성능과 LLM 비용을 실시간으로 모니터링합니다</p>
      </div>

      {/* 핵심 지표 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard
          title="오늘 LLM 비용"
          value={`$${metrics.llmCost.today}`}
          subtitle={`월 누적: $${metrics.llmCost.monthly}`}
          change={costChange}
          icon={DollarSign}
        />
        
        <MetricCard
          title="토큰 사용량"
          value={metrics.tokenUsage.today.toLocaleString()}
          subtitle={`월 누적: ${metrics.tokenUsage.monthly.toLocaleString()}`}
          change={tokenChange}
          icon={Zap}
        />
        
        <MetricCard
          title="API 응답 시간"
          value={`${metrics.apiLatency.current}ms`}
          subtitle={`임계값: ${metrics.apiLatency.threshold}ms`}
          icon={Clock}
          status={metrics.apiLatency.current > metrics.apiLatency.threshold ? 'warning' : 'normal'}
        />
        
        <MetricCard
          title="오류 발생률"
          value={`${metrics.errorRate.current}%`}
          subtitle={`임계값: ${metrics.errorRate.threshold}%`}
          icon={AlertTriangle}
          status={metrics.errorRate.current > metrics.errorRate.threshold ? 'critical' : 'normal'}
        />
        
        <MetricCard
          title="캐시 히트율"
          value={`${metrics.cacheHitRate.current}%`}
          subtitle={`절감 비용: $${metrics.cacheHitRate.savedCost}`}
          icon={Database}
        />
        
        <MetricCard
          title="시스템 상태"
          value="정상"
          subtitle="모든 서비스 운영 중"
          icon={Shield}
          status="normal"
        />
      </div>

      {/* LLM 비용 추이 차트 */}
      <div className="bg-white rounded-lg p-6 border border-gray-100">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-stone-900">LLM 비용 추이</h3>
            <p className="text-sm text-stone-600">최근 7일간 일별 LLM 사용 비용</p>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={costTrendData}>
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#78716c' }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#78716c' }}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value) => [`$${value}`, 'LLM 비용']}
                />
                <Line 
                  type="monotone" 
                  dataKey="cost" 
                  stroke="#78716c" 
                  strokeWidth={2}
                  dot={{ fill: '#78716c', strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, fill: '#44403c' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 운영 인사이트 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-6 border border-gray-100">
          <h3 className="text-lg font-medium text-stone-900 mb-4">비용 최적화 제안</h3>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-amber-400 rounded-full mt-2"></div>
              <div>
                <p className="text-sm font-medium text-stone-900">캐시 활용도 증대</p>
                <p className="text-xs text-stone-600">유사한 분석 요청에 대한 캐시 활용으로 월 $400 절감 가능</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
              <div>
                <p className="text-sm font-medium text-stone-900">배치 처리 최적화</p>
                <p className="text-xs text-stone-600">분석 요청 배치 처리로 토큰 효율성 15% 향상</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-gray-100">
          <h3 className="text-lg font-medium text-stone-900 mb-4">시스템 알림</h3>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
              <div>
                <p className="text-sm font-medium text-stone-900">정상 운영</p>
                <p className="text-xs text-stone-600">모든 API 엔드포인트가 정상적으로 작동 중입니다</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2"></div>
              <div>
                <p className="text-sm font-medium text-stone-900">캐시 정리 예정</p>
                <p className="text-xs text-stone-600">오늘 밤 2시에 30일 이상 된 캐시 데이터 정리 예정</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeModule;