import React, { memo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface DailyTrend {
  date: string;
  logins: number;
  searches: number;
  reports: number;
  newUsers: number;
}

interface TrendChartProps {
  data: DailyTrend[];
  height?: number;
}

const TrendChart: React.FC<TrendChartProps> = memo(({ data, height = 320 }) => {
  // 숫자 포맷팅 함수
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

  // 날짜 포맷팅 함수
  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('ko-KR', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // 툴팁 라벨 포맷팅
  const formatTooltipLabel = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('ko-KR');
  };

  // 툴팁 값 포맷팅
  const formatTooltipValue = (value: number, name: string): [string, string] => {
    const formattedValue = formatNumber(value);
    const label = name === 'logins' ? '로그인' : 
                  name === 'searches' ? '검색' : 
                  name === 'reports' ? '리포트' : '신규 사용자';
    return [formattedValue, label];
  };

  // 범례 포맷팅
  const formatLegend = (value: string): string => {
    return value === 'logins' ? '로그인' : 
           value === 'searches' ? '검색' : 
           value === 'reports' ? '리포트' : '신규 사용자';
  };

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            tickFormatter={formatDate}
            stroke="#666"
            fontSize={12}
          />
          <YAxis 
            tickFormatter={formatNumber}
            stroke="#666"
            fontSize={12}
          />
          <Tooltip 
            labelFormatter={formatTooltipLabel}
            formatter={formatTooltipValue}
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Legend 
            formatter={formatLegend}
            wrapperStyle={{ paddingTop: '20px' }}
          />
          <Line 
            type="monotone" 
            dataKey="logins" 
            stroke="#3B82F6" 
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line 
            type="monotone" 
            dataKey="searches" 
            stroke="#8B5CF6" 
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line 
            type="monotone" 
            dataKey="reports" 
            stroke="#F59E0B" 
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line 
            type="monotone" 
            dataKey="newUsers" 
            stroke="#10B981" 
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});

TrendChart.displayName = 'TrendChart';

export default TrendChart;