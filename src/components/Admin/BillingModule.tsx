import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  CreditCard, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  DollarSign,
  Users,
  Calendar,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';

// 더미 데이터
const revenueData = [
  { month: '6월', mrr: 45000, arr: 540000 },
  { month: '7월', mrr: 52000, arr: 624000 },
  { month: '8월', mrr: 48000, arr: 576000 },
  { month: '9월', mrr: 61000, arr: 732000 },
  { month: '10월', mrr: 58000, arr: 696000 },
  { month: '11월', mrr: 67000, arr: 804000 },
  { month: '12월', mrr: 73000, arr: 876000 }
];

const reportTypeData = [
  { name: '시장분석', value: 65, color: '#78716c' },
  { name: '비즈니스인사이트', value: 35, color: '#a8a29e' }
];

const paymentRisks = [
  {
    id: 'risk_001',
    email: 'john.doe@company.com',
    name: '김철수',
    issue: '카드 만료 임박',
    daysLeft: 5,
    tier: 'premium',
    severity: 'warning'
  },
  {
    id: 'risk_002',
    email: 'jane.smith@startup.co.kr',
    name: '이영희',
    issue: '결제 실패',
    attempts: 3,
    tier: 'enterprise',
    severity: 'critical'
  },
  {
    id: 'risk_003',
    email: 'mike.wilson@tech.com',
    name: '박민수',
    issue: '카드 만료 임박',
    daysLeft: 12,
    tier: 'basic',
    severity: 'info'
  },
  {
    id: 'risk_004',
    email: 'sarah.lee@research.ac.kr',
    name: '최지연',
    issue: '결제 실패',
    attempts: 1,
    tier: 'premium',
    severity: 'warning'
  }
];

const BillingModule: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');

  // KPI 계산
  const currentMRR = 73000;
  const previousMRR = 67000;
  const mrrGrowth = ((currentMRR - previousMRR) / previousMRR * 100).toFixed(1);

  const currentChurn = 3.2;
  const previousChurn = 4.1;
  const churnChange = (currentChurn - previousChurn).toFixed(1);

  const currentARR = 876000;
  const previousARR = 804000;
  const arrGrowth = ((currentARR - previousARR) / previousARR * 100).toFixed(1);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100 border-red-200';
      case 'warning': return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'info': return 'text-blue-600 bg-blue-100 border-blue-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'info': return <Clock className="h-4 w-4" />;
      default: return <CheckCircle className="h-4 w-4" />;
    }
  };

  const KPICard: React.FC<{
    title: string;
    value: string | number;
    change: string;
    isPositive: boolean;
    icon: React.ReactNode;
    subtitle?: string;
  }> = ({ title, value, change, isPositive, icon, subtitle }) => (
    <div className="bg-white rounded-lg p-4 border border-gray-100">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {icon}
            <h3 className="text-sm text-stone-600">{title}</h3>
          </div>
          <div className={`flex items-center space-x-1 text-xs ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            <span>{change}%</span>
          </div>
        </div>
        
        <div>
          <p className="text-2xl font-semibold text-stone-900">{value}</p>
          {subtitle && <p className="text-xs text-stone-500 mt-1">{subtitle}</p>}
        </div>
      </div>
    </div>
  );

  const RiskCard: React.FC<{ risk: typeof paymentRisks[0] }> = ({ risk }) => (
    <div className={`rounded-lg p-3 border ${getSeverityColor(risk.severity)}`}>
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              {getSeverityIcon(risk.severity)}
              <h4 className="font-medium text-stone-900 text-sm">{risk.name}</h4>
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                {risk.tier}
              </span>
            </div>
            <p className="text-xs text-stone-500">{risk.email}</p>
          </div>
        </div>
        
        <div className="space-y-1">
          <p className="text-sm font-medium text-stone-900">{risk.issue}</p>
          {risk.daysLeft && (
            <p className="text-xs text-stone-600">{risk.daysLeft}일 남음</p>
          )}
          {risk.attempts && (
            <p className="text-xs text-stone-600">{risk.attempts}회 시도 실패</p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* 페이지 헤더 */}
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-stone-900">결제 및 수익 관리</h2>
        <p className="text-stone-600">구독 수익과 결제 위험 요소를 모니터링합니다</p>
      </div>

      {/* 핵심 수익 지표 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard
          title="월간 반복 수익 (MRR)"
          value={`₩${currentMRR.toLocaleString()}`}
          change={mrrGrowth}
          isPositive={parseFloat(mrrGrowth) > 0}
          icon={<DollarSign className="h-4 w-4 text-stone-600" />}
          subtitle="전월 대비"
        />
        
        <KPICard
          title="이탈률 (Churn Rate)"
          value={`${currentChurn}%`}
          change={Math.abs(parseFloat(churnChange)).toString()}
          isPositive={parseFloat(churnChange) < 0}
          icon={<Users className="h-4 w-4 text-stone-600" />}
          subtitle="전월 대비"
        />
        
        <KPICard
          title="연간 반복 수익 (ARR)"
          value={`₩${(currentARR / 1000).toFixed(0)}K`}
          change={arrGrowth}
          isPositive={parseFloat(arrGrowth) > 0}
          icon={<TrendingUp className="h-4 w-4 text-stone-600" />}
          subtitle="전월 대비"
        />
      </div>

      {/* 수익 추이 차트 */}
      <div className="bg-white rounded-lg p-6 border border-gray-100">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-stone-600" />
              <h3 className="text-lg font-medium text-stone-900">수익 추이</h3>
            </div>
            
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-500"
            >
              <option value="monthly">월별</option>
              <option value="quarterly">분기별</option>
              <option value="yearly">연별</option>
            </select>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData}>
                <XAxis 
                  dataKey="month" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#78716c' }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#78716c' }}
                  tickFormatter={(value) => `₩${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value: any, name: string) => [
                    `₩${value.toLocaleString()}`,
                    name === 'mrr' ? 'MRR' : 'ARR'
                  ]}
                />
                <Line 
                  type="monotone" 
                  dataKey="mrr" 
                  stroke="#78716c" 
                  strokeWidth={2}
                  dot={{ fill: '#78716c', strokeWidth: 0, r: 4 }}
                  name="MRR"
                />
                <Line 
                  type="monotone" 
                  dataKey="arr" 
                  stroke="#a8a29e" 
                  strokeWidth={2}
                  dot={{ fill: '#a8a29e', strokeWidth: 0, r: 4 }}
                  name="ARR"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 결제 위험 알림 */}
        <div className="bg-white rounded-lg p-6 border border-gray-100">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-stone-600" />
              <h3 className="text-lg font-medium text-stone-900">결제 위험 알림</h3>
              <span className="text-sm text-stone-500">({paymentRisks.length}건)</span>
            </div>
            
            <div className="space-y-3">
              {paymentRisks.map((risk) => (
                <RiskCard key={risk.id} risk={risk} />
              ))}
            </div>
            
            {paymentRisks.length === 0 && (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-300 mx-auto mb-4" />
                <p className="text-stone-500">현재 결제 위험 요소가 없습니다.</p>
              </div>
            )}
          </div>
        </div>

        {/* 리포트 유형 선호도 */}
        <div className="bg-white rounded-lg p-6 border border-gray-100">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-stone-600" />
              <h3 className="text-lg font-medium text-stone-900">리포트 유형 선호도</h3>
            </div>
            
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={reportTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {reportTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(value: any) => [`${value}%`, '비율']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-2">
              {reportTypeData.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-stone-600">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium text-stone-900">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 추가 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <div className="space-y-2">
            <p className="text-sm text-stone-600">평균 고객 가치 (LTV)</p>
            <p className="text-2xl font-semibold text-stone-900">₩2.4M</p>
            <p className="text-xs text-stone-500">고객당 생애 가치</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <div className="space-y-2">
            <p className="text-sm text-stone-600">고객 획득 비용 (CAC)</p>
            <p className="text-2xl font-semibold text-stone-900">₩180K</p>
            <p className="text-xs text-stone-500">신규 고객당 비용</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <div className="space-y-2">
            <p className="text-sm text-stone-600">결제 성공률</p>
            <p className="text-2xl font-semibold text-stone-900">96.8%</p>
            <p className="text-xs text-stone-500">이번 달 평균</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <div className="space-y-2">
            <p className="text-sm text-stone-600">평균 구독 기간</p>
            <p className="text-2xl font-semibold text-stone-900">14.2개월</p>
            <p className="text-xs text-stone-500">고객 유지 기간</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingModule;