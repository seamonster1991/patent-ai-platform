import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, Title, Text } from '@tremor/react';

interface DailyData {
  date: string;
  count: number;
}

interface TrendChartProps {
  title: string;
  description?: string;
  data: DailyData[];
  marketData?: DailyData[];
  dataKey?: string;
  dataLabel?: string;
  marketLabel?: string;
  color?: string;
  marketColor?: string;
  height?: number;
}

const TrendChart: React.FC<TrendChartProps> = ({
  title,
  description,
  data,
  marketData,
  dataKey = 'count',
  dataLabel = '내 활동',
  marketLabel = '시장 평균',
  color = '#3B82F6',
  marketColor = '#10B981',
  height = 300
}) => {
  // Combine user and market data by date
  const combinedData = data.map(userItem => {
    const marketItem = marketData?.find(m => m.date === userItem.date);
    return {
      date: userItem.date,
      user: userItem[dataKey as keyof DailyData],
      market: marketItem ? marketItem[dataKey as keyof DailyData] : 0,
      formattedDate: new Date(userItem.date).toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric'
      })
    };
  });

  return (
    <Card className="p-6">
      <div className="mb-4">
        <Title className="text-lg font-semibold text-gray-900">{title}</Title>
        {description && (
          <Text className="text-sm text-gray-600 mt-1">{description}</Text>
        )}
      </div>
      
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={combinedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="formattedDate" 
            stroke="#6b7280"
            fontSize={12}
            tickLine={false}
          />
          <YAxis 
            stroke="#6b7280"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
            labelFormatter={(label) => `날짜: ${label}`}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="user" 
            stroke={color}
            strokeWidth={2}
            dot={{ fill: color, strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: color, strokeWidth: 2 }}
            name={dataLabel}
          />
          {marketData && (
            <Line 
              type="monotone" 
              dataKey="market" 
              stroke={marketColor}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: marketColor, strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: marketColor, strokeWidth: 2 }}
              name={marketLabel}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};

export default TrendChart;