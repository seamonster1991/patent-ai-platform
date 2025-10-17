import React, { memo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface TopInsight {
  rank: number;
  query?: string;
  topic?: string;
  count: number;
}

interface InsightBarChartProps {
  data: TopInsight[];
  dataKey: 'query' | 'topic';
  color: string;
  height?: number;
  title: string;
}

const InsightBarChart: React.FC<InsightBarChartProps> = memo(({ 
  data, 
  dataKey, 
  color, 
  height = 320, 
  title 
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

  // 툴팁 포맷팅
  const formatTooltipValue = (value: number): [string, string] => {
    const label = dataKey === 'query' ? '검색 횟수' : '분석 횟수';
    return [formatNumber(value), label];
  };

  // 텍스트 자르기 함수
  const truncateText = (text: string, maxLength: number = 15): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Y축 라벨 포맷팅
  const formatYAxisLabel = (value: string): string => {
    return truncateText(value, 12);
  };

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={data} 
          layout="horizontal"
          margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            type="number" 
            tickFormatter={formatNumber}
            stroke="#666"
            fontSize={12}
          />
          <YAxis 
            dataKey={dataKey} 
            type="category" 
            width={90}
            tickFormatter={formatYAxisLabel}
            stroke="#666"
            fontSize={11}
          />
          <Tooltip 
            formatter={formatTooltipValue}
            labelFormatter={(label) => `${dataKey === 'query' ? '검색어' : '주제'}: ${label}`}
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Bar 
            dataKey="count" 
            fill={color}
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

InsightBarChart.displayName = 'InsightBarChart';

export default InsightBarChart;