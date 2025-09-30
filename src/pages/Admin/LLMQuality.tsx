import React, { useEffect, useState } from 'react';
import { 
  Brain, 
  ThumbsUp, 
  ThumbsDown, 
  Star,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  BarChart3,
  MessageSquare
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import AdminLayout from '../../components/Layout/AdminLayout';

interface ReportTypePreference {
  type: string;
  count: number;
  percentage: number;
  growth: number;
}

interface UserFeedback {
  rating: number;
  count: number;
  percentage: number;
}

interface FeedbackTrend {
  date: string;
  positive: number;
  negative: number;
  neutral: number;
  averageRating: number;
}

interface QualityMetric {
  metric: string;
  value: number;
  target: number;
  status: 'good' | 'warning' | 'critical';
  trend: number;
}

interface LLMQualityData {
  reportTypes: ReportTypePreference[];
  feedbackDistribution: UserFeedback[];
  feedbackTrend: FeedbackTrend[];
  qualityMetrics: QualityMetric[];
  totalReports: number;
  averageRating: number;
  responseTime: number;
  satisfactionRate: number;
}

const LLMQuality: React.FC = () => {
  const [data, setData] = useState<LLMQualityData>({
    reportTypes: [
      { type: '기술/시장 분석', count: 8920, percentage: 64.2, growth: 12.5 },
      { type: '비즈니스 전략 인사이트', count: 4978, percentage: 35.8, growth: 18.9 }
    ],
    feedbackDistribution: [
      { rating: 5, count: 3456, percentage: 45.2 },
      { rating: 4, count: 2789, percentage: 36.5 },
      { rating: 3, count: 987, percentage: 12.9 },
      { rating: 2, count: 312, percentage: 4.1 },
      { rating: 1, count: 98, percentage: 1.3 }
    ],
    feedbackTrend: [
      { date: '11/20', positive: 78, negative: 12, neutral: 10, averageRating: 4.2 },
      { date: '11/27', positive: 82, negative: 10, neutral: 8, averageRating: 4.3 },
      { date: '12/04', positive: 85, negative: 8, neutral: 7, averageRating: 4.4 },
      { date: '12/11', positive: 87, negative: 7, neutral: 6, averageRating: 4.5 },
      { date: '12/18', positive: 89, negative: 6, neutral: 5, averageRating: 4.6 }
    ],
    qualityMetrics: [
      { metric: '응답 정확도', value: 94.2, target: 95.0, status: 'warning', trend: 2.1 },
      { metric: '완성도', value: 96.8, target: 95.0, status: 'good', trend: 1.5 },
      { metric: '관련성', value: 92.1, target: 90.0, status: 'good', trend: 3.2 },
      { metric: '창의성', value: 88.7, target: 85.0, status: 'good', trend: 4.8 },
      { metric: '실용성', value: 91.3, target: 90.0, status: 'good', trend: 2.7 }
    ],
    totalReports: 13898,
    averageRating: 4.6,
    responseTime: 2.3,
    satisfactionRate: 89.2
  });
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    const fetchLLMQualityData = async () => {
      try {
        // TODO: Implement actual API calls to fetch LLM quality data
        // For now, using mock data
        setTimeout(() => {
          setIsLoading(false);
          setLastUpdated(new Date());
        }, 1000);
      } catch (error) {
        console.error('Error fetching LLM quality data:', error);
        setIsLoading(false);
      }
    };

    fetchLLMQualityData();
    
    // Auto-refresh every 10 minutes
    const interval = setInterval(fetchLLMQualityData, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const refreshData = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setLastUpdated(new Date());
    }, 1000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'critical': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good': return <CheckCircle className="h-5 w-5 text-green-400" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-400" />;
      case 'critical': return <AlertTriangle className="h-5 w-5 text-red-400" />;
      default: return <CheckCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-white sm:text-3xl sm:truncate">
              LLM 분석 및 품질 관리
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              리포트 품질, 사용자 피드백 및 LLM 성능 분석
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
            <div className="text-sm text-gray-400">
              마지막 업데이트: {lastUpdated.toLocaleString('ko-KR')}
            </div>
            <button
              onClick={refreshData}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>새로고침</span>
            </button>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-gray-800 overflow-hidden shadow-lg rounded-lg border border-gray-700">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 rounded-lg bg-blue-500 text-blue-100">
                    <Brain className="h-6 w-6" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-400 truncate">
                      총 리포트 수
                    </dt>
                    <dd className="text-2xl font-semibold text-white">
                      {data.totalReports.toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 overflow-hidden shadow-lg rounded-lg border border-gray-700">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 rounded-lg bg-yellow-500 text-yellow-100">
                    <Star className="h-6 w-6" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-400 truncate">
                      평균 평점
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-white">
                        {data.averageRating}
                      </div>
                      <div className="ml-2 text-sm text-yellow-400">/5.0</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 overflow-hidden shadow-lg rounded-lg border border-gray-700">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 rounded-lg bg-green-500 text-green-100">
                    <ThumbsUp className="h-6 w-6" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-400 truncate">
                      만족도
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-white">
                        {data.satisfactionRate}%
                      </div>
                      <div className="ml-2 flex items-baseline text-sm font-semibold text-green-400">
                        <TrendingUp className="h-4 w-4 mr-1" />
                        +3.2%
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 overflow-hidden shadow-lg rounded-lg border border-gray-700">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 rounded-lg bg-purple-500 text-purple-100">
                    <BarChart3 className="h-6 w-6" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-400 truncate">
                      응답 시간
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-white">
                        {data.responseTime}s
                      </div>
                      <div className="ml-2 text-sm text-green-400">
                        평균
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Report Type Preferences */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-800 shadow-lg rounded-lg border border-gray-700">
            <div className="px-6 py-4 border-b border-gray-700">
              <h3 className="text-lg font-medium text-white">리포트 유형 선호도</h3>
              <p className="text-sm text-gray-400">생성된 리포트 유형별 분포</p>
            </div>
            <div className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.reportTypes}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="type" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F9FAFB'
                    }} 
                  />
                  <Bar 
                    dataKey="count" 
                    fill="#3B82F6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-3">
                {data.reportTypes.map((type, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-4 h-4 rounded bg-blue-500"></div>
                      <span className="text-white font-medium">{type.type}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-semibold">{type.count.toLocaleString()}</div>
                      <div className="text-sm text-green-400">+{type.growth}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* User Feedback Distribution */}
          <div className="bg-gray-800 shadow-lg rounded-lg border border-gray-700">
            <div className="px-6 py-4 border-b border-gray-700">
              <h3 className="text-lg font-medium text-white">사용자 피드백 분포</h3>
              <p className="text-sm text-gray-400">평점별 피드백 현황</p>
            </div>
            <div className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.feedbackDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={2}
                    dataKey="count"
                  >
                    {data.feedbackDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F9FAFB'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {data.feedbackDistribution.map((feedback, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      ></div>
                      <div className="flex items-center space-x-1">
                        {[...Array(feedback.rating)].map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-medium">{feedback.count.toLocaleString()}</div>
                      <div className="text-sm text-gray-400">{feedback.percentage}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Feedback Trend */}
        <div className="bg-gray-800 shadow-lg rounded-lg border border-gray-700">
          <div className="px-6 py-4 border-b border-gray-700">
            <h3 className="text-lg font-medium text-white">피드백 추이</h3>
            <p className="text-sm text-gray-400">긍정/부정/중립 피드백 및 평균 평점 변화</p>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.feedbackTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F9FAFB'
                  }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="positive" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  name="긍정적"
                />
                <Line 
                  type="monotone" 
                  dataKey="negative" 
                  stroke="#EF4444" 
                  strokeWidth={2}
                  name="부정적"
                />
                <Line 
                  type="monotone" 
                  dataKey="neutral" 
                  stroke="#6B7280" 
                  strokeWidth={2}
                  name="중립"
                />
                <Line 
                  type="monotone" 
                  dataKey="averageRating" 
                  stroke="#F59E0B" 
                  strokeWidth={3}
                  name="평균 평점"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quality Metrics */}
        <div className="bg-gray-800 shadow-lg rounded-lg border border-gray-700">
          <div className="px-6 py-4 border-b border-gray-700">
            <h3 className="text-lg font-medium text-white">품질 지표</h3>
            <p className="text-sm text-gray-400">LLM 성능 및 품질 메트릭</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.qualityMetrics.map((metric, index) => (
                <div key={index} className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-300">{metric.metric}</h4>
                    {getStatusIcon(metric.status)}
                  </div>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl font-bold text-white">{metric.value}%</span>
                    <span className="text-sm text-gray-400">/ {metric.target}%</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          metric.status === 'good' ? 'bg-green-500' :
                          metric.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${(metric.value / 100) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-gray-400">목표: {metric.target}%</span>
                    <span className={`text-xs font-medium ${
                      metric.trend > 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {metric.trend > 0 ? '+' : ''}{metric.trend}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Feedback Summary */}
        <div className="bg-gray-800 shadow-lg rounded-lg border border-gray-700">
          <div className="px-6 py-4 border-b border-gray-700">
            <h3 className="text-lg font-medium text-white">최근 피드백 요약</h3>
            <p className="text-sm text-gray-400">사용자 의견 및 개선 사항</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-green-400 flex items-center">
                  <ThumbsUp className="h-4 w-4 mr-2" />
                  긍정적 피드백
                </h4>
                <div className="space-y-3">
                  <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                    <p className="text-sm text-gray-300">"분석 결과가 매우 상세하고 실용적입니다."</p>
                    <div className="mt-2 flex items-center space-x-2">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                      <span className="text-xs text-gray-400">2시간 전</span>
                    </div>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                    <p className="text-sm text-gray-300">"경쟁사 분석이 특히 도움이 되었습니다."</p>
                    <div className="mt-2 flex items-center space-x-2">
                      <div className="flex items-center">
                        {[...Array(4)].map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                      <span className="text-xs text-gray-400">5시간 전</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-yellow-400 flex items-center">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  개선 제안
                </h4>
                <div className="space-y-3">
                  <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                    <p className="text-sm text-gray-300">"그래프와 차트가 더 많았으면 좋겠습니다."</p>
                    <div className="mt-2 flex items-center space-x-2">
                      <div className="flex items-center">
                        {[...Array(3)].map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                      <span className="text-xs text-gray-400">1일 전</span>
                    </div>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                    <p className="text-sm text-gray-300">"응답 속도가 조금 더 빨랐으면 합니다."</p>
                    <div className="mt-2 flex items-center space-x-2">
                      <div className="flex items-center">
                        {[...Array(4)].map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                      <span className="text-xs text-gray-400">2일 전</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default LLMQuality;