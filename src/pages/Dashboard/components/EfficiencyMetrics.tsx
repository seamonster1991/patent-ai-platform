import React from 'react';
import { motion } from 'framer-motion';
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Tooltip
} from 'recharts';

interface DashboardStatistics {
  total_logins: number;
  personal_searches: number;
  personal_reports: number;
  market_search_average: number;
  market_report_average: number;
}

interface EfficiencyMetrics {
  search_success_rate: number;
  report_completion_rate: number;
  average_search_time: number;
  user_satisfaction_score: number;
}

interface EfficiencyMetricsProps {
  dashboardStatistics: DashboardStatistics;
  efficiencyMetrics: EfficiencyMetrics;
  height?: number;
  className?: string;
}

const EfficiencyMetrics: React.FC<EfficiencyMetricsProps> = ({
  dashboardStatistics,
  efficiencyMetrics,
  height = 300,
  className = ''
}) => {
  // Prepare data for radial chart
  const radialData = [
    {
      name: '검색 성공률',
      value: efficiencyMetrics.search_success_rate,
      fill: '#3b82f6'
    },
    {
      name: '리포트 완료율',
      value: efficiencyMetrics.report_completion_rate,
      fill: '#10b981'
    },
    {
      name: '사용자 만족도',
      value: efficiencyMetrics.user_satisfaction_score,
      fill: '#f59e0b'
    }
  ];

  // Prepare comparison data
  const comparisonData = [
    {
      name: '개인 검색',
      personal: dashboardStatistics.personal_searches,
      market: dashboardStatistics.market_search_average,
      fill: '#3b82f6'
    },
    {
      name: '개인 리포트',
      personal: dashboardStatistics.personal_reports,
      market: dashboardStatistics.market_report_average,
      fill: '#10b981'
    }
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200">
          <p className="text-slate-700 font-medium">{data.name}</p>
          <p className="text-slate-600">
            {typeof data.value === 'number' ? `${data.value.toFixed(1)}%` : data.value}
          </p>
        </div>
      );
    }
    return null;
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(1)}초`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}분 ${remainingSeconds.toFixed(0)}초`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`w-full ${className}`}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
        {/* Efficiency Metrics Radial Chart */}
        <div className="flex flex-col">
          <h4 className="text-sm font-medium text-slate-600 mb-4">효율성 지표</h4>
          <div className="flex-1" style={{ height: height / 2 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius="20%"
                outerRadius="80%"
                data={radialData}
                startAngle={90}
                endAngle={-270}
              >
                <RadialBar
                  dataKey="value"
                  cornerRadius={10}
                  fill="#8884d8"
                />
                <Tooltip content={<CustomTooltip />} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          
          {/* Metrics Legend */}
          <div className="space-y-2 mt-4">
            {radialData.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.fill }}
                  />
                  <span className="text-sm text-slate-600">{item.name}</span>
                </div>
                <span className="text-sm font-medium text-slate-900">
                  {item.value.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Comparison */}
        <div className="flex flex-col">
          <h4 className="text-sm font-medium text-slate-600 mb-4">성과 비교</h4>
          
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <div className="text-xs text-blue-600 font-medium mb-1">평균 검색 시간</div>
              <div className="text-lg font-bold text-blue-900">
                {formatTime(efficiencyMetrics.average_search_time)}
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 border border-green-200">
              <div className="text-xs text-green-600 font-medium mb-1">총 로그인</div>
              <div className="text-lg font-bold text-green-900">
                {dashboardStatistics.total_logins.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Comparison Chart */}
          <div className="flex-1">
            <div className="space-y-3">
              {comparisonData.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">{item.name}</span>
                    <div className="flex items-center space-x-4 text-xs">
                      <span className="text-slate-600">
                        개인: {item.personal.toLocaleString()}
                      </span>
                      <span className="text-slate-500">
                        평균: {item.market.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  
                  {/* Progress bars */}
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-slate-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all duration-500"
                          style={{
                            backgroundColor: item.fill,
                            width: `${Math.min((item.personal / Math.max(item.personal, item.market)) * 100, 100)}%`
                          }}
                        />
                      </div>
                      <span className="text-xs text-slate-600 w-8">개인</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-slate-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-slate-400 transition-all duration-500"
                          style={{
                            width: `${Math.min((item.market / Math.max(item.personal, item.market)) * 100, 100)}%`
                          }}
                        />
                      </div>
                      <span className="text-xs text-slate-600 w-8">평균</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default EfficiencyMetrics;