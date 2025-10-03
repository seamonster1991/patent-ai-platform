import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface WeeklyActivityData {
  day: string;
  dayIndex: number;
  count: number;
  searchCount: number;
  aiAnalysisCount: number;
}

interface WeeklyActivityChartProps {
  data: WeeklyActivityData[];
  className?: string;
}

const WeeklyActivityChart: React.FC<WeeklyActivityChartProps> = ({ data, className = '' }) => {
  // 요일별 색상 정의 (주말은 다른 색상)
  const getBarColor = (dayIndex: number) => {
    if (dayIndex === 0 || dayIndex === 6) { // 일요일, 토요일
      return '#f59e0b'; // amber-500
    }
    return '#3b82f6'; // blue-500
  };

  // 가장 활발한 요일 찾기 (빈 배열 체크)
  const mostActiveDay = data.length > 0 ? data.reduce((prev, current) => 
    prev.count > current.count ? prev : current
  ) : null;

  // 커스텀 툴팁
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-semibold text-gray-900 dark:text-white">{label}</p>
          <p className="text-blue-600 dark:text-blue-400">
            전체 활동: <span className="font-bold">{data.count}회</span>
          </p>
          <p className="text-green-600 dark:text-green-400">
            검색: <span className="font-bold">{data.searchCount}회</span>
          </p>
          <p className="text-purple-600 dark:text-purple-400">
            AI 분석: <span className="font-bold">{data.aiAnalysisCount}회</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 통계 요약 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
          <div className="text-blue-600 dark:text-blue-400 text-sm font-medium">총 활동</div>
          <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
            {data.length > 0 ? data.reduce((sum, day) => sum + day.count, 0) : 0}
          </div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
          <div className="text-green-600 dark:text-green-400 text-sm font-medium">총 검색</div>
          <div className="text-2xl font-bold text-green-700 dark:text-green-300">
            {data.length > 0 ? data.reduce((sum, day) => sum + day.searchCount, 0) : 0}
          </div>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
          <div className="text-purple-600 dark:text-purple-400 text-sm font-medium">AI 분석</div>
          <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
            {data.length > 0 ? data.reduce((sum, day) => sum + day.aiAnalysisCount, 0) : 0}
          </div>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
          <div className="text-amber-600 dark:text-amber-400 text-sm font-medium">가장 활발한 요일</div>
          <div className="text-lg font-bold text-amber-700 dark:text-amber-300">
            {mostActiveDay ? mostActiveDay.day : '-'}
          </div>
        </div>
      </div>

      {/* 차트 */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="day" 
              tick={{ fontSize: 12 }}
              className="text-gray-600 dark:text-gray-400"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              className="text-gray-600 dark:text-gray-400"
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.dayIndex)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 요일별 상세 정보 */}
      <div className="grid grid-cols-7 gap-2 text-center">
        {data.map((day, index) => (
          <div 
            key={index} 
            className={`p-2 rounded-lg text-xs ${
              day.dayIndex === 0 || day.dayIndex === 6 
                ? 'bg-amber-50 dark:bg-amber-900/20' 
                : 'bg-blue-50 dark:bg-blue-900/20'
            }`}
          >
            <div className="font-semibold text-gray-700 dark:text-gray-300">
              {day.day.slice(0, 1)}
            </div>
            <div className="text-gray-600 dark:text-gray-400">
              {day.count}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeeklyActivityChart;